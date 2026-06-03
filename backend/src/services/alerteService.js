const pool = require('../config/db');
const { evaluerRegle, formaterAlerte } = require('./regleService');
const { agreggerParMois } = require('./indicateurService');

/**
 * Évalue toutes les règles actives et crée les alertes correspondantes.
 * Appelé périodiquement ou lors d'un nouvel import.
 */
async function evaluerToutesRegles() {
  const client = await pool.connect();
  const alertesCrees = [];

  try {
    const { rows: regles } = await client.query(`
      SELECT ra.*, s.nom AS site_nom, c.nom AS compteur_nom
      FROM regle_alerte ra
      LEFT JOIN site s ON ra.site_id = s.id
      LEFT JOIN compteur c ON ra.compteur_id = c.id
      WHERE ra.active = TRUE
    `);

    for (const regle of regles) {
      try {
        const alerte = await evaluerUneRegle(client, regle);
        if (alerte) alertesCrees.push(alerte);
      } catch (err) {
        console.error(`Erreur évaluation règle ${regle.id}:`, err.message);
      }
    }
  } finally {
    client.release();
  }

  return alertesCrees;
}

async function evaluerUneRegle(client, regle) {
  const condition = typeof regle.condition === 'string'
    ? JSON.parse(regle.condition)
    : regle.condition;

  const compteurFilter = regle.compteur_id
    ? 'AND r.compteur_id = $1'
    : '';
  const params = regle.compteur_id ? [regle.compteur_id] : [];

  // Récupère les relevés du mois courant
  const { rows: relevesMois } = await client.query(`
    SELECT valeur, date_releve FROM releve
    WHERE date_releve >= DATE_TRUNC('month', NOW())
      AND valide = TRUE
      ${regle.compteur_id ? 'AND compteur_id = $1' : ''}
    ORDER BY date_releve DESC
  `, params);

  if (relevesMois.length === 0) return null;

  const valeurMois = relevesMois.reduce((s, r) => s + parseFloat(r.valeur), 0);

  let valeurRef = null;
  if (regle.type_regle === 'variation' || regle.type_regle === 'comparaison') {
    // Relevés du mois précédent
    const { rows: relevesPrev } = await client.query(`
      SELECT valeur FROM releve
      WHERE date_releve >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month'
        AND date_releve < DATE_TRUNC('month', NOW())
        AND valide = TRUE
        ${regle.compteur_id ? 'AND compteur_id = $1' : ''}
    `, params);
    valeurRef = relevesPrev.reduce((s, r) => s + parseFloat(r.valeur), 0) || null;
  }

  const resultat = evaluerRegle(regle, { valeur: valeurMois, valeurRef });
  if (!resultat.declenchee) return null;

  // Évite de dupliquer une alerte non traitée sur la même règle ce mois
  const { rows: existing } = await client.query(`
    SELECT id FROM alerte
    WHERE regle_id = $1
      AND date_trunc('month', created_at) = date_trunc('month', NOW())
      AND traitee = FALSE
    LIMIT 1
  `, [regle.id]);

  if (existing.length > 0) return null;

  const message = formaterAlerte(regle, resultat, regle.site_nom, regle.compteur_nom);

  const { rows: [nouvelleAlerte] } = await client.query(`
    INSERT INTO alerte (regle_id, site_id, compteur_id, message, valeur_detectee, seuil, niveau)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [regle.id, regle.site_id, regle.compteur_id, message,
      resultat.valeurDetectee, resultat.seuil, regle.niveau || 'warning']);

  return nouvelleAlerte;
}

module.exports = { evaluerToutesRegles, evaluerUneRegle };

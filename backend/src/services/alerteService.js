const pool = require('../config/db');
const { evaluerRegle, formaterAlerte } = require('./regleService');

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
        console.error(`[alertes] Règle ${regle.id}:`, err.message);
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

  // Construire les filtres SQL selon les champs de la règle
  const conditions = ['r.date_releve >= DATE_TRUNC(\'month\', NOW())', 'r.valide = TRUE'];
  const params = [];

  if (regle.compteur_id) {
    params.push(regle.compteur_id);
    conditions.push(`r.compteur_id = $${params.length}`);
  } else if (regle.site_id) {
    // Pas de compteur ciblé mais un site → tous les compteurs du site
    params.push(regle.site_id);
    conditions.push(`c.site_id = $${params.length}`);
  }

  const joinClause = (!regle.compteur_id && regle.site_id)
    ? 'JOIN compteur c ON r.compteur_id = c.id'
    : '';

  const where = conditions.join(' AND ');

  const { rows: relevesMois } = await client.query(
    `SELECT r.valeur FROM releve r ${joinClause} WHERE ${where}`, params
  );

  if (relevesMois.length === 0) return null;

  const valeurMois = relevesMois.reduce((s, r) => s + parseFloat(r.valeur), 0);

  let valeurRef = null;
  if (regle.type_regle === 'variation' || regle.type_regle === 'comparaison') {
    const condsPrev = [
      `r.date_releve >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month'`,
      `r.date_releve < DATE_TRUNC('month', NOW())`,
      'r.valide = TRUE',
    ];
    const paramsPrev = [...params]; // même filtres site/compteur

    const { rows: relevesPrev } = await client.query(
      `SELECT r.valeur FROM releve r ${joinClause} WHERE ${[...condsPrev, ...conditions.slice(2)].join(' AND ')}`,
      paramsPrev
    );
    valeurRef = relevesPrev.reduce((s, r) => s + parseFloat(r.valeur), 0) || null;
  }

  const resultat = evaluerRegle(regle, { valeur: valeurMois, valeurRef });
  if (!resultat.declenchee) return null;

  // Déduplique : pas deux alertes non-traitées pour la même règle ce mois
  const { rows: existing } = await client.query(`
    SELECT id FROM alerte
    WHERE regle_id = $1
      AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())
      AND traitee = FALSE
    LIMIT 1
  `, [regle.id]);
  if (existing.length > 0) return null;

  const message = formaterAlerte(regle, resultat, regle.site_nom, regle.compteur_nom);

  const { rows: [alerte] } = await client.query(`
    INSERT INTO alerte (regle_id, site_id, compteur_id, message, valeur_detectee, seuil, niveau)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [
    regle.id, regle.site_id, regle.compteur_id,
    message, resultat.valeurDetectee, resultat.seuil, regle.niveau || 'warning',
  ]);

  console.log(`[alertes] Alerte créée — règle "${regle.nom}" (${regle.niveau})`);
  return alerte;
}

module.exports = { evaluerToutesRegles, evaluerUneRegle };

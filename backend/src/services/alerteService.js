const pool = require('../config/db');
const { evaluerRegle, formaterAlerte } = require('./regleService');

/**
 * Évalue toutes les règles actives contre les données du mois courant.
 *
 * Architecture :
 *   - 4 requêtes SQL groupées pour charger l'historique (courant + N-1) en HashMap
 *   - 1 requête pour identifier les règles déjà déclenchées ce mois
 *   - Évaluation en mémoire O(1) par règle (pas de requête dans la boucle)
 *   - 1 INSERT groupé pour toutes les alertes générées
 *
 * Pour les règles "variation" et "comparaison", la référence est le même mois
 * de l'année précédente (N-1), pas le mois précédent.
 * Pour les règles "comparaison", la consommation est normalisée par la surface
 * du bâtiment (kWh/m²) avant comparaison.
 */
async function evaluerToutesRegles() {
  const client = await pool.connect();
  try {
    // ── 1. Charger toutes les règles actives avec la surface du site ─────────
    const { rows: regles } = await client.query(`
      SELECT ra.*,
             s.nom        AS site_nom,
             s.surface    AS site_surface,
             c.nom        AS compteur_nom
      FROM regle_alerte ra
      LEFT JOIN site     s ON ra.site_id     = s.id
      LEFT JOIN compteur c ON ra.compteur_id = c.id
      WHERE ra.active = TRUE
    `);
    if (regles.length === 0) return [];

    // ── 2. Séparer les règles par portée (site ou compteur) ─────────────────
    const siteIds     = [...new Set(regles.filter(r => r.site_id    && !r.compteur_id).map(r => r.site_id))];
    const compteurIds = [...new Set(regles.filter(r => r.compteur_id).map(r => r.compteur_id))];

    // ── 3. Charger conso mois courant ET N-1 en 4 requêtes parallèles ───────
    const siteCurrentMap     = new Map(); // site_id     → kWh mois courant
    const siteN1Map          = new Map(); // site_id     → kWh même mois N-1
    const compteurCurrentMap = new Map(); // compteur_id → kWh mois courant
    const compteurN1Map      = new Map(); // compteur_id → kWh même mois N-1

    const queryPromises = [];

    if (siteIds.length > 0) {
      queryPromises.push(
        client.query(`
          SELECT c.site_id, SUM(r.valeur) AS total
          FROM releve r JOIN compteur c ON r.compteur_id = c.id
          WHERE c.site_id = ANY($1)
            AND r.date_releve >= DATE_TRUNC('month', NOW())
            AND r.date_releve <  DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
            AND r.valide = TRUE
          GROUP BY c.site_id
        `, [siteIds]).then(({ rows }) =>
          rows.forEach(r => siteCurrentMap.set(r.site_id, parseFloat(r.total)))
        ),
        client.query(`
          SELECT c.site_id, SUM(r.valeur) AS total
          FROM releve r JOIN compteur c ON r.compteur_id = c.id
          WHERE c.site_id = ANY($1)
            AND r.date_releve >= DATE_TRUNC('month', NOW()) - INTERVAL '1 year'
            AND r.date_releve <  DATE_TRUNC('month', NOW()) - INTERVAL '1 year' + INTERVAL '1 month'
            AND r.valide = TRUE
          GROUP BY c.site_id
        `, [siteIds]).then(({ rows }) =>
          rows.forEach(r => siteN1Map.set(r.site_id, parseFloat(r.total)))
        )
      );
    }

    if (compteurIds.length > 0) {
      queryPromises.push(
        client.query(`
          SELECT compteur_id, SUM(valeur) AS total
          FROM releve
          WHERE compteur_id = ANY($1)
            AND date_releve >= DATE_TRUNC('month', NOW())
            AND date_releve <  DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
            AND valide = TRUE
          GROUP BY compteur_id
        `, [compteurIds]).then(({ rows }) =>
          rows.forEach(r => compteurCurrentMap.set(r.compteur_id, parseFloat(r.total)))
        ),
        client.query(`
          SELECT compteur_id, SUM(valeur) AS total
          FROM releve
          WHERE compteur_id = ANY($1)
            AND date_releve >= DATE_TRUNC('month', NOW()) - INTERVAL '1 year'
            AND date_releve <  DATE_TRUNC('month', NOW()) - INTERVAL '1 year' + INTERVAL '1 month'
            AND valide = TRUE
          GROUP BY compteur_id
        `, [compteurIds]).then(({ rows }) =>
          rows.forEach(r => compteurN1Map.set(r.compteur_id, parseFloat(r.total)))
        )
      );
    }

    await Promise.all(queryPromises);

    // ── 4. Charger en une requête les règles déjà déclenchées ce mois ───────
    const { rows: dejaDeclenchees } = await client.query(`
      SELECT DISTINCT regle_id FROM alerte
      WHERE regle_id = ANY($1)
        AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())
        AND traitee = FALSE
    `, [regles.map(r => r.id)]);
    const reglesDejaOuvertes = new Set(dejaDeclenchees.map(r => r.regle_id));

    // ── 5. Évaluer chaque règle — lookups O(1), aucune requête SQL ──────────
    const alertesACreer = [];

    for (const regle of regles) {
      if (reglesDejaOuvertes.has(regle.id)) continue;

      const condition = typeof regle.condition === 'string'
        ? JSON.parse(regle.condition)
        : regle.condition;

      let valeur, valeurRef, surface;

      if (regle.compteur_id) {
        valeur    = compteurCurrentMap.get(regle.compteur_id) ?? null;
        valeurRef = compteurN1Map.get(regle.compteur_id)      ?? null;
      } else if (regle.site_id) {
        valeur    = siteCurrentMap.get(regle.site_id) ?? null;
        valeurRef = siteN1Map.get(regle.site_id)      ?? null;
        surface   = regle.site_surface ? parseFloat(regle.site_surface) : null;
      }

      if (valeur === null) continue;

      // Normalisation kWh/m² pour les règles "comparaison" (si surface connue)
      let valeurEval    = valeur;
      let valeurRefEval = valeurRef;
      if (regle.type_regle === 'comparaison' && surface > 0) {
        valeurEval    = valeur    / surface;
        valeurRefEval = valeurRef !== null ? valeurRef / surface : null;
      }

      const resultat = evaluerRegle(
        { ...regle, condition },
        { valeur: valeurEval, valeurRef: valeurRefEval }
      );
      if (!resultat.declenchee) continue;

      alertesACreer.push({
        regle_id:        regle.id,
        site_id:         regle.site_id     || null,
        compteur_id:     regle.compteur_id || null,
        message:         formaterAlerte(regle, resultat, regle.site_nom, regle.compteur_nom),
        valeur_detectee: resultat.valeurDetectee,
        seuil:           resultat.seuil,
        niveau:          regle.niveau || 'warning',
      });
    }

    // ── 6. Insertion groupée (bulk insert) ───────────────────────────────────
    if (alertesACreer.length > 0) {
      const placeholders = alertesACreer
        .map((_, i) => {
          const b = i * 7;
          return `($${b+1},$${b+2},$${b+3},$${b+4},$${b+5},$${b+6},$${b+7})`;
        })
        .join(',');

      await client.query(
        `INSERT INTO alerte (regle_id, site_id, compteur_id, message, valeur_detectee, seuil, niveau)
         VALUES ${placeholders}`,
        alertesACreer.flatMap(a => [
          a.regle_id, a.site_id, a.compteur_id,
          a.message, a.valeur_detectee, a.seuil, a.niveau,
        ])
      );
      console.log(`[alertes] ${alertesACreer.length} alerte(s) créée(s)`);
    }

    return alertesACreer;
  } finally {
    client.release();
  }
}

module.exports = { evaluerToutesRegles };

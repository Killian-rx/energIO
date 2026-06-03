const express = require('express');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const {
  normaliserParSurface,
  calculerVariation,
  regressionLineaire,
  detecterAnomalies,
  agreggerParMois,
  classerSites,
  labelTendance,
} = require('../services/indicateurService');

const router = express.Router();
router.use(requireAuth);

// GET /indicateurs/synthese — tableau de bord global
router.get('/synthese', async (req, res) => {
  try {
    // Consommation totale mois courant vs mois précédent
    const { rows: [moisActuel] } = await pool.query(`
      SELECT COALESCE(SUM(r.valeur), 0) AS total
      FROM releve r
      JOIN compteur c ON r.compteur_id = c.id
      WHERE r.valide = TRUE
        AND r.date_releve >= DATE_TRUNC('month', NOW())
        AND c.type_energie = 'electricite'
    `);
    const { rows: [moisPrec] } = await pool.query(`
      SELECT COALESCE(SUM(r.valeur), 0) AS total
      FROM releve r
      JOIN compteur c ON r.compteur_id = c.id
      WHERE r.valide = TRUE
        AND r.date_releve >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month'
        AND r.date_releve < DATE_TRUNC('month', NOW())
        AND c.type_energie = 'electricite'
    `);
    const variation = calculerVariation(
      parseFloat(moisActuel.total),
      parseFloat(moisPrec.total)
    );

    // Nb sites et alertes non traitées
    const { rows: [stats] } = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM site WHERE actif=TRUE) AS nb_sites,
        (SELECT COUNT(*) FROM alerte WHERE traitee=FALSE) AS nb_alertes,
        (SELECT COUNT(*) FROM compteur WHERE actif=TRUE) AS nb_compteurs
    `);

    res.json({
      conso_elec_mois: parseFloat(moisActuel.total),
      conso_elec_mois_prec: parseFloat(moisPrec.total),
      variation_pct: variation,
      nb_sites: parseInt(stats.nb_sites),
      nb_alertes: parseInt(stats.nb_alertes),
      nb_compteurs: parseInt(stats.nb_compteurs),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /indicateurs/evolution?type_energie=electricite&nb_mois=12
router.get('/evolution', async (req, res) => {
  try {
    const { type_energie = 'electricite', nb_mois = 12 } = req.query;
    const { rows } = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', r.date_releve), 'YYYY-MM') AS mois,
        SUM(r.valeur) AS total,
        c.type_energie
      FROM releve r
      JOIN compteur c ON r.compteur_id = c.id
      WHERE r.valide = TRUE
        AND r.date_releve >= DATE_TRUNC('month', NOW()) - ($1 || ' months')::INTERVAL
        AND c.type_energie = $2
      GROUP BY DATE_TRUNC('month', r.date_releve), c.type_energie
      ORDER BY mois ASC
    `, [parseInt(nb_mois), type_energie]);

    const points = rows.map((r, i) => ({ x: i, y: parseFloat(r.total) }));
    const tendance = regressionLineaire(points);

    res.json({
      donnees: rows.map(r => ({ mois: r.mois, total: parseFloat(r.total) })),
      tendance: {
        ...tendance,
        label: labelTendance(tendance.a),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /indicateurs/normalises — consommation kWh/m² par site
router.get('/normalises', async (req, res) => {
  try {
    const { mois } = req.query; // YYYY-MM (défaut = mois courant)
    const periode = mois ? `${mois}-01` : "DATE_TRUNC('month', NOW())";
    const param   = mois ? [mois + '-01'] : [];

    const { rows } = await pool.query(`
      SELECT
        s.id AS site_id, s.nom, s.surface, s.type_batiment,
        SUM(r.valeur) FILTER (WHERE c.type_energie = 'electricite') AS conso_elec,
        SUM(r.valeur) FILTER (WHERE c.type_energie = 'gaz')         AS conso_gaz,
        SUM(r.valeur)                                               AS conso_total
      FROM site s
      JOIN compteur c ON c.site_id = s.id AND c.actif = TRUE
      JOIN releve r   ON r.compteur_id = c.id AND r.valide = TRUE
      WHERE s.actif = TRUE
        AND r.date_releve >= ${mois ? '$1::DATE' : "DATE_TRUNC('month', NOW())"}
        AND r.date_releve < ${mois ? "($1::DATE + INTERVAL '1 month')" : "(DATE_TRUNC('month', NOW()) + INTERVAL '1 month')"}
      GROUP BY s.id, s.nom, s.surface, s.type_batiment
    `, param);

    const sitesClasses = classerSites(rows.map(r => ({
      site_id: r.site_id,
      nom: r.nom,
      surface: parseFloat(r.surface),
      type_batiment: r.type_batiment,
      total_kwh: parseFloat(r.conso_elec || 0),
      conso_gaz: parseFloat(r.conso_gaz || 0),
      conso_totale: parseFloat(r.conso_total || 0),
    })));

    res.json(sitesClasses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /indicateurs/anomalies?compteur_id=X&nb_mois=12
router.get('/anomalies', async (req, res) => {
  try {
    const { nb_mois = 12 } = req.query;
    const { rows } = await pool.query(`
      SELECT
        c.id AS compteur_id, c.nom AS compteur_nom, c.type_energie, c.unite,
        s.nom AS site_nom,
        TO_CHAR(DATE_TRUNC('month', r.date_releve), 'YYYY-MM') AS mois,
        SUM(r.valeur) AS total
      FROM releve r
      JOIN compteur c ON r.compteur_id = c.id
      JOIN site s ON c.site_id = s.id
      WHERE r.valide = TRUE
        AND r.date_releve >= DATE_TRUNC('month', NOW()) - ($1 || ' months')::INTERVAL
      GROUP BY c.id, c.nom, c.type_energie, c.unite, s.nom, DATE_TRUNC('month', r.date_releve)
      ORDER BY c.id, mois
    `, [parseInt(nb_mois)]);

    // Grouper par compteur et détecter anomalies
    const byCompteur = {};
    for (const r of rows) {
      if (!byCompteur[r.compteur_id]) {
        byCompteur[r.compteur_id] = {
          compteur_id: r.compteur_id,
          compteur_nom: r.compteur_nom,
          site_nom: r.site_nom,
          type_energie: r.type_energie,
          mois: [], valeurs: [],
        };
      }
      byCompteur[r.compteur_id].mois.push(r.mois);
      byCompteur[r.compteur_id].valeurs.push(parseFloat(r.total));
    }

    const resultats = [];
    for (const c of Object.values(byCompteur)) {
      const anomalies = detecterAnomalies(c.valeurs);
      if (anomalies.length > 0) {
        resultats.push({
          ...c,
          anomalies: anomalies.map(a => ({
            mois: c.mois[a.index],
            valeur: a.valeur,
            zscore: a.zscore,
          })),
        });
      }
    }

    res.json(resultats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /indicateurs/tendances — tendance par compteur sur N mois
router.get('/tendances', async (req, res) => {
  try {
    const { nb_mois = 12 } = req.query;
    const { rows } = await pool.query(`
      SELECT
        c.id AS compteur_id, c.nom AS compteur_nom, c.type_energie, s.nom AS site_nom,
        TO_CHAR(DATE_TRUNC('month', r.date_releve), 'YYYY-MM') AS mois,
        SUM(r.valeur) AS total
      FROM releve r
      JOIN compteur c ON r.compteur_id = c.id
      JOIN site s ON c.site_id = s.id
      WHERE r.valide = TRUE
        AND r.date_releve >= DATE_TRUNC('month', NOW()) - ($1 || ' months')::INTERVAL
      GROUP BY c.id, c.nom, c.type_energie, s.nom, DATE_TRUNC('month', r.date_releve)
      ORDER BY c.id, mois
    `, [parseInt(nb_mois)]);

    const byCompteur = {};
    for (const r of rows) {
      if (!byCompteur[r.compteur_id]) {
        byCompteur[r.compteur_id] = {
          compteur_id: r.compteur_id, compteur_nom: r.compteur_nom,
          site_nom: r.site_nom, type_energie: r.type_energie,
          mois: [], valeurs: [],
        };
      }
      byCompteur[r.compteur_id].mois.push(r.mois);
      byCompteur[r.compteur_id].valeurs.push(parseFloat(r.total));
    }

    const resultats = Object.values(byCompteur).map(c => {
      const points = c.valeurs.map((y, x) => ({ x, y }));
      const reg = regressionLineaire(points);
      return {
        ...c,
        tendance: { ...reg, label: labelTendance(reg.a) },
      };
    });

    res.json(resultats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;

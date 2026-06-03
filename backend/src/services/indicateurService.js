/**
 * Calcule les indicateurs énergétiques à partir des données brutes.
 * Toutes les fonctions sont pures (pas d'accès DB) pour faciliter les tests.
 */

/**
 * Consommation normalisée par surface (kWh/m²)
 */
function normaliserParSurface(consommationKwh, surfaceM2) {
  if (!surfaceM2 || surfaceM2 <= 0) return null;
  return Math.round((consommationKwh / surfaceM2) * 100) / 100;
}

/**
 * Variation en % entre deux valeurs
 */
function calculerVariation(valeurActuelle, valeurRef) {
  if (!valeurRef || valeurRef === 0) return null;
  return Math.round(((valeurActuelle - valeurRef) / valeurRef) * 10000) / 100;
}

/**
 * Régression linéaire simple (moindres carrés)
 * @param {Array<{x: number, y: number}>} points
 * @returns {{ a: number, b: number, r2: number }} — y = a*x + b
 */
function regressionLineaire(points) {
  const n = points.length;
  if (n < 2) return { a: 0, b: points[0]?.y || 0, r2: 0 };

  const sumX  = points.reduce((s, p) => s + p.x, 0);
  const sumY  = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);

  const a = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const b = (sumY - a * sumX) / n;

  const yMean = sumY / n;
  const ssTot = points.reduce((s, p) => s + Math.pow(p.y - yMean, 2), 0);
  const ssRes = points.reduce((s, p) => s + Math.pow(p.y - (a * p.x + b), 2), 0);
  const r2    = ssTot === 0 ? 1 : Math.round((1 - ssRes / ssTot) * 10000) / 10000;

  return { a: Math.round(a * 100) / 100, b: Math.round(b * 100) / 100, r2 };
}

/**
 * Détection d'anomalies par z-score
 * @param {number[]} valeurs
 * @param {number} seuil z-score (défaut 2.0)
 * @returns {Array<{ index: number, valeur: number, zscore: number }>}
 */
function detecterAnomalies(valeurs, seuil = 2.0) {
  if (valeurs.length < 3) return [];
  const n    = valeurs.length;
  const mean = valeurs.reduce((s, v) => s + v, 0) / n;
  const variance = valeurs.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / n;
  const std  = Math.sqrt(variance);
  if (std === 0) return [];

  return valeurs
    .map((v, i) => ({ index: i, valeur: v, zscore: Math.abs((v - mean) / std) }))
    .filter(p => p.zscore > seuil)
    .map(p => ({ ...p, zscore: Math.round(p.zscore * 100) / 100 }));
}

/**
 * Agrège des relevés bruts par mois
 * @param {Array<{date_releve: string, valeur: number}>} releves
 * @returns {Array<{mois: string, total: number, nb: number}>}
 */
function agreggerParMois(releves) {
  const map = {};
  for (const r of releves) {
    const mois = r.date_releve.slice(0, 7); // YYYY-MM
    if (!map[mois]) map[mois] = { mois, total: 0, nb: 0 };
    map[mois].total += parseFloat(r.valeur);
    map[mois].nb    += 1;
  }
  return Object.values(map).sort((a, b) => a.mois.localeCompare(b.mois));
}

/**
 * Classement des sites par consommation normalisée croissante (meilleur = 1er)
 * @param {Array<{site_id, nom, total_kwh, surface}>} sites
 */
function classerSites(sites) {
  return sites
    .map(s => ({
      ...s,
      conso_norm: normaliserParSurface(s.total_kwh, s.surface),
    }))
    .filter(s => s.conso_norm !== null)
    .sort((a, b) => a.conso_norm - b.conso_norm)
    .map((s, i) => ({ ...s, rang: i + 1 }));
}

/**
 * Tendance textuelle à partir du coefficient directeur
 */
function labelTendance(a) {
  if (a > 50)  return 'hausse forte';
  if (a > 10)  return 'hausse modérée';
  if (a > -10) return 'stable';
  if (a > -50) return 'baisse modérée';
  return 'baisse forte';
}

module.exports = {
  normaliserParSurface,
  calculerVariation,
  regressionLineaire,
  detecterAnomalies,
  agreggerParMois,
  classerSites,
  labelTendance,
};

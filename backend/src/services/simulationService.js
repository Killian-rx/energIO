const pool = require('../config/db');

// compteur_id (int) -> { handle, intervalSeconds }
const timers = new Map();

function generateValue(typeEnergie, intervalSeconds) {
  const h        = new Date().getHours();
  const business = h >= 8 && h <= 19;
  const night    = h < 6  || h >= 23;
  const factor   = intervalSeconds / 3600; // fraction d'heure

  // Taux horaires typiques pour des bâtiments tertiaires
  // + variation aléatoire réaliste (bruit + occasional spike)
  const rand  = () => 0.65 + Math.random() * 0.7;            // ±35%
  const spike = () => Math.random() < 0.08 ? 1.8 + Math.random() : 1; // 8% de chance de pic

  let val;
  switch (typeEnergie) {
    case 'electricite':
      // kWh — puissance 20–180 kW selon heure
      val = (night ? 20 : business ? 160 : 55) * factor * rand() * spike();
      break;
    case 'gaz':
      // m³ — chauffe/cuisson
      val = (night ? 1.5 : business ? 18 : 5) * factor * rand() * spike();
      break;
    case 'eau':
      // m³ — usage sanitaire + process. Minimum lisible même à 30s
      val = (night ? 0.8 : business ? 12 : 3) * factor * rand() * spike();
      // Garantit un minimum de 0.05 m³ pour que la valeur soit visible
      val = Math.max(val, 0.05 * rand());
      break;
    case 'fioul':
      // Litres
      val = (night ? 4 : business ? 50 : 14) * factor * rand() * spike();
      break;
    case 'bois':
      // kg
      val = (night ? 2 : business ? 22 : 7) * factor * rand() * spike();
      break;
    default:
      val = (night ? 8 : business ? 80 : 25) * factor * rand();
  }

  // Précision adaptée à la magnitude
  if (val >= 100) return Math.round(val * 10) / 10;
  if (val >= 10)  return Math.round(val * 100) / 100;
  if (val >= 1)   return Math.round(val * 1000) / 1000;
  return Math.round(val * 10000) / 10000;
}

async function tick(compteurId, intervalSeconds) {
  try {
    const { rows } = await pool.query(
      `SELECT type_energie FROM compteur WHERE id=$1 AND actif=TRUE AND sim_active=TRUE`,
      [compteurId]
    );
    if (rows.length === 0) { stopMeter(compteurId); return; }
    const valeur = generateValue(rows[0].type_energie, intervalSeconds);
    await pool.query(
      `INSERT INTO releve (compteur_id, valeur, date_releve, source, valide)
       VALUES ($1, $2, NOW(), 'simulation', TRUE)`,
      [compteurId, valeur]
    );
  } catch (err) {
    console.error(`[sim] compteur ${compteurId}:`, err.message);
  }
}

function startMeter(compteurId, intervalSeconds) {
  const id  = parseInt(compteurId);
  const sec = parseInt(intervalSeconds) || 300;
  stopMeter(id);
  tick(id, sec); // premier relevé immédiat
  const handle = setInterval(() => tick(id, sec), sec * 1000);
  timers.set(id, { handle, intervalSeconds: sec });
}

function stopMeter(compteurId) {
  const id = parseInt(compteurId);
  const t  = timers.get(id);
  if (t) { clearInterval(t.handle); timers.delete(id); }
}

async function initFromDB() {
  try {
    const { rows } = await pool.query(
      `SELECT id, sim_interval_seconds FROM compteur WHERE actif=TRUE AND sim_active=TRUE`
    );
    for (const r of rows) startMeter(r.id, r.sim_interval_seconds);
    if (rows.length > 0) console.log(`[simulation] ${rows.length} capteur(s) démarrés`);
  } catch (err) {
    console.error('[simulation] initFromDB:', err.message);
  }
}

// Nettoyage : supprime les relevés simulés plus vieux que sim_retention_hours par compteur
async function cleanup() {
  try {
    const { rowCount } = await pool.query(`
      DELETE FROM releve
      WHERE id IN (
        SELECT r.id FROM releve r
        JOIN compteur c ON r.compteur_id = c.id
        WHERE r.source = 'simulation'
          AND r.date_releve < NOW() - (c.sim_retention_hours || ' hours')::INTERVAL
      )
    `);
    if (rowCount > 0) console.log(`[simulation] Nettoyage : ${rowCount} relevé(s) supprimé(s)`);
  } catch (err) {
    console.error('[simulation] cleanup:', err.message);
  }
}

// Nettoyage toutes les 10 minutes
setInterval(cleanup, 10 * 60 * 1000);

function isActive(compteurId) { return timers.has(parseInt(compteurId)); }
function activeIds() { return [...timers.keys()]; }

module.exports = { startMeter, stopMeter, initFromDB, cleanup, isActive, activeIds };

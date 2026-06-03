const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const sim = require('../services/simulationService');


const router = express.Router();
router.use(requireAuth);

// GET /simulation/status
router.get('/status', (req, res) => {
  res.json(sim.getStatus());
});

// GET /simulation/recent — live feed des dernières lectures
router.get('/recent', (req, res) => {
  res.json(sim.getRecentReadings());
});

// POST /simulation/start { intervalSeconds? }
router.post('/start', requireRole('gestionnaire'), (req, res) => {
  const { intervalSeconds } = req.body;
  sim.start(intervalSeconds);
  res.json({ message: 'Simulation démarrée', ...sim.getStatus() });
});

// POST /simulation/stop
router.post('/stop', requireRole('gestionnaire'), (req, res) => {
  sim.stop();
  res.json({ message: 'Simulation arrêtée', ...sim.getStatus() });
});

// POST /simulation/tick — déclenche un relevé manuel immédiat
router.post('/tick', requireRole('gestionnaire'), async (req, res) => {
  await sim.tick();
  res.json({ message: 'Relevé généré', ...sim.getStatus() });
});

// PATCH /simulation/interval { intervalSeconds }
router.patch('/interval', requireRole('gestionnaire'), (req, res) => {
  const { intervalSeconds } = req.body;
  if (!intervalSeconds || intervalSeconds < 10) {
    return res.status(400).json({ error: 'Intervalle minimum : 10 secondes' });
  }
  sim.setIntervalSeconds(intervalSeconds);
  res.json(sim.getStatus());
});

module.exports = router;

require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const authRouter         = require('./routes/auth');
const sitesRouter        = require('./routes/sites');
const compteursRouter    = require('./routes/compteurs');
const relevesRouter      = require('./routes/releves');
const indicateursRouter  = require('./routes/indicateurs');
const reglesRouter       = require('./routes/regles');
const alertesRouter      = require('./routes/alertes');
const importRouter       = require('./routes/import');
const utilisateursRouter = require('./routes/utilisateurs');
const sim                = require('./services/simulationService');

const app  = express();
const PORT = process.env.PORT || 4010;

app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:5173'],
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/auth',          authRouter);
app.use('/sites',         sitesRouter);
app.use('/compteurs',     compteursRouter);
app.use('/releves',       relevesRouter);
app.use('/indicateurs',   indicateursRouter);
app.use('/regles',        reglesRouter);
app.use('/alertes',       alertesRouter);
app.use('/import',        importRouter);
app.use('/utilisateurs',  utilisateursRouter);

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'energio-api', version: '1.0.0' }));
app.use((_, res) => res.status(404).json({ error: 'Route non trouvée' }));
app.use((err, _, res, __) => {
  console.error('Erreur non gérée:', err.message);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

app.listen(PORT, async () => {
  console.log(`EnergIO API démarrée sur http://localhost:${PORT}`);
  await sim.initFromDB(); // démarre les capteurs virtuels persistés en DB
});

module.exports = app;

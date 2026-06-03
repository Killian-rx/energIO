-- EnergIO — Schéma base de données v1
-- RNCP 36463 CDAN — Plateforme de gestion énergétique

BEGIN;

-- Extension pour génération d'UUID si besoin futur
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Utilisateurs ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS utilisateur (
  id          SERIAL PRIMARY KEY,
  nom         VARCHAR(100) NOT NULL,
  prenom      VARCHAR(100) NOT NULL,
  email       VARCHAR(255) UNIQUE NOT NULL,
  mot_de_passe VARCHAR(255) NOT NULL,
  role        VARCHAR(20)  NOT NULL DEFAULT 'utilisateur'
                CHECK (role IN ('admin','gestionnaire','utilisateur')),
  actif       BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Sites (bâtiments) ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS site (
  id               SERIAL PRIMARY KEY,
  nom              VARCHAR(200) NOT NULL,
  adresse          TEXT,
  ville            VARCHAR(100),
  code_postal      VARCHAR(10),
  surface          NUMERIC(10,2),
  type_batiment    VARCHAR(50) CHECK (type_batiment IN ('bureau','erp','technique','logement','autre')),
  usage            VARCHAR(100),
  annee_construction INTEGER,
  gestionnaire_id  INTEGER REFERENCES utilisateur(id) ON DELETE SET NULL,
  actif            BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Zones (sous-ensembles d'un bâtiment) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS zone (
  id       SERIAL PRIMARY KEY,
  site_id  INTEGER NOT NULL REFERENCES site(id) ON DELETE CASCADE,
  nom      VARCHAR(200) NOT NULL,
  surface  NUMERIC(10,2),
  usage    VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Équipements ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS equipement (
  id               SERIAL PRIMARY KEY,
  site_id          INTEGER NOT NULL REFERENCES site(id) ON DELETE CASCADE,
  zone_id          INTEGER REFERENCES zone(id) ON DELETE SET NULL,
  nom              VARCHAR(200) NOT NULL,
  type_equipement  VARCHAR(50),
  puissance_kw     NUMERIC(10,3),
  date_installation DATE,
  actif            BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Compteurs ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS compteur (
  id            SERIAL PRIMARY KEY,
  site_id       INTEGER NOT NULL REFERENCES site(id) ON DELETE CASCADE,
  equipement_id INTEGER REFERENCES equipement(id) ON DELETE SET NULL,
  nom           VARCHAR(200) NOT NULL,
  type_energie  VARCHAR(30) NOT NULL
                CHECK (type_energie IN ('electricite','gaz','eau','fioul','bois','autre')),
  type_compteur VARCHAR(20) NOT NULL DEFAULT 'physique'
                CHECK (type_compteur IN ('physique','virtuel')),
  unite         VARCHAR(20) DEFAULT 'kWh',
  reference     VARCHAR(100),
  actif         BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Relevés ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS releve (
  id          SERIAL PRIMARY KEY,
  compteur_id INTEGER NOT NULL REFERENCES compteur(id) ON DELETE CASCADE,
  valeur      NUMERIC(15,3) NOT NULL,
  date_releve TIMESTAMPTZ NOT NULL,
  source      VARCHAR(50) DEFAULT 'manuel'
              CHECK (source IN ('manuel','api','import','simulation')),
  import_id   INTEGER,
  valide      BOOLEAN DEFAULT TRUE,
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Règles d'alerte ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS regle_alerte (
  id          SERIAL PRIMARY KEY,
  site_id     INTEGER REFERENCES site(id) ON DELETE CASCADE,
  compteur_id INTEGER REFERENCES compteur(id) ON DELETE CASCADE,
  nom         VARCHAR(200) NOT NULL,
  type_regle  VARCHAR(30) NOT NULL
              CHECK (type_regle IN ('seuil_absolu','variation','comparaison')),
  condition   JSONB NOT NULL,
  niveau      VARCHAR(20) DEFAULT 'warning'
              CHECK (niveau IN ('info','warning','critical')),
  active      BOOLEAN DEFAULT TRUE,
  created_by  INTEGER REFERENCES utilisateur(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Alertes générées ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerte (
  id               SERIAL PRIMARY KEY,
  regle_id         INTEGER REFERENCES regle_alerte(id) ON DELETE SET NULL,
  site_id          INTEGER REFERENCES site(id) ON DELETE SET NULL,
  compteur_id      INTEGER REFERENCES compteur(id) ON DELETE SET NULL,
  message          TEXT NOT NULL,
  valeur_detectee  NUMERIC(15,3),
  seuil            NUMERIC(15,3),
  niveau           VARCHAR(20) DEFAULT 'warning'
                   CHECK (niveau IN ('info','warning','critical')),
  traitee          BOOLEAN DEFAULT FALSE,
  traitee_par      INTEGER REFERENCES utilisateur(id) ON DELETE SET NULL,
  traitee_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Journal d'imports ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS import_log (
  id                SERIAL PRIMARY KEY,
  nom_fichier       VARCHAR(255),
  type_import       VARCHAR(50) DEFAULT 'csv_releves',
  nb_lignes_total   INTEGER DEFAULT 0,
  nb_lignes_ok      INTEGER DEFAULT 0,
  nb_lignes_erreur  INTEGER DEFAULT 0,
  statut            VARCHAR(30) DEFAULT 'en_cours'
                    CHECK (statut IN ('en_cours','termine','erreur')),
  erreurs           JSONB,
  importe_par       INTEGER REFERENCES utilisateur(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Index ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_releve_compteur_date ON releve(compteur_id, date_releve DESC);
CREATE INDEX IF NOT EXISTS idx_releve_date          ON releve(date_releve DESC);
CREATE INDEX IF NOT EXISTS idx_compteur_site        ON compteur(site_id);
CREATE INDEX IF NOT EXISTS idx_alerte_traitee       ON alerte(traitee, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_actif           ON site(actif);
CREATE INDEX IF NOT EXISTS idx_regle_active         ON regle_alerte(active);

-- ─── Trigger updated_at ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_utilisateur_updated
  BEFORE UPDATE ON utilisateur
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_site_updated
  BEFORE UPDATE ON site
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_compteur_updated
  BEFORE UPDATE ON compteur
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_regle_updated
  BEFORE UPDATE ON regle_alerte
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;

-- EnergIO — Données de démonstration
-- Mot de passe pour tous les comptes : "password" (bcrypt hash ci-dessous)

BEGIN;

-- ─── Utilisateurs démo ──────────────────────────────────────────────────────
-- Hash bcrypt de "password" (cost 10) — généré avec bcryptjs
INSERT INTO utilisateur (nom, prenom, email, mot_de_passe, role) VALUES
  ('Martin',    'Sophie',   'admin@energio.fr',        '$2a$10$JqDoAz70CTWpxR1rSOwvj.oN/Mg6f.qRGB1zWGK8wPV5nyBo7wmhS', 'admin'),
  ('Dubois',    'Thomas',   'gestionnaire@energio.fr', '$2a$10$JqDoAz70CTWpxR1rSOwvj.oN/Mg6f.qRGB1zWGK8wPV5nyBo7wmhS', 'gestionnaire'),
  ('Legrand',   'Emma',     'utilisateur@energio.fr',  '$2a$10$JqDoAz70CTWpxR1rSOwvj.oN/Mg6f.qRGB1zWGK8wPV5nyBo7wmhS', 'utilisateur')
ON CONFLICT (email) DO NOTHING;

-- ─── Sites (bâtiments) ──────────────────────────────────────────────────────
INSERT INTO site (nom, adresse, ville, code_postal, surface, type_batiment, usage, annee_construction, gestionnaire_id) VALUES
  ('Siège Social',         '12 Rue de la Paix',        'Paris',      '75001', 2800.00, 'bureau',    'Bureaux administratifs',        1995, 2),
  ('Entrepôt Nord',        '45 Avenue de l''Industrie', 'Lyon',       '69009', 5200.00, 'technique', 'Stockage et logistique',        1982, 2),
  ('Médiathèque Centrale', '8 Place du Général',       'Bordeaux',   '33000', 1200.00, 'erp',       'Culture et documentation',      2003, 2),
  ('École Primaire Jean Jaurès', '3 Rue des Écoles',   'Toulouse',   '31000',  950.00, 'erp',       'Enseignement primaire',         1975, 2),
  ('Résidence Les Acacias', '20 Allée des Acacias',    'Nantes',     '44000', 3600.00, 'logement',  'Logements sociaux (48 appts)',  2008, 2)
ON CONFLICT DO NOTHING;

-- ─── Compteurs ──────────────────────────────────────────────────────────────
INSERT INTO compteur (site_id, nom, type_energie, type_compteur, unite, reference) VALUES
  -- Siège Social
  (1, 'Électricité générale',   'electricite', 'physique', 'kWh', 'ELEC-001-PARIS'),
  (1, 'Gaz chauffage',          'gaz',         'physique', 'kWh', 'GAZ-001-PARIS'),
  -- Entrepôt Nord
  (2, 'Électricité entrepôt',   'electricite', 'physique', 'kWh', 'ELEC-002-LYON'),
  (2, 'Fioul chaudière',        'fioul',       'physique', 'L',   'FIOUL-001-LYON'),
  -- Médiathèque
  (3, 'Électricité générale',   'electricite', 'physique', 'kWh', 'ELEC-003-BDX'),
  (3, 'Gaz chauffage',          'gaz',         'physique', 'kWh', 'GAZ-002-BDX'),
  -- École
  (4, 'Électricité générale',   'electricite', 'physique', 'kWh', 'ELEC-004-TLS'),
  (4, 'Gaz école',              'gaz',         'physique', 'kWh', 'GAZ-003-TLS'),
  -- Résidence
  (5, 'Électricité parties communes', 'electricite', 'physique', 'kWh', 'ELEC-005-NTE'),
  (5, 'Chauffage collectif',    'gaz',         'physique', 'kWh', 'GAZ-004-NTE')
ON CONFLICT DO NOTHING;

-- ─── Relevés — 18 mois de données historiques ────────────────────────────────
-- Génération de relevés mensuels réalistes pour chaque compteur
DO $$
DECLARE
  v_mois INTEGER;
  v_date TIMESTAMPTZ;
  v_base NUMERIC;
  v_variation NUMERIC;
  v_saison NUMERIC;
BEGIN
  -- Compteur 1 : Électricité Siège Social (~28 000 kWh/mois base)
  FOR v_mois IN 0..17 LOOP
    v_date := LEAST(DATE_TRUNC('month', NOW()) - (v_mois || ' months')::INTERVAL + INTERVAL '5 days', NOW() - INTERVAL '1 day');
    v_saison := CASE EXTRACT(MONTH FROM v_date)
      WHEN 1  THEN 1.4 WHEN 2  THEN 1.35 WHEN 3  THEN 1.15
      WHEN 4  THEN 0.95 WHEN 5  THEN 0.85 WHEN 6  THEN 0.90
      WHEN 7  THEN 0.80 WHEN 8  THEN 0.75 WHEN 9  THEN 0.90
      WHEN 10 THEN 1.05 WHEN 11 THEN 1.25 WHEN 12 THEN 1.45
      ELSE 1.0 END;
    v_variation := 0.9 + RANDOM() * 0.2;
    v_base := 28000 * v_saison * v_variation;
    INSERT INTO releve (compteur_id, valeur, date_releve, source)
    VALUES (1, ROUND(v_base::NUMERIC, 0), v_date, 'import') ON CONFLICT DO NOTHING;
  END LOOP;

  -- Compteur 2 : Gaz Siège Social (~18 000 kWh/mois hiver)
  FOR v_mois IN 0..17 LOOP
    v_date := LEAST(DATE_TRUNC('month', NOW()) - (v_mois || ' months')::INTERVAL + INTERVAL '5 days', NOW() - INTERVAL '1 day');
    v_saison := CASE EXTRACT(MONTH FROM v_date)
      WHEN 1  THEN 2.8 WHEN 2  THEN 2.6 WHEN 3  THEN 1.8
      WHEN 4  THEN 0.8 WHEN 5  THEN 0.3 WHEN 6  THEN 0.1
      WHEN 7  THEN 0.05 WHEN 8  THEN 0.05 WHEN 9  THEN 0.3
      WHEN 10 THEN 1.2 WHEN 11 THEN 2.0 WHEN 12 THEN 2.7
      ELSE 1.0 END;
    v_variation := 0.9 + RANDOM() * 0.2;
    v_base := 12000 * v_saison * v_variation;
    INSERT INTO releve (compteur_id, valeur, date_releve, source)
    VALUES (2, ROUND(v_base::NUMERIC, 0), v_date, 'import') ON CONFLICT DO NOTHING;
  END LOOP;

  -- Compteur 3 : Électricité Entrepôt (~45 000 kWh/mois)
  FOR v_mois IN 0..17 LOOP
    v_date := LEAST(DATE_TRUNC('month', NOW()) - (v_mois || ' months')::INTERVAL + INTERVAL '6 days', NOW() - INTERVAL '1 day');
    v_saison := CASE EXTRACT(MONTH FROM v_date)
      WHEN 1  THEN 1.3 WHEN 2  THEN 1.25 WHEN 3  THEN 1.1
      WHEN 4  THEN 0.95 WHEN 5  THEN 0.90 WHEN 6  THEN 0.95
      WHEN 7  THEN 1.1 WHEN 8  THEN 1.05 WHEN 9  THEN 1.0
      WHEN 10 THEN 1.05 WHEN 11 THEN 1.2 WHEN 12 THEN 1.35
      ELSE 1.0 END;
    v_variation := 0.88 + RANDOM() * 0.24;
    v_base := 45000 * v_saison * v_variation;
    INSERT INTO releve (compteur_id, valeur, date_releve, source)
    VALUES (3, ROUND(v_base::NUMERIC, 0), v_date, 'import') ON CONFLICT DO NOTHING;
  END LOOP;

  -- Compteur 4 : Fioul Entrepôt (~2000 L/mois hiver)
  FOR v_mois IN 0..17 LOOP
    v_date := LEAST(DATE_TRUNC('month', NOW()) - (v_mois || ' months')::INTERVAL + INTERVAL '6 days', NOW() - INTERVAL '1 day');
    v_saison := CASE EXTRACT(MONTH FROM v_date)
      WHEN 1  THEN 3.0 WHEN 2  THEN 2.8 WHEN 3  THEN 1.9
      WHEN 4  THEN 0.5 WHEN 5  THEN 0.1 WHEN 6  THEN 0.05
      WHEN 7  THEN 0.02 WHEN 8  THEN 0.02 WHEN 9  THEN 0.3
      WHEN 10 THEN 1.5 WHEN 11 THEN 2.2 WHEN 12 THEN 2.9
      ELSE 1.0 END;
    v_variation := 0.9 + RANDOM() * 0.2;
    v_base := 1200 * v_saison * v_variation;
    INSERT INTO releve (compteur_id, valeur, date_releve, source)
    VALUES (4, ROUND(v_base::NUMERIC, 1), v_date, 'import') ON CONFLICT DO NOTHING;
  END LOOP;

  -- Compteur 5 : Électricité Médiathèque (~9 000 kWh/mois)
  FOR v_mois IN 0..17 LOOP
    v_date := LEAST(DATE_TRUNC('month', NOW()) - (v_mois || ' months')::INTERVAL + INTERVAL '7 days', NOW() - INTERVAL '1 day');
    v_saison := CASE EXTRACT(MONTH FROM v_date)
      WHEN 1  THEN 1.35 WHEN 2  THEN 1.3 WHEN 3  THEN 1.1
      WHEN 4  THEN 0.9 WHEN 5  THEN 0.8 WHEN 6  THEN 0.85
      WHEN 7  THEN 0.6 WHEN 8  THEN 0.55 WHEN 9  THEN 0.85
      WHEN 10 THEN 1.05 WHEN 11 THEN 1.25 WHEN 12 THEN 1.4
      ELSE 1.0 END;
    v_variation := 0.92 + RANDOM() * 0.16;
    v_base := 9000 * v_saison * v_variation;
    INSERT INTO releve (compteur_id, valeur, date_releve, source)
    VALUES (5, ROUND(v_base::NUMERIC, 0), v_date, 'import') ON CONFLICT DO NOTHING;
  END LOOP;

  -- Compteur 6 : Gaz Médiathèque (~6 000 kWh/mois hiver)
  FOR v_mois IN 0..17 LOOP
    v_date := LEAST(DATE_TRUNC('month', NOW()) - (v_mois || ' months')::INTERVAL + INTERVAL '7 days', NOW() - INTERVAL '1 day');
    v_saison := CASE EXTRACT(MONTH FROM v_date)
      WHEN 1  THEN 3.2 WHEN 2  THEN 3.0 WHEN 3  THEN 2.0
      WHEN 4  THEN 0.6 WHEN 5  THEN 0.15 WHEN 6  THEN 0.05
      WHEN 7  THEN 0.02 WHEN 8  THEN 0.02 WHEN 9  THEN 0.35
      WHEN 10 THEN 1.4 WHEN 11 THEN 2.4 WHEN 12 THEN 3.1
      ELSE 1.0 END;
    v_variation := 0.88 + RANDOM() * 0.24;
    v_base := 5000 * v_saison * v_variation;
    INSERT INTO releve (compteur_id, valeur, date_releve, source)
    VALUES (6, ROUND(v_base::NUMERIC, 0), v_date, 'import') ON CONFLICT DO NOTHING;
  END LOOP;

  -- Compteur 7 : Électricité École (~6 500 kWh/mois — fermeture été)
  FOR v_mois IN 0..17 LOOP
    v_date := LEAST(DATE_TRUNC('month', NOW()) - (v_mois || ' months')::INTERVAL + INTERVAL '8 days', NOW() - INTERVAL '1 day');
    v_saison := CASE EXTRACT(MONTH FROM v_date)
      WHEN 1  THEN 1.4 WHEN 2  THEN 1.35 WHEN 3  THEN 1.2
      WHEN 4  THEN 1.1 WHEN 5  THEN 1.05 WHEN 6  THEN 0.9
      WHEN 7  THEN 0.2 WHEN 8  THEN 0.15 WHEN 9  THEN 1.0
      WHEN 10 THEN 1.2 WHEN 11 THEN 1.35 WHEN 12 THEN 0.7
      ELSE 1.0 END;
    v_variation := 0.92 + RANDOM() * 0.16;
    v_base := 6500 * v_saison * v_variation;
    INSERT INTO releve (compteur_id, valeur, date_releve, source)
    VALUES (7, ROUND(v_base::NUMERIC, 0), v_date, 'import') ON CONFLICT DO NOTHING;
  END LOOP;

  -- Compteur 8 : Gaz École
  FOR v_mois IN 0..17 LOOP
    v_date := LEAST(DATE_TRUNC('month', NOW()) - (v_mois || ' months')::INTERVAL + INTERVAL '8 days', NOW() - INTERVAL '1 day');
    v_saison := CASE EXTRACT(MONTH FROM v_date)
      WHEN 1  THEN 3.5 WHEN 2  THEN 3.2 WHEN 3  THEN 2.2
      WHEN 4  THEN 1.0 WHEN 5  THEN 0.4 WHEN 6  THEN 0.1
      WHEN 7  THEN 0.0 WHEN 8  THEN 0.0 WHEN 9  THEN 0.5
      WHEN 10 THEN 1.8 WHEN 11 THEN 2.8 WHEN 12 THEN 1.5
      ELSE 1.0 END;
    v_variation := 0.88 + RANDOM() * 0.24;
    v_base := 4000 * v_saison * v_variation;
    INSERT INTO releve (compteur_id, valeur, date_releve, source)
    VALUES (8, ROUND(v_base::NUMERIC, 0), v_date, 'import') ON CONFLICT DO NOTHING;
  END LOOP;

  -- Compteur 9 : Électricité Résidence (parties communes ~8 000 kWh/mois)
  FOR v_mois IN 0..17 LOOP
    v_date := LEAST(DATE_TRUNC('month', NOW()) - (v_mois || ' months')::INTERVAL + INTERVAL '9 days', NOW() - INTERVAL '1 day');
    v_saison := CASE EXTRACT(MONTH FROM v_date)
      WHEN 1  THEN 1.25 WHEN 2  THEN 1.2 WHEN 3  THEN 1.05
      WHEN 4  THEN 0.95 WHEN 5  THEN 0.85 WHEN 6  THEN 0.90
      WHEN 7  THEN 0.85 WHEN 8  THEN 0.80 WHEN 9  THEN 0.90
      WHEN 10 THEN 1.0 WHEN 11 THEN 1.15 WHEN 12 THEN 1.30
      ELSE 1.0 END;
    v_variation := 0.92 + RANDOM() * 0.16;
    v_base := 8000 * v_saison * v_variation;
    INSERT INTO releve (compteur_id, valeur, date_releve, source)
    VALUES (9, ROUND(v_base::NUMERIC, 0), v_date, 'import') ON CONFLICT DO NOTHING;
  END LOOP;

  -- Compteur 10 : Gaz Résidence chauffage collectif
  FOR v_mois IN 0..17 LOOP
    v_date := LEAST(DATE_TRUNC('month', NOW()) - (v_mois || ' months')::INTERVAL + INTERVAL '9 days', NOW() - INTERVAL '1 day');
    v_saison := CASE EXTRACT(MONTH FROM v_date)
      WHEN 1  THEN 3.4 WHEN 2  THEN 3.1 WHEN 3  THEN 2.1
      WHEN 4  THEN 0.8 WHEN 5  THEN 0.2 WHEN 6  THEN 0.05
      WHEN 7  THEN 0.02 WHEN 8  THEN 0.02 WHEN 9  THEN 0.4
      WHEN 10 THEN 1.6 WHEN 11 THEN 2.5 WHEN 12 THEN 3.2
      ELSE 1.0 END;
    v_variation := 0.88 + RANDOM() * 0.24;
    v_base := 15000 * v_saison * v_variation;
    INSERT INTO releve (compteur_id, valeur, date_releve, source)
    VALUES (10, ROUND(v_base::NUMERIC, 0), v_date, 'import') ON CONFLICT DO NOTHING;
  END LOOP;

  -- Anomalie simulée : pic de consommation sur Siège Social il y a 3 mois
  INSERT INTO releve (compteur_id, valeur, date_releve, source, note)
  VALUES (1, 52000, DATE_TRUNC('month', NOW()) - INTERVAL '3 months' + INTERVAL '15 days',
          'manuel', 'Anomalie détectée — probable fuite ou dysfonctionnement clim')
  ON CONFLICT DO NOTHING;

END $$;

-- ─── Règles d'alerte ────────────────────────────────────────────────────────
INSERT INTO regle_alerte (site_id, compteur_id, nom, type_regle, condition, niveau, created_by) VALUES
  (1, 1, 'Seuil électricité Siège >45 000 kWh', 'seuil_absolu',
   '{"seuil": 45000, "periode": "mensuelle"}', 'warning', 2),
  (2, 3, 'Seuil électricité Entrepôt >65 000 kWh', 'seuil_absolu',
   '{"seuil": 65000, "periode": "mensuelle"}', 'critical', 2),
  (NULL, NULL, 'Variation mensuelle >30% tout site', 'variation',
   '{"seuil_pct": 30, "periode": "mensuel"}', 'warning', 2),
  (1, 1, 'Comparaison défavorable vs mois N-1', 'comparaison',
   '{"delta_pct": 20, "periode_ref": "mois_precedent"}', 'info', 2)
ON CONFLICT DO NOTHING;

-- ─── Alertes d'exemple ──────────────────────────────────────────────────────
INSERT INTO alerte (regle_id, site_id, compteur_id, message, valeur_detectee, seuil, niveau) VALUES
  (1, 1, 1, 'Consommation électrique Siège Social dépasse 45 000 kWh ce mois',
   52000, 45000, 'warning'),
  (3, 2, 3, 'Variation mensuelle +35% détectée sur Entrepôt Nord',
   60750, 45000, 'warning')
ON CONFLICT DO NOTHING;

COMMIT;

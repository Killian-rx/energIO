-- Suppression des tables zone et equipement (jamais implémentées)
-- La hiérarchie site → compteur est suffisante pour le périmètre fonctionnel

BEGIN;

ALTER TABLE compteur DROP COLUMN IF EXISTS equipement_id;
DROP TABLE IF EXISTS equipement CASCADE;
DROP TABLE IF EXISTS zone CASCADE;

COMMIT;

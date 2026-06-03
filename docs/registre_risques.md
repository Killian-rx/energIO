# Registre des risques — EnergIO

## Grille d'évaluation

- **Probabilité** : 1 (rare) → 5 (quasi-certain)
- **Impact** : 1 (négligeable) → 5 (critique)
- **Criticité** = Probabilité × Impact

---

## Risques identifiés

### R01 — Données de relevés erronées ou manquantes
| Attribut     | Valeur |
|--------------|--------|
| Probabilité  | 4 |
| Impact       | 4 |
| Criticité    | 16 — **Élevé** |
| Description  | Un agent saisit une valeur erronée (transposition, mauvaise unité) ou oublie un relevé. |
| Conséquences | Indicateurs faux, alertes parasites ou manquées, décisions incorrectes. |
| Prévention   | Validation automatique à l'import (format, plage acceptable), flag `valide=FALSE` pour correction sans perte de traçabilité, z-score pour détection a posteriori. |
| Responsable  | Gestionnaire de site |

---

### R02 — Indisponibilité de la base de données
| Attribut     | Valeur |
|--------------|--------|
| Probabilité  | 2 |
| Impact       | 5 |
| Criticité    | 10 — **Moyen** |
| Description  | La base PostgreSQL devient inaccessible (panne serveur, espace disque plein, connexion perdue). |
| Conséquences | Application totalement inopérante. |
| Prévention   | Pool de connexions pg avec `connectionTimeoutMillis`, backups automatiques PostgreSQL, monitoring service (pg_isready), variable `actif` évite la suppression physique. |
| Responsable  | Administrateur système |

---

### R03 — Volumétrie des données historiques
| Attribut     | Valeur |
|--------------|--------|
| Probabilité  | 3 |
| Impact       | 3 |
| Criticité    | 9 — **Moyen** |
| Description  | Accumulation de millions de relevés sur plusieurs années ralentit les requêtes d'agrégation. |
| Conséquences | Dégradation des performances, timeouts API. |
| Prévention   | Index sur `(compteur_id, date_releve DESC)` et `date_releve`, pagination des endpoints, agrégation SQL côté serveur (SUM avec GROUP BY), planification d'une stratégie d'archivage après 3 ans. |
| Responsable  | Développeur / DBA |

---

### R04 — Usurpation de session / JWT compromis
| Attribut     | Valeur |
|--------------|--------|
| Probabilité  | 2 |
| Impact       | 5 |
| Criticité    | 10 — **Moyen** |
| Description  | Un attaquant obtient un token JWT valide (XSS, log, partage). |
| Conséquences | Accès non autorisé aux données, modification de règles, export de données. |
| Prévention   | Durée de vie limitée à 8h, stockage en localStorage (pas de cookie tiers), HTTPS obligatoire en production, CORS restrictif, token invalidable par changement de secret. |
| Responsable  | Développeur / RSSI |

---

### R05 — Import malveillant (injection CSV)
| Attribut     | Valeur |
|--------------|--------|
| Probabilité  | 2 |
| Impact       | 3 |
| Criticité    | 6 — **Faible** |
| Description  | Un fichier CSV contient des formules (`=CMD()`) ou des données SQL injectées. |
| Conséquences | Données corrompues, risque XSS si les valeurs sont affichées non-échappées. |
| Prévention   | Validation de type (float) sur toutes les valeurs, requêtes paramétrées PostgreSQL ($1...$n), React échappe automatiquement l'affichage, limite taille 5 Mo. |
| Responsable  | Développeur |

---

### R06 — Mauvaise interprétation des indicateurs
| Attribut     | Valeur |
|--------------|--------|
| Probabilité  | 3 |
| Impact       | 3 |
| Criticité    | 9 — **Moyen** |
| Description  | Un utilisateur prend une décision basée sur un indicateur mal compris (ex : confusion kWh vs kWh/m²). |
| Conséquences | Investissements injustifiés, optimisations manquées. |
| Prévention   | Libellés explicites dans l'interface, unités toujours affichées, documentation utilisateur, formation lors du déploiement. |
| Responsable  | Chef de projet / Formateur |

---

### R07 — Dépendance à un fournisseur externe (API énergie)
| Attribut     | Valeur |
|--------------|--------|
| Probabilité  | 2 |
| Impact       | 3 |
| Criticité    | 6 — **Faible** |
| Description  | L'API d'un prestataire énergétique change de format ou devient indisponible. |
| Conséquences | Import automatique en échec, données obsolètes. |
| Prévention   | Fallback sur import CSV manuel, table de correspondance (reference) découple le format externe du modèle interne, journal import_log pour traçabilité. |
| Responsable  | Gestionnaire / Développeur |

---

### R08 — Non-conformité RGPD
| Attribut     | Valeur |
|--------------|--------|
| Probabilité  | 2 |
| Impact       | 4 |
| Criticité    | 8 — **Moyen** |
| Description  | Les données personnelles des utilisateurs (email, nom) ne sont pas protégées conformément au RGPD. |
| Conséquences | Sanctions CNIL, atteinte à la réputation. |
| Prévention   | Seules les données nécessaires sont collectées (minimisation), mot de passe haché, droits CRUD admin sur les comptes (droit à l'oubli : soft-delete), accès restreint par rôle. |
| Responsable  | DPO / Admin |

---

## Matrice de criticité

|          | Impact 1 | Impact 2 | Impact 3 | Impact 4 | Impact 5 |
|----------|----------|----------|----------|----------|----------|
| **P=5**  |    5     |   10     | **15**   | **20**   | **25**   |
| **P=4**  |    4     |    8     | **12**   | **R01**  | **20**   |
| **P=3**  |    3     |    6     | **R03,R06** | **12** | **15** |
| **P=2**  |    2     |    4     | **R05,R07** | **R08** | **R02,R04** |
| **P=1**  |    1     |    2     |    3     |    4     |    5     |

**Légende** : ≥15 = Critique | 8-14 = Élevé | 4-7 = Moyen | <4 = Faible

# Dictionnaire de données — EnergIO

## Classification des données

| Type              | Définition                                              |
|-------------------|---------------------------------------------------------|
| **Source**        | Données brutes reçues de sources externes (CSV, API)    |
| **Interne**       | Données créées et gérées par la plateforme              |
| **Calculée**      | Dérivée d'autres données par algorithme                 |
| **Diffusée**      | Données produites pour consultation ou export           |

---

## Table : `utilisateur`

| Colonne       | Type        | Classe   | Description                                    | Contraintes               |
|---------------|-------------|----------|------------------------------------------------|---------------------------|
| id            | SERIAL      | Interne  | Identifiant unique                             | PK                        |
| nom           | VARCHAR(100)| Interne  | Nom de famille                                 | NOT NULL                  |
| prenom        | VARCHAR(100)| Interne  | Prénom                                         | NOT NULL                  |
| email         | VARCHAR(255)| Interne  | Adresse email (login)                          | UNIQUE, NOT NULL          |
| mot_de_passe  | VARCHAR(255)| Interne  | Hash bcrypt (jamais diffusé)                   | NOT NULL                  |
| role          | VARCHAR(20) | Interne  | Rôle RBAC : admin/gestionnaire/utilisateur     | CHECK, NOT NULL           |
| actif         | BOOLEAN     | Interne  | Soft-delete — compte désactivable              | DEFAULT TRUE              |
| created_at    | TIMESTAMPTZ | Interne  | Date de création                               | DEFAULT NOW()             |
| updated_at    | TIMESTAMPTZ | Interne  | Date de dernière modification                  | trigger set_updated_at    |

---

## Table : `site`

| Colonne              | Type         | Classe   | Description                              | Contraintes                |
|----------------------|--------------|----------|------------------------------------------|----------------------------|
| id                   | SERIAL       | Interne  | Identifiant unique du bâtiment           | PK                         |
| nom                  | VARCHAR(200) | Interne  | Désignation du bâtiment                  | NOT NULL                   |
| adresse              | TEXT         | Interne  | Adresse postale complète                 |                            |
| ville                | VARCHAR(100) | Interne  | Commune                                  |                            |
| code_postal          | VARCHAR(10)  | Interne  | Code postal                              |                            |
| surface              | NUMERIC(10,2)| Source   | Surface SHON en m²                       |                            |
| type_batiment        | VARCHAR(50)  | Interne  | bureau/erp/technique/logement/autre      | CHECK                      |
| usage                | VARCHAR(100) | Interne  | Description de l'usage réel              |                            |
| annee_construction   | INTEGER      | Source   | Année de construction                    |                            |
| gestionnaire_id      | INTEGER      | Interne  | Référence vers l'utilisateur gestionnaire| FK utilisateur             |
| actif                | BOOLEAN      | Interne  | Site actif ou archivé                    |                            |

---

## Table : `compteur`

| Colonne       | Type         | Classe   | Description                                         | Contraintes         |
|---------------|--------------|----------|-----------------------------------------------------|---------------------|
| id            | SERIAL       | Interne  | Identifiant du compteur                             | PK                  |
| site_id       | INTEGER      | Interne  | Bâtiment associé                                    | FK site, NOT NULL   |
| equipement_id | INTEGER      | Interne  | Équipement associé (optionnel)                      | FK equipement       |
| nom           | VARCHAR(200) | Interne  | Libellé du compteur                                 | NOT NULL            |
| type_energie  | VARCHAR(30)  | Interne  | electricite/gaz/eau/fioul/bois/autre                | CHECK, NOT NULL     |
| type_compteur | VARCHAR(20)  | Interne  | physique ou virtuel                                 | CHECK               |
| unite         | VARCHAR(20)  | Interne  | Unité de mesure (kWh, L, m³...)                     | DEFAULT 'kWh'       |
| reference     | VARCHAR(100) | Source   | Code interne fournisseur — clé d'import CSV         |                     |
| actif         | BOOLEAN      | Interne  | Compteur actif ou archivé                           |                     |

---

## Table : `releve`

| Colonne      | Type           | Classe   | Description                                      | Contraintes             |
|--------------|----------------|----------|--------------------------------------------------|-------------------------|
| id           | SERIAL         | Interne  | Identifiant du relevé                            | PK                      |
| compteur_id  | INTEGER        | Interne  | Compteur mesuré                                  | FK compteur, NOT NULL   |
| valeur       | NUMERIC(15,3)  | Source   | Valeur mesurée dans l'unité du compteur          | NOT NULL                |
| date_releve  | TIMESTAMPTZ    | Source   | Horodatage du relevé (heure du mesure)           | NOT NULL                |
| source       | VARCHAR(50)    | Interne  | manuel/api/import/simulation                     | CHECK                   |
| import_id    | INTEGER        | Interne  | Référence au lot d'import si applicable          |                         |
| valide       | BOOLEAN        | Interne  | Permet d'invalider logiquement sans supprimer    | DEFAULT TRUE            |
| note         | TEXT           | Source   | Commentaire libre du saisie                      |                         |
| created_at   | TIMESTAMPTZ    | Interne  | Date d'enregistrement en base                   |                         |

---

## Table : `regle_alerte`

| Colonne     | Type         | Classe   | Description                                           | Contraintes       |
|-------------|--------------|----------|-------------------------------------------------------|-------------------|
| id          | SERIAL       | Interne  | Identifiant de la règle                               | PK                |
| site_id     | INTEGER      | Interne  | Bâtiment cible (null = tous)                          | FK site           |
| compteur_id | INTEGER      | Interne  | Compteur cible (null = tous)                          | FK compteur       |
| nom         | VARCHAR(200) | Interne  | Libellé descriptif de la règle                        | NOT NULL          |
| type_regle  | VARCHAR(30)  | Interne  | seuil_absolu / variation / comparaison                | CHECK, NOT NULL   |
| condition   | JSONB        | Interne  | Paramètres de la règle (seuil, seuil_pct, delta_pct)  | NOT NULL          |
| niveau      | VARCHAR(20)  | Interne  | Sévérité : info / warning / critical                  | CHECK             |
| active      | BOOLEAN      | Interne  | Règle activée ou non                                  | DEFAULT TRUE      |
| created_by  | INTEGER      | Interne  | Utilisateur créateur                                  | FK utilisateur    |

---

## Table : `alerte`

| Colonne         | Type          | Classe    | Description                                        |
|-----------------|---------------|-----------|----------------------------------------------------|
| id              | SERIAL        | Calculée  | Identifiant généré lors de la détection            |
| regle_id        | INTEGER       | Interne   | Règle qui a déclenché l'alerte                     |
| message         | TEXT          | Calculée  | Message formaté décrivant l'événement              |
| valeur_detectee | NUMERIC(15,3) | Calculée  | Valeur qui a causé le déclenchement                |
| seuil           | NUMERIC(15,3) | Calculée  | Valeur seuil de la règle                           |
| niveau          | VARCHAR(20)   | Calculée  | Hérité de la règle                                 |
| traitee         | BOOLEAN       | Interne   | Marquage de traitement par un gestionnaire         |
| created_at      | TIMESTAMPTZ   | Calculée  | Horodatage de détection                            |

---

## Données calculées produites (API `/indicateurs`)

| Indicateur                | Algorithme                              | Unité       |
|---------------------------|-----------------------------------------|-------------|
| Consommation normalisée   | SUM(valeur) / surface                   | kWh/m²      |
| Variation mensuelle       | (V_n - V_{n-1}) / V_{n-1} × 100        | %           |
| Tendance (régression)     | Moindres carrés sur 12 points           | kWh/mois    |
| Anomalie (z-score)        | (v - µ) / σ > 2                         | sans unité  |
| Classement sites          | Tri croissant par kWh/m²               | rang        |

---

## Circulation des données

```
Source externe (CSV, API, saisie)
        │
        ▼
    [Import / Saisie]
    releve (source = import/manuel/api)
        │
        ▼
    [Calcul indicateurs]
    indicateurService → résultats API /indicateurs
        │
        ▼
    [Évaluation règles]
    regleService + alerteService → alerte (si déclenchée)
        │
        ▼
    [Consultation / Export]
    API /alertes, /indicateurs → Frontend + CSV export
```

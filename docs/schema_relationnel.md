## MCD — Modèle Conceptuel de Données

```
                        ┌─────────────────────┐
                        │    UTILISATEUR      │
                        │─────────────────────│
                        │ nom                 │
                        │ prenom              │
                        │ email               │
                        │ mot_de_passe        │
                        │ role                │
                        │ actif               │
                        └──────────┬──────────┘
                                   │
               ┌───────────────────┼───────────────────────┐
               │ gère (0,n)        │ crée (0,n)            │ traite (0,n)
               │                   │                       │
               ▼ (0,1)             ▼ (0,1)                 ▼ (0,1)
    ┌──────────────────┐  ┌──────────────────┐   ┌──────────────────┐
    │      SITE        │  │  REGLE_ALERTE    │   │     ALERTE       │
    │──────────────────│  │──────────────────│   │──────────────────│
    │ nom              │  │ nom              │   │ message          │
    │ adresse          │  │ type_regle       │   │ valeur_detectee  │
    │ ville            │  │ condition (JSON) │   │ seuil            │
    │ code_postal      │  │ niveau           │   │ niveau           │
    │ surface          │  │ active           │   │ traitee          │
    │ type_batiment    │  └────────┬─────────┘   │ traitee_at       │
    │ usage            │           │             └────────┬─────────┘
    │ annee_const.     │           │                      │
    └───────┬──────────┘           │                      │
            │                      │ déclenche (0,n)      │
            │ possède (1,n)        │                      │
            │                      │                      │
    ┌───────▼──────────────────────▼───────────────────────▼───┐
    │                      COMPTEUR                            │
    │──────────────────────────────────────────────────────────│
    │ nom              │ type_energie    │ type_compteur       │
    │ unite            │ reference       │ actif               │
    └───────────────────────────┬──────────────────────────────┘
                                │
                                │ enregistre (1,n)
                                │
                   ┌────────────▼────────────┐
                   │         RELEVE          │
                   │─────────────────────────│
                   │ valeur                  │
                   │ date_releve             │
                   │ source                  │
                   │ valide                  │
                   │ note                    │
                   └────────────┬────────────┘
                                │
                                │ issu de (0,1)
                                │
                   ┌────────────▼────────────┐
                   │       IMPORT_LOG        │
                   │─────────────────────────│
                   │ nom_fichier             │
                   │ type_import             │
                   │ nb_lignes_total         │
                   │ nb_lignes_ok            │
                   │ nb_lignes_erreur        │
                   │ statut                  │
                   │ erreurs (JSON)          │
                   └─────────────────────────┘
```

### Cardinalités résumées

| Association           | Entité A        | Card. A | Card. B | Entité B       |
|-----------------------|-----------------|---------|---------|----------------|
| gère                  | UTILISATEUR     | (0,n)   | (0,1)   | SITE           |
| crée                  | UTILISATEUR     | (0,n)   | (0,1)   | REGLE_ALERTE   |
| traite                | UTILISATEUR     | (0,n)   | (0,1)   | ALERTE         |
| importe               | UTILISATEUR     | (0,n)   | (0,1)   | IMPORT_LOG     |
| possède               | SITE            | (1,n)   | (1,1)   | COMPTEUR       |
| enregistre            | COMPTEUR        | (1,n)   | (1,1)   | RELEVE         |
| issu de               | RELEVE          | (0,n)   | (0,1)   | IMPORT_LOG     |
| surveille (site)      | REGLE_ALERTE    | (0,n)   | (0,1)   | SITE           |
| surveille (compteur)  | REGLE_ALERTE    | (0,n)   | (0,1)   | COMPTEUR       |
| déclenche             | REGLE_ALERTE    | (0,n)   | (0,1)   | ALERTE         |
| concerne (site)       | ALERTE          | (0,n)   | (0,1)   | SITE           |
| concerne (compteur)   | ALERTE          | (0,n)   | (0,1)   | COMPTEUR       |

---

## MLD — Modèle Logique de Données

> Convention : **PK** = clé primaire · **FK** = clé étrangère · souligné = clé primaire

```
UTILISATEUR (
    id              PK  SERIAL,
    nom             VARCHAR(100)    NOT NULL,
    prenom          VARCHAR(100)    NOT NULL,
    email           VARCHAR(255)    NOT NULL  UNIQUE,
    mot_de_passe    VARCHAR(255)    NOT NULL,
    role            VARCHAR(20)     NOT NULL  {admin, gestionnaire, utilisateur},
    actif           BOOLEAN         DEFAULT TRUE,
    created_at      TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ
)

SITE (
    id                  PK  SERIAL,
    nom                 VARCHAR(200)    NOT NULL,
    adresse             TEXT,
    ville               VARCHAR(100),
    code_postal         VARCHAR(10),
    surface             NUMERIC(10,2),
    type_batiment       VARCHAR(50)     {bureau, erp, technique, logement, autre},
    usage               VARCHAR(100),
    annee_construction  INTEGER,
    gestionnaire_id     FK → UTILISATEUR(id),
    actif               BOOLEAN,
    created_at          TIMESTAMPTZ,
    updated_at          TIMESTAMPTZ
)

COMPTEUR (
    id              PK  SERIAL,
    site_id         FK → SITE(id)           NOT NULL,
    nom             VARCHAR(200)            NOT NULL,
    type_energie    VARCHAR(30)             NOT NULL  {electricite, gaz, eau, fioul, bois, autre},
    type_compteur   VARCHAR(20)             {physique, virtuel},
    unite           VARCHAR(20)             DEFAULT 'kWh',
    reference       VARCHAR(100),
    actif           BOOLEAN,
    created_at      TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ
)

RELEVE (
    id              PK  SERIAL,
    compteur_id     FK → COMPTEUR(id)   NOT NULL,
    valeur          NUMERIC(15,3)       NOT NULL,
    date_releve     TIMESTAMPTZ         NOT NULL,
    source          VARCHAR(50)         {manuel, api, import, simulation},
    import_id       FK → IMPORT_LOG(id),
    valide          BOOLEAN             DEFAULT TRUE,
    note            TEXT,
    created_at      TIMESTAMPTZ
)

IMPORT_LOG (
    id                  PK  SERIAL,
    nom_fichier         VARCHAR(255),
    type_import         VARCHAR(50),
    nb_lignes_total     INTEGER,
    nb_lignes_ok        INTEGER,
    nb_lignes_erreur    INTEGER,
    statut              VARCHAR(30)     {en_cours, termine, erreur},
    erreurs             JSONB,
    importe_par         FK → UTILISATEUR(id),
    created_at          TIMESTAMPTZ
)

REGLE_ALERTE (
    id              PK  SERIAL,
    site_id         FK → SITE(id),
    compteur_id     FK → COMPTEUR(id),
    nom             VARCHAR(200)    NOT NULL,
    type_regle      VARCHAR(30)     NOT NULL  {seuil_absolu, variation, comparaison},
    condition       JSONB           NOT NULL,
    niveau          VARCHAR(20)     {info, warning, critical},
    active          BOOLEAN         DEFAULT TRUE,
    created_by      FK → UTILISATEUR(id),
    created_at      TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ
)

ALERTE (
    id              PK  SERIAL,
    regle_id        FK → REGLE_ALERTE(id),
    site_id         FK → SITE(id),
    compteur_id     FK → COMPTEUR(id),
    message         TEXT            NOT NULL,
    valeur_detectee NUMERIC(15,3),
    seuil           NUMERIC(15,3),
    niveau          VARCHAR(20)     {info, warning, critical},
    traitee         BOOLEAN         DEFAULT FALSE,
    traitee_par     FK → UTILISATEUR(id),
    traitee_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ
)
```

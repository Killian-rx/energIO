# EnergIO

**Plateforme web de gestion et de suivi énergétique multi-sites** — projet fil rouge (RNCP 36463 — Concepteur Développeur d'Applications).

EnergIO permet à des gestionnaires de parc immobilier de centraliser le suivi des consommations d'énergie (électricité, gaz, eau, fioul, bois) de plusieurs bâtiments, d'analyser les tendances, de détecter les anomalies et d'être alerté automatiquement en cas de dérive.

---

## Fonctionnalités

- **Authentification & rôles** — connexion par JWT avec trois niveaux d'accès : `admin`, `gestionnaire`, `utilisateur`. Chaque route et chaque page est protégée selon le rôle minimum requis.
- **Gestion des sites** — création et suivi des bâtiments (surface, type, usage, année de construction, gestionnaire attitré).
- **Gestion des compteurs** — compteurs physiques ou virtuels rattachés à un site, par type d'énergie et unité.
- **Relevés** — saisie manuelle, import CSV ou génération par simulation.
- **Simulation temps réel** — les compteurs peuvent générer des relevés réalistes en continu (profils horaires jour/nuit, saisonnalité, bruit et pics aléatoires), avec intervalle et durée de rétention configurables.
- **Tableau de bord & indicateurs**
  - Synthèse globale (consommation du mois, variation vs mois précédent, nombre de sites / compteurs / alertes).
  - Courbes d'évolution multi-périodes (1h à 24 mois) avec **tendance par régression linéaire**.
  - Consommation **normalisée par surface** (kWh/m²) et classement des sites.
  - **Détection d'anomalies** par z-score et analyse de tendances par compteur.
- **Règles d'alerte** — trois types configurables : seuil absolu, variation en %, comparaison. Évaluation automatique toutes les heures et après chaque import.
- **Alertes** — journal des alertes déclenchées, avec suivi de traitement.
- **Import / Export CSV** — import de relevés (avec template téléchargeable, validation ligne à ligne et journal d'import), export filtrable par période et par site.
- **Gestion des utilisateurs** — administration des comptes (réservée aux admins).

---

## Stack technique

| Couche       | Technologies |
|--------------|--------------|
| **Frontend** | React 18, Vite 6, React Router 7, Tailwind CSS, Recharts, Axios, Lucide |
| **Backend**  | Node.js, Express 4, JWT, bcryptjs, express-validator, Multer, csv-parse |
| **Base de données** | PostgreSQL |
| **Tests**    | Jest + Supertest (backend), Vitest + Testing Library (frontend) |

---

## Architecture

```
energIO/
├── backend/
│   ├── migrations/        # Schéma SQL + données de démonstration
│   ├── src/
│   │   ├── config/        # Connexion PostgreSQL
│   │   ├── middleware/    # Auth JWT & contrôle des rôles
│   │   ├── routes/        # Endpoints REST (auth, sites, compteurs, relevés,
│   │   │                  #   indicateurs, règles, alertes, import, utilisateurs)
│   │   ├── services/      # Logique métier (indicateurs, règles, alertes, simulation)
│   │   └── index.js       # Point d'entrée de l'API
│   └── tests/             # Tests unitaires des services et middlewares
├── frontend/
│   └── src/
│       ├── api/           # Client HTTP
│       ├── components/    # Layout, routes protégées
│       ├── contexts/      # Contexte d'authentification
│       └── pages/         # Pages de l'application
└── docs/                  # Modélisation (MCD / MLD)
```

---

## Installation

### Prérequis

- Node.js 18+
- PostgreSQL 14+

### 1. Base de données

Créer la base et l'utilisateur, puis appliquer le schéma et les données de démo :

```bash
cd backend
psql -U energio_app -d energie_db -f migrations/001_schema.sql
psql -U energio_app -d energie_db -f migrations/002_seed.sql
psql -U energio_app -d energie_db -f migrations/003_remove_zone_equipement.sql
```

### 2. Backend

```bash
cd backend
npm install
```

Créer un fichier `.env` dans `backend/` :

```env
PORT=4010
DB_HOST=localhost
DB_PORT=5432
DB_NAME=energie_db
DB_USER=energio_app
DB_PASSWORD=votre_mot_de_passe
JWT_SECRET=une_chaine_secrete_longue_et_aleatoire
JWT_EXPIRES_IN=8h
```

Lancer l'API :

```bash
npm run dev     # avec rechargement à chaud (nodemon)
# ou
npm start
```

L'API démarre sur `http://localhost:4010` (vérifier avec `GET /health`).

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

L'interface est servie sur `http://localhost:8080`.

---

## Comptes de démonstration

Les données de démo créent trois comptes (mot de passe commun : `password`) :

| Rôle          | Email                      |
|---------------|----------------------------|
| Admin         | `admin@energio.fr`         |
| Gestionnaire  | `gestionnaire@energio.fr`  |
| Utilisateur   | `utilisateur@energio.fr`   |

> Le jeu de démonstration inclut 5 sites, 10 compteurs, 18 mois de relevés, des règles d'alerte et une anomalie simulée.

---

## Tests

```bash
# Backend (Jest + couverture)
cd backend
npm test

# Frontend (Vitest)
cd frontend
npm test
```

---

## Aperçu de l'API

| Ressource      | Base d'URL        | Description |
|----------------|-------------------|-------------|
| Authentification | `/auth`         | Connexion, création de compte (admin), profil courant |
| Sites          | `/sites`          | CRUD des bâtiments |
| Compteurs      | `/compteurs`      | CRUD + pilotage de la simulation |
| Relevés        | `/releves`        | Saisie et consultation des relevés |
| Indicateurs    | `/indicateurs`    | Synthèse, évolution, normalisation, anomalies, tendances |
| Règles         | `/regles`         | Configuration des règles d'alerte |
| Alertes        | `/alertes`        | Consultation et traitement des alertes |
| Import / Export| `/import`         | Import/export CSV, template, historique |
| Utilisateurs   | `/utilisateurs`   | Gestion des comptes (admin) |

---

## Modélisation des données

Le modèle conceptuel et logique de données (MCD / MLD) est documenté dans [`docs/schema_relationnel.md`](docs/schema_relationnel.md).

Entités principales : `utilisateur`, `site`, `compteur`, `releve`, `import_log`, `regle_alerte`, `alerte`.

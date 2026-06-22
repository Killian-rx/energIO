# Architecture applicative sécurisée — EnergIO

## 1. Vue d'ensemble

EnergIO est structurée en **architecture trois tiers** avec séparation stricte des responsabilités :

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (Navigateur)                       │
│  React 18 + Vite + TailwindCSS + Recharts                   │
│  Port 8080 | SPA, routes protégées par rôle                 │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP/JSON (Axios)
                            │ Bearer JWT
┌───────────────────────────▼─────────────────────────────────┐
│                  API REST (Node.js + Express)                 │
│  Port 4010 | Middleware : CORS, Auth JWT, Rôles              │
│  Routes : /auth /sites /compteurs /releves                   │
│           /indicateurs /regles /alertes /import              │
│  Services métier : indicateurService, regleService           │
│                    alerteService                             │
└───────────────────────────┬─────────────────────────────────┘
                            │ pg (Pool)
┌───────────────────────────▼─────────────────────────────────┐
│              Base de données PostgreSQL 14+                  │
│  Base : energie_db | Utilisateur applicatif : energio_app   │
│  Tables : utilisateur, site, compteur, releve,               │
│           regle_alerte, alerte, import_log                   │
└─────────────────────────────────────────────────────────────┘
```

## 2. Couches applicatives

### 2.1 Présentation (Frontend)
- **Framework** : React 18 avec hooks (useState, useEffect, useCallback)
- **Routage** : React Router v7 avec guards basés sur les rôles
- **Style** : Tailwind CSS — composants réutilisables (`.card`, `.btn`, `.badge`)
- **Graphiques** : Recharts (LineChart, BarChart)
- **Requêtes HTTP** : Axios avec intercepteurs JWT et gestion des 401

### 2.2 Logique applicative (Backend)
- **Framework** : Express.js 4.x
- **Authentification** : JWT (jsonwebtoken) — payload : `{id, email, role, nom, prenom}`
- **Hachage** : bcryptjs (cost factor 10)
- **Validation** : express-validator sur toutes les entrées
- **Import fichiers** : multer (mémoire, 5 Mo max) + csv-parse
- **Services purs** : indicateurService.js, regleService.js (testables sans DB)

### 2.3 Persistance (Base de données)
- **SGBD** : PostgreSQL 14+
- **Client** : pg (Pool de connexions, max 10)
- **Triggers** : `set_updated_at()` sur les tables mutables
- **Index** : sur les jointures fréquentes et les requêtes temporelles

## 3. Sécurité

### 3.1 Authentification
- Tokens JWT signés (HS256), durée 8 heures
- Mot de passe haché bcrypt — jamais stocké en clair
- Token transmis uniquement en header `Authorization: Bearer <token>`

### 3.2 Autorisation (RBAC)
| Ressource          | utilisateur | gestionnaire | admin |
|--------------------|:-----------:|:------------:|:-----:|
| Lire données       | ✓           | ✓            | ✓     |
| Créer/modifier     | ✗           | ✓            | ✓     |
| Règles & import    | ✗           | ✓            | ✓     |
| Supprimer/admin    | ✗           | ✗            | ✓     |
| Gestion users      | ✗           | ✗            | ✓     |

### 3.3 Autres mesures
- CORS restreint aux origines autorisées (localhost:8080, 5173)
- Validation des entrées côté serveur (express-validator)
- Paramètres SQL toujours via placeholders `$1...$n` (pas de concaténation)
- Soft-delete (actif=FALSE) plutôt que suppression physique des données critiques
- Limite de taille sur l'upload (5 Mo) pour prévenir les abus

## 4. Flux asynchrones

- **Évaluation des règles** : POST `/regles/evaluer` — déclenchement manuel ou programmable
- **Import CSV** : traitement transactionnel (BEGIN/COMMIT/ROLLBACK) avec log en base
- **Détection anomalies** : calcul à la demande sur requête GET (pas de daemon)

## 5. Plan d'assurance qualité

| Élément | Mesure |
|---------|--------|
| Tests unitaires | Jest — 18 tests sur services purs (indicateur + règle) |
| Couverture | Branche, ligne, fonction sur `/src/services/` |
| Validation entrées | express-validator sur chaque route POST/PUT |
| Gestion erreurs | Try/catch global + middleware 500, log console.error |
| Transactions DB | BEGIN/COMMIT sur imports multi-lignes |
| Accessibilité | Labels sémantiques, contraste WCAG AA, navigation clavier |

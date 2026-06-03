# EnergIO — Technical Overview (English)

## Project Description

**EnergIO** is a full-stack web platform for intelligent energy consumption management and optimization across a portfolio of buildings. It is developed as part of the RNCP 36463 professional title (CDAN — Application Designer-Developer).

---

## Architecture

EnergIO follows a **three-tier architecture**:

1. **Presentation layer** — React 18 SPA (Single Page Application), built with Vite, styled with Tailwind CSS, and visualized with Recharts.
2. **Application layer** — Node.js REST API (Express 4.x) with JWT authentication, role-based access control (RBAC), and business logic services.
3. **Persistence layer** — PostgreSQL 14+ relational database with transactional integrity, indexes, and audit triggers.

---

## Key Features

### Multi-role Access Control
Three user roles are enforced at both the API (middleware) and UI (route guards) levels:
- **Admin** — full access, including user management
- **Manager** (gestionnaire) — can configure rules, import data, manage meters and buildings
- **User** (utilisateur) — read-only access to data and indicators

### Building & Meter Registry
A structured data model connects buildings (sites) → optional zones → equipment → meters (compteurs). Each meter has an energy type (`electricity`, `gas`, `water`, `fuel oil`, `wood`) and a unique reference code used during CSV imports.

### Data Collection & Integration
The platform supports multiple data ingestion methods:
- **Manual entry** via the web UI
- **CSV file upload** with a correspondence table (reference code → meter ID)
- **Simulated data** via the SQL seed script (18 months of realistic seasonal data)
- **Export** to CSV for interoperability

A full import log (`import_log`) tracks each upload: filename, number of lines processed, successes, errors, and the importing user.

### Computed Indicators
All indicator calculations are implemented in `indicateurService.js` as **pure functions** (no database calls), enabling full unit test coverage:

| Indicator | Algorithm | Unit |
|-----------|-----------|------|
| Normalized consumption | `SUM(kwh) / surface_m²` | kWh/m² |
| Monthly variation | `(v_n - v_{n-1}) / v_{n-1} × 100` | % |
| Linear trend | Ordinary least squares over 12 points | kWh/month |
| Anomaly detection | Z-score: `(v - μ) / σ > 2` | dimensionless |
| Site ranking | Sort ascending by normalized consumption | rank |

### Alert Rules Engine
Alert rules are database-driven (not hardcoded). Each rule defines:
- **Target**: optional site or meter scope
- **Type**: `seuil_absolu` (absolute threshold), `variation` (% change), `comparaison` (vs reference)
- **Condition**: JSON parameters (e.g., `{ "seuil": 45000 }`)
- **Severity level**: `info`, `warning`, or `critical`

When evaluated, the `alerteService` creates `alerte` records that can be tracked and acknowledged by managers.

---

## Security

- **Authentication**: JWT (HS256), 8-hour expiry, transmitted via `Authorization: Bearer` header
- **Password hashing**: bcrypt (cost factor 10)
- **SQL injection prevention**: all queries use parameterized placeholders (`$1`, `$2`, etc.)
- **Input validation**: `express-validator` on all POST/PUT endpoints
- **CORS**: restricted to known frontend origins
- **Soft delete**: data is never physically deleted; `actif = FALSE` or `valide = FALSE` ensures full audit trail

---

## Testing

Unit tests are written with **Jest** and cover the two core services:

- `indicateurService.test.js` — 18 test cases for all calculation functions
- `regleService.test.js` — 12 test cases for all rule evaluation logic

Tests are fully isolated (no database dependency), allowing CI execution without a running PostgreSQL instance.

Run tests:
```bash
cd backend && npm test
```

---

## Data Flow

```
External source (CSV / manual / API)
        │
        ▼
  [Import & Validation]
  releve table — stamped, traceable
        │
        ▼
  [Indicator Calculation]
  indicateurService → GET /indicateurs/*
        │
        ▼
  [Rule Evaluation]
  regleService + alerteService → alerte records
        │
        ▼
  [Dashboard & Export]
  React SPA + CSV download
```

---

## Tech Stack Summary

| Layer      | Technology        | Version  |
|------------|-------------------|----------|
| Frontend   | React             | 18.3     |
| Build tool | Vite              | 6.0      |
| Styling    | Tailwind CSS      | 3.4      |
| Charts     | Recharts          | 2.14     |
| HTTP client| Axios             | 1.7      |
| Backend    | Node.js / Express | 18 / 4.x |
| Auth       | jsonwebtoken      | 9.0      |
| Hashing    | bcryptjs          | 2.4      |
| Database   | PostgreSQL        | 14+      |
| ORM/Client | pg (node-postgres) | 8.13   |
| Testing    | Jest              | 29.7     |

---

## Demo Accounts

| Role       | Email                      | Password |
|------------|----------------------------|----------|
| Admin      | admin@energio.fr           | password |
| Manager    | gestionnaire@energio.fr    | password |
| User       | utilisateur@energio.fr     | password |

---

## API Endpoints Summary

| Method | Route                       | Auth required | Min role     |
|--------|-----------------------------|---------------|--------------|
| POST   | /auth/login                 | ✗             | —            |
| GET    | /auth/me                    | ✓             | utilisateur  |
| GET    | /sites                      | ✓             | utilisateur  |
| POST   | /sites                      | ✓             | gestionnaire |
| GET    | /compteurs                  | ✓             | utilisateur  |
| GET    | /releves                    | ✓             | utilisateur  |
| GET    | /indicateurs/synthese       | ✓             | utilisateur  |
| GET    | /indicateurs/normalises     | ✓             | utilisateur  |
| GET    | /indicateurs/evolution      | ✓             | utilisateur  |
| GET    | /indicateurs/anomalies      | ✓             | utilisateur  |
| GET    | /indicateurs/tendances      | ✓             | utilisateur  |
| GET    | /alertes                    | ✓             | utilisateur  |
| PATCH  | /alertes/:id/traiter        | ✓             | gestionnaire |
| GET/POST/PUT | /regles             | ✓             | gestionnaire |
| POST   | /regles/evaluer             | ✓             | gestionnaire |
| POST   | /import/releves             | ✓             | gestionnaire |
| GET    | /import/template            | ✓             | gestionnaire |
| GET    | /import/export/releves      | ✓             | gestionnaire |
| GET    | /utilisateurs               | ✓             | admin        |

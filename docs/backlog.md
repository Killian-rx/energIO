# Backlog Agile — EnergIO
*Projet RNCP 36463 CDAN | Sprint 1–4 | Période : avril–juin 2026*

---

## Épopées (Epics)

| ID  | Épopée                             | Bloc CDAN |
|-----|------------------------------------|-----------|
| E1  | Authentification et gestion users  | Bloc 1/3  |
| E2  | Référentiel bâtiments & compteurs  | Bloc 1/3  |
| E3  | Collecte et import de données      | Bloc 3/4  |
| E4  | Calcul d'indicateurs               | Bloc 3    |
| E5  | Règles et alertes                  | Bloc 3    |
| E6  | Interface utilisateur               | Bloc 1    |
| E7  | Documentation et conformité        | Bloc 2/4  |

---

## Sprint 1 — Socle technique (semaine 1-2)

| ID    | Story                                          | Epic | Points | Statut     |
|-------|------------------------------------------------|------|--------|------------|
| US-01 | Mettre en place le projet Node.js + PostgreSQL  | E1   | 3      | ✅ Terminé  |
| US-02 | Concevoir et implémenter le schéma SQL          | E2   | 5      | ✅ Terminé  |
| US-03 | Implémenter l'authentification JWT + bcrypt     | E1   | 5      | ✅ Terminé  |
| US-04 | Mettre en place le middleware RBAC (3 rôles)    | E1   | 3      | ✅ Terminé  |
| US-05 | Initialiser le projet React + Vite + Tailwind   | E6   | 2      | ✅ Terminé  |
| US-06 | Créer les données de démonstration (seed SQL)   | E2   | 2      | ✅ Terminé  |

**Vélocité Sprint 1 : 20 points**

---

## Sprint 2 — Fonctions métier cœur (semaine 3-4)

| ID    | Story                                               | Epic | Points | Statut     |
|-------|-----------------------------------------------------|------|--------|------------|
| US-07 | CRUD bâtiments avec filtres et validation           | E2   | 5      | ✅ Terminé  |
| US-08 | CRUD compteurs avec filtres par site                | E2   | 3      | ✅ Terminé  |
| US-09 | API relevés avec pagination et filtres date         | E3   | 5      | ✅ Terminé  |
| US-10 | Service de calcul d'indicateurs (algorithmes purs)  | E4   | 8      | ✅ Terminé  |
| US-11 | Tests unitaires Jest (indicateurs + règles)         | E4   | 5      | ✅ Terminé  |
| US-12 | API règles d'alerte (CRUD + activation)             | E5   | 5      | ✅ Terminé  |

**Vélocité Sprint 2 : 31 points**

---

## Sprint 3 — Import, alertes, frontend (semaine 5-6)

| ID    | Story                                                   | Epic | Points | Statut     |
|-------|---------------------------------------------------------|------|--------|------------|
| US-13 | Import CSV avec table de correspondance et log          | E3   | 8      | ✅ Terminé  |
| US-14 | Export CSV filtré par période et site                   | E3   | 3      | ✅ Terminé  |
| US-15 | Service d'évaluation asynchrone des règles              | E5   | 5      | ✅ Terminé  |
| US-16 | Page de connexion avec comptes démo                     | E6   | 3      | ✅ Terminé  |
| US-17 | Tableau de bord avec KPI et graphique évolution         | E6   | 8      | ✅ Terminé  |
| US-18 | Pages bâtiments, compteurs (CRUD front)                 | E6   | 5      | ✅ Terminé  |
| US-19 | Page indicateurs (4 onglets : normalisé, évol, anomalie, tendance) | E6 | 8 | ✅ Terminé |

**Vélocité Sprint 3 : 40 points**

---

## Sprint 4 — Qualité, documentation, conformité (semaine 7-8)

| ID    | Story                                                 | Epic | Points | Statut     |
|-------|-------------------------------------------------------|------|--------|------------|
| US-20 | Page alertes avec filtres et marquage traitement      | E6   | 5      | ✅ Terminé  |
| US-21 | Page règles avec évaluation manuelle                  | E6   | 5      | ✅ Terminé  |
| US-22 | Page import/export avec historique                    | E6   | 5      | ✅ Terminé  |
| US-23 | Page administration utilisateurs                      | E6   | 3      | ✅ Terminé  |
| US-24 | Dictionnaire de données                               | E7   | 5      | ✅ Terminé  |
| US-25 | Processus AS-IS / TO-BE                              | E7   | 5      | ✅ Terminé  |
| US-26 | Registre des risques                                  | E7   | 3      | ✅ Terminé  |
| US-27 | Documentation architecture et sécurité               | E7   | 5      | ✅ Terminé  |
| US-28 | Document technique en anglais                         | E7   | 3      | ✅ Terminé  |
| US-29 | Plan d'assurance qualité + recette fonctionnelle      | E7   | 5      | ✅ Terminé  |

**Vélocité Sprint 4 : 44 points**

---

## Résumé

| Sprint | Stories | Points | Statut     |
|--------|---------|--------|------------|
| S1     | 6       | 20     | ✅ Terminé |
| S2     | 6       | 31     | ✅ Terminé |
| S3     | 7       | 40     | ✅ Terminé |
| S4     | 10      | 44     | ✅ Terminé |
| **Total** | **29** | **135** | **✅ Livré** |

---

## Backlog priorisé (évolutions futures hors périmètre v1)

| ID    | Story                                              | Priorité  |
|-------|----------------------------------------------------|-----------|
| US-30 | Connexion API OpenData fournisseurs énergie        | Haute     |
| US-31 | Tableau de bord multi-sites comparatif             | Haute     |
| US-32 | Export rapport PDF automatique mensuel             | Moyenne   |
| US-33 | Gestion des zones et équipements (référentiel fin) | Moyenne   |
| US-34 | Notifications email pour les alertes critiques     | Haute     |
| US-35 | DJU (degrés-jours unifiés) pour normalisation météo| Faible    |

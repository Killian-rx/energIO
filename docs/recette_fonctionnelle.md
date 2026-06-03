# Plan de recette fonctionnelle — EnergIO

## Objectif
Valider que toutes les fonctionnalités livrées correspondent aux exigences du cahier des charges et qu'elles fonctionnent correctement dans les conditions d'utilisation prévues.

---

## 1. Environnement de test

| Composant    | Version/Config                        |
|--------------|---------------------------------------|
| OS           | Ubuntu 22.04+                         |
| Node.js      | 18.x LTS                              |
| PostgreSQL   | 14+                                   |
| Navigateur   | Chrome 120+ / Firefox 120+            |
| Base de test | energie_db (avec seed 002_seed.sql)   |
| Comptes test | admin@energio.fr / gestionnaire@energio.fr / utilisateur@energio.fr |

---

## 2. Cas de test — Authentification (E1)

| ID   | Cas de test                          | Prérequis          | Étapes                                         | Résultat attendu                    | Statut |
|------|--------------------------------------|--------------------|------------------------------------------------|-------------------------------------|--------|
| T01  | Connexion valide (admin)             | Seed appliqué      | Email + MDP corrects → Submit                  | Redirection dashboard, token JWT    | ✅     |
| T02  | Connexion échouée                    | —                  | Email invalide → Submit                         | Message "Identifiants incorrects"   | ✅     |
| T03  | Accès page protégée sans token       | —                  | Naviguer vers /sites sans login                 | Redirection /login                  | ✅     |
| T04  | Accès admin par utilisateur simple   | Connecté en user   | Naviguer vers /utilisateurs                     | Redirection /                       | ✅     |
| T05  | Déconnexion                          | Connecté           | Clic Déconnexion                                | Token effacé, retour /login         | ✅     |

---

## 3. Cas de test — Bâtiments (E2)

| ID   | Cas de test                          | Prérequis           | Étapes                                         | Résultat attendu                    | Statut |
|------|--------------------------------------|---------------------|------------------------------------------------|-------------------------------------|--------|
| T10  | Liste des bâtiments                  | Seed appliqué       | GET /sites → Page bâtiments                    | 5 bâtiments affichés                | ✅     |
| T11  | Créer un bâtiment (gestionnaire)     | Connecté gestionnaire | Formulaire + Submit                           | Nouveau bâtiment en liste           | ✅     |
| T12  | Modifier un bâtiment                 | Bâtiment existant   | Icône crayon → modifier surface → Save         | Surface mise à jour                 | ✅     |
| T13  | Créer bâtiment sans nom              | —                   | Formulaire vide → Submit                       | Message validation côté client/API  | ✅     |
| T14  | Désactiver bâtiment (admin)          | Connecté admin      | Icône poubelle → Confirmer                     | Bâtiment disparu de la liste        | ✅     |

---

## 4. Cas de test — Import / Export (E3)

| ID   | Cas de test                          | Prérequis           | Étapes                                         | Résultat attendu                     | Statut |
|------|--------------------------------------|---------------------|------------------------------------------------|--------------------------------------|--------|
| T20  | Télécharger template CSV             | Connecté gestionnaire | GET /import/template                          | Fichier CSV valide téléchargé        | ✅     |
| T21  | Import CSV valide                    | Gestionnaire         | Déposer template modifié → Submit             | nb_ok = nb_lignes, 0 erreurs         | ✅     |
| T22  | Import CSV avec référence inconnue   | —                   | CSV avec ref="INCONNU" → Submit               | nb_erreurs > 0, message explicite    | ✅     |
| T23  | Import CSV avec date invalide        | —                   | Date "not-a-date" → Submit                    | Ligne rejetée avec message           | ✅     |
| T24  | Export CSV                           | Relevés en base      | Sélectionner période → Exporter               | Fichier CSV avec données correctes   | ✅     |
| T25  | Historique visible                   | Import T21 fait      | Consulter page Import                          | Import listé avec statut "terminé"   | ✅     |

---

## 5. Cas de test — Indicateurs (E4)

| ID   | Cas de test                          | Prérequis           | Étapes                                         | Résultat attendu                     | Statut |
|------|--------------------------------------|---------------------|------------------------------------------------|--------------------------------------|--------|
| T30  | Consommation normalisée              | Seed appliqué       | Onglet "Consommation normalisée"               | Tableau classé + graphique barres    | ✅     |
| T31  | Valeur kWh/m² cohérente              | Seed appliqué       | Siège Social : 2800m² / ~28000 kWh            | ≈ 10 kWh/m²                         | ✅     |
| T32  | Évolution 12 mois                    | Seed appliqué       | Onglet "Évolution" + sélect électricité       | Graphique ligne 12 points            | ✅     |
| T33  | Détection anomalie                   | Seed appliqué (pic à 52000 kWh) | Onglet "Anomalies"               | Compteur 1 listé avec mois           | ✅     |
| T34  | Tendance par compteur                | Seed appliqué       | Onglet "Tendances"                             | R² et pente affichés                 | ✅     |
| T35  | Synthèse dashboard                   | Seed appliqué       | Page /                                          | KPI : nb sites, conso, alertes       | ✅     |

---

## 6. Cas de test — Règles et alertes (E5)

| ID   | Cas de test                          | Prérequis           | Étapes                                         | Résultat attendu                     | Statut |
|------|--------------------------------------|---------------------|------------------------------------------------|--------------------------------------|--------|
| T40  | Lister règles                        | Seed appliqué       | Page /regles                                   | 4 règles affichées                   | ✅     |
| T41  | Créer règle seuil absolu             | Gestionnaire        | Formulaire + seuil 30000 + Submit              | Règle listée, active                 | ✅     |
| T42  | Activer/désactiver règle             | Règle existante     | Clic bouton Power                              | Statut bascule                       | ✅     |
| T43  | Évaluer règles manuellement          | Règles actives, relevés | Bouton "Évaluer maintenant"               | Nb alertes créées affiché            | ✅     |
| T44  | Lister alertes non traitées          | Alertes en base     | Page /alertes, onglet "En attente"            | Alertes listées avec couleur niveau  | ✅     |
| T45  | Traiter une alerte                   | Alerte en attente   | Bouton "Traiter"                               | Alerte disparaît de la liste active  | ✅     |
| T46  | Filtrer alertes par niveau           | Alertes mixtes      | Sélecteur "critical"                           | Seules les alertes critiques         | ✅     |

---

## 7. Cas de test — Utilisateurs (E1)

| ID   | Cas de test                          | Prérequis   | Étapes                                         | Résultat attendu                     | Statut |
|------|--------------------------------------|-------------|------------------------------------------------|--------------------------------------|--------|
| T50  | Lister utilisateurs (admin)          | Admin co.   | Page /utilisateurs                             | 3 comptes affichés                   | ✅     |
| T51  | Créer nouvel utilisateur             | Admin co.   | Formulaire complet → Submit                    | Compte créé, email login valide      | ✅     |
| T52  | Modifier rôle                        | Admin co.   | Changer gestionnaire → utilisateur → Save     | Rôle mis à jour                      | ✅     |
| T53  | Désactiver son propre compte         | Admin co.   | Poubelle sur son propre compte                 | Message d'erreur explicite           | ✅     |

---

## 8. Résultats globaux

| Catégorie        | Nb tests | OK | Échec | Taux réussite |
|------------------|----------|----|-------|---------------|
| Authentification | 5        | 5  | 0     | 100%          |
| Bâtiments        | 5        | 5  | 0     | 100%          |
| Import/Export    | 6        | 6  | 0     | 100%          |
| Indicateurs      | 6        | 6  | 0     | 100%          |
| Règles/Alertes   | 7        | 7  | 0     | 100%          |
| Utilisateurs     | 4        | 4  | 0     | 100%          |
| **Total**        | **33**   | **33** | **0** | **100%**  |

**Conclusion** : toutes les fonctionnalités sont validées. La plateforme est conforme au cahier des charges.

---

## 9. Procédure d'intégration (ITIL-inspired)

1. **Validation** : exécuter les 33 cas de test sur l'environnement de staging
2. **Revue de code** : code review sur la branche de livraison
3. **Migration** : appliquer `001_schema.sql` puis `002_seed.sql` en production
4. **Smoke test** : vérifier `/health`, login, affichage dashboard
5. **Formation** : session utilisateurs (gestionnaire + utilisateur final, 1h)
6. **Monitoring** : activer les logs PostgreSQL + alert mail en cas d'erreur 500
7. **Rollback plan** : backup automatique avant migration, restauration pg_restore

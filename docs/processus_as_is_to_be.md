# Analyse et réingénierie des processus — EnergIO

## 1. Processus AS-IS (situation existante)

### 1.1 Collecte des données
**Acteurs** : agents de site, gestionnaires

- Relevés manuels des compteurs (carnet papier ou tableur Excel)
- Réception mensuelle des factures fournisseurs (PDF email)
- Saisie manuelle dans un fichier Excel partagé sur réseau local
- Perte fréquente de données lors des changements de PC ou de version du fichier

**Problèmes identifiés** :
- Données dispersées entre plusieurs sites sans consolidation
- Délai de saisie de 3 à 10 jours après le relevé réel
- Erreurs de saisie non détectées (transpositions, oublis)
- Impossibilité de comparer les bâtiments entre eux
- Aucune alerte automatique en cas de dérive

### 1.2 Analyse et reporting
**Acteurs** : responsables de site, direction

- Consolidation mensuelle dans un tableau Excel central (1 journée de travail)
- Graphiques Excel créés manuellement à chaque rapport
- Rapport PDF transmis par email à la direction
- Aucune normalisation par surface — comparaison biaisée

**Problèmes identifiés** :
- Tableau de bord produit avec 4 à 6 semaines de retard
- Données non accessibles en temps réel
- Analyses impossibles sur plusieurs années sans restructuration
- Dépendance à une personne (SPOF humain)

### 1.3 Alertes et décisions
- Pas de système d'alerte automatique
- Dépassements détectés uniquement lors de la réception de la facture
- Décisions correctives prises avec 4 à 8 semaines de retard sur les événements

---

## 2. Analyse de conformité

| Exigence                              | Situation AS-IS       | Conformité |
|---------------------------------------|-----------------------|:----------:|
| Traçabilité des relevés               | Partielle (Excel)     | ⚠️         |
| Historisation des données             | Locale, fragile       | ✗          |
| Gestion des droits d'accès            | Aucune                | ✗          |
| Détection d'anomalies                 | Manuelle              | ✗          |
| Conformité RGPD données utilisateurs  | Non formalisée        | ✗          |
| Interopérabilité des formats          | Impossible            | ✗          |

---

## 3. Processus TO-BE (avec EnergIO)

### 3.1 Collecte automatisée
**Acteurs** : système, gestionnaires

```
[Import CSV mensuel]         [Saisie manuelle API]        [Simulation / capteur]
       │                             │                              │
       └─────────────────────────────┴──────────────────────────────┘
                                     │
                               [Validation automatique]
                           (doublons, valeurs aberrantes)
                                     │
                              [Base de données]
                          releve (validé, horodaté, tracé)
```

**Améliorations** :
- Import CSV avec table de correspondance (reference → compteur_id)
- Saisie directe via interface web (mobile-friendly)
- Détection automatique des doublons et erreurs de format
- Journalisation complète de chaque import (qui, quand, combien)

### 3.2 Analyse en temps réel
**Acteurs** : système, tous profils

```
[Relevés en base]
       │
       ▼
[indicateurService]
├── Consommation normalisée (kWh/m²) — par site, par mois
├── Variation mensuelle (%)
├── Régression linéaire (tendance 12 mois)
├── Détection anomalies (z-score > 2σ)
└── Classement des sites
       │
       ▼
[Dashboard Web — temps réel]
├── Tableau de bord KPI
├── Graphiques interactifs
└── Export CSV
```

**Améliorations** :
- Indicateurs disponibles immédiatement après saisie
- Normalisation automatique par surface (kWh/m²)
- Comparaison multi-sites rendue possible
- Tendance calculée par régression — prédictif

### 3.3 Alertes automatiques
**Acteurs** : système, gestionnaires

```
[Règles configurées en base] ──► [evaluerToutesRegles()]
                                         │
                               [Évaluation pour chaque règle]
                               ├── seuil_absolu : v > seuil
                               ├── variation    : |Δv/v_ref| > seuil%
                               └── comparaison  : v > v_ref + delta%
                                         │
                               [Alerte créée si déclenchée]
                                         │
                               [Notification dashboard]
                                    + badge rouge
```

**Améliorations** :
- Détection proactive avant réception de la facture
- Règles personnalisables par site et compteur
- Traçabilité du traitement (qui a traité, quand)
- Historique complet des alertes

---

## 4. Gains attendus

| Indicateur                        | AS-IS          | TO-BE           | Gain estimé |
|-----------------------------------|----------------|-----------------|-------------|
| Délai de disponibilité des données| 3 à 10 jours   | < 1 heure       | -95%        |
| Délai de détection anomalie       | 4 à 8 semaines | Immédiat        | -99%        |
| Temps de reporting mensuel        | 1 journée      | Automatique     | -100%       |
| Fiabilité des données             | Manuelle ~80%  | Contrôlée ~99%  | +24%        |
| Accessibilité multi-sites         | Impossible     | Web, n'importe où | Infini   |

/**
 * Évalue les règles d'alerte contre des données mesurées.
 * Fonctions pures pour faciliter les tests unitaires.
 */

/**
 * Évalue une règle de type seuil_absolu
 * @param {number} valeur
 * @param {object} condition — { seuil: number }
 * @returns {boolean}
 */
function evaluerSeuilAbsolu(valeur, condition) {
  return typeof valeur === 'number' && typeof condition.seuil === 'number'
    ? valeur > condition.seuil
    : false;
}

/**
 * Évalue une règle de type variation
 * @param {number} valeurActuelle
 * @param {number} valeurRef
 * @param {object} condition — { seuil_pct: number }
 * @returns {boolean}
 */
function evaluerVariation(valeurActuelle, valeurRef, condition) {
  if (!valeurRef || valeurRef === 0) return false;
  const variation = Math.abs((valeurActuelle - valeurRef) / valeurRef) * 100;
  return variation > (condition.seuil_pct || 0);
}

/**
 * Évalue une règle de type comparaison (delta par rapport à une ref)
 * @param {number} valeurSite
 * @param {number} valeurRef
 * @param {object} condition — { delta_pct: number }
 * @returns {boolean}
 */
function evaluerComparaison(valeurSite, valeurRef, condition) {
  if (!valeurRef || valeurRef === 0) return false;
  const delta = ((valeurSite - valeurRef) / valeurRef) * 100;
  return delta > (condition.delta_pct || 0);
}

/**
 * Évalue une règle selon son type
 * @param {object} regle — { type_regle, condition }
 * @param {object} contexte — { valeur, valeurRef? }
 * @returns {{ declenchee: boolean, message: string, valeurDetectee: number, seuil: number }}
 */
function evaluerRegle(regle, contexte) {
  const { type_regle, condition, nom } = regle;
  const { valeur, valeurRef } = contexte;
  let declenchee = false;
  let message = '';
  let seuil = null;

  switch (type_regle) {
    case 'seuil_absolu':
      declenchee = evaluerSeuilAbsolu(valeur, condition);
      seuil = condition.seuil;
      message = declenchee
        ? `Règle "${nom}" : valeur ${valeur} dépasse le seuil de ${condition.seuil}`
        : '';
      break;

    case 'variation':
      declenchee = evaluerVariation(valeur, valeurRef, condition);
      seuil = condition.seuil_pct;
      const pct = valeurRef
        ? Math.round(Math.abs((valeur - valeurRef) / valeurRef) * 10000) / 100
        : 0;
      message = declenchee
        ? `Règle "${nom}" : variation de ${pct}% dépasse le seuil de ${condition.seuil_pct}%`
        : '';
      break;

    case 'comparaison':
      declenchee = evaluerComparaison(valeur, valeurRef, condition);
      seuil = condition.delta_pct;
      const delta = valeurRef
        ? Math.round(((valeur - valeurRef) / valeurRef) * 10000) / 100
        : 0;
      message = declenchee
        ? `Règle "${nom}" : écart de +${delta}% par rapport à la référence (seuil: ${condition.delta_pct}%)`
        : '';
      break;

    default:
      break;
  }

  return { declenchee, message, valeurDetectee: valeur, seuil };
}

/**
 * Construit un message d'alerte formaté
 */
function formaterAlerte(regle, resultat, siteNom, compteurNom) {
  const localisation = [siteNom, compteurNom].filter(Boolean).join(' / ');
  return `[${regle.niveau?.toUpperCase() || 'WARNING'}] ${localisation} — ${resultat.message}`;
}

module.exports = {
  evaluerSeuilAbsolu,
  evaluerVariation,
  evaluerComparaison,
  evaluerRegle,
  formaterAlerte,
};

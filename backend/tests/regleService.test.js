const {
  evaluerSeuilAbsolu,
  evaluerVariation,
  evaluerComparaison,
  evaluerRegle,
  formaterAlerte,
} = require('../src/services/regleService');

describe('evaluerSeuilAbsolu', () => {
  test('retourne true si valeur > seuil', () => {
    expect(evaluerSeuilAbsolu(50000, { seuil: 45000 })).toBe(true);
  });
  test('retourne false si valeur <= seuil', () => {
    expect(evaluerSeuilAbsolu(45000, { seuil: 45000 })).toBe(false);
    expect(evaluerSeuilAbsolu(40000, { seuil: 45000 })).toBe(false);
  });
  test('retourne false si valeur ou seuil invalide', () => {
    expect(evaluerSeuilAbsolu(null, { seuil: 45000 })).toBe(false);
    expect(evaluerSeuilAbsolu(50000, {})).toBe(false);
  });
});

describe('evaluerVariation', () => {
  test('retourne true si variation dépasse le seuil', () => {
    expect(evaluerVariation(135, 100, { seuil_pct: 30 })).toBe(true);
  });
  test('retourne false si variation dans la norme', () => {
    expect(evaluerVariation(120, 100, { seuil_pct: 30 })).toBe(false);
  });
  test('calcule sur valeur absolue (baisse aussi)', () => {
    expect(evaluerVariation(60, 100, { seuil_pct: 30 })).toBe(true);
  });
  test('retourne false si ref est zéro', () => {
    expect(evaluerVariation(100, 0, { seuil_pct: 30 })).toBe(false);
  });
});

describe('evaluerComparaison', () => {
  test('retourne true si site dépasse la ref de plus de delta_pct', () => {
    expect(evaluerComparaison(125, 100, { delta_pct: 20 })).toBe(true);
  });
  test('retourne false si site est dans la norme', () => {
    expect(evaluerComparaison(110, 100, { delta_pct: 20 })).toBe(false);
  });
  test('retourne false si site est inférieur à la ref', () => {
    expect(evaluerComparaison(80, 100, { delta_pct: 20 })).toBe(false);
  });
});

describe('evaluerRegle', () => {
  const regleBase = { nom: 'Test', type_regle: 'seuil_absolu', condition: { seuil: 40000 }, niveau: 'warning' };

  test('règle seuil_absolu déclenchée', () => {
    const r = evaluerRegle(regleBase, { valeur: 52000 });
    expect(r.declenchee).toBe(true);
    expect(r.message).toContain('52000');
    expect(r.seuil).toBe(40000);
  });

  test('règle seuil_absolu non déclenchée', () => {
    const r = evaluerRegle(regleBase, { valeur: 30000 });
    expect(r.declenchee).toBe(false);
    expect(r.message).toBe('');
  });

  test('règle variation déclenchée', () => {
    const regle = { nom: 'Var', type_regle: 'variation', condition: { seuil_pct: 25 }, niveau: 'warning' };
    const r = evaluerRegle(regle, { valeur: 50000, valeurRef: 30000 });
    expect(r.declenchee).toBe(true);
  });

  test('règle comparaison déclenchée', () => {
    const regle = { nom: 'Comp', type_regle: 'comparaison', condition: { delta_pct: 15 }, niveau: 'info' };
    const r = evaluerRegle(regle, { valeur: 120, valeurRef: 100 });
    expect(r.declenchee).toBe(true);
  });

  test('type_regle inconnu — non déclenchée', () => {
    const regle = { nom: 'X', type_regle: 'inconnu', condition: {}, niveau: 'info' };
    const r = evaluerRegle(regle, { valeur: 999 });
    expect(r.declenchee).toBe(false);
  });
});

describe('formaterAlerte', () => {
  test('inclut le niveau, le site et le message', () => {
    const regle = { nom: 'Test', niveau: 'critical', type_regle: 'seuil_absolu', condition: { seuil: 40000 } };
    const resultat = { message: 'valeur 50000 dépasse 40000' };
    const msg = formaterAlerte(regle, resultat, 'Siège Social', 'Électricité');
    expect(msg).toContain('[CRITICAL]');
    expect(msg).toContain('Siège Social');
    expect(msg).toContain('Électricité');
    expect(msg).toContain('valeur 50000');
  });

  test('fonctionne sans compteur_nom', () => {
    const regle = { nom: 'Test', niveau: 'warning', type_regle: 'seuil_absolu', condition: {} };
    const msg = formaterAlerte(regle, { message: 'test' }, 'Site A', null);
    expect(msg).toContain('Site A');
    expect(msg).not.toContain('null');
  });
});

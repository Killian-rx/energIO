const {
  normaliserParSurface,
  calculerVariation,
  regressionLineaire,
  detecterAnomalies,
  agreggerParMois,
  classerSites,
  labelTendance,
} = require('../src/services/indicateurService');

describe('normaliserParSurface', () => {
  test('calcule kWh/m² correctement', () => {
    expect(normaliserParSurface(28000, 2800)).toBe(10);
  });
  test('retourne null si surface nulle', () => {
    expect(normaliserParSurface(28000, 0)).toBeNull();
    expect(normaliserParSurface(28000, null)).toBeNull();
  });
  test('arrondi à 2 décimales', () => {
    expect(normaliserParSurface(10000, 3000)).toBe(3.33);
  });
});

describe('calculerVariation', () => {
  test('calcule variation positive', () => {
    expect(calculerVariation(110, 100)).toBe(10);
  });
  test('calcule variation négative', () => {
    expect(calculerVariation(80, 100)).toBe(-20);
  });
  test('retourne null si ref est zéro', () => {
    expect(calculerVariation(50, 0)).toBeNull();
  });
  test('retourne null si ref est null', () => {
    expect(calculerVariation(50, null)).toBeNull();
  });
});

describe('regressionLineaire', () => {
  test('droite parfaite y = 2x + 1', () => {
    const pts = [0,1,2,3,4].map(x => ({ x, y: 2*x + 1 }));
    const r = regressionLineaire(pts);
    expect(r.a).toBe(2);
    expect(r.b).toBe(1);
    expect(r.r2).toBe(1);
  });
  test('moins de 2 points — retourne pente 0', () => {
    const r = regressionLineaire([{ x: 0, y: 100 }]);
    expect(r.a).toBe(0);
    expect(r.r2).toBe(0);
  });
  test('valeurs constantes — pente nulle, R²=1', () => {
    const pts = [0,1,2].map(x => ({ x, y: 50 }));
    const r = regressionLineaire(pts);
    expect(r.a).toBe(0);
    expect(r.r2).toBe(1);
  });
});

describe('detecterAnomalies', () => {
  test('détecte un pic évident', () => {
    const valeurs = [100, 102, 98, 101, 99, 500, 103, 97, 100];
    const anomalies = detecterAnomalies(valeurs);
    expect(anomalies.length).toBeGreaterThanOrEqual(1);
    expect(anomalies[0].valeur).toBe(500);
  });
  test('retourne tableau vide si moins de 3 valeurs', () => {
    expect(detecterAnomalies([100, 200])).toHaveLength(0);
  });
  test('retourne tableau vide si toutes valeurs identiques', () => {
    expect(detecterAnomalies([100, 100, 100, 100])).toHaveLength(0);
  });
  test('seuil personnalisable', () => {
    const valeurs = [100, 100, 100, 100, 130]; // z modéré
    const strict   = detecterAnomalies(valeurs, 1.0);
    const laxiste  = detecterAnomalies(valeurs, 3.0);
    expect(strict.length).toBeGreaterThanOrEqual(laxiste.length);
  });
});

describe('agreggerParMois', () => {
  test('agrège correctement deux relevés du même mois', () => {
    const releves = [
      { date_releve: '2026-01-05T00:00:00Z', valeur: '1000' },
      { date_releve: '2026-01-20T00:00:00Z', valeur: '500' },
      { date_releve: '2026-02-10T00:00:00Z', valeur: '800' },
    ];
    const result = agreggerParMois(releves);
    expect(result).toHaveLength(2);
    expect(result.find(r => r.mois === '2026-01').total).toBe(1500);
    expect(result.find(r => r.mois === '2026-02').total).toBe(800);
  });
  test('retourne tableau vide si input vide', () => {
    expect(agreggerParMois([])).toHaveLength(0);
  });
});

describe('classerSites', () => {
  test('classe du moins au plus consommateur (kWh/m²)', () => {
    const sites = [
      { site_id: 1, nom: 'A', surface: 1000, total_kwh: 20000 }, // 20 kWh/m²
      { site_id: 2, nom: 'B', surface: 500,  total_kwh: 5000 },  // 10 kWh/m²
      { site_id: 3, nom: 'C', surface: 200,  total_kwh: 8000 },  // 40 kWh/m²
    ];
    const result = classerSites(sites);
    expect(result[0].site_id).toBe(2); // meilleur
    expect(result[1].site_id).toBe(1);
    expect(result[2].site_id).toBe(3);
    expect(result[0].rang).toBe(1);
    expect(result[2].rang).toBe(3);
  });
  test('exclut les sites sans surface', () => {
    const sites = [
      { site_id: 1, nom: 'A', surface: null, total_kwh: 5000 },
      { site_id: 2, nom: 'B', surface: 500,  total_kwh: 5000 },
    ];
    expect(classerSites(sites)).toHaveLength(1);
  });
});

describe('labelTendance', () => {
  test.each([
    [100,  'hausse forte'],
    [30,   'hausse modérée'],
    [0,    'stable'],
    [-30,  'baisse modérée'],
    [-100, 'baisse forte'],
  ])('a=%i → %s', (a, expected) => {
    expect(labelTendance(a)).toBe(expected);
  });
});

let mockClient;

jest.mock('../src/config/db', () => ({
  connect: jest.fn(() => Promise.resolve(mockClient)),
}));

const pool = require('../src/config/db');
const { evaluerToutesRegles } = require('../src/services/alerteService');

function setupClient(queryImpl) {
  mockClient = {
    query: jest.fn(queryImpl),
    release: jest.fn(),
  };
}

describe('evaluerToutesRegles', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  test('retourne un tableau vide quand aucune règle active n’existe', async () => {
    setupClient(async (sql, params) => {
      if (sql.includes('FROM regle_alerte')) return { rows: [] };
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const result = await evaluerToutesRegles();

    expect(pool.connect).toHaveBeenCalledTimes(1);
    expect(result).toEqual([]);
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  test('crée une alerte pour une règle compteur avec seuil dépassé', async () => {
    let insertParams;
    setupClient(async (sql, params) => {
      if (sql.includes('FROM regle_alerte')) {
        return {
          rows: [{
            id: 10,
            site_id: null,
            compteur_id: 7,
            nom: 'Seuil compteur',
            type_regle: 'seuil_absolu',
            condition: '{"seuil": 100}',
            niveau: 'critical',
            site_nom: null,
            compteur_nom: 'Electricité générale',
          }],
        };
      }
      if (sql.includes('FROM releve') && sql.includes('compteur_id = ANY') && sql.includes("- INTERVAL '1 year'")) {
        return { rows: [{ compteur_id: 7, total: '80' }] };
      }
      if (sql.includes('FROM releve') && sql.includes('compteur_id = ANY')) {
        return { rows: [{ compteur_id: 7, total: '150' }] };
      }
      if (sql.includes('SELECT DISTINCT regle_id')) return { rows: [] };
      if (sql.includes('INSERT INTO alerte')) {
        insertParams = params;
        return { rowCount: 1 };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const result = await evaluerToutesRegles();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      regle_id: 10,
      compteur_id: 7,
      valeur_detectee: 150,
      seuil: 100,
      niveau: 'critical',
    });
    expect(result[0].message).toContain('[CRITICAL]');
    expect(result[0].message).toContain('Electricité générale');
    expect(insertParams).toEqual([
      10, null, 7,
      result[0].message, 150, 100, 'critical',
    ]);
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  test('ne recrée pas une alerte déjà ouverte sur le mois courant', async () => {
    setupClient(async sql => {
      if (sql.includes('FROM regle_alerte')) {
        return {
          rows: [{
            id: 10,
            site_id: null,
            compteur_id: 7,
            nom: 'Seuil compteur',
            type_regle: 'seuil_absolu',
            condition: { seuil: 100 },
            niveau: 'warning',
            site_nom: null,
            compteur_nom: 'Electricité générale',
          }],
        };
      }
      if (sql.includes('FROM releve') && sql.includes('compteur_id = ANY')) {
        return { rows: [{ compteur_id: 7, total: '150' }] };
      }
      if (sql.includes('SELECT DISTINCT regle_id')) return { rows: [{ regle_id: 10 }] };
      if (sql.includes('INSERT INTO alerte')) throw new Error('Insert should not be called');
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const result = await evaluerToutesRegles();

    expect(result).toEqual([]);
    expect(mockClient.query).not.toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO alerte'),
      expect.any(Array)
    );
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });
});

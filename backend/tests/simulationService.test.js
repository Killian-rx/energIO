describe('simulationService', () => {
  let pool;
  let service;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.resetModules();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});

    jest.doMock('../src/config/db', () => ({
      query: jest.fn(async sql => {
        if (sql.includes('SELECT type_energie')) return { rows: [{ type_energie: 'electricite' }] };
        if (sql.includes('INSERT INTO releve')) return { rowCount: 1 };
        if (sql.includes('SELECT id, sim_interval_seconds')) return { rows: [] };
        if (sql.includes('DELETE FROM releve')) return { rowCount: 0 };
        return { rows: [] };
      }),
    }));

    pool = require('../src/config/db');
    service = require('../src/services/simulationService');
  });

  afterEach(() => {
    for (const id of service.activeIds()) service.stopMeter(id);
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('startMeter active un compteur et stopMeter le désactive', async () => {
    service.startMeter(42, 60);
    await Promise.resolve();

    expect(service.isActive(42)).toBe(true);
    expect(service.activeIds()).toContain(42);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT type_energie'),
      [42]
    );
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO releve'),
      expect.arrayContaining([42])
    );

    service.stopMeter(42);

    expect(service.isActive(42)).toBe(false);
    expect(service.activeIds()).not.toContain(42);
  });

  test('initFromDB démarre les compteurs simulés actifs', async () => {
    pool.query.mockImplementation(async sql => {
      if (sql.includes('SELECT id, sim_interval_seconds')) {
        return { rows: [{ id: 5, sim_interval_seconds: 120 }] };
      }
      if (sql.includes('SELECT type_energie')) return { rows: [{ type_energie: 'gaz' }] };
      if (sql.includes('INSERT INTO releve')) return { rowCount: 1 };
      return { rows: [] };
    });

    await service.initFromDB();

    expect(service.isActive(5)).toBe(true);
    expect(console.log).toHaveBeenCalledWith('[simulation] 1 capteur(s) démarrés');
  });

  test('cleanup supprime les anciens relevés simulés', async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 3 });

    await service.cleanup();

    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM releve'));
    expect(console.log).toHaveBeenCalledWith('[simulation] Nettoyage : 3 relevé(s) supprimé(s)');
  });
});

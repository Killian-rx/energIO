import api from './client';

describe('api client', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('configure la base API et le timeout', () => {
    expect(api.defaults.baseURL).toBe('/api');
    expect(api.defaults.timeout).toBe(15000);
  });

  test('ajoute le Bearer token aux requêtes authentifiées', async () => {
    localStorage.setItem('energio_token', 'jwt-demo');

    const handler = api.interceptors.request.handlers[0].fulfilled;
    const config = await handler({ headers: {} });

    expect(config.headers.Authorization).toBe('Bearer jwt-demo');
  });

  test('ne crée pas de header Authorization sans token', async () => {
    const handler = api.interceptors.request.handlers[0].fulfilled;
    const config = await handler({ headers: {} });

    expect(config.headers.Authorization).toBeUndefined();
  });
});

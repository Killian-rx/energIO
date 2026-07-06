const jwt = require('jsonwebtoken');
const { requireAuth } = require('../src/middleware/auth');
const { requireRole } = require('../src/middleware/roles');

function mockResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('requireAuth', () => {
  const secret = 'test-secret';

  beforeEach(() => {
    process.env.JWT_SECRET = secret;
  });

  test('refuse une requête sans header Authorization', () => {
    const req = { headers: {} };
    const res = mockResponse();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token manquant' });
    expect(next).not.toHaveBeenCalled();
  });

  test('refuse un token invalide', () => {
    const req = { headers: { authorization: 'Bearer invalid-token' } };
    const res = mockResponse();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token invalide ou expiré' });
    expect(next).not.toHaveBeenCalled();
  });

  test('décode un token valide et attache req.user', () => {
    const payload = { id: 1, email: 'admin@energio.fr', role: 'admin' };
    const token = jwt.sign(payload, secret);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockResponse();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(req.user).toMatchObject(payload);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('requireRole', () => {
  test('autorise un admin sur une route gestionnaire', () => {
    const req = { user: { role: 'admin' } };
    const res = mockResponse();
    const next = jest.fn();

    requireRole('gestionnaire')(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('refuse un utilisateur simple sur une route gestionnaire', () => {
    const req = { user: { role: 'utilisateur' } };
    const res = mockResponse();
    const next = jest.fn();

    requireRole('gestionnaire')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Droits insuffisants' });
    expect(next).not.toHaveBeenCalled();
  });
});

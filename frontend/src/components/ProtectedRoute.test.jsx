import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import ProtectedRoute from './ProtectedRoute';
import { useAuth } from '../contexts/AuthContext';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

function renderProtected(minRole) {
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route path="/" element={<div>Accueil</div>} />
        <Route path="/login" element={<div>Connexion</div>} />
        <Route
          path="/protected"
          element={
            <ProtectedRoute minRole={minRole}>
              <div>Contenu protégé</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test('redirige vers login si aucun utilisateur n’est connecté', () => {
    useAuth.mockReturnValue({ user: null });

    renderProtected();

    expect(screen.getByText('Connexion')).toBeInTheDocument();
    expect(screen.queryByText('Contenu protégé')).not.toBeInTheDocument();
  });

  test('affiche le contenu si le rôle est suffisant', () => {
    useAuth.mockReturnValue({ user: { role: 'gestionnaire' } });

    renderProtected('gestionnaire');

    expect(screen.getByText('Contenu protégé')).toBeInTheDocument();
  });

  test('redirige vers accueil si le rôle est insuffisant', () => {
    useAuth.mockReturnValue({ user: { role: 'utilisateur' } });

    renderProtected('gestionnaire');

    expect(screen.getByText('Accueil')).toBeInTheDocument();
    expect(screen.queryByText('Contenu protégé')).not.toBeInTheDocument();
  });
});

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { useAuth } from '../hooks/useAuth';

// Mock de useAuth
vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

describe('ProtectedRoute Component Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test('debe redirigir al portal de /login si el especialista no está autenticado', () => {
    // Mock: No autenticado
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      user: null,
      token: null,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/analyze']}>
        <Routes>
          <Route
            path="/analyze"
            element={
              <ProtectedRoute allowedRoles={['radiologist', 'admin']}>
                <div data-testid="child-content">Contenido Protegido</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div data-testid="login-view">Pantalla Login</div>} />
        </Routes>
      </MemoryRouter>
    );

    // Debe re-enrutar e imprimir la pantalla de login
    expect(screen.queryByTestId('child-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('login-view')).toBeInTheDocument();
  });

  test('debe mostrar la pantalla de Acceso Denegado (Ley 1581) si el rol es insuficiente', () => {
    // Mock: Autenticado como investigador (insuficiente para /analyze)
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      user: {
        id: 'usr-4412',
        name: 'Dra. Sofía Rivas',
        email: 'investigador@medvision.ai',
        role: 'researcher',
        institutionalId: 'CO-RES-124',
      },
      token: 'jwt-x',
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/analyze']}>
        <Routes>
          <Route
            path="/analyze"
            element={
              <ProtectedRoute allowedRoles={['radiologist', 'admin']}>
                <div data-testid="child-content">Workspace Inferencia</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    // No debe mostrar contenido y debe pintar el escudo de Acceso Denegado
    expect(screen.queryByTestId('child-content')).not.toBeInTheDocument();
    expect(screen.getByText(/Acceso Denegado/i)).toBeInTheDocument();
    expect(screen.getByText(/Dra. Sofía Rivas/i)).toBeInTheDocument();
    expect(screen.getByText(/CO-RES-124/i)).toBeInTheDocument();
    expect(screen.getByText(/Cumplimiento Ley 1581 \/ HIPAA/i)).toBeInTheDocument();
  });

  test('debe renderizar el contenido hijo si el rol cumple con los privilegios', () => {
    // Mock: Autenticado como radiólogo (válido para /analyze)
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      user: {
        id: 'usr-1',
        name: 'Dr. Manuel Gil',
        email: 'radiologo@medvision.ai',
        role: 'radiologist',
        institutionalId: 'CO-RAD-921',
      },
      token: 'jwt-x',
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/analyze']}>
        <Routes>
          <Route
            path="/analyze"
            element={
              <ProtectedRoute allowedRoles={['radiologist', 'admin']}>
                <div data-testid="child-content">Workspace Inferencia</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    // Debe renderizar el Workspace clínico sin problemas
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.queryByText(/Acceso Denegado/i)).not.toBeInTheDocument();
  });
});

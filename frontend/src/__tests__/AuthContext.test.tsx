import React from 'react';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider } from '../context/AuthContext';
import { useAuth } from '../hooks/useAuth';

// Componente de prueba consumidor del contexto
const TestConsumer: React.FC = () => {
  const { user, isAuthenticated, login, logout, isLoading } = useAuth();
  const [error, setError] = React.useState<string>('');

  const handleLogin = async (email: string, pass: string) => {
    setError('');
    try {
      await login(email, pass);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (isLoading) return <div>Cargando sesion...</div>;
  if (!isAuthenticated) {
    return (
      <div>
        <span data-testid="auth-state">Guest</span>
        {error && <span data-testid="error-state">{error}</span>}
        <button data-testid="btn-login-admin" onClick={() => handleLogin('admin@medvision.ai', 'MedVision2026!')}>
          Login Admin
        </button>
        <button data-testid="btn-login-wrong" onClick={() => handleLogin('wrong@medvision.ai', 'BadPass')}>
          Login Wrong
        </button>
      </div>
    );
  }

  return (
    <div>
      <span data-testid="auth-state">Auth</span>
      <span data-testid="user-name">{user?.name}</span>
      <span data-testid="user-role">{user?.role}</span>
      <button data-testid="btn-logout" onClick={logout}>
        Logout
      </button>
    </div>
  );
};

describe('AuthContext and useAuth Hook Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  test('debe iniciarse como Guest no autenticado si no hay tokens guardados', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-state')).toHaveTextContent('Guest');
  });

  test('debe loguearse exitosamente con credenciales de admin', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    // Click en botón de login admin
    const btn = screen.getByTestId('btn-login-admin');
    fireEvent.click(btn);

    // Validar loading asíncrono y resolución de simulación (~800ms)
    await waitFor(() => {
      expect(screen.getByTestId('auth-state')).toHaveTextContent('Auth');
    }, { timeout: 1200 });

    expect(screen.getByTestId('user-name')).toHaveTextContent('Ing. Alejandro Sol');
    expect(screen.getByTestId('user-role')).toHaveTextContent('admin');
    expect(localStorage.getItem('medvision_jwt')).toContain('sim-jwt');
  });

  test('debe denegar acceso e informar errores clínicos ante credenciales erróneas', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    const btn = screen.getByTestId('btn-login-wrong');
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByTestId('error-state')).toBeInTheDocument();
    }, { timeout: 1200 });

    expect(screen.getByTestId('error-state')).toHaveTextContent(/Credenciales incorrectas/i);
    expect(screen.getByTestId('auth-state')).toHaveTextContent('Guest');
  });

  test('debe mantener iniciada la sesión si localStorage posee tokens previos', () => {
    // Inyectar datos mock en el storage ficticio
    localStorage.setItem('medvision_jwt', 'sim-jwt-saved-token');
    localStorage.setItem(
      'medvision_user',
      JSON.stringify({
        id: 'usr-90',
        name: 'Dra. Persistente',
        role: 'radiologist',
        institutionalId: 'CO-RAD-90',
      })
    );

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    // Debe saltar el loading e iniciar directamente autenticado
    expect(screen.getByTestId('auth-state')).toHaveTextContent('Auth');
    expect(screen.getByTestId('user-name')).toHaveTextContent('Dra. Persistente');
    expect(screen.getByTestId('user-role')).toHaveTextContent('radiologist');
  });

  test('debe limpiar tokens y retornar a Guest al pulsar Logout', async () => {
    // Iniciar persistido
    localStorage.setItem('medvision_jwt', 'sim-jwt-saved-token');
    localStorage.setItem(
      'medvision_user',
      JSON.stringify({ id: 'usr-1', name: 'Dr. Manuel', role: 'admin', institutionalId: 'X' })
    );

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-state')).toHaveTextContent('Auth');

    const logoutBtn = screen.getByTestId('btn-logout');
    fireEvent.click(logoutBtn);

    expect(screen.getByTestId('auth-state')).toHaveTextContent('Guest');
    expect(localStorage.getItem('medvision_jwt')).toBeNull();
  });
});

import React, { createContext, useState, useEffect, type ReactNode } from 'react';
import type { User, UserRole, AuthState } from '../types/auth';

interface AuthContextType extends AuthState {
  login: (email: string, pass: string) => Promise<User>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Cuentas preconfiguradas para simulación de grado médico
const PRECONFIGURED_ACCOUNTS = [
  {
    email: 'radiologo@medvision.ai',
    pass: 'MedVision2026!',
    user: {
      id: 'usr-1092',
      name: 'Dr. Manuel Gil',
      email: 'radiologo@medvision.ai',
      role: 'radiologist' as UserRole,
      institutionalId: 'CO-RAD-921',
    },
  },
  {
    email: 'investigador@medvision.ai',
    pass: 'MedVision2026!',
    user: {
      id: 'usr-4412',
      name: 'Dra. Sofía Rivas',
      email: 'investigador@medvision.ai',
      role: 'researcher' as UserRole,
      institutionalId: 'CO-RES-124',
    },
  },
  {
    email: 'admin@medvision.ai',
    pass: 'MedVision2026!',
    user: {
      id: 'usr-0001',
      name: 'Ing. Alejandro Sol',
      email: 'admin@medvision.ai',
      role: 'admin' as UserRole,
      institutionalId: 'CO-ADM-001',
    },
  },
];

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null,
    isLoading: true,
  });

  // Cargar sesión guardada de localStorage al inicializar
  useEffect(() => {
    const savedToken = localStorage.getItem('medvision_jwt');
    const savedUserStr = localStorage.getItem('medvision_user');

    if (savedToken && savedUserStr) {
      try {
        const savedUser = JSON.parse(savedUserStr) as User;
        setAuthState({
          isAuthenticated: true,
          user: savedUser,
          token: savedToken,
          isLoading: false,
        });
      } catch (err) {
        console.error('Error cargando la sesión persistida:', err);
        handleClearSession();
      }
    } else {
      setAuthState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Simular Silent Refresh (refresco de token en background cada 5 minutos)
  useEffect(() => {
    if (!authState.isAuthenticated) return;

    const interval = setInterval(() => {
      console.log('[Security] Silent refresh triggered. Renewing JWT clinical session...');
      const newToken = `sim-jwt-${Math.random().toString(36).substr(2)}-refreshed`;
      localStorage.setItem('medvision_jwt', newToken);
      setAuthState((prev) => ({
        ...prev,
        token: newToken,
      }));
    }, 5 * 60 * 1000); // 5 minutos

    return () => clearInterval(interval);
  }, [authState.isAuthenticated]);

  const handleClearSession = () => {
    localStorage.removeItem('medvision_jwt');
    localStorage.removeItem('medvision_user');
    setAuthState({
      isAuthenticated: false,
      user: null,
      token: null,
      isLoading: false,
    });
  };

  const login = async (email: string, pass: string): Promise<User> => {
    return new Promise((resolve, reject) => {
      // Simular latencia de red institucional (~800ms)
      setTimeout(() => {
        const account = PRECONFIGURED_ACCOUNTS.find(
          (acc) => acc.email.toLowerCase() === email.toLowerCase().trim()
        );

        if (!account) {
          reject(new Error('Credenciales incorrectas: El usuario institucional no está registrado.'));
          return;
        }

        if (account.pass !== pass) {
          reject(new Error('Credenciales incorrectas: Contraseña institucional inválida.'));
          return;
        }

        // Generar JWT token simulado
        const simulatedToken = `sim-jwt-${btoa(email)}-${Date.now()}`;
        
        // Guardar persistencia
        localStorage.setItem('medvision_jwt', simulatedToken);
        localStorage.setItem('medvision_user', JSON.stringify(account.user));

        setAuthState({
          isAuthenticated: true,
          user: account.user,
          token: simulatedToken,
          isLoading: false,
        });

        resolve(account.user);
      }, 800);
    });
  };

  const logout = () => {
    console.log('[Security] Initiating logout sequence. Purging memory and persistent clinical state.');
    handleClearSession();
  };

  return (
    <AuthContext.Provider value={{ ...authState, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

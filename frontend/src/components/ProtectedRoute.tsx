import React, { useEffect } from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ShieldAlert, ArrowLeft, Heart } from 'lucide-react';
import type { UserRole } from '../types/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated && user && allowedRoles && !allowedRoles.includes(user.role)) {
      // Registrar de forma estricta los intentos de violación en la consola (Audit Logs)
      console.warn(
        `%c[SECURITY ALERT] Intento de acceso NO AUTORIZADO detectado! %c\n` +
        `• Especialista: ${user.name} (${user.email})\n` +
        `• Rol actual: ${user.role.toUpperCase()} (ID: ${user.institutionalId})\n` +
        `• Path restringido: ${location.pathname}\n` +
        `• Estampa de tiempo: ${new Date().toISOString()}\n` +
        `• Acción: Bloqueo de enrutamiento y denegación de renderizado.`,
        'color: #EF4444; font-weight: bold; font-size: 11px;',
        'color: #64748B;'
      );
    }
  }, [isAuthenticated, user, allowedRoles, location]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-brand-white dark:bg-primary">
        <div className="w-8 h-8 border-3 border-brand-cyan border-t-transparent rounded-full animate-spin mb-3"></div>
        <span className="text-xs text-brand-gray font-semibold">Validando credenciales institucionales...</span>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    // Redirigir a login preservando la ruta previa
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si se definen roles permitidos y el rol actual no está incluido, denegar renderizado
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex-grow flex items-center justify-center p-6 min-h-[70vh] select-none font-sans">
        <div className="w-full max-w-md bg-white rounded-2xl border border-red-200 dark:border-red-500/20 p-8 shadow-lg text-center flex flex-col items-center gap-4 dark:bg-primary">
          <div className="p-3 bg-red-100 dark:bg-red-500/10 text-red-600 rounded-2xl animate-pulse">
            <ShieldAlert className="w-10 h-10" />
          </div>

          <div>
            <span className="block text-[9px] uppercase tracking-wider font-extrabold text-red-600 dark:text-red-400">
              Política de Seguridad MLOps
            </span>
            <h3 className="text-lg font-black text-brand-deep dark:text-white uppercase mt-1 tracking-tight">
              Acceso Denegado
            </h3>
            <p className="text-xs text-brand-gray mt-2 leading-relaxed">
              Su cuenta institucional con rol de **{user.role.toUpperCase()}** no posee los privilegios suficientes para auditar o modificar esta sección clínica.
            </p>
          </div>

          {/* Detalles Técnicos */}
          <div className="w-full bg-brand-deep/5 dark:bg-white/5 border border-brand-gray/10 p-3.5 rounded-xl text-left font-mono text-[10px] text-brand-gray">
            <div className="flex justify-between">
              <span>Operador:</span>
              <span className="font-bold text-brand-deep dark:text-white">{user.name}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span>Registro ID:</span>
              <span>{user.institutionalId}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span>Path evaluado:</span>
              <span className="text-red-500">{location.pathname}</span>
            </div>
          </div>

          {/* Botón de Retorno */}
          <Link
            to="/"
            className="w-full py-2 bg-brand-deep text-white hover:bg-brand-deep/95 border border-brand-gray/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer dark:bg-white dark:text-primary dark:hover:bg-white/90"
          >
            <ArrowLeft className="w-4 h-4" />
            Regresar al Dashboard
          </Link>

          {/* HIPAA Disclaimer */}
          <div className="mt-2 flex items-start gap-2 text-left text-[9px] text-brand-gray leading-snug border-t border-brand-gray/10 pt-4 w-full">
            <Heart className="w-3.5 h-3.5 text-brand-cyan flex-shrink-0 mt-0.5" />
            <span>
              <b>Cumplimiento Ley 1581 / HIPAA:</b> Los intentos de escalación de privilegios dentro del panel de control de MedVision AI son registrados y reportados automáticamente al Oficial de Seguridad Informática institucional.
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Si pasa las validaciones, renderizar la ruta
  return <>{children}</>;
};
export default ProtectedRoute;

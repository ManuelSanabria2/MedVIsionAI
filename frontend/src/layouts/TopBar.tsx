import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Sun, Moon, Bell, Search, ChevronRight } from 'lucide-react';

export const TopBar: React.FC = () => {
  const location = useLocation();
  const [isDark, setIsDark] = useState<boolean>(() => {
    return document.documentElement.classList.contains('dark') || 
      localStorage.getItem('theme') === 'dark';
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsCount, setNotificationsCount] = useState(3);

  // Efecto para persistir y actualizar tema dark/light
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  // Generador de Breadcrumbs Dinámicos
  const generateBreadcrumbs = () => {
    const pathnames = location.pathname.split('/').filter((x) => x);
    if (pathnames.length === 0) {
      return (
        <span className="text-xs text-brand-deep font-bold dark:text-white">
          Panel de Control
        </span>
      );
    }

    const routeNames: Record<string, string> = {
      analyze: 'Analizador Clínico',
      history: 'Historial de Estudios',
      models: 'Gestión de Modelos',
      settings: 'Configuración',
      help: 'Ayuda y Normativa',
    };

    return (
      <div className="flex items-center gap-1.5 font-sans text-xs">
        <Link to="/" className="text-brand-gray hover:text-brand-deep dark:hover:text-white font-medium transition-all">
          MedVision AI
        </Link>
        {pathnames.map((value, index) => {
          const last = index === pathnames.length - 1;
          const to = `/${pathnames.slice(0, index + 1).join('/')}`;
          const displayName = routeNames[value] || (value.length > 20 ? `${value.substring(0, 8)}...` : value);

          return (
            <React.Fragment key={to}>
              <ChevronRight className="w-3 h-3 text-brand-gray/60" />
              {last ? (
                <span className="text-brand-deep font-bold dark:text-white">
                  {displayName}
                </span>
              ) : (
                <Link to={to} className="text-brand-gray hover:text-brand-deep dark:hover:text-white font-medium transition-all">
                  {displayName}
                </Link>
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <header className="h-16 bg-white border-b border-brand-gray/15 px-6 flex items-center justify-between select-none relative z-20 shadow-sm dark:bg-primary dark:border-brand-gray/10">
      {/* Sección Izquierda: Breadcrumbs */}
      <div className="flex items-center gap-4">
        {generateBreadcrumbs()}
      </div>

      {/* Sección Derecha: Buscador, Notificaciones y Configuración */}
      <div className="flex items-center gap-5">
        {/* Buscador Clínico (ID o Fecha) */}
        <div className="relative hidden md:block">
          <input
            type="text"
            placeholder="Buscar estudio por ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-56 pl-9 pr-3 py-1.5 bg-brand-white border border-brand-gray/25 rounded-lg text-xs focus:w-64 focus:border-accent focus:outline-none transition-all placeholder:text-brand-gray/50 dark:bg-primary-light dark:border-white/10 dark:text-white"
          />
          <Search className="w-4 h-4 text-brand-gray absolute left-3 top-1/2 -translate-y-1/2 dark:text-brand-gray" />
        </div>

        {/* Notificaciones */}
        <button
          onClick={() => setNotificationsCount(0)}
          className="p-2 bg-brand-white hover:bg-brand-gray/10 rounded-lg text-brand-deep hover:text-brand-cyan transition-all relative cursor-pointer border border-brand-gray/10 dark:bg-primary-light dark:border-white/10 dark:text-white dark:hover:bg-white/5"
        >
          <Bell className="w-4 h-4" />
          {notificationsCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-danger text-white border border-white dark:border-primary">
              {notificationsCount}
            </span>
          )}
        </button>

        {/* Toggle Dark/Light Mode */}
        <button
          onClick={() => setIsDark(!isDark)}
          className="p-2 bg-brand-white hover:bg-brand-gray/10 rounded-lg text-brand-deep hover:text-brand-cyan transition-all cursor-pointer border border-brand-gray/10 dark:bg-primary-light dark:border-white/10 dark:text-white dark:hover:bg-white/5"
          aria-label="Toggle tema oscuro"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};

import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  UploadCloud,
  Clock,
  Cpu,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
  User,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, setIsCollapsed }) => {
  const { user, logout } = useAuth();
  // Estado para el indicador del modelo clínico
  const [modelStatus] = useState<'online' | 'offline'>('online');

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: Activity },
    { name: 'Nueva Imagen', path: '/analyze', icon: UploadCloud },
    { name: 'Historial', path: '/history', icon: Clock },
    { name: 'Gestión de Modelos', path: '/models', icon: Cpu },
    { name: 'Configuración', path: '/settings', icon: Settings },
    { name: 'Ayuda / Normativa', path: '/help', icon: Shield },
  ];

  return (
    <motion.div
      animate={{ width: isCollapsed ? 64 : 240 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="h-screen bg-primary border-r border-brand-gray/15 flex flex-col justify-between text-white select-none relative z-30 shrink-0"
    >
      {/* Header del Sidebar */}
      <div>
        <div className={`h-16 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between px-5'} border-b border-brand-gray/15`}>
          <AnimatePresence mode="wait">
            {!isCollapsed ? (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-2"
              >
                <div className="p-1 bg-accent/25 border border-accent/40 rounded text-accent">
                  <Activity className="w-5 h-5" />
                </div>
                <span className="font-sans font-black text-sm tracking-wide">MEDVISION AI</span>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-1 bg-accent/25 border border-accent/40 rounded text-accent"
              >
                <Activity className="w-5 h-5" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Botón Colapsador */}
          {!isCollapsed && (
            <button
              onClick={() => setIsCollapsed(true)}
              className="p-1 bg-primary-light hover:bg-primary-dark border border-brand-gray/10 rounded-md text-brand-gray hover:text-white transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Menú de Navegación */}
        <nav className="mt-6 px-3 flex flex-col gap-1.5">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all select-none ${
                  isActive
                    ? 'bg-accent text-primary font-bold shadow-md'
                    : 'text-brand-gray hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <item.icon className="w-4.5 h-4.5 shrink-0" />
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="truncate"
                  >
                    {item.name}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Footer del Sidebar */}
      <div className="border-t border-brand-gray/15 p-4 flex flex-col gap-4">
        {/* Indicador de Modelo Activo */}
        <div className={`flex items-center gap-2.5 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="relative">
            <span className={`block w-2.5 h-2.5 rounded-full ${modelStatus === 'online' ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
          </div>
          {!isCollapsed && (
            <div className="text-[10px] font-mono leading-none">
              <span className="block text-brand-gray font-bold">EfficientNet-B4</span>
              <span className="block text-accent font-medium mt-0.5">Online v0.1.0</span>
            </div>
          )}
        </div>

        {/* Avatar + Nombre Médico */}
        <div className={`flex items-center justify-between border-t border-brand-gray/10 pt-3 gap-2 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="flex items-center gap-3 truncate">
            <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-accent shrink-0 select-none">
              <User className="w-4 h-4" />
            </div>
            {!isCollapsed && user && (
              <div className="truncate leading-none">
                <span className="block font-bold text-xs truncate max-w-[120px]">{user.name}</span>
                <span className="block text-[9px] text-brand-gray mt-1 font-semibold uppercase tracking-wider select-none">
                  {user.role === 'admin'
                    ? 'Admin MLOps'
                    : user.role === 'radiologist'
                    ? 'Radiólogo'
                    : 'Investigador'}
                </span>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <button
              onClick={logout}
              className="p-1.5 hover:bg-red-500/10 hover:text-red-500 rounded-lg text-brand-gray transition-all cursor-pointer"
              title="Cerrar Sesión"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          )}
        </div>
      </div>

      {/* Botón flotante expandidor cuando está colapsado */}
      {isCollapsed && (
        <button
          onClick={() => setIsCollapsed(false)}
          className="absolute -right-3 top-16 transform -translate-y-1/2 p-1 bg-accent border border-accent rounded-full text-primary shadow-lg cursor-pointer hover:scale-110 transition-transform"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
    </motion.div>
  );
};

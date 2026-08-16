import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'framer-motion';
import { ShieldCheck, Lock, Mail, AlertCircle, Info, Heart } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { LogoMark } from '../components/brand/Logo';

export const LoginPage: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showHelper, setShowHelper] = useState<boolean>(false);

  // Obtener la ruta a la que intentaba ingresar antes de ser redirigido
  const from = (location.state as any)?.from?.pathname || '/app';

  // Si ya está autenticado, redirigir inmediatamente
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  // Mensaje si redirigió por expiración
  useEffect(() => {
    if (location.state?.expired) {
      setErrorMsg('Su sesión institucional ha expirado por inactividad. Por favor re-autentíquese.');
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      await login(email, password);
      // Redirigir exitosamente
      navigate(from, { replace: true });
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de conexión institucional. Inténtelo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Función rápida para autocompletar cuentas demo
  const handleQuickFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('MedVision2026!');
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen bg-brand-deep flex items-center justify-center p-4 relative overflow-hidden font-sans select-none">
      {/* Círculos de luz de fondo cian clínicos decorativos */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-brand-cyan/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-brand-cyan/5 blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md bg-white/95 dark:bg-primary/95 backdrop-blur-md rounded-2xl border border-white/20 dark:border-brand-gray/10 shadow-2xl overflow-hidden p-8 flex flex-col gap-6 relative z-10"
      >
        {/* Cabecera del Portal */}
        <div className="text-center flex flex-col items-center">
          <div className="p-3 bg-brand-deep rounded-2xl border border-brand-cyan/20 mb-3 shadow-[0_0_15px_rgba(0,194,203,0.15)] text-white">
            <LogoMark size={34} />
          </div>
          <h1 className="text-xl font-black text-brand-deep dark:text-white tracking-tight leading-none">
            Med<span className="text-brand-cyan">Vision</span> AI
          </h1>
          <span className="text-[10px] text-brand-gray tracking-widest uppercase font-bold mt-1">
            "Ver más. Detectar antes."
          </span>
          <h2 className="text-xs font-semibold text-brand-gray mt-4 select-none">
            Portal Clínico de Autenticación Unificada
          </h2>
        </div>

        {/* Mensaje de Error */}
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-3.5 bg-red-500/10 border border-red-500/25 rounded-xl flex items-start gap-2 text-red-600 dark:text-red-400 text-xs leading-relaxed"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="font-medium">{errorMsg}</span>
          </motion.div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Usuario */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-extrabold text-brand-deep dark:text-white flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-brand-cyan" />
              Usuario Institucional (Email)
            </label>
            <input
              type="email"
              required
              placeholder="nombre@medvision.ai"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2.5 bg-brand-white dark:bg-primary-light border border-brand-gray/25 dark:border-white/10 rounded-xl focus:border-brand-cyan focus:outline-none dark:text-white text-xs font-mono"
            />
          </div>

          {/* Contraseña */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-extrabold text-brand-deep dark:text-white flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-brand-cyan" />
              Contraseña Unificada
            </label>
            <input
              type="password"
              required
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2.5 bg-brand-white dark:bg-primary-light border border-brand-gray/25 dark:border-white/10 rounded-xl focus:border-brand-cyan focus:outline-none dark:text-white text-xs font-mono"
            />
          </div>

          {/* Botón de Acceso */}
          <Button
            variant="primary"
            type="submit"
            isLoading={isSubmitting}
            className="w-full flex items-center justify-center gap-1.5 py-3 mt-2 bg-brand-cyan text-primary hover:bg-brand-cyan/95 font-bold rounded-xl border border-brand-cyan cursor-pointer shadow-lg shadow-brand-cyan/10"
          >
            <ShieldCheck className="w-4.5 h-4.5" />
            Autenticar Credenciales
          </Button>
        </form>

        {/* Acordeón de Cuentas Demo - Increíblemente útil para pruebas */}
        <div className="border border-brand-gray/15 rounded-xl overflow-hidden bg-brand-deep/5 dark:bg-white/5">
          <button
            onClick={() => setShowHelper(!showHelper)}
            className="w-full p-2.5 text-[10px] font-bold text-brand-deep dark:text-white flex items-center justify-between hover:bg-brand-deep/10 cursor-pointer select-none"
            type="button"
          >
            <span className="flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-brand-cyan" />
              Cuentas de Demostración Clínicas
            </span>
            <span>{showHelper ? '▲' : '▼'}</span>
          </button>
          
          {showHelper && (
            <div className="p-3 border-t border-brand-gray/10 flex flex-col gap-2 bg-white dark:bg-primary text-[10px] text-brand-gray leading-snug">
              <div className="flex justify-between items-center border-b border-brand-gray/5 pb-1.5">
                <div>
                  <span className="block font-bold text-brand-deep dark:text-white">Dr. Manuel Gil (Radiólogo)</span>
                  <span className="font-mono text-[9px]">radiologo@medvision.ai</span>
                </div>
                <button
                  onClick={() => handleQuickFill('radiologo@medvision.ai')}
                  className="px-2 py-0.5 bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20 rounded hover:bg-brand-cyan hover:text-primary font-bold cursor-pointer transition-all"
                >
                  Usar
                </button>
              </div>
              <div className="flex justify-between items-center border-b border-brand-gray/5 pb-1.5">
                <div>
                  <span className="block font-bold text-brand-deep dark:text-white">Dra. Sofía Rivas (Investigador)</span>
                  <span className="font-mono text-[9px]">investigador@medvision.ai</span>
                </div>
                <button
                  onClick={() => handleQuickFill('investigador@medvision.ai')}
                  className="px-2 py-0.5 bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20 rounded hover:bg-brand-cyan hover:text-primary font-bold cursor-pointer transition-all"
                >
                  Usar
                </button>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <span className="block font-bold text-brand-deep dark:text-white">Ing. Alejandro Sol (Admin)</span>
                  <span className="font-mono text-[9px]">admin@medvision.ai</span>
                </div>
                <button
                  onClick={() => handleQuickFill('admin@medvision.ai')}
                  className="px-2 py-0.5 bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20 rounded hover:bg-brand-cyan hover:text-primary font-bold cursor-pointer transition-all"
                >
                  Usar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Ley 1581 / Normativa */}
        <div className="flex items-start gap-2 border-t border-brand-gray/10 pt-4 text-[9px] text-brand-gray leading-snug select-none">
          <Heart className="w-3.5 h-3.5 text-brand-cyan flex-shrink-0 mt-0.5" />
          <span>
            <b>Aviso de Privacidad y Normativa:</b> Al ingresar, acepta la recopilación y tratamiento de información de conformidad con la <b>Ley 1581 de 2012 (Habeas Data)</b>. Puede acceder al documento de <a href="https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=49981" target="_blank" rel="noopener noreferrer" className="text-brand-cyan font-bold hover:underline">Políticas de Privacidad y Tratamiento de Datos Sensibles</a>.
          </span>
        </div>
      </motion.div>
    </div>
  );
};
export default LoginPage;

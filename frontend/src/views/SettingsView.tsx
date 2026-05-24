import { useState, type FC } from 'react';
import { Settings, Database, KeyRound, Save } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const SettingsView: FC = () => {
  const [rateLimit, setRateLimit] = useState<number>(100);
  const [windowPreset, setWindowPreset] = useState<string>('chest_xray');
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-extrabold text-brand-deep dark:text-white">Configuración del Sistema</h2>
        <p className="text-xs text-brand-gray">Gestión de rate limiting, presets de windowing clínico, credenciales y estados de base de datos.</p>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: General Settings */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-white rounded-xl border border-brand-gray/15 p-5 shadow-sm dark:bg-primary dark:border-brand-gray/10 flex flex-col gap-4">
            <h3 className="text-brand-deep font-bold text-sm border-b border-brand-gray/10 pb-3 flex items-center gap-1.5 dark:text-white">
              <Settings className="w-4.5 h-4.5 text-brand-cyan" />
              Parámetros de Inferencia y API
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              <div>
                <label className="block text-brand-deep dark:text-white font-semibold mb-1.5">
                  Límite de Peticiones (Rate Limit / min)
                </label>
                <input
                  type="number"
                  value={rateLimit}
                  onChange={(e) => setRateLimit(Number(e.target.value))}
                  className="w-full p-2.5 bg-brand-white border border-brand-gray/25 rounded-lg focus:border-accent focus:outline-none transition-all dark:bg-primary-light dark:border-white/10 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-brand-deep dark:text-white font-semibold mb-1.5">
                  Preset de Windowing Clínico por Defecto
                </label>
                <select
                  value={windowPreset}
                  onChange={(e) => setWindowPreset(e.target.value)}
                  className="w-full p-2.5 bg-brand-white border border-brand-gray/25 rounded-lg focus:border-accent focus:outline-none transition-all dark:bg-primary-light dark:border-white/10 dark:text-white font-sans font-medium"
                >
                  <option value="chest_xray">Ventana Pulmonar (Chest X-Ray)</option>
                  <option value="bone">Ventana Ósea (Bone)</option>
                  <option value="brain">Ventana Cerebral (Brain)</option>
                  <option value="soft_tissue">Tejidos Blandos (Soft Tissue)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-brand-gray/15 p-5 shadow-sm dark:bg-primary dark:border-brand-gray/10 flex flex-col gap-4">
            <h3 className="text-brand-deep font-bold text-sm border-b border-brand-gray/10 pb-3 flex items-center gap-1.5 dark:text-white">
              <KeyRound className="w-4.5 h-4.5 text-brand-cyan" />
              Credenciales y Llaves de API (Seguridad)
            </h3>

            <div className="text-xs flex flex-col gap-4">
              <div>
                <label className="block text-brand-deep dark:text-white font-semibold mb-1.5">
                  MLflow Server URI
                </label>
                <input
                  type="text"
                  disabled
                  value="http://localhost:5000"
                  className="w-full p-2.5 bg-brand-white/60 border border-brand-gray/25 rounded-lg text-brand-gray font-mono cursor-not-allowed dark:bg-primary-light/40 dark:border-white/10 dark:text-brand-gray"
                />
              </div>

              <div>
                <label className="block text-brand-deep dark:text-white font-semibold mb-1.5">
                  SECRET_KEY (JWT Auth)
                </label>
                <input
                  type="password"
                  disabled
                  value="••••••••••••••••••••••••••••••••••••"
                  className="w-full p-2.5 bg-brand-white/60 border border-brand-gray/25 rounded-lg text-brand-gray font-mono cursor-not-allowed dark:bg-primary-light/40 dark:border-white/10 dark:text-brand-gray"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Database Health & Actions */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-white rounded-xl border border-brand-gray/15 p-5 shadow-sm dark:bg-primary dark:border-brand-gray/10 flex flex-col gap-4">
            <h3 className="text-brand-deep font-bold text-sm flex items-center gap-1.5 dark:text-white">
              <Database className="w-4.5 h-4.5 text-brand-cyan" />
              Base de Datos (PostgreSQL)
            </h3>

            <div className="p-4 bg-brand-deep/5 rounded-xl border border-brand-cyan/20 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-brand-deep dark:text-accent">PostgreSQL RDBMS</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  CONECTADO
                </span>
              </div>
              <span className="block text-[10px] text-brand-gray mt-1">Esquema Activo:</span>
              <span className="block text-xs font-bold font-mono text-brand-deep dark:text-white">
                medvision_db.predictions_log
              </span>
            </div>

            <div className="text-xs flex flex-col gap-1.5 text-brand-gray leading-relaxed border-t border-brand-gray/10 pt-3">
              <span className="block font-semibold text-brand-deep dark:text-white">Variables PostgreSQL:</span>
              <span className="block font-mono text-[10px]">HOST: localhost</span>
              <span className="block font-mono text-[10px]">PORT: 5432</span>
              <span className="block font-mono text-[10px]">USER: medvision_user</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              type="submit"
              variant="primary"
              className="w-full flex items-center justify-center gap-1.5 py-3 cursor-pointer"
            >
              <Save className="w-4.5 h-4.5" />
              Guardar Cambios
            </Button>
            {isSaved && (
              <span className="text-center text-xs font-semibold text-emerald-500 animate-bounce">
                ¡Configuraciones de la API guardadas con éxito!
              </span>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, CheckCircle, Lock, AlertTriangle } from 'lucide-react';
import { Button } from './ui/Button';
import type { ModelRegistryItem } from './ModelCard';

interface ModelActivationModalProps {
  model: ModelRegistryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmActivation: (version: string, reason: string) => void;
}

export const ModelActivationModal: React.FC<ModelActivationModalProps> = ({
  model,
  isOpen,
  onClose,
  onConfirmActivation,
}) => {
  const [typedConfirmation, setTypedConfirmation] = useState<string>('');
  const [activationReason, setActivationReason] = useState<string>('');
  const [isLocked, setIsLocked] = useState<boolean>(true);

  useEffect(() => {
    if (model) {
      // Comparación exacta ignorando mayúsculas y espacios innecesarios
      const expected = `${model.name} ${model.version}`.trim().toLowerCase();
      const current = typedConfirmation.trim().toLowerCase();
      setIsLocked(current !== expected);
    }
  }, [typedConfirmation, model]);

  // Resetear estados al cerrar/abrir
  useEffect(() => {
    if (isOpen) {
      setTypedConfirmation('');
      setActivationReason('');
      setIsLocked(true);
    }
  }, [isOpen]);

  if (!isOpen || !model) return null;

  const { name, version, architecture, metrics } = model;
  const expectedString = `${name} ${version}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;

    onConfirmActivation(
      version,
      activationReason.trim() || 'Migración de checkpoint rutinaria autorizada en caliente.'
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/80 backdrop-blur-sm animate-fade-in font-sans">
      <div
        className="w-full max-w-lg bg-white rounded-2xl border border-brand-gray/15 overflow-hidden shadow-2xl dark:bg-primary dark:border-brand-gray/10 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header de Seguridad */}
        <div className="p-5 border-b border-brand-gray/10 flex items-center justify-between bg-red-600 text-white select-none">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5.5 h-5.5 text-white animate-pulse" />
            <div>
              <h3 className="text-sm font-extrabold tracking-tight uppercase">
                Protocolo de Activación MLOps
              </h3>
              <span className="block text-[9px] uppercase tracking-wider text-red-100">
                Solo Personal de Ingeniería / Admins Autorizados
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg text-red-100 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {/* Resumen del Modelo */}
          <div className="bg-brand-deep/5 dark:bg-white/5 p-4 rounded-xl border border-brand-gray/10 text-xs flex flex-col gap-2 select-none">
            <span className="block text-[8px] uppercase tracking-wider font-extrabold text-brand-gray">Resumen del Checkpoint candidato</span>
            <div className="flex justify-between mt-1">
              <span className="text-brand-gray">Versión candidato:</span>
              <span className="font-mono text-brand-deep dark:text-accent font-bold">{expectedString}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-gray">Arquitectura:</span>
              <span className="font-mono text-brand-deep dark:text-white font-semibold">{architecture}</span>
            </div>
            <div className="flex justify-between border-t border-brand-gray/10 pt-2 mt-1">
              <span className="text-brand-gray">Target AUC-ROC:</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{(metrics.aucRoc * 100).toFixed(1)}%</span>
            </div>
          </div>

          {/* Caja de Advertencia Clínica Fija */}
          <div className="bg-amber-500/10 border border-amber-500/25 p-4 rounded-xl flex items-start gap-3 select-none leading-relaxed">
            <AlertTriangle className="w-5.5 h-5.5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-[10px] text-amber-900 dark:text-amber-300 font-medium">
              <span className="block font-bold text-xs uppercase text-amber-600 dark:text-amber-400">Impacto Clínico Crítico</span>
              Al confirmar esta acción, los pesos de inferencia activos en la API FastAPI se actualizarán en caliente. Las imágenes cargadas por radiólogos a partir de este instante se evaluarán bajo el nuevo checkpoint, alterando el mapa calórico y las sugerencias neuronales institucionales.
            </div>
          </div>

          {/* Entrada de Confirmación Manual Estricta */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase font-extrabold text-brand-deep dark:text-white select-none">
              Para desbloquear, escriba exactamente: <span className="font-mono text-brand-cyan select-all bg-brand-cyan/5 px-2 py-0.5 rounded font-bold">{expectedString}</span>
            </label>
            <input
              type="text"
              required
              placeholder="Confirmación de versión del modelo..."
              value={typedConfirmation}
              onChange={(e) => setTypedConfirmation(e.target.value)}
              className="w-full p-2.5 bg-brand-white border border-brand-gray/25 rounded-lg focus:border-red-500 focus:outline-none dark:bg-primary-light dark:border-white/10 dark:text-white font-mono text-xs"
            />
          </div>

          {/* Entrada de Razón / Bitácora de Auditoría */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase font-extrabold text-brand-deep dark:text-white select-none">
              Motivo de la Activación (Audit Log)
            </label>
            <textarea
              placeholder="Describa el motivo del despliegue (ej. corrección de falsos positivos en hilio pulmonar)..."
              value={activationReason}
              onChange={(e) => setActivationReason(e.target.value)}
              className="w-full p-2.5 bg-brand-white border border-brand-gray/25 rounded-lg focus:border-accent focus:outline-none dark:bg-primary-light dark:border-white/10 dark:text-white text-xs min-h-[60px]"
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 mt-4 select-none">
            <Button
              variant="secondary"
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-brand-gray/20 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={isLocked}
              className={`px-4 py-2 flex items-center gap-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                isLocked
                  ? 'bg-brand-gray/20 border-transparent text-brand-gray/60 cursor-not-allowed'
                  : 'bg-red-600 border-red-600 hover:bg-red-700 text-white font-black shadow-lg shadow-red-500/20'
              }`}
            >
              {isLocked ? <Lock className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5 animate-bounce" />}
              Confirmar Activación
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default ModelActivationModal;

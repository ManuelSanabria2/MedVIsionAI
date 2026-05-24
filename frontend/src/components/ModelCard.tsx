import React from 'react';
import { Cpu, Calendar, Database, Eye, ShieldAlert, Award } from 'lucide-react';
import { Button } from './ui/Button';

export interface ModelRegistryItem {
  id: string;
  name: string;
  version: string;
  status: 'active' | 'staging' | 'deprecated' | 'training';
  architecture: string;
  trainingDate: string;
  datasetName: string;
  datasetSize: number;
  metrics: {
    aucRoc: number;
    f1Score: number;
    sensitivity: number;
    specificity: number;
  };
  lossHistory: { epoch: number; loss: number; valLoss: number }[];
  confusionMatrix: { tp: number; fn: number; fp: number; tn: number };
  rocCurve: { fpr: number; tpr: number }[];
}

interface ModelCardProps {
  model: ModelRegistryItem;
  userRole: 'doctor' | 'admin';
  onViewMetrics: (model: ModelRegistryItem) => void;
  onActivate: (model: ModelRegistryItem) => void;
}

export const ModelCard: React.FC<ModelCardProps> = ({
  model,
  userRole,
  onViewMetrics,
  onActivate,
}) => {
  const { name, version, status, trainingDate, datasetName, datasetSize, metrics } = model;

  // Clases y colores según estado del modelo
  const statusColors = {
    active: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 dark:bg-emerald-500/20',
    staging: 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20 dark:bg-brand-cyan/20',
    deprecated: 'bg-brand-gray/10 text-brand-gray border-brand-gray/20 dark:bg-brand-gray/20',
    training: 'bg-amber-500/10 text-amber-500 border-amber-500/20 dark:bg-amber-500/20 animate-pulse',
  };

  const statusLabels = {
    active: 'Activo en Prod',
    staging: 'En Staging',
    deprecated: 'Deprecado',
    training: 'Entrenando...',
  };

  const isActive = status === 'active';
  const isStaging = status === 'staging';
  const isTraining = status === 'training';
  const isAdmin = userRole === 'admin';

  return (
    <div
      className={`bg-white rounded-xl border p-5 shadow-sm dark:bg-primary transition-all flex flex-col justify-between ${
        isActive
          ? 'border-brand-cyan bg-brand-cyan/5 shadow-scan relative overflow-hidden'
          : 'border-brand-gray/15 hover:border-brand-deep/30 dark:border-white/10 dark:hover:border-accent/40'
      }`}
    >
      {/* Efecto escaneo sutil sobre modelo activo */}
      {isActive && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-brand-cyan to-transparent animate-pulse" />
      )}

      <div>
        {/* Fila superior: Versión y Estado */}
        <div className="flex items-start justify-between gap-3 mb-4 select-none">
          <div>
            <h3 className="font-extrabold text-brand-deep text-base dark:text-white flex items-center gap-1.5 leading-snug">
              <Cpu className={`w-4.5 h-4.5 ${isActive ? 'text-brand-cyan' : 'text-brand-gray'}`} />
              {name}
            </h3>
            <span className="block text-[10px] font-mono font-bold text-brand-cyan mt-0.5">
              Version: {version}
            </span>
          </div>

          <span
            className={`px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider rounded-lg border leading-none select-none ${statusColors[status]}`}
          >
            {statusLabels[status]}
          </span>
        </div>

        {/* Metadatos de Entrenamiento */}
        <div className="flex flex-col gap-2.5 text-xs text-brand-gray mb-5 border-b border-brand-gray/10 pb-4 font-sans select-none">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-brand-gray/60" />
            <span>
              Entrenado: <span className="font-semibold text-brand-deep dark:text-white">{trainingDate}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-brand-gray/60" />
            <span>
              Dataset: <span className="font-semibold text-brand-deep dark:text-white">{datasetName}</span>
              <span className="font-mono text-[10px] bg-brand-deep/5 dark:bg-white/5 px-1.5 py-0.5 rounded ml-1.5 font-bold">
                {datasetSize.toLocaleString()} imágenes
              </span>
            </span>
          </div>
        </div>

        {/* Métricas de Inferencia - Badges en Grid */}
        <div className="flex flex-col gap-3 mb-5 select-none">
          <span className="text-[10px] uppercase font-extrabold tracking-wider text-brand-gray flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-brand-cyan" />
            Métricas de Validación Clínica
          </span>
          <div className="grid grid-cols-2 gap-2 text-center">
            {/* AUC-ROC */}
            <div className="bg-brand-white dark:bg-primary-light/10 p-2 rounded-lg border border-brand-gray/10 flex flex-col justify-center">
              <span className="text-[8px] uppercase font-bold text-brand-gray tracking-wide">AUC-ROC</span>
              <span className="text-sm font-black font-mono text-brand-deep dark:text-white mt-0.5">
                {(metrics.aucRoc * 100).toFixed(1)}%
              </span>
            </div>
            {/* F1 Score */}
            <div className="bg-brand-white dark:bg-primary-light/10 p-2 rounded-lg border border-brand-gray/10 flex flex-col justify-center">
              <span className="text-[8px] uppercase font-bold text-brand-gray tracking-wide">F1-Score</span>
              <span className="text-sm font-black font-mono text-brand-deep dark:text-white mt-0.5">
                {(metrics.f1Score * 100).toFixed(1)}%
              </span>
            </div>
            {/* Sensibilidad */}
            <div className="bg-brand-white dark:bg-primary-light/10 p-2 rounded-lg border border-brand-gray/10 flex flex-col justify-center">
              <span className="text-[8px] uppercase font-bold text-brand-gray tracking-wide">Sensibilidad</span>
              <span className="text-sm font-black font-mono text-brand-deep dark:text-white mt-0.5">
                {(metrics.sensitivity * 100).toFixed(1)}%
              </span>
            </div>
            {/* Especificidad */}
            <div className="bg-brand-white dark:bg-primary-light/10 p-2 rounded-lg border border-brand-gray/10 flex flex-col justify-center">
              <span className="text-[8px] uppercase font-bold text-brand-gray tracking-wide">Especificidad</span>
              <span className="text-sm font-black font-mono text-brand-deep dark:text-white mt-0.5">
                {(metrics.specificity * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex flex-col gap-2 pt-2 border-t border-brand-gray/10">
        <Button
          variant="secondary"
          onClick={() => onViewMetrics(model)}
          disabled={isTraining}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5" />
          Ver Métricas Completas
        </Button>

        {/* Botón de Activación: Solo admins lo ven y solo aplica si no está activo o entrenando */}
        {isAdmin && (isStaging || status === 'deprecated') && (
          <Button
            variant="primary"
            onClick={() => onActivate(model)}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold bg-brand-cyan text-primary hover:bg-brand-cyan/90 border border-brand-cyan cursor-pointer mt-1"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Activar Modelo
          </Button>
        )}

        {/* Indicator de rol clínico */}
        {!isAdmin && (isStaging || status === 'deprecated') && (
          <div className="text-[10px] text-brand-gray text-center italic mt-1.5 font-sans select-none">
            Acceso de lectura (Active Learning)
          </div>
        )}
      </div>
    </div>
  );
};

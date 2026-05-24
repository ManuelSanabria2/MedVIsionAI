import React, { useState } from 'react';
import { Activity, ShieldAlert, Zap, Heart, MessageSquare, X } from 'lucide-react';
import type { PredictionResponse } from '../services/api';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { FeedbackSection } from './FeedbackSection';

interface AnalysisPanelProps {
  state: 'idle' | 'uploading' | 'processing' | 'done' | 'error';
  progress: number;
  error: string | null;
  prediction: PredictionResponse | null;
  onFeedbackSubmitted?: () => void;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  state,
  progress,
  error,
  prediction,
  onFeedbackSubmitted,
}) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Clasificación de chips de predicción clínicos semánticos
  const getDiagnosticStatus = () => {
    if (!prediction) return null;
    const isAnomaly = prediction.prediction === 1;
    const conf = prediction.confidence;

    if (isAnomaly) {
      if (conf >= 0.95) {
        return { label: 'Crítico (Prioritario)', variant: 'critical' as const, color: 'bg-red-500 text-white border-red-600' };
      }
      return { label: 'Anomalía Detectada', variant: 'anomaly' as const, color: 'bg-amber-500 text-white border-amber-600' };
    }
    return { label: 'Sin Anomalías (Normal)', variant: 'normal' as const, color: 'bg-emerald-500 text-white border-emerald-600' };
  };

  const status = getDiagnosticStatus();

  return (
    <div className="bg-white rounded-xl border border-brand-gray/15 p-5 shadow-sm h-full flex flex-col justify-between dark:bg-primary dark:border-brand-gray/10 select-none">
      
      {/* 1. SECCIÓN SUPERIOR: ESTADO DEL PROCESAMIENTO / RESULTADOS */}
      <div>
        <h3 className="font-bold text-brand-deep text-sm mb-4 border-b border-brand-gray/10 pb-3 flex items-center gap-1.5 dark:text-white">
          <Activity className="w-4.5 h-4.5 text-brand-cyan" />
          Panel Clínico de Análisis
        </h3>

        {/* Estado: IDLE */}
        {state === 'idle' && (
          <div className="flex flex-col items-center justify-center py-12 text-center text-brand-gray">
            <Activity className="w-8 h-8 opacity-40 mb-2" />
            <p className="text-xs">Espacio de trabajo listo para cargar estudio médico</p>
          </div>
        )}

        {/* Estado: UPLOADING o PROCESSING */}
        {(state === 'uploading' || state === 'processing') && (
          <div className="flex flex-col gap-4 py-8 relative scan-overlay rounded-lg border border-accent/20 bg-accent/5 p-4 overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold font-mono text-brand-cyan uppercase animate-pulse">
                {state === 'uploading' ? 'Cargando Estudio...' : 'Analizando Red Neuronal...'}
              </span>
              <span className="text-xs font-mono font-bold text-brand-deep dark:text-white">{progress}%</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-brand-deep/15 h-2 rounded-full overflow-hidden">
              <div
                style={{ width: `${progress}%` }}
                className="bg-accent h-full shadow-[0_0_8px_#00C2CB] transition-all duration-300"
              />
            </div>
            
            <p className="text-[10px] text-brand-gray/95 font-sans leading-relaxed">
              Ejecutando normalizaciones radiológicas window/level, anonimizando tags y calculando Grad-CAM...
            </p>
          </div>
        )}

        {/* Estado: ERROR */}
        {state === 'error' && (
          <div className="p-4 bg-red-50 rounded-xl border border-red-200 text-red-800 text-xs flex flex-col gap-2">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldAlert className="w-4 h-4 text-red-600" />
              <span>Diagnóstico Fallido</span>
            </div>
            <p className="text-[10px] leading-relaxed opacity-95">{error}</p>
          </div>
        )}

        {/* Estado: DONE / RESULTADOS */}
        {state === 'done' && prediction && status && (
          <div className="flex flex-col gap-5">
            {/* Resultado Chip */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] text-brand-gray uppercase font-bold tracking-wider">Hallazgo Principal</span>
              <div className="flex">
                <Badge variant={status.variant} className="text-xs px-3.5 py-1 text-center font-black">
                  {status.label}
                </Badge>
              </div>
            </div>

            {/* Latencia Inferencia */}
            <div className="flex items-center gap-2 border-b border-brand-gray/10 pb-4">
              <div className="p-2 bg-brand-deep/5 rounded-lg text-brand-cyan">
                <Zap className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <span className="block text-brand-gray text-[9px] uppercase font-bold">Latencia de Inferencia</span>
                <span className="block font-bold text-brand-deep dark:text-white font-mono mt-0.5">
                  {prediction.inference_time_ms.toFixed(1)} <span className="text-[9px] font-sans font-medium text-brand-gray">ms</span>
                </span>
              </div>
            </div>

            {/* Barra de Confianza Semántica */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-brand-deep dark:text-white">Confianza del Diagnóstico</span>
                <span className="font-bold font-mono text-brand-deep dark:text-white">
                  {(prediction.confidence * 100).toFixed(1)}%
                </span>
              </div>

              <div className="w-full bg-brand-deep/15 h-2 rounded-full overflow-hidden">
                <div
                  style={{ width: `${prediction.confidence * 100}%` }}
                  className={`h-full shadow-sm ${
                    prediction.prediction === 1
                      ? prediction.confidence >= 0.95
                        ? 'bg-red-500' // Crítico
                        : 'bg-amber-500' // Anomalía
                      : 'bg-emerald-500' // Normal
                  }`}
                />
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="flex flex-col gap-2.5 mt-2">
              <Button
                variant="primary"
                onClick={() => setIsModalOpen(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 font-bold cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                Registrar Feedback Médico
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 2. SECCIÓN INFERIOR: ADVERTENCIA CLÍNICA */}
      <div className="mt-8">
        <div className="p-3 bg-brand-deep/5 rounded-xl border border-brand-gray/10 flex items-start gap-2 text-brand-gray leading-relaxed dark:bg-primary-light/20">
          <Heart className="w-4.5 h-4.5 text-brand-cyan flex-shrink-0 mt-0.5 animate-pulse" />
          <span className="text-[10px] font-semibold text-brand-deep dark:text-white">
            <b>Soporte Diagnóstico:</b> Este sistema es un asistente computacional y **no reemplaza** el criterio clínico ni la validación de un médico radiólogo titulado.
          </span>
        </div>
      </div>

      {/* 3. MODAL DE FEEDBACK CLÍNICO (ACTIVE LEARNING) */}
      {isModalOpen && prediction && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in select-none">
          <div className="bg-white dark:bg-primary border border-brand-gray/15 rounded-xl max-w-sm w-full p-5 shadow-2xl relative">
            
            {/* Close Button */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-brand-deep/5 rounded-lg text-brand-gray hover:text-brand-deep transition-all dark:hover:bg-white/10 dark:hover:text-white cursor-pointer"
            >
              <X className="w-4.5 h-4.5" />
            </button>

            {/* Feedback form content */}
            <FeedbackSection
              predictionId={prediction.prediction_id}
              initialLabel={prediction.prediction}
              onFeedbackSubmitted={() => {
                if (onFeedbackSubmitted) onFeedbackSubmitted();
                setTimeout(() => setIsModalOpen(false), 1500);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

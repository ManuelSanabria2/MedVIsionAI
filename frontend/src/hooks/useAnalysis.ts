import { useState } from 'react';
import { medicalApi } from '../services/api';
import type { PredictionResponse } from '../services/api';

export type AnalysisState = 'idle' | 'uploading' | 'processing' | 'done' | 'error';

export interface PatientMetadata {
  patientId: string;
  modality: 'RX' | 'CT' | 'MRI';
  studyDate: string;
}

export const useAnalysis = () => {
  const [state, setState] = useState<AnalysisState>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);

  // Simulador de barra de carga clínica durante el procesamiento neuronal
  const simulateProgress = (startVal: number, targetVal: number, duration: number, callback?: () => void) => {
    let current = startVal;
    const interval = 50; // ms
    const step = (targetVal - startVal) / (duration / interval);
    
    const timer = setInterval(() => {
      current += step;
      if (current >= targetVal) {
        clearInterval(timer);
        setProgress(targetVal);
        if (callback) callback();
      } else {
        setProgress(Math.floor(current));
      }
    }, interval);

    return timer;
  };

  const sendToAPI = async (imageFile: File, metadata: PatientMetadata) => {
    setState('uploading');
    setProgress(0);
    setError(null);
    setPrediction(null);
    console.log('Procesando metadatos para el estudio:', metadata);

    // Simular carga de red inicial (0% a 30%)
    simulateProgress(0, 30, 600, () => {
      setState('processing');
      // Inferencia neural (30% a 90% en 1.5s)
      const processingTimer = simulateProgress(30, 90, 1500);

      // Iniciar llamada real al backend
      medicalApi.predictImage(imageFile)
        .then((res) => {
          clearInterval(processingTimer);
          // Completar al 100%
          simulateProgress(90, 100, 200, () => {
            setPrediction(res);
            setState('done');
          });
        })
        .catch((err: any) => {
          clearInterval(processingTimer);
          setState('error');
          console.error('Error clínico en inferencia neural:', err);
          
          // Mensaje de error formateado clínicamente
          const status = err.response?.status;
          if (status === 503) {
            setError('Servicio Diagnóstico Temporalmente Degradado. El modelo de IA está recargándose o el hardware CUDA no está disponible.');
          } else if (status === 429) {
            setError('Límite de solicitudes de análisis excedido. Por favor, espere un minuto antes de procesar otro estudio.');
          } else if (status === 400) {
            setError('Archivo de imagen inválido o corrupto. Verifique que la radiografía o archivo DICOM no esté dañado.');
          } else {
            setError('Fallo Crítico del Servidor Clínico. No se pudo establecer conexión con el pipeline de detección neural.');
          }
        });
    });
  };

  const resetAnalysis = () => {
    setState('idle');
    setProgress(0);
    setError(null);
    setPrediction(null);
  };

  return {
    state,
    progress,
    error,
    prediction,
    sendToAPI,
    resetAnalysis,
  };
};

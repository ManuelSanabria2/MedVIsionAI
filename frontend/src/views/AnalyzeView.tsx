import { useState, type FC } from 'react';
import { Dropzone } from '../components/Dropzone';
import { GradCamViewer } from '../components/GradCamViewer';
import { MetadataTable } from '../components/MetadataTable';
import { FeedbackSection } from '../components/FeedbackSection';
import { medicalApi } from '../services/api';
import type { PredictionResponse } from '../services/api';
import { Brain, RotateCcw, ShieldCheck, ShieldAlert } from 'lucide-react';

export const AnalyzeView: FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setIsLoading(true);
    setPrediction(null);
    
    try {
      const result = await medicalApi.predictImage(file);
      setPrediction(result);
    } catch (err: any) {
      console.error('Error analizando la imagen médica:', err);
      alert(err.response?.data?.detail || 'Error de conexión con la API de predicción.');
      setSelectedFile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPrediction(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-extrabold text-brand-deep dark:text-white">Analizador de Estudios Médicos</h2>
        <p className="text-xs text-brand-gray">Cargue radiografías (.png, .jpg) o archivos DICOM (.dcm) para inferencia y explicabilidad Grad-CAM.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-white rounded-xl border border-brand-gray/15 p-5 shadow-sm dark:bg-primary dark:border-brand-gray/10">
            <h3 className="text-brand-deep font-bold text-sm mb-4 dark:text-white">1. Cargar Estudio</h3>
            {!selectedFile ? (
              <Dropzone onFileSelect={handleFileSelect} isLoading={isLoading} />
            ) : (
              <div className="flex flex-col items-center justify-center p-6 border border-brand-cyan/20 bg-brand-cyan/5 rounded-xl text-center">
                <span className="block text-brand-deep font-semibold text-xs truncate max-w-full mb-1 dark:text-white">
                  {selectedFile.name}
                </span>
                <span className="block text-brand-gray text-[10px] font-mono mb-4">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </span>
                {!isLoading && (
                  <button
                    onClick={handleReset}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-deep hover:bg-brand-deep/90 text-white rounded text-xs font-semibold shadow transition-all dark:bg-accent dark:text-primary dark:hover:bg-accent-dark cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Analizar Otro Estudio
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 flex flex-col gap-6">
          {prediction ? (
            <>
              <div className={`p-5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm ${
                prediction.prediction === 1 ? 'bg-red-50/70 border-red-200 text-red-800' : 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-lg flex-shrink-0 ${
                    prediction.prediction === 1 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {prediction.prediction === 1 ? <ShieldAlert className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-bold tracking-wider opacity-85">Sugerencia Diagnóstica</span>
                    <h2 className="text-lg font-black mt-0.5 tracking-tight uppercase">
                      {prediction.prediction === 1 ? 'Anomalía Detectada' : 'Estudio Normal'}
                    </h2>
                    <p className="text-xs opacity-90 mt-1">
                      Inferencia: <span className="font-mono font-bold">{prediction.inference_time_ms.toFixed(1)} ms</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-white/60 p-3 rounded-lg border border-black/5 self-start md:self-auto shadow-sm">
                  <div className="text-right">
                    <span className="block text-[9px] uppercase font-bold text-brand-gray">Nivel de Confianza</span>
                    <span className="block text-xl font-black font-mono text-brand-deep">
                      {(prediction.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <GradCamViewer heatmapUrl={prediction.gradcam_url} originalFile={selectedFile} />
                <div className="flex flex-col gap-6">
                  <MetadataTable metadata={prediction.metadata} />
                  <FeedbackSection
                    predictionId={prediction.prediction_id}
                    initialLabel={prediction.prediction}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-brand-gray/15 shadow-sm text-center px-4 dark:bg-primary dark:border-brand-gray/10">
              <Brain className="w-8 h-8 opacity-60 text-brand-cyan mb-4" />
              <h3 className="text-brand-deep font-bold text-base mb-1 dark:text-white">Resultados de Inferencia</h3>
              <p className="text-brand-gray text-xs max-w-sm">
                Cargue una radiografía o archivo DICOM de tórax para procesarla en el pipeline neuronal de MedVision AI.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

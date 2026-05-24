import { useState, useEffect, type FC } from 'react';
import { useAnalysis } from '../hooks/useAnalysis';
import { ImageUploader } from '../components/ImageUploader';
import { ImageViewer } from '../components/ImageViewer';
import { AnalysisPanel } from '../components/AnalysisPanel';
import { Brain, FileCode, CheckCircle2 } from 'lucide-react';

export const AnalyzePage: FC = () => {
  const {
    state,
    progress,
    error,
    prediction,
    sendToAPI,
    resetAnalysis,
  } = useAnalysis();

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Manejar el archivo cargado para generar una previsualización local
  const handleUpload = (file: File, metadata: any) => {
    setSelectedFile(file);
    
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (['.png', '.jpg', '.jpeg'].includes(ext)) {
      const url = URL.createObjectURL(file);
      setImageUrl(url);
    } else {
      setImageUrl(null); // Es un DICOM, no hay preview local
    }

    sendToAPI(file, metadata);
  };

  // Liberar memoria del preview URL
  useEffect(() => {
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);

  const handleReset = () => {
    resetAnalysis();
    setSelectedFile(null);
    setImageUrl(null);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-brand-deep dark:text-white flex items-center gap-2">
            <Brain className="w-5 h-5 text-brand-cyan" />
            Workspace de Análisis Neuronal
          </h2>
          <p className="text-xs text-brand-gray">Área de diagnóstico asistido por EfficientNet-B4 y explicabilidad Grad-CAM.</p>
        </div>

        {state === 'done' && (
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-light transition-all shadow-sm flex items-center gap-1.5 dark:bg-accent dark:text-primary dark:hover:bg-accent-dark cursor-pointer"
          >
            Analizar Nuevo Estudio
          </button>
        )}
      </div>

      {/* Grid del Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Columna Izquierda: Carga de Estudios */}
        <div className="xl:col-span-1">
          {state === 'idle' ? (
            <ImageUploader onUpload={handleUpload} isLoading={false} />
          ) : (
            <div className="bg-white rounded-xl border border-brand-gray/15 p-5 shadow-sm dark:bg-primary dark:border-brand-gray/10 flex flex-col gap-4">
              <h3 className="text-brand-deep font-bold text-xs border-b border-brand-gray/10 pb-3 dark:text-white flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-brand-cyan" />
                Estudio Activo
              </h3>
              
              <div className="p-4 bg-brand-deep/5 rounded-xl border border-brand-cyan/20 text-center flex flex-col items-center">
                <span className="block font-bold text-xs text-brand-deep dark:text-white truncate max-w-full">
                  {selectedFile?.name}
                </span>
                <span className="block text-[10px] text-brand-gray font-mono mt-1">
                  Size: {((selectedFile?.size || 0) / 1024 / 1024).toFixed(2)} MB
                </span>

                {state === 'done' && (
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-150 mt-4 select-none">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Diagnóstico Completado
                  </div>
                )}
              </div>

              {state === 'done' && (
                <button
                  onClick={handleReset}
                  className="w-full py-2.5 bg-brand-deep/5 border border-brand-deep/10 text-brand-deep hover:bg-brand-deep hover:text-white rounded-lg text-xs font-bold shadow-sm transition-all dark:border-white/10 dark:text-white dark:hover:bg-white/5 cursor-pointer uppercase tracking-wider"
                >
                  Cambiar Estudio
                </button>
              )}
            </div>
          )}
        </div>

        {/* Columna Derecha / Central: ImageViewer + AnalysisPanel */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {/* ImageViewer (Ocupa 2/3 columnas en responsive) */}
            <div className="md:col-span-2">
              <ImageViewer
                imageUrl={imageUrl}
                heatmapUrl={prediction ? prediction.gradcam_url : null}
              />
            </div>

            {/* AnalysisPanel (Ocupa 1/3 en responsive) */}
            <div className="md:col-span-1">
              <AnalysisPanel
                state={state}
                progress={progress}
                error={error}
                prediction={prediction}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default AnalyzePage;

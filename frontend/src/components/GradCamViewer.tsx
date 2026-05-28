import { useState, useEffect, type FC } from 'react';
import { Eye, Layers, Percent } from 'lucide-react';

interface GradCamViewerProps {
  heatmapUrl: string | null;
  originalFile: File | null;
  className?: string;
}

export const GradCamViewer: FC<GradCamViewerProps> = ({
  heatmapUrl,
  originalFile,
  className = '',
}) => {
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [isDicom, setIsDicom] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'slider' | 'side-by-side'>('slider');

  useEffect(() => {
    if (!originalFile) {
      setOriginalUrl(null);
      return;
    }

    const ext = originalFile.name.substring(originalFile.name.lastIndexOf('.')).toLowerCase();
    const dicomExts = ['.dcm', '.dicom'];
    
    if (dicomExts.includes(ext)) {
      setIsDicom(true);
      setOriginalUrl(null);
    } else {
      setIsDicom(false);
      const url = URL.createObjectURL(originalFile);
      setOriginalUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [originalFile]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSliderPosition(Number(e.target.value));
  };

  const getFullHeatmapUrl = (url: string) => {
    if (url.startsWith('http')) return url;
    const normalized = url.replace(/\\/g, '/').replace(/^static/, '/static');
    return normalized.startsWith('/api') ? normalized : `/api${normalized}`;
  };

  if (!heatmapUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-80 bg-brand-deep/5 rounded-xl border border-brand-gray/10 text-brand-gray">
        <Eye className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-sm">El mapa de calor Grad-CAM aparecerá aquí tras el análisis</p>
      </div>
    );
  }

  const fullHeatmapUrl = getFullHeatmapUrl(heatmapUrl);

  return (
    <div className={`flex flex-col bg-white rounded-xl border border-brand-gray/15 p-5 shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-4 border-b border-brand-gray/10 pb-3">
        <div>
          <h4 className="font-semibold text-brand-deep text-sm flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-cyan" />
            Mapa de Calor Explicativo (Grad-CAM)
          </h4>
          <p className="text-brand-gray text-xs">Resalta las regiones convolucionales de mayor influencia diagnóstica</p>
        </div>

        {!isDicom && originalUrl && (
          <div className="flex bg-brand-deep/5 rounded-lg p-0.5 border border-brand-gray/10">
            <button
              onClick={() => setViewMode('slider')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                viewMode === 'slider'
                  ? 'bg-brand-deep text-white shadow-sm'
                  : 'text-brand-gray hover:text-brand-deep'
              }`}
            >
              Control Deslizante
            </button>
            <button
              onClick={() => setViewMode('side-by-side')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                viewMode === 'side-by-side'
                  ? 'bg-brand-deep text-white shadow-sm'
                  : 'text-brand-gray hover:text-brand-deep'
              }`}
            >
              Paralelo
            </button>
          </div>
        )}
      </div>

      {isDicom || !originalUrl ? (
        // Caso DICOM: no podemos previsualizar el original directamente en navegador
        <div className="relative flex flex-col items-center justify-center bg-black rounded-lg p-4 overflow-hidden border border-brand-gray/10 select-none">
          <img
            src={fullHeatmapUrl}
            alt="Grad-CAM DICOM overlay"
            className="max-h-[380px] object-contain rounded-md"
          />
          <div className="absolute bottom-6 left-6 bg-brand-deep/80 text-brand-white text-xs px-2.5 py-1 rounded border border-brand-cyan/20 backdrop-blur-sm">
            Estudio DICOM (Heatmap Compuesto)
          </div>
        </div>
      ) : viewMode === 'slider' ? (
        // Modo Slider Interactivo (PNG / JPEG)
        <div className="relative flex flex-col items-center select-none">
          <div className="relative w-full max-w-[400px] h-[380px] bg-black rounded-lg overflow-hidden border border-brand-gray/10">
            {/* Imagen Original debajo */}
            <img
              src={originalUrl}
              alt="Original"
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Imagen Grad-CAM arriba con clip-path */}
            <img
              src={fullHeatmapUrl}
              alt="Grad-CAM"
              style={{ clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` }}
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Línea divisoria */}
            <div
              style={{ left: `${sliderPosition}%` }}
              className="absolute top-0 bottom-0 w-0.5 bg-brand-cyan shadow-[0_0_10px_#00C2CB] pointer-events-none"
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-brand-cyan border-2 border-white flex items-center justify-center text-brand-deep shadow-lg">
                ↔
              </div>
            </div>
          </div>

          {/* Slider input */}
          <div className="w-full max-w-[400px] mt-4 flex items-center gap-3">
            <span className="text-xs text-brand-gray font-medium">Original</span>
            <input
              type="range"
              min="0"
              max="100"
              value={sliderPosition}
              onChange={handleSliderChange}
              className="flex-grow accent-brand-cyan bg-brand-deep/10 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-xs text-brand-cyan font-bold flex items-center gap-0.5">
              Grad-CAM <Percent className="w-3 h-3 inline" />
            </span>
          </div>
        </div>
      ) : (
        // Modo Side by Side (PNG / JPEG)
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col items-center">
            <div className="w-full aspect-square max-h-[280px] bg-black rounded-lg overflow-hidden border border-brand-gray/10">
              <img
                src={originalUrl}
                alt="Original"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-xs text-brand-gray mt-2 font-medium">Radiografía Original</span>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-full aspect-square max-h-[280px] bg-black rounded-lg overflow-hidden border border-brand-gray/10">
              <img
                src={fullHeatmapUrl}
                alt="Grad-CAM Map"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-xs text-brand-cyan mt-2 font-semibold flex items-center gap-1">
              Atención del Modelo
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useRef } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, HelpCircle, Layers } from 'lucide-react';

interface GradCAMComparisonProps {
  imageUrl: string | null;
  heatmapUrl: string | null;
}

export const GradCAMComparison: React.FC<GradCAMComparisonProps> = ({
  imageUrl,
  heatmapUrl,
}) => {
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  
  const [isDraggingImage, setIsDraggingImage] = useState<boolean>(false);
  const [isDraggingSlider, setIsDraggingSlider] = useState<boolean>(false);
  
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Soportar zoom con rueda del ratón
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    setZoom((prev) => Math.min(Math.max(prev * zoomFactor, 0.8), 5));
  };

  // Manejar el inicio del arrastre de la imagen o del slider
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Solo clic izquierdo

    // Verificar si hizo clic cerca del slider central
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const sliderX = (sliderPosition / 100) * rect.width;

      if (Math.abs(clickX - sliderX) < 15) {
        setIsDraggingSlider(true);
        e.preventDefault();
        return;
      }
    }

    // Si no, iniciar arrastre de la imagen (Pan)
    setIsDraggingImage(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingSlider && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.min(Math.max((x / rect.width) * 100, 0), 100);
      setSliderPosition(percentage);
    } else if (isDraggingImage) {
      setPan({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDraggingImage(false);
    setIsDraggingSlider(false);
  };

  const resetViewport = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSliderPosition(50);
  };

  // fallback para demo si no hay radiografía original disponible
  const demoOriginal = imageUrl || 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=400&auto=format&fit=crop';
  const normalizedHeatmapUrl = heatmapUrl?.replace(/\\/g, '/').replace(/^static/, '/static');
  const fullHeatmapUrl = normalizedHeatmapUrl
    ? (normalizedHeatmapUrl.startsWith('http') || normalizedHeatmapUrl.startsWith('/api')
      ? normalizedHeatmapUrl
      : `/api${normalizedHeatmapUrl}`)
    : demoOriginal;

  return (
    <div className="flex flex-col bg-white rounded-xl border border-brand-gray/15 p-5 shadow-sm dark:bg-primary dark:border-brand-gray/10 select-none">
      {/* Barra de Control superior */}
      <div className="flex items-center justify-between border-b border-brand-gray/10 pb-4 mb-4 select-none">
        <h4 className="font-semibold text-brand-deep text-sm flex items-center gap-2 dark:text-white">
          <Layers className="w-4.5 h-4.5 text-brand-cyan" />
          Visor Comparativo Sincronizado (Wipe Slider)
        </h4>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <button
            onClick={() => setZoom((z) => Math.min(z + 0.3, 5))}
            className="p-1.5 bg-brand-white hover:bg-brand-gray/10 border border-brand-gray/10 rounded-lg text-brand-deep hover:text-brand-cyan dark:bg-primary-light dark:border-white/10 dark:text-white cursor-pointer"
            title="Acercar"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.3, 0.8))}
            className="p-1.5 bg-brand-white hover:bg-brand-gray/10 border border-brand-gray/10 rounded-lg text-brand-deep hover:text-brand-cyan dark:bg-primary-light dark:border-white/10 dark:text-white cursor-pointer"
            title="Alejar"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={resetViewport}
            className="p-1.5 bg-brand-white hover:bg-brand-gray/10 border border-brand-gray/10 rounded-lg text-brand-deep hover:text-brand-cyan dark:bg-primary-light dark:border-white/10 dark:text-white cursor-pointer"
            title="Resetear Vista"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Wipe Slider Viewport */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`h-[420px] bg-black rounded-lg relative overflow-hidden border border-brand-gray/15 flex items-center justify-center ${
          isDraggingSlider ? 'cursor-col-resize' : isDraggingImage ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        {/* IMAGEN 1: ORIGINAL (Lado izquierdo, visible según sliderPosition) */}
        <div
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
          }}
          className="absolute w-full h-full flex items-center justify-center transition-transform duration-75 pointer-events-none origin-center"
        >
          <img
            src={demoOriginal}
            alt="Original"
            className="max-h-full max-w-full object-contain"
          />
        </div>

        {/* IMAGEN 2: GRAD-CAM (Lado derecho, revelada con clipPath sincronizado espacialmente) */}
        <div
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            clipPath: `polygon(${sliderPosition}% 0, 100% 0, 100% 100%, ${sliderPosition}% 100%)`,
          }}
          className="absolute w-full h-full flex items-center justify-center transition-transform duration-75 pointer-events-none origin-center z-10"
        >
          <img
            src={fullHeatmapUrl}
            alt="Grad-CAM Overlay"
            className="max-h-full max-w-full object-contain"
          />
        </div>

        {/* Barra del Slider Wipe divisoria interactiva */}
        <div
          style={{ left: `${sliderPosition}%` }}
          className="absolute top-0 bottom-0 w-1 bg-brand-cyan hover:bg-accent-dark shadow-[0_0_12px_#00C2CB] z-20 cursor-col-resize flex items-center justify-center"
        >
          <div className="w-7 h-7 rounded-full bg-accent border-2 border-white flex items-center justify-center text-primary font-bold shadow-lg select-none text-[10px]">
            ↔
          </div>
        </div>

        {/* Etiquetas de Estado en esquinas */}
        <div className="absolute bottom-4 left-4 bg-brand-deep/80 text-white text-[9px] font-bold px-2 py-0.5 rounded backdrop-blur-sm border border-white/10 pointer-events-none select-none z-30 uppercase tracking-wide">
          Original
        </div>
        <div className="absolute bottom-4 right-4 bg-accent/80 text-primary text-[9px] font-bold px-2 py-0.5 rounded backdrop-blur-sm border border-accent/25 pointer-events-none select-none z-30 uppercase tracking-wide">
          Grad-CAM Revelado
        </div>
      </div>

      <div className="mt-3 flex items-start gap-2 p-2.5 bg-brand-white rounded border border-brand-gray/10 text-[9px] text-brand-gray leading-relaxed dark:bg-primary-light/10 select-none">
        <HelpCircle className="w-4 h-4 text-brand-cyan flex-shrink-0 mt-0.5" />
        <div>
          <b>Instructivo del Wipe:</b> Arrastre la barra cian central de izquierda a derecha para realizar la comparación. Use el <b>scroll del ratón</b> para hacer zoom simultáneo y arrastre la imagen con el cursor para desplazarse (Pan) sobre detalles patológicos.
        </div>
      </div>
    </div>
  );
};
export default GradCAMComparison;

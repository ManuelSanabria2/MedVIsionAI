import React, { useState, useRef } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Eye, EyeOff, Edit3, Sun, Contrast, Trash } from 'lucide-react';

interface ImageViewerProps {
  imageUrl: string | null;
  heatmapUrl: string | null;
  className?: string;
}

interface BoundingBox {
  id: string;
  startX: number;
  startY: number;
  width: number;
  height: number;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  imageUrl,
  heatmapUrl,
  className = '',
}) => {
  // Ajustes de Imagen
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);

  // Estados visuales y de herramientas
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [activeTool, setActiveTool] = useState<'move' | 'annotate'>('move');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Anotaciones clínicas
  const [annotations, setAnnotations] = useState<BoundingBox[]>([]);
  const [currentBox, setCurrentBox] = useState<Partial<BoundingBox> | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Manejar Zoom con scroll de ratón
  const handleWheel = (e: React.WheelEvent) => {
    if (activeTool !== 'move') return;
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((prev) => Math.min(Math.max(prev * zoomFactor, 0.8), 5));
  };

  // Manejar arrastre (Pan) y dibujo de anotaciones
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Solo clic izquierdo
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === 'move') {
      setIsDragging(true);
      dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    } else if (activeTool === 'annotate') {
      setIsDragging(true);
      setCurrentBox({
        id: 'box-' + Math.random().toString(36).substring(2, 9),
        startX: x,
        startY: y,
        width: 0,
        height: 0,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    if (activeTool === 'move') {
      setPan({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y,
      });
    } else if (activeTool === 'annotate' && currentBox) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setCurrentBox({
        ...currentBox,
        width: x - (currentBox.startX || 0),
        height: y - (currentBox.startY || 0),
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (activeTool === 'annotate' && currentBox) {
      const finalBox = currentBox as BoundingBox;
      // Registrar la caja solo si tiene dimensiones mínimas
      if (Math.abs(finalBox.width) > 5 && Math.abs(finalBox.height) > 5) {
        // Corregir dimensiones negativas
        const correctedBox: BoundingBox = {
          id: finalBox.id,
          startX: finalBox.width < 0 ? finalBox.startX + finalBox.width : finalBox.startX,
          startY: finalBox.height < 0 ? finalBox.startY + finalBox.height : finalBox.startY,
          width: Math.abs(finalBox.width),
          height: Math.abs(finalBox.height),
        };
        setAnnotations((prev) => [...prev, correctedBox]);
      }
      setCurrentBox(null);
    }
  };

  const resetFilters = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setBrightness(100);
    setContrast(100);
    setAnnotations([]);
  };

  return (
    <div className={`flex flex-col bg-white rounded-xl border border-brand-gray/15 p-5 shadow-sm dark:bg-primary dark:border-brand-gray/10 ${className}`}>
      {/* Barra de Herramientas superior */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-gray/10 pb-4 mb-4 select-none">
        <div className="flex items-center gap-1.5 bg-brand-deep/5 rounded-lg p-0.5 border border-brand-gray/10 dark:bg-primary-light/20">
          <button
            onClick={() => setActiveTool('move')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
              activeTool === 'move'
                ? 'bg-brand-deep text-white shadow-sm dark:bg-accent dark:text-primary'
                : 'text-brand-gray hover:text-brand-deep'
            }`}
          >
            Navegar (Pan/Zoom)
          </button>
          <button
            onClick={() => setActiveTool('annotate')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
              activeTool === 'annotate'
                ? 'bg-brand-deep text-white shadow-sm dark:bg-accent dark:text-primary'
                : 'text-brand-gray hover:text-brand-deep'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            Anotar Región
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <button
            onClick={() => setZoom((z) => Math.min(z + 0.2, 5))}
            className="p-2 bg-brand-white hover:bg-brand-gray/10 border border-brand-gray/10 rounded-lg text-brand-deep hover:text-brand-cyan transition-all dark:bg-primary-light dark:border-white/10 dark:text-white cursor-pointer"
            title="Acercar (Zoom In)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.2, 0.8))}
            className="p-2 bg-brand-white hover:bg-brand-gray/10 border border-brand-gray/10 rounded-lg text-brand-deep hover:text-brand-cyan transition-all dark:bg-primary-light dark:border-white/10 dark:text-white cursor-pointer"
            title="Alejar (Zoom Out)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          {/* Toggle Heatmap */}
          {heatmapUrl && (
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center gap-1 text-xs font-bold ${
                showHeatmap
                  ? 'bg-accent/15 border-accent text-brand-cyan shadow-sm'
                  : 'bg-brand-white border-brand-gray/15 text-brand-gray hover:text-brand-deep'
              }`}
              title="Mostrar/Ocultar Grad-CAM"
            >
              {showHeatmap ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              Grad-CAM
            </button>
          )}

          {/* Reset Filters */}
          <button
            onClick={resetFilters}
            className="p-2 bg-brand-white hover:bg-brand-gray/10 border border-brand-gray/10 rounded-lg text-brand-deep hover:text-brand-cyan transition-all dark:bg-primary-light dark:border-white/10 dark:text-white cursor-pointer"
            title="Resetear Filtros y Navegación"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Visor e Indicador de gradiente */}
      <div className="flex gap-4 items-stretch select-none">
        {/* Visor central de imagen */}
        <div
          ref={containerRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className={`flex-grow h-[350px] bg-black rounded-lg relative overflow-hidden border border-brand-gray/15 flex items-center justify-center select-none ${
            activeTool === 'move' ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'
          }`}
        >
          {imageUrl ? (
            <div
              style={{
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                filter: `brightness(${brightness}%) contrast(${contrast}%)`,
              }}
              className="absolute w-full h-full flex items-center justify-center transition-transform duration-75 origin-center pointer-events-none"
            >
              {/* Imagen base */}
              <img
                ref={imageRef}
                src={imageUrl}
                alt="Radiografía base"
                className="max-h-full max-w-full object-contain"
              />

              {/* Overlay Grad-CAM */}
              {heatmapUrl && showHeatmap && (
                <img
                  src={heatmapUrl.startsWith('http') ? heatmapUrl : `/api${heatmapUrl}`}
                  alt="Grad-CAM Overlay"
                  className="absolute max-h-full max-w-full object-contain mix-blend-screen opacity-70 transition-opacity"
                />
              )}
            </div>
          ) : (
            <div className="text-xs text-brand-gray">Cargue un estudio médico en el cargador para iniciar</div>
          )}

          {/* Overlay SVG para dibujo de Anotaciones manuales */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
            {annotations.map((box) => (
              <g key={box.id}>
                <rect
                  x={box.startX}
                  y={box.startY}
                  width={box.width}
                  height={box.height}
                  fill="rgba(0, 194, 203, 0.05)"
                  stroke="#00C2CB"
                  strokeWidth="2"
                  strokeDasharray="4"
                />
                <foreignObject
                  x={box.startX}
                  y={box.startY - 20}
                  width="120"
                  height="20"
                  className="overflow-visible"
                >
                  <div className="flex items-center gap-1">
                    <span className="bg-accent text-primary font-mono font-bold text-[8px] px-1 py-0.5 rounded shadow">
                      MARCA CLÍNICA
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setAnnotations((prev) => prev.filter((b) => b.id !== box.id));
                      }}
                      className="p-0.5 bg-danger text-white rounded cursor-pointer pointer-events-auto hover:bg-red-600"
                    >
                      <Trash className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </foreignObject>
              </g>
            ))}
            
            {/* Dibujado de caja en progreso */}
            {activeTool === 'annotate' && isDragging && currentBox && (
              <rect
                x={currentBox.width! < 0 ? currentBox.startX! + currentBox.width! : currentBox.startX}
                y={currentBox.height! < 0 ? currentBox.startY! + currentBox.height! : currentBox.startY}
                width={Math.abs(currentBox.width!)}
                height={Math.abs(currentBox.height!)}
                fill="rgba(0, 194, 203, 0.15)"
                stroke="#00C2CB"
                strokeWidth="2"
              />
            )}
          </svg>
        </div>

        {/* Barra lateral de gradiente de calor Grad-CAM */}
        {heatmapUrl && showHeatmap && (
          <div className="w-10 bg-brand-deep/5 rounded-lg border border-brand-gray/10 p-2 flex flex-col items-center justify-between text-[9px] font-bold font-mono text-brand-gray shrink-0 dark:bg-primary-light/20">
            <span className="text-red-500 uppercase tracking-widest leading-none rotate-90 my-2 select-none">Fuerte</span>
            <div className="w-2.5 flex-grow bg-gradient-to-t from-blue-600 via-yellow-500 to-red-600 rounded-full" />
            <span className="text-blue-500 uppercase tracking-widest leading-none rotate-90 my-2 select-none">Sutil</span>
          </div>
        )}
      </div>

      {/* Sliders de Brillo y Contraste */}
      {imageUrl && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4 border-t border-brand-gray/10 pt-4 text-xs select-none">
          <div className="flex items-center gap-3">
            <Sun className="w-4 h-4 text-brand-gray shrink-0" />
            <span className="w-16 font-semibold text-brand-deep dark:text-white">Brillo</span>
            <input
              type="range"
              min="50"
              max="150"
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              className="flex-grow accent-brand-cyan h-1.5 rounded-lg bg-brand-deep/10 appearance-none cursor-pointer"
            />
            <span className="font-mono w-8 text-right font-bold text-brand-deep dark:text-white">
              {brightness}%
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Contrast className="w-4 h-4 text-brand-gray shrink-0" />
            <span className="w-16 font-semibold text-brand-deep dark:text-white">Contraste</span>
            <input
              type="range"
              min="50"
              max="150"
              value={contrast}
              onChange={(e) => setContrast(Number(e.target.value))}
              className="flex-grow accent-brand-cyan h-1.5 rounded-lg bg-brand-deep/10 appearance-none cursor-pointer"
            />
            <span className="font-mono w-8 text-right font-bold text-brand-deep dark:text-white">
              {contrast}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

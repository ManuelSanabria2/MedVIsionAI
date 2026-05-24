import React, { useState, useEffect, useRef } from 'react';
import { X, Download, Printer, FileText, Loader2, Heart } from 'lucide-react';
import { Button } from './ui/Button';
import { reportGenerator } from '../services/reportGenerator';
import type { PredictionLogItem } from '../services/api';
import type { User } from '../types/auth';

interface ReportPreviewProps {
  data: PredictionLogItem | null;
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  clinicalNotes: string | null;
  correctedClass: number | null;
  isAgreed: boolean;
}

export const ReportPreview: React.FC<ReportPreviewProps> = ({
  data,
  user,
  isOpen,
  onClose,
  clinicalNotes,
  correctedClass,
  isAgreed,
}) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState<boolean>(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (isOpen && data) {
      setIsCompiling(true);
      setPdfUrl(null);

      const compileReport = async () => {
        try {
          // Generar el blob binario del PDF
          const blob = await reportGenerator.generateBlob(
            data,
            user,
            clinicalNotes,
            correctedClass,
            isAgreed
          );
          
          // Crear la URL temporal para incrustar
          const url = URL.createObjectURL(blob);
          setPdfUrl(url);
        } catch (err) {
          console.error('[Report Generator] Error compilando PDF:', err);
          alert('No se pudo generar el reporte PDF. Por favor, intente de nuevo.');
          onClose();
        } finally {
          setIsCompiling(false);
        }
      };

      compileReport();
    }

    // Limpieza de memoria al desmontar
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [isOpen, data, user, clinicalNotes, correctedClass, isAgreed]);

  if (!isOpen || !data) return null;

  const handleDownload = () => {
    if (!pdfUrl) return;
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `reporte_medvision_${data.id.substring(0, 8)}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    if (iframeRef.current) {
      // Invocar diálogo de impresión nativo del navegador sobre el iframe incrustado
      iframeRef.current.contentWindow?.focus();
      iframeRef.current.contentWindow?.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/80 backdrop-blur-sm animate-fade-in font-sans">
      <div
        className="w-full max-w-4xl h-[90vh] bg-white rounded-2xl border border-brand-gray/15 overflow-hidden shadow-2xl dark:bg-primary dark:border-brand-gray/10 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Superior del Reporte */}
        <div className="p-5 border-b border-brand-gray/10 flex items-center justify-between bg-primary text-white select-none">
          <div className="flex items-center gap-2">
            <FileText className="w-5.5 h-5.5 text-brand-cyan" />
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-wide">
                Vista Previa del Reporte PDF
              </h3>
              <span className="block text-[10px] text-brand-gray">
                Estudio: <span className="font-mono text-brand-cyan font-bold">{data.id}</span>
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Imprimir */}
            <button
              onClick={handlePrint}
              disabled={isCompiling || !pdfUrl}
              className={`p-2 hover:bg-white/10 rounded-lg transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold ${
                isCompiling ? 'text-brand-gray/40 cursor-not-allowed' : 'text-brand-gray hover:text-white'
              }`}
              title="Imprimir Reporte"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
            {/* Descargar */}
            <button
              onClick={handleDownload}
              disabled={isCompiling || !pdfUrl}
              className={`p-2 hover:bg-white/10 rounded-lg transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold ${
                isCompiling ? 'text-brand-gray/40 cursor-not-allowed' : 'text-brand-gray hover:text-white'
              }`}
              title="Descargar PDF"
            >
              <Download className="w-4 h-4" />
              Descargar
            </button>
            {/* Cerrar */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg text-brand-gray hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Workspace del Pre-visualizador */}
        <div className="flex-grow bg-brand-gray/5 dark:bg-black/35 relative flex items-center justify-center">
          {isCompiling ? (
            <div className="flex flex-col items-center gap-2.5 select-none text-brand-deep dark:text-white">
              <Loader2 className="w-9 h-9 text-brand-cyan animate-spin" />
              <span className="text-xs font-extrabold tracking-wide uppercase">Compilando Documento Clínico...</span>
              <span className="text-[10px] text-brand-gray">Dibujando placas y metadatos DICOM en el lienzo PDF</span>
            </div>
          ) : pdfUrl ? (
            <iframe
              ref={iframeRef}
              src={pdfUrl}
              title="MedVision Report Preview"
              className="w-full h-full border-none bg-white"
            />
          ) : (
            <span className="text-xs text-red-500 font-bold select-none">
              Error cargando el visualizador PDF.
            </span>
          )}
        </div>

        {/* Footer Normativo */}
        <div className="p-4 bg-brand-white dark:bg-primary-light/5 border-t border-brand-gray/10 flex flex-col md:flex-row md:items-center justify-between gap-4 select-none">
          <div className="flex items-start gap-2 max-w-xl text-[9px] text-brand-gray leading-snug">
            <Heart className="w-4 h-4 text-brand-cyan flex-shrink-0 mt-0.5 animate-pulse" />
            <span>
              <b>Aviso de Responsabilidad FDA:</b> La visualización en pantalla y descarga PDF representan una firma digitalizada de auditoría clínica de apoyo diagnóstico basada en redes EfficientNet. Verifique e interprete siempre con profesional facultado.
            </span>
          </div>

          <Button
            variant="secondary"
            onClick={onClose}
            className="self-end md:self-auto px-4 py-2 border border-brand-gray/20 rounded-lg text-xs font-semibold cursor-pointer"
          >
            Cerrar Preview
          </Button>
        </div>
      </div>
    </div>
  );
};
export default ReportPreview;

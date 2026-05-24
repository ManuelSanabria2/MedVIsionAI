import { useState, useRef } from 'react';
import { Upload, ShieldAlert, FileCode } from 'lucide-react';

interface DropzoneProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
}

export const Dropzone: React.FC<DropzoneProps> = ({ onFileSelect, isLoading }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedExtensions = ['.dcm', '.dicom', '.png', '.jpg', '.jpeg'];

  const validateFile = (file: File): boolean => {
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      setErrorMessage(`Formato no soportado. Tipos permitidos: DICOM, PNG, JPG.`);
      return false;
    }
    setErrorMessage(null);
    return true;
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (isLoading) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        onFileSelect(file);
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLoading) return;

    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        onFileSelect(file);
      }
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <div
        className={`relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl transition-all duration-300 ${
          isDragActive
            ? 'border-brand-cyan bg-brand-cyan/5 scale-[1.01]'
            : 'border-brand-gray/30 hover:border-brand-cyan/50 hover:bg-brand-white/50'
        } ${isLoading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".dcm,.dicom,.png,.jpg,.jpeg"
          onChange={handleFileInput}
          disabled={isLoading}
        />

        {isLoading ? (
          <div className="flex flex-col items-center py-6">
            <div className="w-12 h-12 border-4 border-brand-cyan border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-brand-deep font-medium">Analizando imagen médica...</p>
            <p className="text-brand-gray text-xs mt-1">Extrayendo metadatos, prediciendo y calculando Grad-CAM</p>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center py-6">
            <div className="p-4 bg-brand-deep/5 rounded-full text-brand-deep mb-4 transition-transform hover:scale-110">
              <Upload className="w-8 h-8 text-brand-deep" />
            </div>
            <p className="text-brand-deep font-semibold text-base mb-1">
              Arrastra y suelta tu estudio radiográfico o DICOM
            </p>
            <p className="text-brand-gray text-sm mb-4">
              Soporta archivos .dcm, .dicom, .png, .jpg, .jpeg
            </p>
            <button
              type="button"
              className="px-5 py-2.5 bg-brand-deep text-white font-medium text-sm rounded-lg hover:bg-brand-deep/90 shadow transition-all duration-200"
              disabled={isLoading}
            >
              Seleccionar Archivo
            </button>
            <div className="flex items-center gap-2 mt-6 text-xs text-brand-gray bg-brand-white p-2 rounded border border-brand-gray/10">
              <FileCode className="w-3.5 h-3.5 text-brand-cyan" />
              <span>La anonimización DICOM se ejecuta en el preprocesador cumpliendo la <b>Ley 1581</b>.</span>
            </div>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 mt-3 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
          <ShieldAlert className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};

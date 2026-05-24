import React, { useState, useRef } from 'react';
import { UploadCloud, FileCode, Trash2, Calendar, ShieldCheck, Tag } from 'lucide-react';
import type { PatientMetadata } from '../hooks/useAnalysis';

interface ImageUploaderProps {
  onUpload: (file: File, metadata: PatientMetadata) => void;
  isLoading: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onUpload, isLoading }) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Metadatos Clínicos
  const [patientId, setPatientId] = useState<string>('');
  const [modality, setModality] = useState<'RX' | 'CT' | 'MRI'>('RX');
  const [studyDate, setStudyDate] = useState<string>(() => new Date().toISOString().substring(0, 10));

  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedExtensions = ['.dcm', '.dicom', '.png', '.jpg', '.jpeg'];
  const maxFileSize = 50 * 1024 * 1024; // 50MB

  const validateAndSetFile = (selectedFile: File) => {
    const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
    
    if (!allowedExtensions.includes(ext)) {
      setErrorMessage(`Formato no compatible. Permitidos: DICOM, PNG, JPG.`);
      return;
    }

    if (selectedFile.size > maxFileSize) {
      setErrorMessage(`El archivo excede el límite de tamaño de 50MB.`);
      return;
    }

    setErrorMessage(null);
    setFile(selectedFile);

    // Generar preview para imágenes estándar
    if (['.png', '.jpg', '.jpeg'].includes(ext)) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null); // Es un DICOM, no hay preview nativo
    }

    // Auto-generar Patient ID de forma segura y anonimizada si está vacío
    if (!patientId) {
      const hash = Math.random().toString(36).substring(2, 8).toUpperCase();
      setPatientId(`MV-${hash}`);
    }
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
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setFile(null);
    setPreviewUrl(null);
    setErrorMessage(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    onUpload(file, {
      patientId: patientId || 'ANONYMOUS',
      modality,
      studyDate,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 text-xs">
      {/* Zona de Dropzone */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => !file && !isLoading && fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl transition-all duration-300 ${
          isDragActive
            ? 'border-accent bg-accent/5 scale-[1.01]'
            : 'border-brand-gray/30 hover:border-accent/60 hover:bg-brand-white/50'
        } ${file ? 'cursor-default' : 'cursor-pointer'} ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          data-testid="file-input"
          className="hidden"
          accept=".dcm,.dicom,.png,.jpg,.jpeg"
          onChange={(e) => e.target.files?.[0] && validateAndSetFile(e.target.files[0])}
          disabled={isLoading}
        />

        {file ? (
          <div className="w-full relative flex flex-col items-center py-4 select-none">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Radiografía cargada"
                className="max-h-[160px] object-cover rounded-lg border border-brand-gray/15 mb-3"
              />
            ) : (
              <div className="p-4 bg-brand-deep/5 rounded-full text-brand-deep mb-3 dark:text-accent">
                <FileCode className="w-10 h-10" />
              </div>
            )}

            <span className="block font-bold text-brand-deep dark:text-white truncate max-w-[200px] mb-0.5">
              {file.name}
            </span>
            <span className="block text-[10px] text-brand-gray font-mono mb-4">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </span>

            {!isLoading && (
              <button
                type="button"
                onClick={removeFile}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-danger/10 hover:bg-danger text-danger hover:text-white rounded border border-danger/20 transition-all font-semibold cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remover Archivo
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center text-center py-6 select-none">
            <div className="p-3 bg-brand-deep/5 rounded-full text-brand-deep mb-3 dark:text-accent">
              <UploadCloud className="w-8 h-8" />
            </div>
            <p className="text-brand-deep font-bold text-xs dark:text-white">
              Cargar Estudio Radiográfico
            </p>
            <p className="text-brand-gray text-[10px] mt-1 mb-4 leading-relaxed">
              Arrastra tu archivo aquí o haz clic para explorar.
              <br />
              Formatos: DICOM (.dcm), PNG, JPG (máx. 50MB)
            </p>
          </div>
        )}

        {errorMessage && (
          <div className="mt-3 p-2 bg-danger/10 border border-danger/25 text-danger rounded text-[10px] font-semibold w-full text-center">
            {errorMessage}
          </div>
        )}
      </div>

      {/* Inputs de Metadatos Clínicos */}
      <div className="bg-white rounded-xl border border-brand-gray/15 p-4 shadow-sm dark:bg-primary dark:border-brand-gray/10 flex flex-col gap-4">
        <h4 className="font-bold text-brand-deep text-xs border-b border-brand-gray/10 pb-2 flex items-center gap-1.5 dark:text-white">
          <Tag className="w-4 h-4 text-brand-cyan" />
          Metadatos Clínicos (Habeas Data)
        </h4>

        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-brand-deep dark:text-white font-semibold mb-1">
              ID Paciente (Anonimizado)
            </label>
            <input
              type="text"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              placeholder="MV-XXXXXX"
              disabled={isLoading}
              className="w-full p-2 bg-brand-white border border-brand-gray/25 rounded-lg focus:border-accent focus:outline-none transition-all dark:bg-primary-light dark:border-white/10 dark:text-white font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-brand-deep dark:text-white font-semibold mb-1">
                Modalidad
              </label>
              <select
                value={modality}
                onChange={(e) => setModality(e.target.value as any)}
                disabled={isLoading}
                className="w-full p-2 bg-brand-white border border-brand-gray/25 rounded-lg focus:border-accent focus:outline-none transition-all dark:bg-primary-light dark:border-white/10 dark:text-white font-medium"
              >
                <option value="RX">Radiografía (RX)</option>
                <option value="CT">Tomografía (CT)</option>
                <option value="MRI">Resonancia (MRI)</option>
              </select>
            </div>

            <div>
              <label className="block text-brand-deep dark:text-white font-semibold mb-1 flex items-center gap-0.5">
                <Calendar className="w-3 h-3 text-brand-cyan" />
                Fecha Estudio
              </label>
              <input
                type="date"
                value={studyDate}
                onChange={(e) => setStudyDate(e.target.value)}
                disabled={isLoading}
                className="w-full p-1.5 bg-brand-white border border-brand-gray/25 rounded-lg focus:border-accent focus:outline-none transition-all dark:bg-primary-light dark:border-white/10 dark:text-white font-mono"
              />
            </div>
          </div>
        </div>

        <div className="flex items-start gap-1.5 p-2 bg-brand-white rounded border border-brand-gray/10 text-[9px] text-brand-gray leading-relaxed dark:bg-primary-light/20">
          <ShieldCheck className="w-4 h-4 text-brand-cyan flex-shrink-0" />
          <span>
            <b>Anonimización Activa:</b> Cumplimiento regulatorio de Habeas Data **Ley 1581**.
          </span>
        </div>
      </div>

      <button
        type="submit"
        disabled={!file || isLoading}
        className={`w-full py-3 text-center text-xs font-bold rounded-lg shadow-md transition-all text-white cursor-pointer select-none uppercase tracking-wide ${
          !file || isLoading
            ? 'bg-brand-deep/50 text-white/50 cursor-not-allowed'
            : 'bg-brand-deep hover:bg-brand-deep/90 dark:bg-accent dark:text-primary dark:hover:bg-accent-dark'
        }`}
      >
        {isLoading ? 'Analizando Estudio...' : 'Iniciar Análisis Diagnóstico'}
      </button>
    </form>
  );
};

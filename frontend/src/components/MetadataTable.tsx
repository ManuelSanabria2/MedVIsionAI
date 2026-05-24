import { type FC } from 'react';
import { Database, ShieldAlert } from 'lucide-react';

interface MetadataTableProps {
  metadata: Record<string, any> | null;
  className?: string;
}

export const MetadataTable: FC<MetadataTableProps> = ({ metadata, className = '' }) => {
  if (!metadata || Object.keys(metadata).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-brand-deep/5 rounded-xl border border-brand-gray/10 text-brand-gray text-xs">
        <Database className="w-6 h-6 mb-1.5 opacity-50" />
        <span>No hay metadatos DICOM disponibles para este estudio</span>
      </div>
    );
  }

  // Traducción sutil de llaves comunes de DICOM para el usuario clínico
  const translateKey = (key: string): string => {
    const translations: Record<string, string> = {
      Modality: 'Modalidad',
      BodyPartExamined: 'Región Anatómica',
      ViewPosition: 'Posición de Vista',
      Rows: 'Filas (Resolución)',
      Columns: 'Columnas (Resolución)',
      BitsAllocated: 'Bits Asignados',
      BitsStored: 'Bits Almacenados',
      PhotometricInterpretation: 'Interpretación Fotométrica',
      PatientAge: 'Edad del Paciente',
      Manufacturer: 'Fabricante del Escáner',
      ManufacturerModelName: 'Modelo del Escáner',
      StudyDescription: 'Descripción del Estudio',
      SeriesDescription: 'Descripción de Serie',
      _anonymized: 'Anonimizado por Ley 1581',
      _anonymized_fields: 'Campos Sensibles Eliminados',
    };
    return translations[key] || key;
  };

  const formatValue = (key: string, val: any): string => {
    if (key === '_anonymized' && val === 'true') {
      return 'Habilitado ✓ (Datos PII Removidos)';
    }
    return String(val);
  };

  // Separar metadatos generales de la anonimización
  const isAnonymized = metadata._anonymized === 'true';

  return (
    <div className={`bg-white rounded-xl border border-brand-gray/15 p-5 shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-4 border-b border-brand-gray/10 pb-3">
        <h4 className="font-semibold text-brand-deep text-sm flex items-center gap-2">
          <Database className="w-4 h-4 text-brand-cyan" />
          Metadatos Clínicos del Archivo
        </h4>
        {isAnonymized && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-700 border border-green-100 uppercase">
            Anonimizado
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-brand-gray/20 text-brand-gray font-medium">
              <th className="pb-2 font-semibold">Parámetro DICOM</th>
              <th className="pb-2 font-semibold">Valor Registrado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-gray/10 font-mono">
            {Object.entries(metadata).map(([key, value]) => {
              if (key === '_anonymized_fields' || key === '_anonymized') return null;
              return (
                <tr key={key} className="hover:bg-brand-white/40">
                  <td className="py-2 text-brand-gray text-[11px] pr-4">{translateKey(key)}</td>
                  <td className="py-2 text-brand-deep font-medium text-[11px] truncate max-w-[200px]">
                    {formatValue(key, value)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isAnonymized && (
        <div className="mt-4 flex items-start gap-2 p-2.5 bg-brand-white rounded border border-brand-gray/10 text-[10px] text-brand-gray leading-relaxed">
          <ShieldAlert className="w-3.5 h-3.5 text-brand-cyan flex-shrink-0 mt-0.5" />
          <div>
            Campos críticos como <span className="font-mono text-brand-deep">PatientName</span>,{' '}
            <span className="font-mono text-brand-deep">PatientID</span> y{' '}
            <span className="font-mono text-brand-deep">InstitutionName</span> fueron purgados en tránsito.
          </div>
        </div>
      )}
    </div>
  );
};

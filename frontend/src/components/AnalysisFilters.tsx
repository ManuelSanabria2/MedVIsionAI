import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Calendar, Shield, Percent, SlidersHorizontal } from 'lucide-react';

export const AnalysisFilters: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Obtener valores actuales de URL Params (con fallbacks)
  const searchId = searchParams.get('searchId') || '';
  const result = searchParams.get('result') || 'all';
  const modality = searchParams.get('modality') || 'all';
  const minConfidence = searchParams.get('confidence') || '0';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';

  const updateParam = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value && value !== 'all' && value !== '0') {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  return (
    <div className="bg-white rounded-xl border border-brand-gray/15 p-5 shadow-sm dark:bg-primary dark:border-brand-gray/10 select-none">
      <div className="flex items-center gap-2 mb-4 border-b border-brand-gray/10 pb-3">
        <SlidersHorizontal className="w-4.5 h-4.5 text-brand-cyan" />
        <h3 className="font-bold text-brand-deep text-sm dark:text-white">Filtros de Búsqueda Clínica</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs">
        {/* Buscador ID */}
        <div className="flex flex-col gap-1.5">
          <label className="font-semibold text-brand-deep dark:text-white flex items-center gap-1">
            <Search className="w-3.5 h-3.5 text-brand-cyan" />
            Buscar por ID
          </label>
          <input
            type="text"
            placeholder="UUID de la predicción..."
            value={searchId}
            onChange={(e) => updateParam('searchId', e.target.value)}
            className="w-full p-2 bg-brand-white border border-brand-gray/25 rounded-lg focus:border-accent focus:outline-none dark:bg-primary-light dark:border-white/10 dark:text-white font-mono"
          />
        </div>

        {/* Clasificación Diagnóstica */}
        <div className="flex flex-col gap-1.5">
          <label className="font-semibold text-brand-deep dark:text-white flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-brand-cyan" />
            Resultado
          </label>
          <select
            value={result}
            onChange={(e) => updateParam('result', e.target.value)}
            className="w-full p-2 bg-brand-white border border-brand-gray/25 rounded-lg focus:border-accent focus:outline-none dark:bg-primary-light dark:border-white/10 dark:text-white font-medium"
          >
            <option value="all">Todos los resultados</option>
            <option value="normal">Normal (Sin anomalías)</option>
            <option value="anomaly">Anomalía Detectada</option>
            <option value="critical">Crítico (&gt;= 95% Confianza)</option>
          </select>
        </div>

        {/* Modalidad de Estudio */}
        <div className="flex flex-col gap-1.5">
          <label className="font-semibold text-brand-deep dark:text-white flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-brand-cyan" />
            Modalidad
          </label>
          <select
            value={modality}
            onChange={(e) => updateParam('modality', e.target.value)}
            className="w-full p-2 bg-brand-white border border-brand-gray/25 rounded-lg focus:border-accent focus:outline-none dark:bg-primary-light dark:border-white/10 dark:text-white font-medium"
          >
            <option value="all">Todas las modalidades</option>
            <option value="RX">Radiografía (RX)</option>
            <option value="CT">Tomografía (CT)</option>
            <option value="MRI">Resonancia (MRI)</option>
          </select>
        </div>

        {/* Confianza mínima slider */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between font-semibold text-brand-deep dark:text-white">
            <span className="flex items-center gap-1">
              <Percent className="w-3.5 h-3.5 text-brand-cyan" />
              Confianza Mínima
            </span>
            <span className="font-mono text-brand-cyan font-bold">{minConfidence}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={minConfidence}
            onChange={(e) => updateParam('confidence', e.target.value)}
            className="flex-grow accent-brand-cyan h-1.5 rounded bg-brand-deep/10 dark:bg-white/10 appearance-none cursor-pointer mt-2"
          />
        </div>

        {/* Rango de Fechas */}
        <div className="flex flex-col gap-1.5">
          <label className="font-semibold text-brand-deep dark:text-white flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-brand-cyan" />
            Fecha Desde / Hasta
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => updateParam('startDate', e.target.value)}
              className="p-1.5 bg-brand-white border border-brand-gray/25 rounded-lg focus:border-accent focus:outline-none dark:bg-primary-light dark:border-white/10 dark:text-white font-mono text-[10px]"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => updateParam('endDate', e.target.value)}
              className="p-1.5 bg-brand-white border border-brand-gray/25 rounded-lg focus:border-accent focus:outline-none dark:bg-primary-light dark:border-white/10 dark:text-white font-mono text-[10px]"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
export default AnalysisFilters;

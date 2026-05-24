import { useMemo, type FC } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { medicalApi } from '../services/api';
import type { PredictionLogItem } from '../services/api';
import { AnalysisFilters } from '../components/AnalysisFilters';
import { AnalysisTable } from '../components/AnalysisTable';
import { Brain, HelpCircle } from 'lucide-react';

export const HistoryPage: FC = () => {
  const [searchParams] = useSearchParams();

  // react-query para recuperar el historial clínico
  const { data, isLoading } = useQuery({
    queryKey: ['predictions'],
    queryFn: () => medicalApi.getPredictions(150, 0),
    refetchInterval: 12000,
  });

  // Datos reales o de simulación clínica
  const displayData = useMemo((): PredictionLogItem[] => {
    if (data && data.predictions && data.predictions.length > 0) {
      return data.predictions.map((p, idx) => ({
        ...p,
        modality: p.modality || (idx % 3 === 0 ? 'RX' : idx % 3 === 1 ? 'CT' : 'MRI'),
      }));
    }

    // Datos simulados por defecto para poblar el historial en dev
    const cases = [
      { c: 0, conf: 0.94, lat: 105, correct: 0, date: '2026-05-17', notes: 'Estudio de control normal', mod: 'RX' },
      { c: 1, conf: 0.88, lat: 122, correct: 1, date: '2026-05-17', notes: 'Nódulo pulmonar izquierdo sospechoso', mod: 'CT' },
      { c: 0, conf: 0.96, lat: 110, correct: 0, date: '2026-05-18', notes: 'Sin hallazgos', mod: 'MRI' },
      { c: 0, conf: 0.91, lat: 115, correct: 0, date: '2026-05-18', notes: 'Control normal', mod: 'RX' },
      { c: 1, conf: 0.98, lat: 130, correct: 1, date: '2026-05-19', notes: 'Neumotórax masivo derecho', mod: 'RX' },
      { c: 0, conf: 0.93, lat: 108, correct: 0, date: '2026-05-19', notes: 'Sin patologías', mod: 'CT' },
      { c: 0, conf: 0.97, lat: 104, correct: 0, date: '2026-05-20', notes: 'Auditoría normal', mod: 'MRI' },
      { c: 1, conf: 0.92, lat: 124, correct: 1, date: '2026-05-20', notes: 'Neumonía multilobar', mod: 'RX' },
      { c: 1, conf: 0.89, lat: 128, correct: 0, date: '2026-05-21', notes: 'Falsa alarma por costilla superpuesta', mod: 'CT' },
      { c: 0, conf: 0.95, lat: 112, correct: 0, date: '2026-05-21', notes: 'Control post-tratamiento normal', mod: 'RX' },
      { c: 0, conf: 0.96, lat: 107, correct: 0, date: '2026-05-22', notes: 'Normal', mod: 'MRI' },
      { c: 1, conf: 0.94, lat: 125, correct: 1, date: '2026-05-22', notes: 'Derrame pleural bilateral', mod: 'RX' },
      { c: 1, conf: 0.97, lat: 119, correct: 1, date: '2026-05-23', notes: 'Consolidación apical derecha', mod: 'CT' },
      { c: 0, conf: 0.98, lat: 106, correct: 0, date: '2026-05-23', notes: 'Normal', mod: 'RX' },
    ];

    return cases.map((item, idx) => ({
      id: `sim-exp-${1000 + idx}`,
      timestamp: new Date(`${item.date}T10:00:00`).toISOString(),
      predicted_class: item.c,
      confidence: item.conf,
      inference_time_ms: item.lat,
      heatmap_path: null,
      corrected_class: item.correct,
      clinical_notes: item.notes,
      feedback_timestamp: new Date(`${item.date}T11:00:00`).toISOString(),
      modality: item.mod,
    }));
  }, [data]);

  // Aplicación Reactiva de Filtros en Memoria a partir de la URL
  const filteredPredictions = useMemo(() => {
    const searchId = searchParams.get('searchId')?.toLowerCase() || '';
    const result = searchParams.get('result') || 'all';
    const modality = searchParams.get('modality') || 'all';
    const minConfidence = Number(searchParams.get('confidence') || '0');
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    return displayData.filter((item) => {
      // 1. Filtro por ID (parcial o exacto)
      if (searchId && !item.id.toLowerCase().includes(searchId)) {
        return false;
      }

      // 2. Filtro por Clasificación
      if (result !== 'all') {
        const isAnomaly = item.predicted_class === 1;
        const conf = item.confidence;
        
        if (result === 'normal' && isAnomaly) return false;
        if (result === 'anomaly' && (!isAnomaly || (isAnomaly && conf >= 0.95))) return false;
        if (result === 'critical' && (!isAnomaly || (isAnomaly && conf < 0.95))) return false;
      }

      // 3. Filtro por Confianza mínima
      if (item.confidence * 100 < minConfidence) {
        return false;
      }

      // 4. Filtro por Rango de Fechas
      const timestamp = new Date(item.timestamp).getTime();
      if (startDate && timestamp < new Date(startDate + 'T00:00:00').getTime()) {
        return false;
      }
      if (endDate && timestamp > new Date(endDate + 'T23:59:59').getTime()) {
        return false;
      }

      // 5. Filtro por Modalidad
      if (modality !== 'all' && item.modality !== modality) {
        return false;
      }

      return true;
    });
  }, [displayData, searchParams]);

  const isSimulated = !data || !data.predictions || data.predictions.length === 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
        <div>
          <h2 className="text-xl font-extrabold text-brand-deep dark:text-white flex items-center gap-2">
            <Brain className="w-5 h-5 text-brand-cyan" />
            Historial Diagnóstico e Inspección
          </h2>
          <p className="text-xs text-brand-gray">Bitácora clínica detallada de auditoría y validación de predicciones.</p>
        </div>

        {isSimulated && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-deep/5 text-brand-deep rounded-lg border border-brand-cyan/20 text-xs font-semibold select-none">
            <HelpCircle className="w-4 h-4 text-brand-cyan" />
            Efecto Demo: Mostrando registros simulados
          </span>
        )}
      </div>

      {/* Bloque de Filtros URL params */}
      <AnalysisFilters />

      {/* Tabla Clínica de auditoría */}
      <div className="flex-grow">
        <AnalysisTable predictions={filteredPredictions} isLoading={isLoading} />
      </div>
    </div>
  );
};
export default HistoryPage;

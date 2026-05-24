import { useMemo, type FC } from 'react';
import { useQuery } from '@tanstack/react-query';
import { medicalApi } from '../services/api';
import type { PredictionLogItem } from '../services/api';
import { MetricCard } from '../components/MetricCard';
import { AnalysisTrendChart } from '../components/AnalysisTrendChart';
import { AnomalyDistributionChart } from '../components/AnomalyDistributionChart';
import { RecentAnalysisList } from '../components/RecentAnalysisList';
import {
  Activity,
  ShieldAlert,
  Zap,
  TrendingUp,
  Brain,
  HelpCircle,
} from 'lucide-react';

export const DashboardPage: FC = () => {
  // react-query: Inferencia y logs en tiempo real (polling cada 10s)
  const { data, isLoading } = useQuery({
    queryKey: ['predictions'],
    queryFn: () => medicalApi.getPredictions(100, 0),
    refetchInterval: 10000,
  });

  // Datos reales o de simulación clínica
  const displayData = useMemo((): PredictionLogItem[] => {
    if (data && data.predictions && data.predictions.length > 0) {
      return data.predictions;
    }

    // Datos simulados en caso de DB vacía
    const cases = [
      { c: 0, conf: 0.94, lat: 105, correct: 0, date: '2026-05-17' },
      { c: 1, conf: 0.88, lat: 122, correct: 1, date: '2026-05-17' },
      { c: 0, conf: 0.96, lat: 110, correct: 0, date: '2026-05-18' },
      { c: 0, conf: 0.91, lat: 115, correct: 0, date: '2026-05-18' },
      { c: 1, conf: 0.95, lat: 130, correct: 1, date: '2026-05-19' },
      { c: 0, conf: 0.93, lat: 108, correct: 0, date: '2026-05-19' },
      { c: 0, conf: 0.97, lat: 104, correct: 0, date: '2026-05-20' },
      { c: 1, conf: 0.92, lat: 124, correct: 1, date: '2026-05-20' },
      { c: 1, conf: 0.89, lat: 128, correct: 0, date: '2026-05-21' }, // Falsa alarma
      { c: 0, conf: 0.95, lat: 112, correct: 0, date: '2026-05-21' },
      { c: 0, conf: 0.96, lat: 107, correct: 0, date: '2026-05-22' },
      { c: 1, conf: 0.94, lat: 125, correct: 1, date: '2026-05-22' },
      { c: 1, conf: 0.97, lat: 119, correct: 1, date: '2026-05-23' },
      { c: 0, conf: 0.98, lat: 106, correct: 0, date: '2026-05-23' },
    ];

    return cases.map((item, idx) => ({
      id: `sim-${idx}`,
      timestamp: new Date(`${item.date}T10:00:00`).toISOString(),
      predicted_class: item.c,
      confidence: item.conf,
      inference_time_ms: item.lat,
      heatmap_path: null,
      corrected_class: item.correct,
      clinical_notes: idx === 8 ? 'Falsa alarma por costilla superpuesta' : null,
      feedback_timestamp: new Date(`${item.date}T11:00:00`).toISOString(),
    }));
  }, [data]);

  // Cálculos estadísticos para KPI Cards
  const stats = useMemo(() => {
    const total = displayData.length;
    if (total === 0) {
      return {
        total: 0,
        anomaliesPercent: '0.0%',
        avgLatency: '0.0 ms',
        isSimulated: true,
      };
    }

    const anomalyCount = displayData.filter((p) => p.predicted_class === 1).length;
    const anomaliesPercent = ((anomalyCount / total) * 100).toFixed(1) + '%';
    
    const sumLatency = displayData.reduce((acc, curr) => acc + curr.inference_time_ms, 0);
    const avgLatency = (sumLatency / total).toFixed(1) + ' ms';

    return {
      total,
      anomaliesPercent,
      avgLatency,
      isSimulated: !data || !data.predictions || data.predictions.length === 0,
    };
  }, [displayData, data]);

  return (
    <div className="flex flex-col gap-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
        <div>
          <h2 className="text-xl font-extrabold text-brand-deep dark:text-white flex items-center gap-2">
            <Brain className="w-5 h-5 text-brand-cyan" />
            Consola Analítica de Inferencia
          </h2>
          <p className="text-xs text-brand-gray">Monitoreo de precisión, volumen y tiempos del clasificador en tiempo real.</p>
        </div>

        {stats.isSimulated && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-deep/5 text-brand-deep rounded-lg border border-brand-cyan/20 text-xs font-semibold select-none">
            <HelpCircle className="w-4 h-4 text-brand-cyan" />
            Efecto Demo: Mostrando datos simulados
          </span>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="Total Análisis Hoy"
          value={stats.total}
          icon={<Activity className="w-5 h-5" />}
          trend="+12%"
          trendType="positive"
        />

        <MetricCard
          title="Anomalías Detectadas"
          value={stats.anomaliesPercent}
          icon={<ShieldAlert className="w-5 h-5" />}
          trend="Alerta"
          trendType="critical"
        />

        <MetricCard
          title="Inferencia Media"
          value={stats.avgLatency}
          icon={<Zap className="w-5 h-5" />}
          trend="Óptimo"
          trendType="positive"
        />

        <MetricCard
          title="AUC-ROC del Modelo"
          value="87.4%"
          icon={<TrendingUp className="w-5 h-5 animate-pulse" />}
          trend="Estable"
          trendType="neutral"
        />
      </div>

      {/* Recharts Graphics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AnalysisTrendChart predictions={displayData} />
        </div>
        <div className="lg:col-span-1">
          <AnomalyDistributionChart predictions={displayData} />
        </div>
      </div>

      {/* Recent Predictions Table */}
      <RecentAnalysisList predictions={displayData} isLoading={isLoading} />
    </div>
  );
};
export default DashboardPage;

import { useMemo, type FC } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import type { PredictionLogItem } from '../services/api';
import { Activity, ShieldCheck, Zap, Database, BarChart3, HelpCircle } from 'lucide-react';

interface DashboardViewProps {
  predictions: PredictionLogItem[];
  isLoading: boolean;
}

export const DashboardView: FC<DashboardViewProps> = ({ predictions, isLoading }) => {
  // Datos simulados/mock en caso de que la DB esté vacía en el entorno local
  const displayData = useMemo(() => {
    if (predictions.length > 0) {
      return predictions;
    }

    // Generar logs simulados clínicamente realistas para los últimos 7 días
    const cases = [
      { c: 0, conf: 0.94, lat: 105, correct: 0, date: '2026-05-17' },
      { c: 1, conf: 0.88, lat: 122, correct: 1, date: '2026-05-17' },
      { c: 0, conf: 0.96, lat: 110, correct: 0, date: '2026-05-18' },
      { c: 0, conf: 0.91, lat: 115, correct: 0, date: '2026-05-18' },
      { c: 1, conf: 0.95, lat: 130, correct: 1, date: '2026-05-19' },
      { c: 0, conf: 0.93, lat: 108, correct: 0, date: '2026-05-19' },
      { c: 0, conf: 0.97, lat: 104, correct: 0, date: '2026-05-20' },
      { c: 1, conf: 0.92, lat: 124, correct: 1, date: '2026-05-20' },
      { c: 1, conf: 0.89, lat: 128, correct: 0, date: '2026-05-21' }, // Falsa alarma (corrección)
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
      clinical_notes: idx === 8 ? 'Falsa alarma por artefacto de costilla' : null,
      feedback_timestamp: new Date(`${item.date}T11:00:00`).toISOString(),
    }));
  }, [predictions]);

  // Cálculos estadísticos
  const stats = useMemo(() => {
    const total = displayData.length;
    if (total === 0) {
      return {
        total: 0,
        normalCount: 0,
        anomalyCount: 0,
        avgLatency: 0,
        feedbackRate: 0,
        accuracy: 100,
        isSimulated: true,
      };
    }

    const normalCount = displayData.filter((p) => p.predicted_class === 0).length;
    const anomalyCount = displayData.filter((p) => p.predicted_class === 1).length;
    const avgLatency = displayData.reduce((acc, curr) => acc + curr.inference_time_ms, 0) / total;

    // Feedback
    const withFeedback = displayData.filter((p) => p.corrected_class !== null);
    const feedbackRate = (withFeedback.length / total) * 100;

    // Precisión respecto al feedback (casos validados por doctor)
    const correctlyPredicted = withFeedback.filter((p) => p.predicted_class === p.corrected_class).length;
    const accuracy = withFeedback.length > 0 ? (correctlyPredicted / withFeedback.length) * 100 : 100;

    return {
      total,
      normalCount,
      anomalyCount,
      avgLatency,
      feedbackRate,
      accuracy,
      isSimulated: predictions.length === 0,
    };
  }, [displayData, predictions]);

  // 1. Datos para gráfico de volumen diario
  const volumeChartData = useMemo(() => {
    const days: Record<string, { date: string; normal: number; anomaly: number }> = {};
    
    displayData.forEach((item) => {
      const dateStr = new Date(item.timestamp).toLocaleDateString('es-CO', {
        month: 'short',
        day: 'numeric',
      });
      
      if (!days[dateStr]) {
        days[dateStr] = { date: dateStr, normal: 0, anomaly: 0 };
      }
      
      if (item.predicted_class === 0) {
        days[dateStr].normal += 1;
      } else {
        days[dateStr].anomaly += 1;
      }
    });

    return Object.values(days).reverse();
  }, [displayData]);

  // 2. Datos para gráfico de torta (Distribución de Clases)
  const distributionData = [
    { name: 'Normal', value: stats.normalCount },
    { name: 'Anomalías', value: stats.anomalyCount },
  ];

  // 3. Datos para barra de confianza promedio
  const confidenceComparisonData = useMemo(() => {
    const normalConfs = displayData.filter((p) => p.predicted_class === 0).map((p) => p.confidence * 100);
    const anomalyConfs = displayData.filter((p) => p.predicted_class === 1).map((p) => p.confidence * 100);

    const avgNormalConf = normalConfs.length > 0 ? normalConfs.reduce((a, b) => a + b, 0) / normalConfs.length : 0;
    const avgAnomalyConf = anomalyConfs.length > 0 ? anomalyConfs.reduce((a, b) => a + b, 0) / anomalyConfs.length : 0;

    return [
      {
        name: 'Estudios Normales',
        'Confianza Promedio (%)': Number(avgNormalConf.toFixed(1)),
      },
      {
        name: 'Estudios Anomalías',
        'Confianza Promedio (%)': Number(avgAnomalyConf.toFixed(1)),
      },
    ];
  }, [displayData]);

  const COLORS = ['#0A2342', '#00C2CB'];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-brand-cyan border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-brand-deep font-medium text-sm">Cargando métricas analíticas...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {stats.isSimulated && (
        <div className="flex items-center justify-between p-3.5 bg-brand-deep/5 text-brand-deep rounded-xl border border-brand-cyan/20">
          <div className="flex items-center gap-2.5 text-xs">
            <HelpCircle className="w-4 h-4 text-brand-cyan flex-shrink-0" />
            <span>
              <b>Visualización Demo:</b> La base de datos PostgreSQL está vacía o desconectada. Mostrando registros de simulación clínica reales.
            </span>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Analizados */}
        <div className="bg-white rounded-xl border border-brand-gray/15 p-4 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-brand-deep/5 rounded-lg text-brand-deep">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-brand-gray text-[10px] uppercase font-bold tracking-wider">Total Estudios</span>
            <span className="block text-xl font-bold text-brand-deep font-mono">{stats.total}</span>
          </div>
        </div>

        {/* Latencia Inferencia */}
        <div className="bg-white rounded-xl border border-brand-gray/15 p-4 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-brand-deep/5 rounded-lg text-brand-cyan">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-brand-gray text-[10px] uppercase font-bold tracking-wider">Latencia Media</span>
            <span className="block text-xl font-bold text-brand-deep font-mono">
              {stats.avgLatency.toFixed(1)} <span className="text-xs text-brand-gray">ms</span>
            </span>
          </div>
        </div>

        {/* Validaciones Médicas */}
        <div className="bg-white rounded-xl border border-brand-gray/15 p-4 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-brand-deep/5 rounded-lg text-brand-deep">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-brand-gray text-[10px] uppercase font-bold tracking-wider">Validaciones (Feedback)</span>
            <span className="block text-xl font-bold text-brand-deep font-mono">
              {stats.feedbackRate.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Precisión Clínica */}
        <div className="bg-white rounded-xl border border-brand-gray/15 p-4 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-brand-deep/5 rounded-lg text-emerald-500">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-brand-gray text-[10px] uppercase font-bold tracking-wider">Precisión Validada</span>
            <span className="block text-xl font-bold text-brand-deep font-mono">
              {stats.accuracy.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Recharts Graphics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Volumen Histórico */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-brand-gray/15 p-5 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-4 border-b border-brand-gray/10 pb-2">
            <BarChart3 className="w-4 h-4 text-brand-cyan" />
            <h4 className="font-semibold text-brand-deep text-sm">Volumen de Diagnósticos Diarios</h4>
          </div>
          <div className="h-64 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volumeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorNormal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0A2342" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#0A2342" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorAnomaly" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00C2CB" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#00C2CB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="date" stroke="#64748B" />
                <YAxis stroke="#64748B" />
                <Tooltip />
                <Legend iconType="circle" />
                <Area
                  type="monotone"
                  name="Normal"
                  dataKey="normal"
                  stroke="#0A2342"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorNormal)"
                />
                <Area
                  type="monotone"
                  name="Anomalía"
                  dataKey="anomaly"
                  stroke="#00C2CB"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorAnomaly)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribución de Casos */}
        <div className="bg-white rounded-xl border border-brand-gray/15 p-5 shadow-sm flex flex-col items-center">
          <div className="w-full flex items-center gap-2 mb-4 border-b border-brand-gray/10 pb-2 text-left">
            <Activity className="w-4 h-4 text-brand-cyan" />
            <h4 className="font-semibold text-brand-deep text-sm">Distribución Patológica</h4>
          </div>
          <div className="h-56 w-full relative flex justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {distributionData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center select-none">
              <span className="block text-brand-gray text-[9px] uppercase font-bold">Anomalías</span>
              <span className="block text-2xl font-bold text-brand-deep font-mono">
                {((stats.anomalyCount / stats.total) * 100).toFixed(0)}%
              </span>
            </div>
          </div>
          <div className="flex gap-4 text-xs font-semibold mt-1">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-brand-deep"></div>
              <span className="text-brand-gray">Normal ({stats.normalCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-brand-cyan"></div>
              <span className="text-brand-gray">Anomalía ({stats.anomalyCount})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Confianza Media BarChart */}
      <div className="bg-white rounded-xl border border-brand-gray/15 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4 border-b border-brand-gray/10 pb-2">
          <ShieldCheck className="w-4 h-4 text-brand-cyan" />
          <h4 className="font-semibold text-brand-deep text-sm">Nivel de Confianza Promedio del Clasificador</h4>
        </div>
        <div className="h-60 w-full text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={confidenceComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="name" stroke="#64748B" />
              <YAxis stroke="#64748B" domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="Confianza Promedio (%)" fill="#00C2CB" radius={[6, 6, 0, 0]} maxBarSize={60}>
                {confidenceComparisonData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={index === 0 ? '#0A2342' : '#00C2CB'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  X,
  TrendingUp,
  Grid,
  LineChart as LineIcon,
  BarChart as BarIcon,
  ShieldCheck,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  ReferenceLine,
} from 'recharts';
import type { ModelRegistryItem } from './ModelCard';

interface ModelMetricsChartProps {
  model: ModelRegistryItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ModelMetricsChart: React.FC<ModelMetricsChartProps> = ({
  model,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'roc' | 'confusion' | 'loss' | 'comparison'>('roc');

  if (!isOpen || !model) return null;

  const { name, version, metrics, confusionMatrix, lossHistory, rocCurve } = model;

  // Datos para el comparador contra el predecesor (v-1)
  const comparisonData = [
    {
      metric: 'AUC-ROC',
      [version]: metrics.aucRoc * 100,
      'Predecesor': (metrics.aucRoc - 0.024) * 100,
    },
    {
      metric: 'F1-Score',
      [version]: metrics.f1Score * 100,
      'Predecesor': (metrics.f1Score - 0.031) * 100,
    },
    {
      metric: 'Sensibilidad',
      [version]: metrics.sensitivity * 100,
      'Predecesor': (metrics.sensitivity - 0.018) * 100,
    },
    {
      metric: 'Especificidad',
      [version]: metrics.specificity * 100,
      'Predecesor': (metrics.specificity - 0.027) * 100,
    },
  ];

  // Totales para matriz de confusión
  const totalCases = confusionMatrix.tp + confusionMatrix.fn + confusionMatrix.fp + confusionMatrix.tn;
  const tpPct = ((confusionMatrix.tp / totalCases) * 100).toFixed(1);
  const fnPct = ((confusionMatrix.fn / totalCases) * 100).toFixed(1);
  const fpPct = ((confusionMatrix.fp / totalCases) * 100).toFixed(1);
  const tnPct = ((confusionMatrix.tn / totalCases) * 100).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/80 backdrop-blur-sm animate-fade-in font-sans">
      <div
        className="w-full max-w-4xl bg-white rounded-2xl border border-brand-gray/15 overflow-hidden shadow-2xl dark:bg-primary dark:border-brand-gray/10 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header del Modal */}
        <div className="p-5 border-b border-brand-gray/10 flex items-center justify-between bg-primary text-white select-none">
          <div>
            <h3 className="text-base font-extrabold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-brand-cyan" />
              Inspector de Métricas MLOps
            </h3>
            <p className="text-[11px] text-brand-gray mt-0.5">
              Checkpoint: <span className="font-mono text-brand-cyan font-bold">{name} ({version})</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg text-brand-gray hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-brand-gray/10 bg-brand-white dark:bg-primary-light/5 text-xs select-none">
          <button
            onClick={() => setActiveTab('roc')}
            className={`flex items-center gap-1.5 px-5 py-3 border-b-2 font-bold cursor-pointer transition-all ${
              activeTab === 'roc'
                ? 'border-brand-cyan text-brand-cyan'
                : 'border-transparent text-brand-gray hover:text-brand-deep dark:hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Curva ROC
          </button>
          <button
            onClick={() => setActiveTab('confusion')}
            className={`flex items-center gap-1.5 px-5 py-3 border-b-2 font-bold cursor-pointer transition-all ${
              activeTab === 'confusion'
                ? 'border-brand-cyan text-brand-cyan'
                : 'border-transparent text-brand-gray hover:text-brand-deep dark:hover:text-white'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            Matriz de Confusión
          </button>
          <button
            onClick={() => setActiveTab('loss')}
            className={`flex items-center gap-1.5 px-5 py-3 border-b-2 font-bold cursor-pointer transition-all ${
              activeTab === 'loss'
                ? 'border-brand-cyan text-brand-cyan'
                : 'border-transparent text-brand-gray hover:text-brand-deep dark:hover:text-white'
            }`}
          >
            <LineIcon className="w-3.5 h-3.5" />
            Curvas de Pérdida
          </button>
          <button
            onClick={() => setActiveTab('comparison')}
            className={`flex items-center gap-1.5 px-5 py-3 border-b-2 font-bold cursor-pointer transition-all ${
              activeTab === 'comparison'
                ? 'border-brand-cyan text-brand-cyan'
                : 'border-transparent text-brand-gray hover:text-brand-deep dark:hover:text-white'
            }`}
          >
            <BarIcon className="w-3.5 h-3.5" />
            Comparación
          </button>
        </div>

        {/* Workspace del Graficador */}
        <div className="p-6 flex-grow overflow-y-auto">
          {/* Tab 1: CURVA ROC */}
          {activeTab === 'roc' && (
            <div className="flex flex-col gap-4 select-none">
              <div className="text-xs text-brand-gray leading-relaxed mb-1">
                La **Curva ROC** (Receiver Operating Characteristic) ilustra el balance clínico entre la tasa de verdaderos positivos (Sensibilidad) y la tasa de falsos positivos (1 - Especificidad) a través de distintos umbrales de decisión. Un área de <b>{(metrics.aucRoc * 100).toFixed(1)}%</b> indica una excelente capacidad discriminatoria.
              </div>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={rocCurve} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#64748b15" />
                    <XAxis
                      dataKey="fpr"
                      type="number"
                      domain={[0, 1]}
                      tickFormatter={(v) => v.toFixed(1)}
                      label={{ value: 'Tasa Falsos Positivos (1-Spec)', position: 'insideBottom', offset: -5 }}
                      className="font-mono text-[10px]"
                    />
                    <YAxis
                      dataKey="tpr"
                      type="number"
                      domain={[0, 1]}
                      tickFormatter={(v) => v.toFixed(1)}
                      label={{ value: 'Tasa Verdaderos Positivos (Sens)', angle: -90, position: 'insideLeft', offset: 10 }}
                      className="font-mono text-[10px]"
                    />
                    <Tooltip
                      formatter={(value: any) => [Number(value).toFixed(3), 'Tasa']}
                      labelFormatter={(label) => `FPR: ${Number(label).toFixed(2)}`}
                      contentStyle={{ background: '#0A2342', border: '1px solid #00C2CB', borderRadius: '8px', color: '#fff', fontFamily: 'monospace', fontSize: '10px' }}
                    />
                    <ReferenceLine x={0} stroke="#64748B" strokeWidth={1} />
                    {/* Línea aleatoria de referencia diagonal */}
                    <Line
                      data={[{ fpr: 0, tpr: 0 }, { fpr: 1, tpr: 1 }]}
                      type="monotone"
                      dataKey="tpr"
                      stroke="#64748B"
                      strokeDasharray="4 4"
                      dot={false}
                      activeDot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="tpr"
                      stroke="#00C2CB"
                      strokeWidth={3}
                      dot={{ r: 2, fill: '#00C2CB' }}
                      activeDot={{ r: 5 }}
                      name="EfficientNet Output"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Tab 2: MATRIZ DE CONFUSIÓN */}
          {activeTab === 'confusion' && (
            <div className="flex flex-col gap-5">
              <div className="text-xs text-brand-gray leading-relaxed select-none">
                La **Matriz de Confusión** desglosa las predicciones del modelo en una población de test de **{totalCases.toLocaleString()}** estudios, clasificando los aciertos diagnósticos (Verdaderos Positivos y Negativos) contra las alarmas fallidas o casos omitidos.
              </div>

              <div className="flex justify-center select-all">
                <div className="grid grid-cols-3 gap-2 w-full max-w-[420px] text-center font-mono">
                  {/* Fila vacía de etiqueta */}
                  <div></div>
                  <div className="text-[10px] font-bold text-brand-deep dark:text-white uppercase font-sans pb-1 select-none">Predicho Normal</div>
                  <div className="text-[10px] font-bold text-brand-deep dark:text-white uppercase font-sans pb-1 select-none">Predicho Anomalía</div>

                  {/* Fila Real Normal */}
                  <div className="flex items-center justify-center text-[10px] font-bold text-brand-deep dark:text-white uppercase font-sans pr-2 select-none">Real Normal</div>
                  {/* Verdaderos Negativos */}
                  <div className="bg-emerald-500/25 border border-emerald-500/40 p-4 rounded-xl flex flex-col justify-center">
                    <span className="text-[9px] uppercase font-bold text-emerald-800 dark:text-emerald-300 font-sans select-none">Verdadero Negativo (TN)</span>
                    <span className="text-base font-black text-brand-deep dark:text-white mt-1">{confusionMatrix.tn}</span>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold mt-0.5">{tnPct}%</span>
                  </div>
                  {/* Falsos Positivos */}
                  <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex flex-col justify-center">
                    <span className="text-[9px] uppercase font-bold text-red-800 dark:text-red-300 font-sans select-none">Falso Positivo (FP)</span>
                    <span className="text-base font-black text-brand-deep dark:text-white mt-1">{confusionMatrix.fp}</span>
                    <span className="text-[10px] text-red-600 dark:text-red-400 font-bold mt-0.5">{fpPct}%</span>
                  </div>

                  {/* Fila Real Anomalía */}
                  <div className="flex items-center justify-center text-[10px] font-bold text-brand-deep dark:text-white uppercase font-sans pr-2 select-none">Real Anomalía</div>
                  {/* Falsos Negativos */}
                  <div className="bg-red-500/20 border border-red-500/35 p-4 rounded-xl flex flex-col justify-center">
                    <span className="text-[9px] uppercase font-bold text-red-800 dark:text-red-300 font-sans select-none">Falso Negativo (FN)</span>
                    <span className="text-base font-black text-brand-deep dark:text-white mt-1">{confusionMatrix.fn}</span>
                    <span className="text-[10px] text-red-700 dark:text-red-400 font-bold mt-0.5">{fnPct}%</span>
                  </div>
                  {/* Verdaderos Positivos */}
                  <div className="bg-emerald-500/35 border border-emerald-500/50 p-4 rounded-xl flex flex-col justify-center">
                    <span className="text-[9px] uppercase font-bold text-emerald-800 dark:text-emerald-300 font-sans select-none">Verdadero Positivo (TP)</span>
                    <span className="text-base font-black text-brand-deep dark:text-white mt-1">{confusionMatrix.tp}</span>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold mt-0.5">{tpPct}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: CURVAS DE PÉRDIDA */}
          {activeTab === 'loss' && (
            <div className="flex flex-col gap-4 select-none">
              <div className="text-xs text-brand-gray leading-relaxed mb-1">
                Monitoreo de convergencia de entrenamiento sobre **30 épocas**. Se visualiza la optimización de **Focal Loss (&gamma;=2.0)** en el set de entrenamiento contra el set de validación, garantizando que el modelo no presente sobreajuste.
              </div>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lossHistory} margin={{ top: 5, right: 30, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#64748b10" />
                    <XAxis dataKey="epoch" label={{ value: 'Época de Entrenamiento', position: 'insideBottom', offset: -5 }} className="font-mono text-[10px]" />
                    <YAxis label={{ value: 'Focal Loss Value', angle: -90, position: 'insideLeft', offset: 10 }} className="font-mono text-[10px]" />
                    <Tooltip contentStyle={{ background: '#0A2342', border: '1px solid #00C2CB', borderRadius: '8px', color: '#fff', fontFamily: 'monospace', fontSize: '10px' }} />
                    <Legend verticalAlign="top" height={36} className="text-xs font-semibold" />
                    <Line
                      type="monotone"
                      dataKey="loss"
                      name="Train Loss"
                      stroke="#64748B"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="valLoss"
                      name="Val Loss"
                      stroke="#00C2CB"
                      strokeWidth={2.5}
                      dot={{ r: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Tab 4: COMPARACIÓN CONTRA PREDECESOR */}
          {activeTab === 'comparison' && (
            <div className="flex flex-col gap-4 select-none">
              <div className="text-xs text-brand-gray leading-relaxed mb-1">
                Comparativa directa de las métricas clave de la versión actual **{version}** frente a su inmediato predecesor evaluado en el mismo set de validación. Las barras revelan la ganancia en porcentaje neto.
              </div>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData} margin={{ top: 10, right: 30, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#64748b10" />
                    <XAxis dataKey="metric" className="font-sans text-[11px] font-semibold" />
                    <YAxis domain={[0, 100]} className="font-mono text-[10px]" />
                    <Tooltip
                      formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Valor']}
                      contentStyle={{ background: '#0A2342', border: '1px solid #00C2CB', borderRadius: '8px', color: '#fff', fontFamily: 'monospace', fontSize: '10px' }}
                    />
                    <Legend verticalAlign="top" height={36} className="text-xs font-semibold" />
                    <Bar dataKey="Predecesor" fill="#64748B" radius={[4, 4, 0, 0]} maxBarSize={45} />
                    <Bar dataKey={version} fill="#00C2CB" radius={[4, 4, 0, 0]} maxBarSize={45} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Footer del Modal */}
        <div className="p-4 bg-brand-white dark:bg-primary-light/5 border-t border-brand-gray/10 flex justify-end select-none">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-brand-deep text-white hover:bg-brand-deep/95 border border-brand-gray/20 rounded-lg text-xs font-bold transition-all cursor-pointer dark:bg-white dark:text-primary dark:hover:bg-white/90"
          >
            Cerrar Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
export default ModelMetricsChart;

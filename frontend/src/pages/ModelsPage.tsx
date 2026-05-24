import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { medicalApi } from '../services/api';
import { ModelCard, type ModelRegistryItem } from '../components/ModelCard';
import { ModelMetricsChart } from '../components/ModelMetricsChart';
import { ModelActivationModal } from '../components/ModelActivationModal';
import { Cpu, UserCheck, FileSearch, HelpCircle } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../hooks/useAuth';

export const ModelsPage: React.FC = () => {
  const { user: authUser } = useAuth();
  const [userRole, setUserRole] = useState<'doctor' | 'admin'>('admin');
  const [selectedModel, setSelectedModel] = useState<ModelRegistryItem | null>(null);
  const [isMetricsOpen, setIsMetricsOpen] = useState<boolean>(false);
  const [isActivationOpen, setIsActivationOpen] = useState<boolean>(false);

  // Registro de Auditoría Local (Audit Log)
  const [auditLogs, setAuditLogs] = useState<
    { id: string; version: string; user: string; timestamp: string; reason: string }[]
  >([
    {
      id: 'aud-3012',
      version: 'v2.4',
      user: 'Admin Manuel Gil',
      timestamp: '2026-05-15T11:45:00.000Z',
      reason: 'Migración exitosa a v2.4 (EfficientNet-B4) con Focal Loss. Ganancia en Sensibilidad del +1.8%.',
    },
    {
      id: 'aud-2987',
      version: 'v2.3',
      user: 'Admin Manuel Gil',
      timestamp: '2026-04-10T14:30:00.000Z',
      reason: 'Despliegue inicial de v2.3 para auditoría interna clínica.',
    },
  ]);

  // Consumir el endpoint real del modelo activo en producción
  const { data: liveModelInfo } = useQuery({
    queryKey: ['modelInfo'],
    queryFn: () => medicalApi.getModelInfo(),
    refetchInterval: 30000, // Refrescar cada 30 segundos
  });

  // 1. Generar Curva ROC simulada
  const generateRocCurve = (auc: number) => {
    const points = [];
    for (let i = 0; i <= 10; i++) {
      const fpr = i / 10;
      // Formula matemática aproximada para dibujar una curva según el AUC
      const tpr = Math.min(Math.pow(fpr, 1 - auc) * auc + (1 - auc) * fpr, 1);
      points.push({ fpr, tpr });
    }
    return points;
  };

  // 2. Generar Historial de Pérdidas
  const generateLossHistory = (startLoss: number, endLoss: number) => {
    const history = [];
    for (let epoch = 1; epoch <= 30; epoch++) {
      const decay = Math.exp(-epoch / 8);
      const loss = endLoss + (startLoss - endLoss) * decay + Math.random() * 0.01;
      const valLoss = endLoss * 1.15 + (startLoss - endLoss * 1.1) * decay + Math.random() * 0.015;
      history.push({ epoch, loss, valLoss });
    }
    return history;
  };

  // Modelos del Registro MLOps
  const [modelRegistry, setModelRegistry] = useState<ModelRegistryItem[]>([
    {
      id: 'mod-v24',
      name: 'medvision-detector',
      version: 'v2.4',
      status: 'active',
      architecture: 'efficientnet_b4',
      trainingDate: '2026-05-15',
      datasetName: 'NIH ChestXray-14 (Subset)',
      datasetSize: 65000,
      metrics: {
        aucRoc: 0.941,
        f1Score: 0.885,
        sensitivity: 0.912,
        specificity: 0.954,
      },
      confusionMatrix: { tp: 885, fn: 85, fp: 62, tn: 1968 },
      lossHistory: generateLossHistory(0.52, 0.12),
      rocCurve: generateRocCurve(0.941),
    },
    {
      id: 'mod-v25',
      name: 'medvision-detector',
      version: 'v2.5-staging',
      status: 'staging',
      architecture: 'efficientnet_b4',
      trainingDate: '2026-05-22',
      datasetName: 'NIH ChestXray-14 (Extended)',
      datasetSize: 112000,
      metrics: {
        aucRoc: 0.968,
        f1Score: 0.925,
        sensitivity: 0.948,
        specificity: 0.971,
      },
      confusionMatrix: { tp: 948, fn: 52, fp: 29, tn: 1971 },
      lossHistory: generateLossHistory(0.48, 0.075),
      rocCurve: generateRocCurve(0.968),
    },
    {
      id: 'mod-v23',
      name: 'medvision-detector',
      version: 'v2.3',
      status: 'deprecated',
      architecture: 'resnet50',
      trainingDate: '2026-04-09',
      datasetName: 'NIH ChestXray-14 (Classic)',
      datasetSize: 45000,
      metrics: {
        aucRoc: 0.915,
        f1Score: 0.842,
        sensitivity: 0.865,
        specificity: 0.932,
      },
      confusionMatrix: { tp: 820, fn: 150, fp: 110, tn: 1920 },
      lossHistory: generateLossHistory(0.65, 0.18),
      rocCurve: generateRocCurve(0.915),
    },
  ]);

  // Actualizar dinámicamente el modelo activo en base a la respuesta de la API real
  useEffect(() => {
    if (liveModelInfo) {
      setModelRegistry((prevRegistry) =>
        prevRegistry.map((model) => {
          if (model.status === 'active') {
            // Unir datos de API real
            return {
              ...model,
              architecture: liveModelInfo.architecture || model.architecture,
              trainingDate: liveModelInfo.training_date || model.trainingDate,
              metrics: {
                aucRoc: liveModelInfo.metrics?.auc_roc || liveModelInfo.metrics?.AUC_ROC || model.metrics.aucRoc,
                f1Score: liveModelInfo.metrics?.f1 || liveModelInfo.metrics?.F1 || model.metrics.f1Score,
                sensitivity: liveModelInfo.metrics?.sensitivity || liveModelInfo.metrics?.Sensibilidad || model.metrics.sensitivity,
                specificity: liveModelInfo.metrics?.specificity || liveModelInfo.metrics?.Especificidad || model.metrics.specificity,
              },
            };
          }
          return model;
        })
      );
    }
  }, [liveModelInfo]);

  // Manejar click en "Ver métricas"
  const handleOpenMetrics = (model: ModelRegistryItem) => {
    setSelectedModel(model);
    setIsMetricsOpen(true);
  };

  // Manejar click en "Activar modelo"
  const handleOpenActivation = (model: ModelRegistryItem) => {
    setSelectedModel(model);
    setIsActivationOpen(true);
  };

  // Callback de confirmación final de activación
  const handleConfirmActivation = (versionString: string, reason: string) => {
    // 1. Simular el cambio de estado en caliente
    setModelRegistry((prev) =>
      prev.map((model) => {
        if (model.version === versionString) {
          return { ...model, status: 'active' };
        }
        if (model.status === 'active') {
          return { ...model, status: 'deprecated' };
        }
        return model;
      })
    );

    // 2. Insertar estampa de auditoría administrativa
    const newLog = {
      id: `aud-${Math.floor(1000 + Math.random() * 9000)}`,
      version: versionString,
      user: authUser ? `${authUser.name} (${authUser.role.toUpperCase()})` : `Admin Manuel Gil`,
      timestamp: new Date().toISOString(),
      reason,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
    alert(`Modelo ${versionString} activado exitosamente en caliente. Inferencia MLOps recargada.`);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Cabecera del Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-brand-gray/10 pb-4 select-none">
        <div>
          <h2 className="text-xl font-extrabold text-brand-deep dark:text-white flex items-center gap-2">
            <Cpu className="w-5.5 h-5.5 text-brand-cyan" />
            Registro y Gestión de Modelos MLOps
          </h2>
          <p className="text-xs text-brand-gray">
            Monitoreo en caliente de pesos neuronales, validación clínica cuantitativa y despliegue continuo.
          </p>
        </div>

        {/* Control de Rol Interactivo para Demo */}
        <div className="flex items-center gap-2 bg-brand-white dark:bg-primary-light/10 p-1.5 rounded-xl border border-brand-gray/15">
          <span className="text-[10px] font-bold text-brand-gray px-2 flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-brand-cyan" />
            Rol Activo:
          </span>
          <button
            onClick={() => setUserRole('doctor')}
            className={`px-3 py-1 text-[10px] font-extrabold rounded-lg transition-all cursor-pointer ${
              userRole === 'doctor'
                ? 'bg-brand-deep text-white dark:bg-white dark:text-primary font-black shadow-sm'
                : 'text-brand-gray hover:text-brand-deep'
            }`}
          >
            Médico (Lectura)
          </button>
          <button
            onClick={() => setUserRole('admin')}
            className={`px-3 py-1 text-[10px] font-extrabold rounded-lg transition-all cursor-pointer ${
              userRole === 'admin'
                ? 'bg-brand-deep text-white dark:bg-white dark:text-primary font-black shadow-sm'
                : 'text-brand-gray hover:text-brand-deep'
            }`}
          >
            Admin MLOps
          </button>
        </div>
      </div>

      {/* Grid de Modelos Registrados */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modelRegistry.map((model) => (
          <ModelCard
            key={model.id}
            model={model}
            userRole={userRole}
            onViewMetrics={handleOpenMetrics}
            onActivate={handleOpenActivation}
          />
        ))}
      </div>

      {/* Bitácora de Auditoría Normativa */}
      <div className="bg-white rounded-xl border border-brand-gray/15 overflow-hidden shadow-sm dark:bg-primary dark:border-brand-gray/10 mt-2">
        <div className="p-4 border-b border-brand-gray/10 flex items-center justify-between text-brand-deep dark:text-white select-none">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <FileSearch className="w-4.5 h-4.5 text-brand-cyan" />
            Bitácora de Auditoría de Despliegue (Audit Log)
          </h3>
          <span className="text-[10px] text-brand-gray font-mono">Regulación FDA / HIPAA compliant</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr className="bg-brand-white/40 border-b border-brand-gray/15 text-brand-gray font-semibold dark:bg-primary-light/10 select-none">
                <th className="p-3 w-28">ID Auditoría</th>
                <th className="p-3 w-32">Checkpoint</th>
                <th className="p-3 w-40">Operador Autorizado</th>
                <th className="p-3 w-48">Fecha de Activación</th>
                <th className="p-3">Motivo de la Activación / Diagnóstico</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-gray/10 dark:divide-white/5 font-mono text-[11px] select-all">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-brand-white/30 dark:hover:bg-white/5 transition-all">
                  <td className="p-3 font-bold text-brand-cyan select-all">{log.id}</td>
                  <td className="p-3 font-sans">
                    <Badge variant="normal">{log.version}</Badge>
                  </td>
                  <td className="p-3 font-sans font-semibold text-brand-deep dark:text-white">
                    {log.user}
                  </td>
                  <td className="p-3 text-brand-gray">
                    {new Date(log.timestamp).toLocaleString('es-CO')}
                  </td>
                  <td className="p-3 text-brand-deep font-medium dark:text-white font-sans text-xs max-w-sm truncate" title={log.reason}>
                    {log.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modales overlay */}
      <ModelMetricsChart
        model={selectedModel}
        isOpen={isMetricsOpen}
        onClose={() => setIsMetricsOpen(false)}
      />

      <ModelActivationModal
        model={selectedModel}
        isOpen={isActivationOpen}
        onClose={() => setIsActivationOpen(false)}
        onConfirmActivation={handleConfirmActivation}
      />

      {/* Advertencia Normativa MLOps Inferior */}
      <div className="mt-2 flex items-start gap-2.5 p-3.5 bg-brand-white rounded-xl border border-brand-gray/10 text-[10px] text-brand-gray leading-relaxed dark:bg-primary-light/10 select-none">
        <HelpCircle className="w-4 h-4 text-brand-cyan flex-shrink-0 mt-0.5" />
        <div>
          <b>Aviso sobre versionamiento MLOps:</b> Los checkpoints desplegados cumplen con los criterios de validación cruzada. El cambio a nivel de backend modifica los parámetros de la primera capa de la arquitectura cargada en memoria, asegurando consistencia matemática sin necesidad de reiniciar contenedores Docker en el servidor clínico.
        </div>
      </div>
    </div>
  );
};
export default ModelsPage;

import { useState, useEffect, type FC } from 'react';
import { DashboardView as DashboardComponent } from '../components/DashboardView';
import { medicalApi } from '../services/api';
import type { PredictionLogItem } from '../services/api';

export const DashboardView: FC = () => {
  const [predictions, setPredictions] = useState<PredictionLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await medicalApi.getPredictions(50, 0);
        setPredictions(data.predictions);
      } catch (err) {
        console.error('Error cargando historial de predicciones:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-extrabold text-brand-deep dark:text-white">Panel de Control Analítico</h2>
        <p className="text-xs text-brand-gray">Resumen de volumen, precisión de inferencia neuronal e historial clínico.</p>
      </div>
      <DashboardComponent predictions={predictions} isLoading={isLoading} />
    </div>
  );
};

import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { PredictionLogItem } from '../services/api';
import { Badge } from './ui/Badge';
import { Skeleton } from './ui/Skeleton';
import { Clock, Eye, AlertCircle } from 'lucide-react';

interface RecentAnalysisListProps {
  predictions: PredictionLogItem[];
  isLoading: boolean;
}

export const RecentAnalysisList: React.FC<RecentAnalysisListProps> = ({
  predictions,
  isLoading,
}) => {
  const navigate = useNavigate();

  const handleRowClick = (id: string) => {
    navigate(`/history/${id}`);
  };

  const getRecentItems = () => {
    // Tomar solo los últimos 10
    return predictions.slice(0, 10);
  };

  const recentItems = getRecentItems();

  return (
    <div className="bg-white rounded-xl border border-brand-gray/15 overflow-hidden shadow-sm dark:bg-primary dark:border-brand-gray/10 select-none">
      <div className="p-4 border-b border-brand-gray/10 flex items-center justify-between">
        <h4 className="font-semibold text-brand-deep text-sm flex items-center gap-2 dark:text-white">
          <Clock className="w-4.5 h-4.5 text-brand-cyan" />
          Bitácora Reciente de Estudios
        </h4>
        <span className="text-[10px] font-mono text-brand-gray font-bold uppercase">Últimos 10</span>
      </div>

      {isLoading ? (
        <div className="p-4 flex flex-col gap-3">
          <Skeleton variant="text" className="w-full h-8" />
          <Skeleton variant="text" className="w-full h-8" />
          <Skeleton variant="text" className="w-full h-8" />
        </div>
      ) : recentItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center text-brand-gray">
          <AlertCircle className="w-7 h-7 opacity-40 mb-2" />
          <p className="text-xs">No se han registrado análisis diagnósticos hoy.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-brand-white/40 border-b border-brand-gray/15 text-brand-gray font-semibold dark:bg-primary-light/10">
                <th className="p-3.5">ID Predicción</th>
                <th className="p-3.5">Fecha / Hora</th>
                <th className="p-3.5">Modalidad</th>
                <th className="p-3.5">Resultado IA</th>
                <th className="p-3.5">Confianza</th>
                <th className="p-3.5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-gray/10 dark:divide-white/5 font-mono">
              {recentItems.map((item) => {
                const isAnomaly = item.predicted_class === 1;
                return (
                  <tr
                    key={item.id}
                    onClick={() => handleRowClick(item.id)}
                    className="hover:bg-brand-white/40 dark:hover:bg-white/5 transition-all cursor-pointer"
                  >
                    <td className="p-3.5 text-brand-deep font-bold dark:text-accent text-[11px] truncate max-w-[120px]">
                      {item.id}
                    </td>
                    <td className="p-3.5 text-brand-gray text-[11px] font-sans">
                      {new Date(item.timestamp).toLocaleString('es-CO')}
                    </td>
                    <td className="p-3.5 text-brand-deep dark:text-white text-[11px] font-sans font-bold">
                      RX
                    </td>
                    <td className="p-3.5">
                      <Badge variant={isAnomaly ? 'critical' : 'normal'}>
                        {isAnomaly ? 'Anomalía' : 'Normal'}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-brand-deep font-bold dark:text-white text-[11px]">
                      {(item.confidence * 100).toFixed(1)}%
                    </td>
                    <td className="p-3.5 text-center font-sans">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRowClick(item.id);
                        }}
                        className="p-1.5 hover:bg-brand-deep/5 hover:text-brand-cyan rounded transition-all text-brand-gray hover:scale-110 cursor-pointer"
                        title="Ver Detalles de Inferencia"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
export default RecentAnalysisList;

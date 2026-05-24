import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PredictionLogItem } from '../services/api';
import { Badge } from './ui/Badge';
import { Eye, ArrowUpDown, Download, ChevronLeft, ChevronRight } from 'lucide-react';

interface AnalysisTableProps {
  predictions: PredictionLogItem[];
  isLoading: boolean;
}

export const AnalysisTable: React.FC<AnalysisTableProps> = ({ predictions, isLoading }) => {
  const navigate = useNavigate();

  // Selección y paginación
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<keyof PredictionLogItem>('timestamp');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const itemsPerPage = 20;

  // Manejar Ordenación
  const handleSort = (field: keyof PredictionLogItem) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const processedData = useMemo(() => {
    const sorted = [...predictions].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === 'string') {
        return sortAsc ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
      }
      return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

    // Paginación
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginated = sorted.slice(startIndex, startIndex + itemsPerPage);

    return {
      paginated,
      totalCount: sorted.length,
      totalPages: Math.ceil(sorted.length / itemsPerPage),
    };
  }, [predictions, sortField, sortAsc, currentPage]);

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(processedData.paginated.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelectRow = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    e.stopPropagation();
    if (e.target.checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  // Exportar a CSV
  const exportToCSV = () => {
    if (selectedIds.length === 0) {
      alert('Por favor, seleccione al menos una fila para exportar.');
      return;
    }

    const selectedItems = predictions.filter((p) => selectedIds.includes(p.id));
    const headers = ['ID_Prediccion', 'Fecha_Inferencia', 'Modalidad', 'Prediccion_IA', 'Confianza', 'Latencia_ms', 'Resultado_Validado', 'Notas_Clinicas'];
    
    const rows = selectedItems.map((p) => [
      p.id,
      new Date(p.timestamp).toISOString(),
      p.modality || 'RX',
      p.predicted_class === 1 ? 'Anomalia' : 'Normal',
      p.confidence.toFixed(4),
      p.inference_time_ms.toFixed(1),
      p.corrected_class !== null ? (p.corrected_class === 1 ? 'Anomalia' : 'Normal') : 'No_Validado',
      p.clinical_notes || '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `auditoria_medvision_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-xl border border-brand-gray/15 overflow-hidden shadow-sm dark:bg-primary dark:border-brand-gray/10 select-none flex flex-col justify-between h-full min-h-[480px]">
      
      {/* Header Actions */}
      <div className="p-4 border-b border-brand-gray/10 flex items-center justify-between">
        <h4 className="font-semibold text-brand-deep text-sm dark:text-white">
          Bitácora de Auditoría Clínica
        </h4>
        <button
          onClick={exportToCSV}
          disabled={selectedIds.length === 0}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer ${
            selectedIds.length === 0
              ? 'bg-brand-deep/20 text-brand-gray/60 cursor-not-allowed border border-transparent'
              : 'bg-accent text-primary font-bold hover:bg-accent-dark'
          }`}
        >
          <Download className="w-3.5 h-3.5" />
          Exportar CSV ({selectedIds.length})
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center flex-grow py-20">
          <div className="w-8 h-8 border-3 border-brand-cyan border-t-transparent rounded-full animate-spin mb-3"></div>
          <span className="text-xs text-brand-gray">Cargando registros...</span>
        </div>
      ) : processedData.paginated.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-grow py-20 text-brand-gray text-xs">
          No se encontraron predicciones con los filtros seleccionados
        </div>
      ) : (
        <div className="overflow-x-auto flex-grow">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-brand-white/40 border-b border-brand-gray/15 text-brand-gray font-semibold dark:bg-primary-light/10">
                <th className="p-3.5 text-center w-12">
                  <input
                    type="checkbox"
                    onChange={toggleSelectAll}
                    checked={selectedIds.length === processedData.paginated.length && selectedIds.length > 0}
                    className="accent-brand-cyan h-3.5 w-3.5 cursor-pointer rounded"
                  />
                </th>
                <th className="p-3.5 cursor-pointer hover:text-brand-deep" onClick={() => handleSort('id')}>
                  ID Predicción (UUID) <ArrowUpDown className="w-3 h-3 inline ml-1" />
                </th>
                <th className="p-3.5 cursor-pointer hover:text-brand-deep" onClick={() => handleSort('timestamp')}>
                  Fecha / Hora <ArrowUpDown className="w-3 h-3 inline ml-1" />
                </th>
                <th className="p-3.5 cursor-pointer hover:text-brand-deep" onClick={() => handleSort('modality')}>
                  Modalidad <ArrowUpDown className="w-3 h-3 inline ml-1" />
                </th>
                <th className="p-3.5 cursor-pointer hover:text-brand-deep" onClick={() => handleSort('predicted_class')}>
                  Resultado IA <ArrowUpDown className="w-3 h-3 inline ml-1" />
                </th>
                <th className="p-3.5 cursor-pointer hover:text-brand-deep" onClick={() => handleSort('confidence')}>
                  Confianza <ArrowUpDown className="w-3 h-3 inline ml-1" />
                </th>
                <th className="p-3.5 cursor-pointer hover:text-brand-deep" onClick={() => handleSort('inference_time_ms')}>
                  Latencia <ArrowUpDown className="w-3 h-3 inline ml-1" />
                </th>
                <th className="p-3.5">Revisión Radiólogo</th>
                <th className="p-3.5 text-center">Auditar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-gray/10 dark:divide-white/5 font-mono">
              {processedData.paginated.map((item) => {
                const isAnomaly = item.predicted_class === 1;
                const isSelected = selectedIds.includes(item.id);
                return (
                  <tr
                    key={item.id}
                    onClick={() => navigate(`/history/${item.id}`)}
                    className={`hover:bg-brand-white/40 dark:hover:bg-white/5 transition-all cursor-pointer ${
                      isSelected ? 'bg-accent/5' : ''
                    }`}
                  >
                    <td className="p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => toggleSelectRow(e, item.id)}
                        className="accent-brand-cyan h-3.5 w-3.5 cursor-pointer rounded"
                      />
                    </td>
                    <td className="p-3.5 text-brand-deep font-bold dark:text-accent text-[11px] truncate max-w-[120px]">
                      {item.id}
                    </td>
                    <td className="p-3.5 text-brand-gray text-[11px] font-sans">
                      {new Date(item.timestamp).toLocaleString('es-CO')}
                    </td>
                    <td className="p-3.5 text-brand-deep font-semibold dark:text-white text-[11px] font-sans">
                      <span className="px-2 py-0.5 bg-brand-deep/5 dark:bg-white/5 border border-brand-gray/20 rounded text-[10px] font-mono font-bold">
                        {item.modality || 'RX'}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <Badge variant={isAnomaly ? 'critical' : 'normal'}>
                        {isAnomaly ? 'Anomalía' : 'Normal'}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-brand-deep font-bold dark:text-white text-[11px]">
                      {(item.confidence * 100).toFixed(1)}%
                    </td>
                    <td className="p-3.5 text-brand-gray text-[11px]">
                      {item.inference_time_ms.toFixed(0)} ms
                    </td>
                    <td className="p-3.5">
                      {item.corrected_class !== null ? (
                        <Badge variant={item.corrected_class === 1 ? 'critical' : 'normal'}>
                          Validado {item.corrected_class === 1 ? 'Anomalía' : 'Normal'}
                        </Badge>
                      ) : (
                        <span className="text-[10px] text-brand-gray font-sans italic">Pendiente</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center font-sans">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/history/${item.id}`);
                        }}
                        className="p-1 text-brand-cyan hover:scale-110 transition-transform cursor-pointer"
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

      {/* Paginación Footer */}
      {!isLoading && processedData.totalPages > 1 && (
        <div className="p-4 border-t border-brand-gray/10 flex items-center justify-between text-xs text-brand-gray font-sans">
          <span>
            Mostrando página <b>{currentPage}</b> de <b>{processedData.totalPages}</b> (Total:{' '}
            <b>{processedData.totalCount}</b> registros)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-1 bg-brand-deep/5 hover:bg-brand-deep/10 border border-brand-gray/10 text-brand-deep hover:text-brand-cyan rounded-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, processedData.totalPages))}
              disabled={currentPage === processedData.totalPages}
              className="p-1 bg-brand-deep/5 hover:bg-brand-deep/10 border border-brand-gray/10 text-brand-deep hover:text-brand-cyan rounded-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default AnalysisTable;

import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnalysisPanel } from '../components/AnalysisPanel';

describe('AnalysisPanel Component Tests', () => {
  test('debe mostrar el estado IDLE solicitando carga de estudio', () => {
    render(
      <AnalysisPanel
        state="idle"
        progress={0}
        error={null}
        prediction={null}
      />
    );

    expect(screen.getByText(/Espacio de trabajo listo para cargar estudio médico/i)).toBeInTheDocument();
  });

  test('debe dibujar barra de progreso e indicadores de análisis durante PROCESSING', () => {
    render(
      <AnalysisPanel
        state="processing"
        progress={65}
        error={null}
        prediction={null}
      />
    );

    expect(screen.getByText(/Analizando Red Neuronal.../i)).toBeInTheDocument();
    expect(screen.getByText(/65%/i)).toBeInTheDocument(); // Progreso
  });

  test('debe renderizar alertas rojas y explicaciones en caso de ERROR clínico', () => {
    const clinicalError = 'Servicio Diagnóstico Temporalmente Degradado. CUDA no responde.';
    render(
      <AnalysisPanel
        state="error"
        progress={0}
        error={clinicalError}
        prediction={null}
      />
    );

    expect(screen.getByText(/Diagnóstico Fallido/i)).toBeInTheDocument();
    expect(screen.getByText(clinicalError)).toBeInTheDocument();
  });

  test('debe renderizar clasificaciones críticas ante anomalías de alta confianza (DONE)', () => {
    const mockPrediction = {
      prediction_id: 'pred-900',
      prediction: 1, // Anomalía
      class_detected: 'anomalía',
      confidence: 0.985, // 98.5% (>= 95% = Crítico)
      gradcam_url: '/heatmaps/900.png',
      inference_time_ms: 104.2,
      metadata: null,
    };

    render(
      <AnalysisPanel
        state="done"
        progress={100}
        error={null}
        prediction={mockPrediction}
      />
    );

    expect(screen.getByText(/Panel Clínico de Análisis/i)).toBeInTheDocument();
    expect(screen.getByText(/Crítico \(Prioritario\)/i)).toBeInTheDocument();
    expect(screen.getByText(/98.5%/i)).toBeInTheDocument(); // Confianza
    expect(screen.getByText(/104.2/i)).toBeInTheDocument(); // Latencia
  });

  test('debe renderizar diagnóstico normal ante placas limpias (DONE)', () => {
    const mockPrediction = {
      prediction_id: 'pred-901',
      prediction: 0, // Normal
      class_detected: 'normal',
      confidence: 0.942, // 94.2%
      gradcam_url: null,
      inference_time_ms: 98.5,
      metadata: null,
    };

    render(
      <AnalysisPanel
        state="done"
        progress={100}
        error={null}
        prediction={mockPrediction}
      />
    );

    expect(screen.getByText(/Sin Anomalías \(Normal\)/i)).toBeInTheDocument();
    expect(screen.getByText(/94.2%/i)).toBeInTheDocument();
  });
});

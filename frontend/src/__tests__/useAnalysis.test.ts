import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAnalysis } from '../hooks/useAnalysis';
import { medicalApi } from '../services/api';

// Mock de medicalApi
vi.mock('../services/api', () => {
  return {
    medicalApi: {
      predictImage: vi.fn(),
    },
  };
});

describe('useAnalysis Hook Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('debe inicializarse en estado IDLE con progreso cero', () => {
    const { result } = renderHook(() => useAnalysis());
    
    expect(result.current.state).toBe('idle');
    expect(result.current.progress).toBe(0);
    expect(result.current.error).toBeNull();
    expect(result.current.prediction).toBeNull();
  });

  test('debe transicionar por uploading/processing y finalizar exitosamente (DONE) al resolver API', async () => {
    const mockResponse = {
      prediction_id: 'pred-1002',
      prediction: 1,
      class_detected: 'anomalía',
      confidence: 0.962,
      gradcam_url: '/heatmaps/pred-1002.png',
      inference_time_ms: 110,
      metadata: null,
    };
    
    // Mock del retorno exitoso de la API
    vi.mocked(medicalApi.predictImage).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useAnalysis());
    const validFile = new File(['Ray'], 'chest.png', { type: 'image/png' });
    const metadata = { patientId: 'P-992', modality: 'RX' as const, studyDate: '2026-05-24' };

    // Disparar inferencia
    let promise: Promise<any>;
    act(() => {
      promise = result.current.sendToAPI(validFile, metadata);
    });

    // 1. Estado inmediato debe ser uploading
    expect(result.current.state).toBe('uploading');
    
    // Avanzar temporizador para completar el uploading inicial (~600ms)
    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    // 2. Transiciona a processing
    expect(result.current.state).toBe('processing');

    // Avanzar temporizador para disparar la inferencia real en el catch/then
    await act(async () => {
      // Avanzar temporizador de simulación de inferencia
      vi.advanceTimersByTime(1500);
      await promise; // Resolver promesa axios mockeada
    });

    // Avanzar temporizador de completado final al 100% (~200ms)
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    // 3. Resultado DONE
    expect(result.current.state).toBe('done');
    expect(result.current.progress).toBe(100);
    expect(result.current.prediction).toEqual(mockResponse);
    expect(result.current.error).toBeNull();
  });

  test('debe manejar errores de CUDA/Servidor Degradado (HTTP 503)', async () => {
    const errorResponse = {
      response: {
        status: 503,
        data: { detail: 'CUDA Out Of Memory' }
      }
    };
    
    vi.mocked(medicalApi.predictImage).mockRejectedValue(errorResponse);

    const { result } = renderHook(() => useAnalysis());
    const validFile = new File(['Ray'], 'chest.png', { type: 'image/png' });
    const metadata = { patientId: 'P-992', modality: 'RX' as const, studyDate: '2026-05-24' };

    let promise: Promise<any>;
    act(() => {
      promise = result.current.sendToAPI(validFile, metadata);
    });

    // Avanzar uploading y processing
    await act(async () => {
      vi.advanceTimersByTime(2100);
      try {
        await promise;
      } catch (e) {
        // Ignorar rechazo esperado para la prueba
      }
    });

    expect(result.current.state).toBe('error');
    expect(result.current.error).toContain('Servicio Diagnóstico Temporalmente Degradado');
    expect(result.current.prediction).toBeNull();
  });

  test('debe permitir resetear la máquina de estados', () => {
    const { result } = renderHook(() => useAnalysis());

    act(() => {
      result.current.resetAnalysis();
    });

    expect(result.current.state).toBe('idle');
    expect(result.current.progress).toBe(0);
    expect(result.current.error).toBeNull();
    expect(result.current.prediction).toBeNull();
  });
});

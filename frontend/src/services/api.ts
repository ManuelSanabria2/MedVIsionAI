import axios from 'axios';

// Instancia de Axios configurada
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de peticiones para adjuntar JWT token en cabeceras
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('medvision_jwt');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de respuestas para capturar 401 y re-dirigir a login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('[Security] HTTP 401 Unauthorized captured! Clearing clinical session and redirecting to login portal.');
      localStorage.removeItem('medvision_jwt');
      localStorage.removeItem('medvision_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface PredictionResponse {
  prediction_id: string;
  prediction: number;
  class_detected: string;
  confidence: number;
  gradcam_url: string | null;
  inference_time_ms: number;
  metadata: Record<string, any> | null;
}

export interface FeedbackRequest {
  prediction_id: string;
  correct_label: number;
  clinical_notes?: string;
}

export interface PredictionLogItem {
  id: string;
  timestamp: string;
  predicted_class: number;
  confidence: number;
  inference_time_ms: number;
  heatmap_path: string | null;
  corrected_class: number | null;
  clinical_notes: string | null;
  feedback_timestamp: string | null;
  modality?: string;
}

export interface PredictionsListResponse {
  total: number;
  predictions: PredictionLogItem[];
}

export interface HealthResponse {
  status: string;
  model_loaded: boolean;
  device: string;
  version: string;
}

export interface ModelInfoResponse {
  architecture: string;
  num_classes: number;
  class_names: Record<number, string>;
  training_date: string;
  metrics: Record<string, number>;
}

export const medicalApi = {
  checkHealth: async (): Promise<HealthResponse> => {
    const response = await api.get<HealthResponse>('/health');
    return response.data;
  },

  predictImage: async (file: File): Promise<PredictionResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<PredictionResponse>('/predict', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  submitFeedback: async (feedback: FeedbackRequest): Promise<{ message: string; prediction_id: string }> => {
    const response = await api.post('/feedback', feedback);
    return response.data;
  },

  getPredictions: async (limit: number = 50, offset: number = 0): Promise<PredictionsListResponse> => {
    const response = await api.get<PredictionsListResponse>('/predictions', {
      params: { limit, offset },
    });
    return response.data;
  },

  getModelInfo: async (): Promise<ModelInfoResponse> => {
    const response = await api.get<ModelInfoResponse>('/model/info');
    return response.data;
  },
};

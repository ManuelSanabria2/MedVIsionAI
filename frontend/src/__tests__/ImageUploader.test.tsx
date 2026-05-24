import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImageUploader } from '../components/ImageUploader';

// Mock de URL.createObjectURL para simular previsualización local
global.URL.createObjectURL = vi.fn(() => 'blob:sim-url');

describe('ImageUploader Component Tests', () => {
  const mockOnUpload = vi.fn();

  beforeEach(() => {
    mockOnUpload.mockClear();
    vi.restoreAllMocks();
  });

  test('debe renderizar el Dropzone inicial y textos corporativos', () => {
    render(<ImageUploader onUpload={mockOnUpload} isLoading={false} />);
    
    expect(screen.getByText(/Cargar Estudio Radiográfico/i)).toBeInTheDocument();
    expect(screen.getByText(/Arrastra tu archivo aquí o haz clic para explorar/i)).toBeInTheDocument();
    expect(screen.getByText(/Formatos: DICOM \(.dcm\), PNG, JPG \(máx. 50MB\)/i)).toBeInTheDocument();
  });

  test('debe bloquear formatos incompatibles mostrando advertencias clínicas', () => {
    render(<ImageUploader onUpload={mockOnUpload} isLoading={false} />);
    
    const file = new File(['mock content'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByTestId('file-input') as HTMLInputElement;

    // Simular evento de carga
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText(/Formato no compatible/i)).toBeInTheDocument();
    expect(mockOnUpload).not.toHaveBeenCalled();
  });

  test('debe bloquear archivos que excedan el límite de 50MB', () => {
    render(<ImageUploader onUpload={mockOnUpload} isLoading={false} />);
    
    // Crear un archivo ficticio que excede 50MB
    const bigFile = new File([''], 'big_radiography.png', { type: 'image/png' });
    Object.defineProperty(bigFile, 'size', { value: 60 * 1024 * 1024 }); // 60MB

    const input = screen.getByTestId('file-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [bigFile] } });

    expect(screen.getByText(/El archivo excede el límite de tamaño/i)).toBeInTheDocument();
    expect(mockOnUpload).not.toHaveBeenCalled();
  });

  test('debe previsualizar imágenes válidas y permitir rellenar metadatos', async () => {
    render(<ImageUploader onUpload={mockOnUpload} isLoading={false} />);
    
    const validFile = new File(['img_content'], 'thorax_ray.png', { type: 'image/png' });
    const input = screen.getByTestId('file-input') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [validFile] } });

    // La previsualización debe mostrar la metadata del archivo cargado
    expect(screen.getByText('thorax_ray.png')).toBeInTheDocument();
    expect(screen.queryByText(/Formato no compatible/i)).not.toBeInTheDocument();

    // Rellenar formulario clínico de anonimización
    const idInput = screen.getByPlaceholderText(/MV-XXXXXX/i);
    fireEvent.change(idInput, { target: { value: 'PAT-4029' } });

    // Modificar modalidad
    const modalitySelect = screen.getByRole('combobox');
    fireEvent.change(modalitySelect, { target: { value: 'CT' } });

    // Enviar formulario
    const submitBtn = screen.getByRole('button', { name: /Iniciar Análisis Diagnóstico/i });
    fireEvent.click(submitBtn);

    expect(mockOnUpload).toHaveBeenCalledTimes(1);
    expect(mockOnUpload).toHaveBeenCalledWith(validFile, {
      patientId: 'PAT-4029',
      modality: 'CT',
      studyDate: expect.any(String),
    });
  });

  test('debe deshabilitar botones y mostrar spinner si isLoading es true', () => {
    render(<ImageUploader onUpload={mockOnUpload} isLoading={true} />);
    
    const validFile = new File(['img_content'], 'thorax_ray.png', { type: 'image/png' });
    const input = screen.getByTestId('file-input') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [validFile] } });

    const submitBtn = screen.getByRole('button', { name: /Analizando Estudio.../i });
    expect(submitBtn).toBeDisabled();
  });
});

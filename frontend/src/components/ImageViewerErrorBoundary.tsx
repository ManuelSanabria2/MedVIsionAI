import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from './ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ImageViewerErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(
      `%c[IMAGING ERROR BOUNDARY] Viewer exception captured! %c\n` +
      `• Message: ${error.message}\n` +
      `• Component: ${errorInfo.componentStack}`,
      'color: #EF4444; font-weight: bold;',
      'color: #64748B;'
    );
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-[420px] bg-brand-deep/5 dark:bg-black/40 rounded-xl border border-dashed border-red-500/30 flex flex-col items-center justify-center p-6 text-center select-none font-sans">
          <div className="p-3 bg-red-500/10 text-red-500 rounded-full mb-3">
            <AlertCircle className="w-8 h-8" />
          </div>
          
          <span className="text-[10px] uppercase font-bold text-red-500 tracking-wider">
            Fallo de Transferencia DICOM
          </span>
          <h4 className="text-sm font-black text-brand-deep dark:text-white uppercase mt-1">
            Error al Renderizar Placa
          </h4>
          <p className="text-xs text-brand-gray max-w-xs mt-2 leading-relaxed">
            No se pudo descargar el mapa de calor Grad-CAM o el archivo radiográfico original del microservicio de almacenamiento.
          </p>

          <Button
            variant="secondary"
            onClick={this.handleRetry}
            className="mt-4 flex items-center justify-center gap-1 py-1.5 px-4 text-xs font-semibold cursor-pointer border border-brand-gray/10 hover:border-brand-deep"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Re-intentar Conexión
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ImageViewerErrorBoundary;

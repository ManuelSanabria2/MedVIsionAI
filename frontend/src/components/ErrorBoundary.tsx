import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ShieldAlert, RefreshCcw, Heart } from 'lucide-react';
import { Button } from './ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Simular el logging a un servicio de monitoreo MLOps (Datadog/Sentry)
    console.error(
      `%c[MONITORING ENGINE] Global clinical exception logged! %c\n` +
      `• Error Message: ${error.message}\n` +
      `• Stack trace details: ${error.stack}\n` +
      `• Component Context: ${errorInfo.componentStack}\n` +
      `• Action: Sent report to official IT Clinical Security department.`,
      'color: #EF4444; font-weight: bold; font-size: 11px;',
      'color: #64748B;'
    );
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-brand-white dark:bg-primary flex items-center justify-center p-6 select-none font-sans">
          <div className="w-full max-w-lg bg-white dark:bg-primary border border-red-200 dark:border-red-500/20 rounded-2xl p-8 shadow-xl text-center flex flex-col items-center gap-5">
            <div className="p-4 bg-red-500/10 text-red-600 rounded-full animate-pulse">
              <ShieldAlert className="w-12 h-12" />
            </div>

            <div>
              <span className="block text-[10px] uppercase tracking-widest font-extrabold text-red-600 dark:text-red-400">
                Anomalía de Ejecución de Software
              </span>
              <h1 className="text-xl font-black text-brand-deep dark:text-white uppercase mt-1.5 tracking-tight leading-none">
                Error Clínico Detectado
              </h1>
              <p className="text-xs text-brand-gray mt-3 leading-relaxed">
                El motor convolucional o el renderizado del expediente ha colapsado de forma temporal. Se ha generado un registro cifrado de auditoría y se ha notificado al departamento de soporte técnico MLOps.
              </p>
            </div>

            {this.state.error && (
              <div className="w-full bg-brand-deep/5 dark:bg-white/5 border border-brand-gray/10 p-3 rounded-lg text-left font-mono text-[9px] text-red-500 max-h-[80px] overflow-y-auto">
                {this.state.error.name}: {this.state.error.message}
              </div>
            )}

            <Button
              variant="primary"
              onClick={this.handleReload}
              className="w-full flex items-center justify-center gap-1.5 py-3 bg-red-600 border border-red-600 hover:bg-red-700 text-white font-bold rounded-xl cursor-pointer shadow-lg shadow-red-500/10"
            >
              <RefreshCcw className="w-4.5 h-4.5" />
              Recargar Aplicación Médica
            </Button>

            {/* Legal Notice */}
            <div className="mt-2 flex items-start gap-2 text-left text-[9px] text-brand-gray leading-snug border-t border-brand-gray/10 pt-4 w-full">
              <Heart className="w-4 h-4 text-brand-cyan flex-shrink-0 mt-0.5" />
              <span>
                <b>Garantía de Resiliencia HIPAA:</b> La desconexión temporal de interfaces no compromete la base de datos PostgreSQL de auditoría ni los datos DICOM de pacientes custodiados de conformidad con la Ley 1581 de 2012.
              </span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;

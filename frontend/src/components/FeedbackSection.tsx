import { useState, type FC } from 'react';
import { ClipboardEdit, CheckCircle2, ShieldAlert } from 'lucide-react';
import { medicalApi } from '../services/api';

interface FeedbackSectionProps {
  predictionId: string;
  initialLabel: number;
  onFeedbackSubmitted?: (correctLabel: number, notes: string) => void;
}

export const FeedbackSection: FC<FeedbackSectionProps> = ({
  predictionId,
  initialLabel,
  onFeedbackSubmitted,
}) => {
  const [correctLabel, setCorrectLabel] = useState<number>(initialLabel);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await medicalApi.submitFeedback({
        prediction_id: predictionId,
        correct_label: correctLabel,
        clinical_notes: notes.trim() || undefined,
      });
      setIsSuccess(true);
      if (onFeedbackSubmitted) {
        onFeedbackSubmitted(correctLabel, notes);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        err.response?.data?.detail || 'Error de red. No se pudo registrar el feedback.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-brand-gray/15 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4 border-b border-brand-gray/10 pb-3">
        <ClipboardEdit className="w-4 h-4 text-brand-cyan" />
        <h4 className="font-semibold text-brand-deep text-sm">
          Validación del Especialista (Active Learning)
        </h4>
      </div>

      {isSuccess ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2 animate-bounce" />
          <p className="text-emerald-700 font-semibold text-sm">Feedback Clínico Guardado</p>
          <p className="text-brand-gray text-xs mt-1 max-w-[280px]">
            La corrección fue almacenada en PostgreSQL y se usará para el reentrenamiento supervisado del modelo.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
          <div>
            <label className="block text-brand-deep font-semibold mb-1.5">
              ¿Es correcto el diagnóstico sugerido?
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setCorrectLabel(0)}
                className={`py-2 px-3 rounded-lg border font-medium transition-all ${
                  correctLabel === 0
                    ? 'border-brand-cyan bg-brand-cyan/5 text-brand-cyan font-bold shadow-sm'
                    : 'border-brand-gray/20 text-brand-gray hover:border-brand-deep/30'
                }`}
              >
                Normal (Sin Anomalías)
              </button>
              <button
                type="button"
                onClick={() => setCorrectLabel(1)}
                className={`py-2 px-3 rounded-lg border font-medium transition-all ${
                  correctLabel === 1
                    ? 'border-brand-cyan bg-brand-cyan/5 text-brand-cyan font-bold shadow-sm'
                    : 'border-brand-gray/20 text-brand-gray hover:border-brand-deep/30'
                }`}
              >
                Con Anomalía (Patológico)
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="block text-brand-deep font-semibold mb-1.5">
              Notas Clínicas u Observaciones (Opcional)
            </label>
            <textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describa hallazgos específicos, falsos positivos por artefactos, tipo de patología observada, etc..."
              className="w-full p-2.5 bg-brand-white border border-brand-gray/25 rounded-lg focus:border-brand-cyan focus:outline-none transition-all placeholder:text-brand-gray/50"
            />
          </div>

          {errorMsg && (
            <div className="flex items-center gap-1.5 p-2.5 bg-red-50 text-red-700 rounded border border-red-100">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-2.5 text-center font-medium rounded-lg shadow-sm transition-all text-white ${
              isSubmitting
                ? 'bg-brand-deep/75 cursor-not-allowed'
                : 'bg-brand-deep hover:bg-brand-deep/90'
            }`}
          >
            {isSubmitting ? 'Registrando corrección...' : 'Guardar Feedback'}
          </button>
        </form>
      )}
    </div>
  );
};

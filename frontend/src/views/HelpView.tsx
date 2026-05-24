import { type FC } from 'react';
import { BookOpen, Scale, Landmark } from 'lucide-react';

export const HelpView: FC = () => {
  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-extrabold text-brand-deep dark:text-white">Normativa y Guía Clínica</h2>
        <p className="text-xs text-brand-gray">Información legal, cumplimiento regulatorio de datos sensibles e instructivos de soporte diagnóstico.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ley 1581 */}
        <div className="bg-white rounded-xl border border-brand-gray/15 p-5 shadow-sm dark:bg-primary dark:border-brand-gray/10 flex flex-col gap-3">
          <h3 className="font-bold text-sm text-brand-deep dark:text-white flex items-center gap-2 border-b border-brand-gray/10 pb-3">
            <Scale className="w-4.5 h-4.5 text-brand-cyan" />
            Ley 1581 de 2012 (Habeas Data)
          </h3>
          <p className="text-xs text-brand-gray leading-relaxed font-sans">
            Las imágenes médicas (DICOM/Rayos X) contienen datos sensibles del paciente. En cumplimiento estricto con la legislación colombiana (Ley 1581 de 2012), MedVision AI cuenta con un pipeline de preprocesamiento local que <b>puga en tránsito</b> todos los campos PII (PatientName, PatientID, etc.) del header del archivo antes de almacenarse en PostgreSQL o enviarse al clasificador, garantizando anonimato completo y seguridad cifrada.
          </p>
        </div>

        {/* Regulacion INVIMA */}
        <div className="bg-white rounded-xl border border-brand-gray/15 p-5 shadow-sm dark:bg-primary dark:border-brand-gray/10 flex flex-col gap-3">
          <h3 className="font-bold text-sm text-brand-deep dark:text-white flex items-center gap-2 border-b border-brand-gray/10 pb-3">
            <Landmark className="w-4.5 h-4.5 text-brand-cyan" />
            Regulación INVIMA (SaMD)
          </h3>
          <p className="text-xs text-brand-gray leading-relaxed font-sans">
            Cualquier software que asista en la toma de decisiones médicas (Software as a Medical Device - SaMD) requiere evaluación y registro del INVIMA para su uso en entornos clínicos reales. 
            <br /><br />
            <b>Aviso de Responsabilidad:</b> MedVision AI es un <b>prototipo de investigación académica</b> de la Universidad Santo Tomás Tunja. NO cuenta con certificación clínica y debe utilizarse únicamente para validación investigativa o docente, nunca como único criterio terapéutico.
          </p>
        </div>
      </div>

      {/* Manual de Operación */}
      <div className="bg-white rounded-xl border border-brand-gray/15 p-5 shadow-sm dark:bg-primary dark:border-brand-gray/10 flex flex-col gap-4">
        <h3 className="font-bold text-sm text-brand-deep dark:text-white flex items-center gap-2 border-b border-brand-gray/10 pb-3">
          <BookOpen className="w-4.5 h-4.5 text-brand-cyan" />
          Instructivo de Operación Clínica
        </h3>

        <div className="text-xs flex flex-col gap-4">
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-accent/15 border border-accent/30 text-brand-cyan font-bold flex items-center justify-center shrink-0">
              1
            </div>
            <div>
              <span className="block font-bold text-brand-deep dark:text-white">Carga del estudio</span>
              <p className="text-brand-gray mt-1 font-sans">Arrastre la radiografía en el workspace. El preprocesador detectará si es un DICOM (.dcm) o formato estándar (.png/.jpg) y aplicará la normalización window/level.</p>
            </div>
          </div>

          <div className="flex gap-3 border-t border-brand-gray/10 pt-4">
            <div className="w-6 h-6 rounded-full bg-accent/15 border border-accent/30 text-brand-cyan font-bold flex items-center justify-center shrink-0">
              2
            </div>
            <div>
              <span className="block font-bold text-brand-deep dark:text-white">Auditoría visual (Grad-CAM)</span>
              <p className="text-brand-gray mt-1 font-sans">Utilice el control deslizante (slider) para graduar la opacidad del heatmap. Verifique si el área iluminada en rojo concuerda con las regiones anatómicas sospechosas (ej. condensación lobar en neumonía).</p>
            </div>
          </div>

          <div className="flex gap-3 border-t border-brand-gray/10 pt-4">
            <div className="w-6 h-6 rounded-full bg-accent/15 border border-accent/30 text-brand-cyan font-bold flex items-center justify-center shrink-0">
              3
            </div>
            <div>
              <span className="block font-bold text-brand-deep dark:text-white">Registro de Feedback</span>
              <p className="text-brand-gray mt-1 font-sans">Valide el diagnóstico. Si detecta un falso positivo o falso negativo, ingrese la clase correcta en el formulario de validación médica. Sus notas clínicas se guardarán de forma anonimizada para Active Learning.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

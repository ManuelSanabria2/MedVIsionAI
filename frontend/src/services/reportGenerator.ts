import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { AnalysisReport } from '../templates/AnalysisReport';
import type { PredictionLogItem } from './api';
import type { User } from '../types/auth';

export const reportGenerator = {
  /**
   * Compila la plantilla de reporte react-pdf en caliente y retorna un binario Blob.
   */
  generateBlob: async (
    data: PredictionLogItem,
    user: User | null,
    clinicalNotes: string | null,
    correctedClass: number | null,
    isAgreed: boolean
  ): Promise<Blob> => {
    // Instanciar el elemento de React en caliente
    const doc = React.createElement(AnalysisReport, {
      data,
      user,
      clinicalNotes,
      correctedClass,
      isAgreed,
    });

    // Compilar mediante react-pdf bundle
    const pdfInstance = pdf();
    pdfInstance.updateContainer(doc);
    
    const blob = await pdfInstance.toBlob();
    return blob;
  },
};
export default reportGenerator;

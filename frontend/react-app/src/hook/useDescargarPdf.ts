import { useState, useCallback } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export function useDescargarPdf() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const downloadPdf = useCallback(async (element: HTMLElement | null, fileName: string) => {
    if (!element) {
        console.error("Referencia al elemento nula");
        return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // 1. Generar Canvas del HTML
      const canvas = await html2canvas(element, {
        scale: 2, // Mejor calidad
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff', // Fondo blanco forzado
      });

      const imgData = canvas.toDataURL('image/png');

      // 2. Configurar PDF (A4)
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

      // 3. Lógica para múltiples páginas
      let heightLeft = imgHeight;
      let position = 0;

      // Primera página
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;

      // Páginas siguientes (si el contenido es muy largo)
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      // 4. Descargar
      pdf.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);

    } catch (err: any) {
      console.error("Error generando PDF:", err);
      setError(err.message || "Error al generar el PDF");
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return { 
    downloadPdf, 
    isGenerating, 
    error 
  };
}
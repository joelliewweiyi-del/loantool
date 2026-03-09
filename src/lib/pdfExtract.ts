import * as pdfjsLib from 'pdfjs-dist';

// Point worker to the static copy in public/
// Source: node_modules/pdfjs-dist/build/pdf.worker.min.js
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

/**
 * Extract all text content from a PDF file.
 * Returns a single string with page texts joined by newlines.
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pageTexts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    pageTexts.push(text);
  }

  return pageTexts.join('\n');
}

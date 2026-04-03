import * as pdfjsLib from 'pdfjs-dist';

// Reuse the same worker as pdfExtract.ts
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

/**
 * Render each page of a PDF to a base64-encoded JPEG image.
 * Uses 1.5x scale for readability while keeping payload size manageable.
 * JPEG at 85% quality is ~5-10x smaller than PNG for document pages.
 */
export async function renderPdfToImages(blob: Blob): Promise<string[]> {
  const arrayBuffer = await blob.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const images: string[] = [];
  const scale = 1.5;

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error(`Failed to get canvas context for page ${i}`);

    // White background (JPEG has no transparency)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport }).promise;

    // JPEG at 85% quality — much smaller than PNG
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, '');
    images.push(base64);
  }

  return images;
}

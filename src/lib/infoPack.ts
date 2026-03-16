import JSZip from 'jszip';
import { fetchDocumentsForLoans, downloadDocument } from '@/hooks/useDocuments';
import type { LoanDocument } from '@/types/loan';

interface InfoPackOptions {
  loanIds: string[];
  /** Map of loan_id (uuid) → display loan_id (e.g. "S16") for folder naming */
  loanDisplayIds: Record<string, string>;
  onProgress?: (current: number, total: number) => void;
}

export async function generateInfoPack({ loanIds, loanDisplayIds, onProgress }: InfoPackOptions): Promise<Blob> {
  const documents = await fetchDocumentsForLoans(loanIds);
  if (documents.length === 0) {
    throw new Error('No documents found for earmarked loans');
  }

  const zip = new JSZip();
  let completed = 0;

  for (const doc of documents) {
    const blob = await downloadDocument(doc.file_path);
    const folderName = loanDisplayIds[doc.loan_id] || doc.loan_id;
    zip.file(`${folderName}/${doc.file_name}`, blob);
    completed++;
    onProgress?.(completed, documents.length);
  }

  return zip.generateAsync({ type: 'blob' });
}

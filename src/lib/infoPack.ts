import JSZip from 'jszip';
import { fetchDocumentsForLoans, downloadDocument } from '@/hooks/useDocuments';
import type { LoanDocument } from '@/types/loan';

interface InfoPackOptions {
  /** Earmarked loan UUIDs */
  earmarkedIds: string[];
  /** Non-earmarked loan UUIDs */
  nonEarmarkedIds: string[];
  /** Map of loan_id (uuid) → display loan_id (e.g. "S16") for folder naming */
  loanDisplayIds: Record<string, string>;
  onProgress?: (current: number, total: number) => void;
}

/** Patterns that indicate a credit proposal document */
const CREDIT_PROPOSAL_PATTERNS = [
  /kredietbrief/i,
  /voorstel/i,
  /credit\s*proposal/i,
  /loan\s*proposal/i,
  /credit\s*memo/i,
];

function isCreditProposal(fileName: string): boolean {
  return CREDIT_PROPOSAL_PATTERNS.some(p => p.test(fileName));
}

/**
 * For an earmarked loan, pick the best English-language document:
 * 1. An -EN.html translation if available
 * 2. Otherwise, the first document whose name matches credit proposal patterns
 */
function pickEnglishDoc(loanId: string, docs: LoanDocument[]): LoanDocument | null {
  const loanDocs = docs.filter(d => d.loan_id === loanId);
  const translation = loanDocs.find(d => d.file_name.endsWith('-EN.html'));
  if (translation) return translation;
  const proposal = loanDocs.find(d => isCreditProposal(d.file_name));
  return proposal || null;
}

export async function generateInfoPack({ earmarkedIds, nonEarmarkedIds, loanDisplayIds, onProgress }: InfoPackOptions): Promise<Blob> {
  const allIds = [...earmarkedIds, ...nonEarmarkedIds];
  const documents = await fetchDocumentsForLoans(allIds);
  if (documents.length === 0) {
    throw new Error('No documents found for selected loans');
  }

  const earmarkedSet = new Set(earmarkedIds);

  // For earmarked loans, pick the best English doc (translation or credit proposal)
  const englishDocIds = new Set<string>();
  for (const loanId of earmarkedIds) {
    const doc = pickEnglishDoc(loanId, documents);
    if (doc) englishDocIds.add(doc.id);
  }

  const zip = new JSZip();
  let completed = 0;

  for (const doc of documents) {
    const blob = await downloadDocument(doc.file_path);
    const folderName = loanDisplayIds[doc.loan_id] || doc.loan_id;
    const section = earmarkedSet.has(doc.loan_id) ? 'Earmarked' : 'Non-Earmarked';
    zip.file(`${section}/${folderName}/${doc.file_name}`, blob);

    // Also add to Earmarked - English folder if this is the picked English doc
    if (englishDocIds.has(doc.id)) {
      zip.file(`Earmarked - English/${folderName}/${doc.file_name}`, blob);
    }

    completed++;
    onProgress?.(completed, documents.length);
  }

  return zip.generateAsync({ type: 'blob' });
}

interface TranslationPackOptions {
  loanIds: string[];
  loanDisplayIds: Record<string, string>;
  onProgress?: (current: number, total: number) => void;
}

export async function generateTranslationPack({ loanIds, loanDisplayIds, onProgress }: TranslationPackOptions): Promise<Blob> {
  const documents = await fetchDocumentsForLoans(loanIds);
  const translations = documents.filter(d => d.file_name.endsWith('-EN.html'));
  if (translations.length === 0) {
    throw new Error('No English translations found');
  }

  const zip = new JSZip();
  let completed = 0;

  for (const doc of translations) {
    const blob = await downloadDocument(doc.file_path);
    const displayId = loanDisplayIds[doc.loan_id] || doc.loan_id;
    // Prefix with loan ID for clarity, flat structure (no folders)
    zip.file(`${displayId} - ${doc.file_name}`, blob);
    completed++;
    onProgress?.(completed, translations.length);
  }

  return zip.generateAsync({ type: 'blob' });
}

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { extractTextFromPdf } from '@/lib/pdfExtract';
import { wrapTranslationHtml } from '@/lib/translationTemplate';
import { downloadDocument } from '@/hooks/useDocuments';
import type { LoanDocument } from '@/types/loan';
import { toast } from 'sonner';

/** Derive the translated file name from the original */
function translatedFileName(originalName: string): string {
  const dotIdx = originalName.lastIndexOf('.');
  const baseName = dotIdx > 0 ? originalName.slice(0, dotIdx) : originalName;
  return `${baseName}-EN.html`;
}

/** Open an HTML string in a new browser tab */
function openHtmlInNewTab(html: string) {
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  // Revoke after a delay so the tab has time to load
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function useTranslateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (doc: LoanDocument) => {
      const enFileName = translatedFileName(doc.file_name);
      const enFilePath = `${doc.loan_id}/${enFileName}`;

      // 1. Check if translation already exists in storage
      const { data: existingList } = await supabase.storage
        .from('loan-documents')
        .list(doc.loan_id, { search: enFileName });

      const alreadyExists = existingList?.some(f => f.name === enFileName);

      if (alreadyExists) {
        // Download and open the cached translation
        const blob = await downloadDocument(enFilePath);
        const html = await blob.text();
        openHtmlInNewTab(html);
        return { cached: true };
      }

      // 2. Download the original PDF
      toast.info('Downloading document...');
      const pdfBlob = await downloadDocument(doc.file_path);

      // 3. Extract text from PDF
      toast.info('Extracting text...');
      const pdfFile = new File([pdfBlob], doc.file_name, { type: 'application/pdf' });
      const text = await extractTextFromPdf(pdfFile);

      if (!text || text.trim().length < 50) {
        throw new Error('Could not extract enough text from this PDF. It may be a scanned/image PDF.');
      }

      // 4. Send to Edge Function for translation
      toast.info('Translating document...');
      const { data, error } = await supabase.functions.invoke('translate-document', {
        body: { text },
      });

      if (error) {
        const detail = data?.error || error.message;
        throw new Error(`Translation failed: ${detail}`);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Translation returned no results');
      }

      // 5. Wrap in branded template
      const fullHtml = wrapTranslationHtml(data.html, data.title, doc.file_name);

      // 6. Upload translated HTML to storage
      const htmlBlob = new Blob([fullHtml], { type: 'text/html' });
      const { error: uploadError } = await supabase.storage
        .from('loan-documents')
        .upload(enFilePath, htmlBlob, {
          contentType: 'text/html',
          upsert: true,
        });
      if (uploadError) throw uploadError;

      // 7. Create document record
      const { data: user } = await supabase.auth.getUser();
      const { data: existing } = await supabase
        .from('loan_documents')
        .select('id')
        .eq('loan_id', doc.loan_id)
        .eq('file_name', enFileName)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('loan_documents')
          .update({
            file_size: htmlBlob.size,
            content_type: 'text/html',
            uploaded_by: user.user!.id,
            created_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        const { error: insertError } = await supabase
          .from('loan_documents')
          .insert({
            loan_id: doc.loan_id,
            file_name: enFileName,
            file_path: enFilePath,
            file_size: htmlBlob.size,
            content_type: 'text/html',
            uploaded_by: user.user!.id,
          });
        if (insertError) throw insertError;
      }

      // 8. Open in new tab
      openHtmlInNewTab(fullHtml);

      return { cached: false };
    },
    onSuccess: (_result, doc) => {
      queryClient.invalidateQueries({ queryKey: ['loan-documents', doc.loan_id] });
      toast.success('Translation complete');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

/** Check if a translation already exists for a given document */
export function hasTranslation(doc: LoanDocument, allDocs: LoanDocument[]): boolean {
  const enFileName = translatedFileName(doc.file_name);
  return allDocs.some(d => d.file_name === enFileName);
}

/** Check if a document IS a translation (ends with -EN.html) */
export function isTranslationFile(doc: LoanDocument): boolean {
  return doc.file_name.endsWith('-EN.html');
}

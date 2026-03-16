import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { LoanDocument } from '@/types/loan';

export function useLoanDocuments(loanId: string | undefined) {
  return useQuery({
    queryKey: ['loan-documents', loanId],
    queryFn: async () => {
      if (!loanId) return [];
      const { data, error } = await supabase
        .from('loan_documents')
        .select('*')
        .eq('loan_id', loanId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as LoanDocument[];
    },
    enabled: !!loanId,
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ loanId, file }: { loanId: string; file: File }) => {
      const filePath = `${loanId}/${file.name}`;

      // Upload to storage (upsert to allow overwriting)
      const { error: uploadError } = await supabase.storage
        .from('loan-documents')
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      // Check if a record with same loan_id + file_name already exists
      const { data: existing } = await supabase
        .from('loan_documents')
        .select('id')
        .eq('loan_id', loanId)
        .eq('file_name', file.name)
        .maybeSingle();

      if (existing) {
        // Update existing record
        const { data: user } = await supabase.auth.getUser();
        const { error: updateError } = await supabase
          .from('loan_documents')
          .update({
            file_size: file.size,
            content_type: file.type || null,
            uploaded_by: user.user!.id,
            created_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        if (updateError) throw updateError;
      } else {
        // Insert new record
        const { data: user } = await supabase.auth.getUser();
        const { error: insertError } = await supabase
          .from('loan_documents')
          .insert({
            loan_id: loanId,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            content_type: file.type || null,
            uploaded_by: user.user!.id,
          });
        if (insertError) throw insertError;
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['loan-documents', variables.loanId] });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ doc }: { doc: LoanDocument }) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('loan-documents')
        .remove([doc.file_path]);
      if (storageError) throw storageError;

      // Delete metadata record
      const { error: dbError } = await supabase
        .from('loan_documents')
        .delete()
        .eq('id', doc.id);
      if (dbError) throw dbError;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['loan-documents', variables.doc.loan_id] });
    },
  });
}

/** Download a single document from storage */
export async function downloadDocument(filePath: string): Promise<Blob> {
  const { data, error } = await supabase.storage
    .from('loan-documents')
    .download(filePath);
  if (error) throw error;
  return data;
}

/** Fetch all documents for multiple loans */
export async function fetchDocumentsForLoans(loanIds: string[]): Promise<LoanDocument[]> {
  if (loanIds.length === 0) return [];
  const { data, error } = await supabase
    .from('loan_documents')
    .select('*')
    .in('loan_id', loanIds);
  if (error) throw error;
  return data as LoanDocument[];
}

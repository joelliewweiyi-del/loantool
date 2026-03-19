import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LoanCovenant, CovenantSubmission, CovenantStatus, CovenantType, RentRollEntry } from '@/types/loan';
import { inferDueDate } from '@/lib/covenantUtils';

export interface CovenantWithSubmissions extends LoanCovenant {
  submissions: CovenantSubmission[];
}

export function useLoanCovenants(loanId?: string) {
  return useQuery({
    queryKey: ['covenants', loanId],
    enabled: !!loanId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loan_covenants')
        .select('*')
        .eq('loan_id', loanId!)
        .eq('active', true)
        .order('tracking_year', { ascending: false });
      if (error) throw error;
      return (data ?? []) as LoanCovenant[];
    },
  });
}

export function useCovenantSubmissions(loanId?: string) {
  return useQuery({
    queryKey: ['covenant-submissions', loanId],
    enabled: !!loanId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('covenant_submissions')
        .select('*')
        .eq('loan_id', loanId!)
        .order('due_date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as CovenantSubmission[];
    },
  });
}

/** Fetch all covenants with submissions joined — for the loan detail tab */
export function useLoanCovenantsWithSubmissions(loanId?: string) {
  const covenants = useLoanCovenants(loanId);
  const submissions = useCovenantSubmissions(loanId);

  const data: CovenantWithSubmissions[] = (covenants.data ?? []).map(cov => ({
    ...cov,
    submissions: (submissions.data ?? []).filter(s => s.covenant_id === cov.id),
  }));

  return {
    data,
    isLoading: covenants.isLoading || submissions.isLoading,
    error: covenants.error || submissions.error,
  };
}

/** Fetch all covenants + submissions across the portfolio — for the Compliance page */
export function useAllCovenants(trackingYear?: number) {
  const covenantsQuery = useQuery({
    queryKey: ['all-covenants', trackingYear],
    queryFn: async () => {
      let q = supabase
        .from('loan_covenants')
        .select('*')
        .eq('active', true)
        .order('tracking_year', { ascending: false });
      if (trackingYear) q = q.eq('tracking_year', trackingYear);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as LoanCovenant[];
    },
  });

  const submissionsQuery = useQuery({
    queryKey: ['all-covenant-submissions', trackingYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('covenant_submissions')
        .select('*')
        .order('due_date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as CovenantSubmission[];
    },
  });

  const loansQuery = useQuery({
    queryKey: ['loans-for-covenants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loans')
        .select('id, loan_id, borrower_name, vehicle')
        .order('loan_id');
      if (error) throw error;
      return data as { id: string; loan_id: string; borrower_name: string; vehicle: string }[];
    },
  });

  return {
    covenants: covenantsQuery.data ?? [],
    submissions: submissionsQuery.data ?? [],
    loans: loansQuery.data ?? [],
    isLoading: covenantsQuery.isLoading || submissionsQuery.isLoading || loansQuery.isLoading,
    error: covenantsQuery.error || submissionsQuery.error || loansQuery.error,
  };
}

/** Update a covenant submission's status (and optionally notes, received_at, received_by) */
export function useUpdateSubmissionStatus() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      submissionId: string;
      status: CovenantStatus;
      notes?: string | null;
      received_at?: string | null;
      received_by?: string | null;
    }) => {
      const update: Record<string, any> = { status: params.status };
      if (params.notes !== undefined) update.notes = params.notes;
      if (params.received_at !== undefined) update.received_at = params.received_at;
      if (params.received_by !== undefined) update.received_by = params.received_by;

      // Auto-set received_at when marking as received/reviewed
      if ((params.status === 'received' || params.status === 'reviewed') && !params.received_at) {
        update.received_at = new Date().toISOString().split('T')[0];
      }

      const { data, error } = await supabase
        .from('covenant_submissions')
        .update(update)
        .eq('id', params.submissionId)
        .select()
        .single();
      if (error) throw error;
      return data as CovenantSubmission;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['covenant-submissions'] });
      qc.invalidateQueries({ queryKey: ['all-covenant-submissions'] });
    },
  });
}

/** Create a new covenant + auto-generate submissions based on frequency */
export function useCreateCovenant() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      loan_id: string;
      covenant_type: CovenantType;
      tracking_year: number;
      frequency: string;
      frequency_detail?: string | null;
      threshold_value?: number | null;
      threshold_operator?: string | null;
      threshold_metric?: string | null;
      notes?: string | null;
    }) => {
      // 1. Create the covenant
      const { data: covenant, error: covErr } = await supabase
        .from('loan_covenants')
        .insert({
          loan_id: params.loan_id,
          covenant_type: params.covenant_type,
          tracking_year: params.tracking_year,
          frequency: params.frequency,
          frequency_detail: params.frequency_detail || null,
          threshold_value: params.threshold_value || null,
          threshold_operator: params.threshold_operator || null,
          threshold_metric: params.threshold_metric || null,
          notes: params.notes || null,
        })
        .select()
        .single();
      if (covErr) throw covErr;

      // 2. Auto-generate submissions based on frequency
      const year = params.tracking_year;
      const periods: { period_label: string; due_date: string | null }[] = [];

      switch (params.frequency) {
        case 'quarterly':
          for (let q = 1; q <= 4; q++) {
            const label = `Q${q} ${year}`;
            periods.push({ period_label: label, due_date: inferDueDate(label) });
          }
          break;
        case 'biannually':
          periods.push(
            { period_label: `H1 ${year}`, due_date: `${year}-06-30` },
            { period_label: `H2 ${year}`, due_date: `${year}-12-31` },
          );
          break;
        case 'annually':
        case 'once':
          periods.push({ period_label: `${year}`, due_date: `${year}-12-31` });
          break;
        default:
          // Custom — create a single open submission
          periods.push({ period_label: `${year}`, due_date: `${year}-12-31` });
      }

      if (periods.length > 0) {
        const { error: subErr } = await supabase
          .from('covenant_submissions')
          .insert(periods.map(p => ({
            covenant_id: covenant.id,
            loan_id: params.loan_id,
            period_label: p.period_label,
            due_date: p.due_date,
            status: 'pending' as const,
          })));
        if (subErr) throw subErr;
      }

      return covenant as LoanCovenant;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['covenants'] });
      qc.invalidateQueries({ queryKey: ['covenant-submissions'] });
      qc.invalidateQueries({ queryKey: ['all-covenants'] });
      qc.invalidateQueries({ queryKey: ['all-covenant-submissions'] });
    },
  });
}

/** Upload rent roll entries for a submission */
export function useUploadRentRoll() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      submissionId: string;
      loanId: string;
      entries: Array<{
        tenant_name: string | null;
        lease_start: string | null;
        lease_end: string | null;
        notice_period: string | null;
        renewal_period: string | null;
        sqm: number | null;
        annual_rent: number | null;
        notes: string | null;
      }>;
    }) => {
      // Delete existing entries for this submission first
      await supabase
        .from('rent_roll_entries')
        .delete()
        .eq('submission_id', params.submissionId);

      // Insert new entries
      const { data, error } = await supabase
        .from('rent_roll_entries')
        .insert(params.entries.map(e => ({
          submission_id: params.submissionId,
          loan_id: params.loanId,
          ...e,
        })))
        .select();
      if (error) throw error;

      // Mark submission as received
      await supabase
        .from('covenant_submissions')
        .update({
          status: 'received' as const,
          received_at: new Date().toISOString().split('T')[0],
        })
        .eq('id', params.submissionId);

      return data as RentRollEntry[];
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['covenant-submissions'] });
      qc.invalidateQueries({ queryKey: ['all-covenant-submissions'] });
    },
  });
}

/** Update notes on a covenant submission */
export function useUpdateSubmissionNotes() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: { submissionId: string; notes: string | null }) => {
      const { data, error } = await supabase
        .from('covenant_submissions')
        .update({ notes: params.notes })
        .eq('id', params.submissionId)
        .select()
        .single();
      if (error) throw error;
      return data as CovenantSubmission;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['covenant-submissions'] });
      qc.invalidateQueries({ queryKey: ['all-covenant-submissions'] });
    },
  });
}

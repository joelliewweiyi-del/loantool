import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';
import { startOfMonth, endOfMonth, addMonths, isBefore, parseISO, format } from 'date-fns';

type DbEventType = Database['public']['Enums']['event_type'];
type Json = Database['public']['Tables']['loan_events']['Row']['metadata'];

export interface BatchLoanInput {
  loan_id: string;
  borrower_name: string;
  loan_start_date: string;
  maturity_date?: string | null;
  interest_rate?: number | null;
  interest_type?: string;
  outstanding?: number | null;
  total_commitment?: number | null;
  commitment_fee_rate?: number | null;
  commitment_fee_basis?: string | null;
  notice_frequency?: string;
  vehicle?: string;
  facility?: string | null;
  city?: string | null;
  category?: string | null;
  arrangement_fee?: number | null;
  payment_due_rule?: string | null;
}

export interface BatchCreateResult {
  success: boolean;
  loan_id: string;
  error?: string;
}

function generateMonthlyPeriods(
  loanId: string,
  startDate: string,
  maturityDate?: string | null
): Database['public']['Tables']['periods']['Insert'][] {
  const periods: Database['public']['Tables']['periods']['Insert'][] = [];
  const start = parseISO(startDate);
  const today = new Date();
  const endDate = maturityDate ? parseISO(maturityDate) : today;
  const endOfCurrentMonth = endOfMonth(today);
  const effectiveEnd = isBefore(endDate, endOfCurrentMonth) ? endDate : endOfCurrentMonth;

  let currentDate = start;

  while (isBefore(startOfMonth(currentDate), startOfMonth(addMonths(effectiveEnd, 1)))) {
    const periodStart = startOfMonth(currentDate);
    const periodEnd = endOfMonth(currentDate);

    if (!isBefore(periodEnd, start)) {
      periods.push({
        loan_id: loanId,
        period_start: format(periodStart, 'yyyy-MM-dd'),
        period_end: format(periodEnd, 'yyyy-MM-dd'),
        status: 'open',
        processing_mode: 'manual',
      });
    }

    currentDate = addMonths(currentDate, 1);
  }

  return periods;
}

export function useBatchCreateLoans() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (loans: BatchLoanInput[]): Promise<BatchCreateResult[]> => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');
      const userId = user.user.id;

      const results: BatchCreateResult[] = [];

      for (const loanInput of loans) {
        try {
          const { arrangement_fee, ...loanData } = loanInput;

          // Create the loan
          const { data: loan, error } = await supabase
            .from('loans')
            .insert([{
              loan_id: loanData.loan_id,
              borrower_name: loanData.borrower_name,
              loan_start_date: loanData.loan_start_date || null,
              maturity_date: loanData.maturity_date || null,
              interest_rate: loanData.interest_rate || null,
              interest_type: loanData.interest_type || 'cash_pay',
              outstanding: loanData.outstanding || null,
              total_commitment: loanData.total_commitment || null,
              commitment_fee_rate: loanData.commitment_fee_rate || null,
              commitment_fee_basis: loanData.commitment_fee_basis || 'undrawn_only',
              notice_frequency: loanData.notice_frequency || 'monthly',
              vehicle: loanData.vehicle || 'RED IV',
              facility: loanData.vehicle === 'TLF' ? loanData.facility || null : null,
              city: loanData.city || null,
              category: loanData.category || null,
              payment_due_rule: loanData.payment_due_rule || null,
            }])
            .select()
            .single();

          if (error) {
            results.push({ success: false, loan_id: loanData.loan_id, error: error.message });
            continue;
          }

          const createdLoan = loan;
          const effectiveDate = loanData.loan_start_date || new Date().toISOString().split('T')[0];
          const isPikLoan = loanData.interest_type === 'pik';

          const createFoundingEvent = async (
            eventType: DbEventType,
            amount: number | null,
            rate: number | null,
            metadata: Record<string, unknown>
          ) => {
            const { error } = await supabase.rpc('create_founding_event', {
              p_loan_id: createdLoan.id,
              p_event_type: eventType,
              p_effective_date: effectiveDate,
              p_amount: amount,
              p_rate: rate,
              p_created_by: userId,
              p_metadata: metadata as unknown as Json,
            });
            if (error) throw error;
          };

          // 1. Commitment Set
          if (loanData.total_commitment && loanData.total_commitment > 0) {
            await createFoundingEvent(
              'commitment_set',
              loanData.total_commitment,
              null,
              { auto_generated: true, description: 'Initial commitment' }
            );
          }

          // 2. Interest Rate Set
          if (loanData.interest_rate && loanData.interest_rate > 0) {
            await createFoundingEvent(
              'interest_rate_set',
              null,
              loanData.interest_rate,
              { auto_generated: true, description: 'Initial rate' }
            );
          }

          // 3. Principal Draw
          if (loanData.outstanding && loanData.outstanding > 0) {
            await createFoundingEvent(
              'principal_draw',
              loanData.outstanding,
              null,
              { auto_generated: true, description: 'Opening principal draw' }
            );
          }

          // 4. Arrangement Fee
          if (arrangement_fee && arrangement_fee > 0) {
            await createFoundingEvent(
              'fee_invoice',
              arrangement_fee,
              null,
              {
                auto_generated: true,
                fee_type: 'arrangement',
                payment_type: isPikLoan ? 'pik' : 'cash',
                description: isPikLoan ? 'Arrangement fee (capitalised)' : 'Arrangement fee (withheld from borrower)'
              }
            );
          }

          // Generate monthly periods
          if (loanData.loan_start_date) {
            const monthlyPeriods = generateMonthlyPeriods(
              createdLoan.id,
              loanData.loan_start_date,
              loanData.maturity_date
            );

            if (monthlyPeriods.length > 0) {
              await supabase.from('periods').insert(monthlyPeriods);
            }
          }

          results.push({ success: true, loan_id: loanData.loan_id });
        } catch (err) {
          results.push({
            success: false,
            loan_id: loanInput.loan_id,
            error: err instanceof Error ? err.message : 'Unknown error'
          });
        }
      }

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      
      if (failCount === 0) {
        toast({ title: `Successfully created ${successCount} loans with founding events` });
      } else {
        toast({
          title: `Created ${successCount} loans, ${failCount} failed`,
          description: 'Check the results for details',
          variant: failCount > 0 ? 'destructive' : 'default'
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Batch upload failed',
        description: error.message,
        variant: 'destructive'
      });
    },
  });
}

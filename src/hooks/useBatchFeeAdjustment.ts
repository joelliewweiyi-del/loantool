import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CSVFeeRow {
  loan_id: string;
  arrangement_fee: string | number;
}

export interface ParsedFeeAdjustment {
  loan_id: string;
  arrangement_fee: number;
}

export interface FeeValidationError {
  row: number;
  field: string;
  message: string;
}

// Parse currency values like "€70,000" or "70000"
function parseCurrency(value: string | number | undefined): number | null {
  if (value === undefined || value === null || value === '') return null;
  
  if (typeof value === 'number') return value;
  
  const cleaned = value.replace(/[€$£,\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

export function validateAndParseFees(rows: CSVFeeRow[]): { 
  adjustments: ParsedFeeAdjustment[]; 
  errors: FeeValidationError[];
} {
  const adjustments: ParsedFeeAdjustment[] = [];
  const errors: FeeValidationError[] = [];
  
  rows.forEach((row, index) => {
    const rowNum = index + 2; // +2 for header row and 0-indexing
    
    // Loan ID is required
    const loanId = row.loan_id?.toString().trim();
    if (!loanId) {
      errors.push({ row: rowNum, field: 'loan_id', message: 'loan_id is required' });
      return;
    }
    
    // Arrangement fee is required and must be positive
    const fee = parseCurrency(row.arrangement_fee);
    if (fee === null || fee <= 0) {
      errors.push({ row: rowNum, field: 'arrangement_fee', message: 'arrangement_fee must be a positive number' });
      return;
    }
    
    adjustments.push({
      loan_id: loanId,
      arrangement_fee: fee,
    });
  });
  
  return { adjustments, errors };
}

export function useBatchFeeAdjustment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (adjustments: ParsedFeeAdjustment[]) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');
      const userId = user.user.id;

      const results: { success: number; failed: number; errors: string[] } = {
        success: 0,
        failed: 0,
        errors: [],
      };

      for (const adj of adjustments) {
        try {
          // 1. Find the loan by loan_id
          const { data: loan, error: loanError } = await supabase
            .from('loans')
            .select('id, loan_id, loan_start_date')
            .eq('loan_id', adj.loan_id)
            .single();

          if (loanError || !loan) {
            throw new Error(`Loan ${adj.loan_id} not found`);
          }

          // 2. Find the founding principal_draw event
          const { data: drawEvent, error: drawError } = await supabase
            .from('loan_events')
            .select('*')
            .eq('loan_id', loan.id)
            .eq('event_type', 'principal_draw')
            .eq('status', 'approved')
            .order('effective_date', { ascending: true })
            .limit(1)
            .single();

          if (drawError || !drawEvent) {
            throw new Error(`No founding principal_draw event found for loan ${adj.loan_id}`);
          }

          const originalAmount = drawEvent.amount || 0;
          if (adj.arrangement_fee >= originalAmount) {
            throw new Error(`Fee (${adj.arrangement_fee}) >= principal (${originalAmount})`);
          }

          const netCashAmount = originalAmount - adj.arrangement_fee;
          const effectiveDate = drawEvent.effective_date;

          // 3. Update the principal_draw to net cash amount
          // Note: We need to use a workaround since approved events can't be modified
          // We'll create reversing events and new events instead

          // 3a. Create a reversing principal_repayment for the fee amount
          const { error: repayError } = await supabase
            .from('loan_events')
            .insert({
              loan_id: loan.id,
              event_type: 'principal_repayment',
              effective_date: effectiveDate,
              amount: adj.arrangement_fee,
              status: 'approved',
              created_by: userId,
              approved_by: userId,
              approved_at: new Date().toISOString(),
              requires_approval: false,
              is_system_generated: true,
              metadata: {
                auto_generated: true,
                description: 'Adjustment: Split arrangement fee from principal draw',
                adjustment_type: 'fee_split',
                original_draw_id: drawEvent.id,
              },
            });

          if (repayError) throw repayError;

          // 3b. Create the fee_invoice event with PIK metadata
          const { error: feeError } = await supabase
            .from('loan_events')
            .insert({
              loan_id: loan.id,
              event_type: 'fee_invoice',
              effective_date: effectiveDate,
              amount: adj.arrangement_fee,
              status: 'approved',
              created_by: userId,
              approved_by: userId,
              approved_at: new Date().toISOString(),
              requires_approval: false,
              is_system_generated: true,
              metadata: {
                auto_generated: true,
                description: 'Arrangement fee (afsluitprovisie)',
                fee_type: 'arrangement',
                payment_type: 'pik', // Capitalized into principal
                adjustment_type: 'fee_split',
                original_draw_id: drawEvent.id,
              },
            });

          if (feeError) throw feeError;

          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push(`Loan ${adj.loan_id}: ${(error as Error).message}`);
        }
      }

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['loan-events'] });
      
      if (results.failed === 0) {
        toast({ 
          title: 'Fee adjustment complete', 
          description: `Successfully adjusted ${results.success} loans` 
        });
      } else {
        toast({ 
          title: 'Adjustment completed with errors', 
          description: `${results.success} succeeded, ${results.failed} failed`,
          variant: 'destructive' 
        });
      }
    },
    onError: (error) => {
      toast({ 
        title: 'Adjustment failed', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });
}

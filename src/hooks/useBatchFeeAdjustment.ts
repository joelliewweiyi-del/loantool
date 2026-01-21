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
      // Call edge function with service role to bypass RLS for approved event inserts
      const { data, error } = await supabase.functions.invoke('batch-fee-adjustment', {
        body: { adjustments },
      });

      if (error) throw error;
      return data as { success: number; failed: number; errors: string[] };
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

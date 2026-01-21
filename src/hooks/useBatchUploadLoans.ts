import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

export interface CSVLoanRow {
  loan_id: string;
  borrower_name?: string;
  vehicle?: string;
  facility?: string;
  city?: string;
  category?: string;
  loan_start_date?: string;
  maturity_date?: string;
  interest_rate?: string | number;
  interest_type?: string;
  loan_type?: string;
  outstanding?: string | number;
  total_commitment?: string | number;
  commitment_fee_rate?: string | number;
  commitment_fee_basis?: string;
  notice_frequency?: string;
  payment_due_rule?: string;
}

export interface ParsedLoan {
  loan_id: string;
  borrower_name: string;
  vehicle: string;
  facility: string | null;
  city: string | null;
  category: string | null;
  loan_start_date: string;
  maturity_date: string;
  interest_rate: number | null;
  interest_type: string;
  loan_type: string;
  outstanding: number | null;
  total_commitment: number | null;
  commitment_fee_rate: number | null;
  commitment_fee_basis: string | null;
  notice_frequency: string;
  payment_due_rule: string | null;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

// Parse a percentage string like "12.5%" or "0.125" to decimal
function parseRate(value: string | number | undefined): number | null {
  if (value === undefined || value === null || value === '') return null;
  
  const str = String(value).trim();
  if (str.includes('%')) {
    const num = parseFloat(str.replace('%', ''));
    return isNaN(num) ? null : num / 100;
  }
  
  const num = parseFloat(str);
  if (isNaN(num)) return null;
  
  // If value is greater than 1, assume it's a percentage
  return num > 1 ? num / 100 : num;
}

// Parse currency values like "€1,000,000" or "1000000"
function parseCurrency(value: string | number | undefined): number | null {
  if (value === undefined || value === null || value === '') return null;
  
  if (typeof value === 'number') return value;
  
  const cleaned = value.replace(/[€$£,\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// Parse date strings in various formats
function parseDate(value: string | undefined): string | null {
  if (!value || value.trim() === '') return null;
  
  const str = value.trim();
  
  // Try ISO format first (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  
  // Try DD/MM/YYYY or DD-MM-YYYY
  const euMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (euMatch) {
    const [, day, month, year] = euMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Try MM/DD/YYYY
  const usMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (usMatch) {
    const [, month, day, year] = usMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Try parsing with Date
  const date = new Date(str);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }
  
  return null;
}

export function validateAndParseLoans(rows: CSVLoanRow[]): { 
  loans: ParsedLoan[]; 
  errors: ValidationError[];
} {
  const loans: ParsedLoan[] = [];
  const errors: ValidationError[] = [];
  
  rows.forEach((row, index) => {
    const rowNum = index + 2; // +2 for header row and 0-indexing
    
    // Loan ID is required (primary key)
    const loanId = row.loan_id?.trim();
    if (!loanId) {
      errors.push({ row: rowNum, field: 'loan_id', message: 'Loan_ID is required' });
      return;
    }
    
    // Start date is required
    const startDate = parseDate(row.loan_start_date);
    if (!startDate) {
      errors.push({ row: rowNum, field: 'loan_start_date', message: 'Start date is required' });
      return;
    }
    
    // Maturity date is required
    const maturityDate = parseDate(row.maturity_date);
    if (!maturityDate) {
      errors.push({ row: rowNum, field: 'maturity_date', message: 'Maturity date is required' });
      return;
    }
    
    // Vehicle validation
    const vehicle = row.vehicle?.trim() || 'RED IV';
    if (!['RED IV', 'TLF'].includes(vehicle)) {
      errors.push({ row: rowNum, field: 'vehicle', message: 'Vehicle must be "RED IV" or "TLF"' });
      return;
    }
    
    // TLF requires facility
    if (vehicle === 'TLF' && !row.facility?.trim()) {
      errors.push({ row: rowNum, field: 'facility', message: 'Facility is required for TLF loans' });
      return;
    }
    
    // Interest type validation
    const interestType = row.interest_type?.trim()?.toLowerCase() || 'cash_pay';
    if (!['cash_pay', 'pik'].includes(interestType)) {
      errors.push({ row: rowNum, field: 'interest_type', message: 'Interest type must be "cash_pay" or "pik"' });
      return;
    }
    
    // Loan type - simplified to always be term_loan
    const loanType = 'term_loan';
    
    const parsedLoan: ParsedLoan = {
      loan_id: loanId,
      borrower_name: row.borrower_name?.trim() || '',
      vehicle,
      facility: row.facility?.trim() || null,
      city: row.city?.trim() || null,
      category: row.category?.trim() || null,
      loan_start_date: startDate,
      maturity_date: maturityDate,
      interest_rate: parseRate(row.interest_rate),
      interest_type: interestType,
      loan_type: loanType,
      outstanding: parseCurrency(row.outstanding),
      total_commitment: parseCurrency(row.total_commitment),
      commitment_fee_rate: parseRate(row.commitment_fee_rate),
      commitment_fee_basis: row.commitment_fee_basis?.trim() || 'undrawn_only',
      notice_frequency: row.notice_frequency?.trim() || 'monthly',
      payment_due_rule: row.payment_due_rule?.trim() || null,
    };
    
    loans.push(parsedLoan);
  });
  
  return { loans, errors };
}

export function useBatchUploadLoans() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (loans: ParsedLoan[]) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');
      const userId = user.user.id;

      const results: { success: number; failed: number; errors: string[] } = {
        success: 0,
        failed: 0,
        errors: [],
      };

      for (const loan of loans) {
        try {
          // Create the loan
          const { data: createdLoan, error: loanError } = await supabase
            .from('loans')
            .insert([{
              loan_id: loan.loan_id,
              borrower_name: loan.borrower_name,
              vehicle: loan.vehicle,
              facility: loan.facility,
              city: loan.city,
              category: loan.category,
              loan_start_date: loan.loan_start_date,
              maturity_date: loan.maturity_date,
              interest_rate: loan.interest_rate,
              interest_type: loan.interest_type,
              loan_type: loan.loan_type,
              outstanding: loan.outstanding,
              total_commitment: loan.total_commitment,
              commitment_fee_rate: loan.commitment_fee_rate,
              commitment_fee_basis: loan.commitment_fee_basis,
              notice_frequency: loan.notice_frequency,
              payment_due_rule: loan.payment_due_rule,
            }])
            .select()
            .single();

          if (loanError) throw loanError;

          // Auto-generate founding events
          const foundingEvents: Database['public']['Tables']['loan_events']['Insert'][] = [];
          const effectiveDate = loan.loan_start_date || new Date().toISOString().split('T')[0];

          if (loan.total_commitment && loan.total_commitment > 0) {
            foundingEvents.push({
              loan_id: createdLoan.id,
              event_type: 'commitment_set',
              effective_date: effectiveDate,
              amount: loan.total_commitment,
              rate: null,
              status: 'approved',
              created_by: userId,
              metadata: { auto_generated: true, description: 'Initial commitment' } as unknown as Database['public']['Tables']['loan_events']['Insert']['metadata'],
            });
          }

          if (loan.interest_rate && loan.interest_rate > 0) {
            foundingEvents.push({
              loan_id: createdLoan.id,
              event_type: 'interest_rate_set',
              effective_date: effectiveDate,
              amount: null,
              rate: loan.interest_rate,
              status: 'approved',
              created_by: userId,
              metadata: { auto_generated: true, description: 'Initial rate' } as unknown as Database['public']['Tables']['loan_events']['Insert']['metadata'],
            });
          }

          if (loan.outstanding && loan.outstanding > 0) {
            foundingEvents.push({
              loan_id: createdLoan.id,
              event_type: 'principal_draw',
              effective_date: effectiveDate,
              amount: loan.outstanding,
              rate: null,
              status: 'approved',
              created_by: userId,
              metadata: { auto_generated: true, description: 'Opening principal draw' } as unknown as Database['public']['Tables']['loan_events']['Insert']['metadata'],
            });
          }

          if (foundingEvents.length > 0) {
            const { error: eventsError } = await supabase
              .from('loan_events')
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .insert(foundingEvents as any);

            if (eventsError) {
              console.error('Failed to create founding events for loan:', loan.loan_id, eventsError);
              throw new Error(`Founding events failed: ${eventsError.message}`);
            }
          }

          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push(`${loan.borrower_name}: ${(error as Error).message}`);
        }
      }

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      
      if (results.failed === 0) {
        toast({ 
          title: 'Import complete', 
          description: `Successfully imported ${results.success} loans` 
        });
      } else {
        toast({ 
          title: 'Import completed with errors', 
          description: `${results.success} succeeded, ${results.failed} failed`,
          variant: 'destructive' 
        });
      }
    },
    onError: (error) => {
      toast({ 
        title: 'Import failed', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });
}

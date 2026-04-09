import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AFAS_FOUNDING_MATCH_WINDOW_DAYS } from '@/lib/constants';
import type { AfasDrawTransaction, LoanEvent } from '@/types/loan';

export interface DrawsSummary {
  totalTransactions: number;
  totalDrawAmount: number;
  totalRepaymentAmount: number;
  confirmedCount: number;
  pendingCount: number;
}

export interface GroupedLoanDraws {
  loanId: string;
  loanUuid: string | null;
  borrowerName: string;
  vehicle: string;
  transactions: AfasDrawTransaction[];
  totalDrawAmount: number;
  totalRepaymentAmount: number;
  confirmedCount: number;
  pendingCount: number;
  dominantType: 'draw' | 'repayment' | 'mixed';
}

export interface MonthlyApprovalDraws {
  transactions: AfasDrawTransaction[];
  groupedByLoan: GroupedLoanDraws[];
  summary: DrawsSummary;
}

export function useMonthlyApprovalDraws(yearMonth: string | undefined) {
  // Fetch AFAS draws (connector #4: accounts 1750-1752)
  const { data: afasData, isLoading: afasLoading } = useQuery({
    queryKey: ['monthly-approval-draws-afas'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('test-afas-draws', {
        body: {
          filterFieldIds: 'UnitId,JournalId,AccountNo',
          filterValues: '5,50,1750..1752',
          operatorTypes: '1,1,15',
          take: 500,
        },
      });
      if (error) throw error;
      return (data?.allData?.rows ?? []) as Array<{
        AccountNo: number;
        EntryDate: string;
        AmtDebit: number;
        AmtCredit: number;
        Description: string;
        EntryNo: number;
        SeqNo: number;
        DimAx1: string | null;
      }>;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch loan metadata (for UUID resolution + display)
  const { data: loansData, isLoading: loansLoading } = useQuery({
    queryKey: ['monthly-approval-draws-loans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loans')
        .select('id, loan_id, borrower_name, vehicle');
      if (error) throw error;
      return data as Array<{
        id: string;
        loan_id: string;
        borrower_name: string;
        vehicle: string | null;
      }>;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch all draw/repayment events (draft + approved) for matching against AFAS transactions
  const { data: confirmedEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ['afas-draw-confirmations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loan_events')
        .select('id, loan_id, event_type, effective_date, amount, status, metadata')
        .in('event_type', ['principal_draw', 'principal_repayment']);
      if (error) throw error;
      return data as LoanEvent[];
    },
    staleTime: 30 * 1000,
  });

  const result = useMemo((): MonthlyApprovalDraws | null => {
    if (!afasData || !loansData || !confirmedEvents) return null;

    // Build maps
    const numericToLoan = new Map(loansData.map(l => [l.loan_id, l]));

    // 1. Map afas_ref → event info (exact ref match)
    const refToEvent = new Map<string, { id: string; status: string }>();
    // 2. Founding events by loan UUID for proximity matching + amount matching
    const foundingByLoan = new Map<string, Array<{ date: string; amount: number; id: string; status: string }>>();
    // 3. Amount+date index for dedup: loan_uuid|date|amount|event_type → available matches
    const amountDateIndex = new Map<string, Array<{ id: string; status: string }>>();

    for (const event of confirmedEvents) {
      const meta = event.metadata as Record<string, unknown> | null;
      const ref = meta?.afas_ref;
      if (typeof ref === 'string') {
        refToEvent.set(ref, { id: event.id, status: event.status });
      }
      if (meta?.founding_event === true) {
        const arr = foundingByLoan.get(event.loan_id) ?? [];
        arr.push({ date: event.effective_date, amount: event.amount ?? 0, id: event.id, status: event.status });
        foundingByLoan.set(event.loan_id, arr);
      }
      // Build amount+date index (round to 2 decimals for tolerance)
      const roundedAmt = Math.round((event.amount ?? 0) * 100) / 100;
      const key = `${event.loan_id}|${event.effective_date}|${roundedAmt}|${event.event_type}`;
      const existing = amountDateIndex.get(key) ?? [];
      existing.push({ id: event.id, status: event.status });
      amountDateIndex.set(key, existing);
    }

    // Match founding event: first by date proximity, then by amount (date-agnostic)
    function findFoundingMatch(loanUuid: string, afasDate: string, amount: number) {
      const entries = foundingByLoan.get(loanUuid);
      if (!entries) return undefined;
      const afasTime = new Date(afasDate).getTime();
      // Tier 2a: date proximity
      for (const e of entries) {
        const diff = Math.abs(new Date(e.date).getTime() - afasTime);
        if (diff <= AFAS_FOUNDING_MATCH_WINDOW_DAYS * 86400000) return { id: e.id, status: e.status };
      }
      // Tier 2b: same loan + same amount (founding draws often have different AFAS booking date)
      const roundedAmount = Math.round(amount * 100) / 100;
      for (const e of entries) {
        const roundedEventAmt = Math.round(e.amount * 100) / 100;
        if (roundedEventAmt === roundedAmount) return { id: e.id, status: e.status };
      }
      return undefined;
    }

    // Consume one match from the amount+date index (prevents one event matching multiple AFAS rows)
    function findAmountDateMatch(loanUuid: string | undefined, date: string, amount: number, isDraw: boolean) {
      if (!loanUuid) return undefined;
      const eventType = isDraw ? 'principal_draw' : 'principal_repayment';
      const roundedAmt = Math.round(amount * 100) / 100;
      const key = `${loanUuid}|${date}|${roundedAmt}|${eventType}`;
      const matches = amountDateIndex.get(key);
      if (!matches || matches.length === 0) return undefined;
      return matches.shift(); // consume one match
    }

    // Filter to selected month and enrich
    const transactions: AfasDrawTransaction[] = [];

    for (const row of afasData) {
      const loanId = row.DimAx1;
      if (!loanId) continue;

      // Filter by month
      if (yearMonth) {
        const entryMonth = row.EntryDate.slice(0, 7);
        if (entryMonth !== yearMonth) continue;
      }

      const loan = numericToLoan.get(loanId);
      const afasRef = `${row.EntryNo}-${row.SeqNo}`;
      const isDraw = row.AmtDebit > 0;
      const amount = isDraw ? row.AmtDebit : row.AmtCredit;

      // Skip trivial test transactions (e.g. €1 bank verification)
      if (amount <= 1) continue;

      // 4-tier matching: exact ref → founding (date+amount) → amount+date dedup
      const existing = refToEvent.get(afasRef)
        || (loan ? findFoundingMatch(loan.id, row.EntryDate, amount) : undefined)
        || findAmountDateMatch(loan?.id, row.EntryDate, amount, isDraw);

      transactions.push({
        loanId,
        loanUuid: loan?.id ?? null,
        borrowerName: loan?.borrower_name ?? '',
        vehicle: loan?.vehicle ?? '',
        entryDate: row.EntryDate,
        amount,
        type: isDraw ? 'draw' : 'repayment',
        description: row.Description,
        afasRef,
        isConfirmed: !!existing,
        createdEventId: existing?.id ?? null,
        eventStatus: (existing?.status as 'draft' | 'approved') ?? null,
      });
    }

    // Sort by date descending
    transactions.sort((a, b) => b.entryDate.localeCompare(a.entryDate));

    // Group transactions by loan
    const loanGroups = new Map<string, AfasDrawTransaction[]>();
    for (const tx of transactions) {
      const arr = loanGroups.get(tx.loanId) ?? [];
      arr.push(tx);
      loanGroups.set(tx.loanId, arr);
    }

    const groupedByLoan: GroupedLoanDraws[] = [...loanGroups.entries()].map(([lid, txs]) => {
      const first = txs[0];
      const draws = txs.filter(t => t.type === 'draw');
      const repayments = txs.filter(t => t.type === 'repayment');
      const dominantType: 'draw' | 'repayment' | 'mixed' =
        draws.length > 0 && repayments.length > 0 ? 'mixed'
        : draws.length > 0 ? 'draw' : 'repayment';
      return {
        loanId: lid,
        loanUuid: first.loanUuid,
        borrowerName: first.borrowerName,
        vehicle: first.vehicle,
        transactions: txs,
        totalDrawAmount: draws.reduce((s, t) => s + t.amount, 0),
        totalRepaymentAmount: repayments.reduce((s, t) => s + t.amount, 0),
        confirmedCount: txs.filter(t => t.isConfirmed).length,
        pendingCount: txs.filter(t => !t.isConfirmed).length,
        dominantType,
      };
    });

    const summary: DrawsSummary = {
      totalTransactions: transactions.length,
      totalDrawAmount: transactions.filter(t => t.type === 'draw').reduce((s, t) => s + t.amount, 0),
      totalRepaymentAmount: transactions.filter(t => t.type === 'repayment').reduce((s, t) => s + t.amount, 0),
      confirmedCount: transactions.filter(t => t.isConfirmed).length,
      pendingCount: transactions.filter(t => !t.isConfirmed).length,
    };

    return { transactions, groupedByLoan, summary };
  }, [afasData, loansData, confirmedEvents, yearMonth]);

  return {
    data: result,
    isLoading: afasLoading || loansLoading || eventsLoading,
  };
}

/** Confirm an AFAS draw/repayment from the monthly approval page. */
export function useConfirmDrawFromApproval(yearMonth: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      loanUuid: string;
      eventType: 'principal_draw' | 'principal_repayment';
      effectiveDate: string;
      amount: number;
      afasRef: string;
      afasDescription: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Duplicate check
      const { data: existing } = await supabase
        .from('loan_events')
        .select('id')
        .eq('loan_id', input.loanUuid)
        .in('event_type', ['principal_draw', 'principal_repayment'])
        .contains('metadata', { afas_ref: input.afasRef })
        .maybeSingle();

      if (existing) throw new Error('This AFAS transaction has already been confirmed');

      const { data: event, error } = await supabase
        .from('loan_events')
        .insert([{
          loan_id: input.loanUuid,
          event_type: input.eventType,
          effective_date: input.effectiveDate,
          amount: input.amount,
          status: 'draft',
          created_by: userData.user.id,
          metadata: {
            afas_ref: input.afasRef,
            afas_description: input.afasDescription,
            source: 'afas_confirmation',
            confirmed_at: new Date().toISOString(),
          },
        }])
        .select()
        .single();

      if (error) throw error;
      return event;
    },
    onSuccess: (_, variables) => {
      const label = variables.eventType === 'principal_draw' ? 'Draw' : 'Repayment';
      toast({ title: `${label} confirmed`, description: 'Draft event created for controller approval.' });
      queryClient.invalidateQueries({ queryKey: ['monthly-approval-draws-afas'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-approval-draws-loans'] });
      queryClient.invalidateQueries({ queryKey: ['afas-draw-confirmations'] });
      queryClient.invalidateQueries({ queryKey: ['loan-events', variables.loanUuid] });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to confirm', description: error.message, variant: 'destructive' });
    },
  });
}

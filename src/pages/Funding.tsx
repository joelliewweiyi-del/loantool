import { useMemo } from 'react';
import { FinancialStrip } from '@/components/loans/FinancialStrip';
import { CounterpartyPanel } from '@/components/funding/CounterpartyPanel';
import { AddCounterpartyDialog } from '@/components/funding/AddCounterpartyDialog';
import { useCounterparties, useAllFundingNotes } from '@/hooks/useFunding';
import { Skeleton } from '@/components/ui/skeleton';
import { getCurrentDate } from '@/lib/simulatedDate';
import { format as fnsFormat } from 'date-fns';
import { formatDate } from '@/lib/format';

export default function Funding() {
  const { data: counterparties, isLoading: cpLoading } = useCounterparties();
  const { data: allNotes, isLoading: notesLoading } = useAllFundingNotes();

  const isLoading = cpLoading || notesLoading;
  const today = fnsFormat(getCurrentDate(), 'yyyy-MM-dd');

  const stats = useMemo(() => {
    if (!counterparties || !allNotes) return null;

    const active = counterparties.filter(c => c.stage !== 'closed').length;
    const closed = counterparties.filter(c => c.stage === 'closed').length;
    const totalNotes = allNotes.length;

    // Next follow-up
    const upcoming = counterparties
      .filter(c => c.next_followup && c.stage !== 'closed')
      .sort((a, b) => (a.next_followup! < b.next_followup! ? -1 : 1));
    const nextFollowup = upcoming[0];

    // Overdue follow-ups
    const overdue = counterparties.filter(c => c.next_followup && c.next_followup < today && c.stage !== 'closed').length;

    // Latest note
    const latestNote = allNotes[0];
    const latestDate = latestNote ? fnsFormat(new Date(latestNote.created_at), 'dd MMM') : '—';

    return { active, closed, totalNotes, nextFollowup, overdue, latestDate };
  }, [counterparties, allNotes, today]);

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Funding</h1>
          <p className="text-sm text-foreground-secondary mt-1">Back leverage provider conversations</p>
        </div>
        <AddCounterpartyDialog />
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : (
        <>
          <FinancialStrip items={[
            { label: 'Active', value: String(stats?.active ?? 0), accent: 'primary' },
            { label: 'Closed', value: String(stats?.closed ?? 0), accent: 'sage' },
            { label: 'Notes', value: String(stats?.totalNotes ?? 0) },
            {
              label: 'Next Follow-up',
              value: stats?.nextFollowup?.next_followup
                ? `${stats.nextFollowup.name} · ${formatDate(stats.nextFollowup.next_followup)}`
                : '—',
              accent: stats?.overdue ? 'destructive' : undefined,
              mono: false,
            },
            { label: 'Latest Activity', value: stats?.latestDate ?? '—' },
          ]} />

          <div className="space-y-3">
            {counterparties?.map((cp, i) => (
              <CounterpartyPanel
                key={cp.id}
                counterparty={cp}
                defaultExpanded={i === 0}
              />
            ))}
          </div>

          {counterparties?.length === 0 && (
            <div className="text-center py-12 text-foreground-muted text-sm">
              No counterparties yet. Add one to start tracking funding conversations.
            </div>
          )}
        </>
      )}
    </div>
  );
}

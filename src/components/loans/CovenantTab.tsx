import { useState, useMemo } from 'react';
import { useLoanCovenantsWithSubmissions, CovenantWithSubmissions, useUpdateSubmissionStatus } from '@/hooks/useCovenants';
import { CovenantStatusBadge } from './CovenantStatusBadge';
import { FinancialStrip } from './FinancialStrip';
import { CovenantType, CovenantStatus } from '@/types/loan';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getCurrentDateString } from '@/lib/simulatedDate';
import { effectiveDueDate } from '@/lib/covenantUtils';
import { AddCovenantDialog } from './AddCovenantDialog';
import { RentRollUploadDialog } from './RentRollUploadDialog';
import { cn } from '@/lib/utils';

interface CovenantTabProps {
  loanId: string;
}

const typeLabels: Record<CovenantType, string> = {
  valuation: 'Valuation',
  rent_roll: 'Rent Roll',
  annual_accounts: 'Annual Accounts',
  insurance: 'Insurance',
  kyc_check: 'KYC / AML',
  financial_covenant: 'Financial Covenant',
};

const typeOrder: CovenantType[] = [
  'valuation', 'rent_roll', 'annual_accounts', 'insurance', 'financial_covenant', 'kyc_check',
];

const statusPriority: Record<CovenantStatus, number> = {
  breached: 0,
  overdue: 1,
  requested: 2,
  reminder_sent: 3,
  pending: 4,
  received: 5,
  reviewed: 6,
  not_applicable: 7,
};

function formatThreshold(cov: CovenantWithSubmissions): string | null {
  if (!cov.threshold_value || !cov.threshold_metric) return null;
  const op = cov.threshold_operator === 'lte' ? '≤' : '≥';
  switch (cov.threshold_metric) {
    case 'icr': return `ICR ${op} ${cov.threshold_value}`;
    case 'ltv': return `LTV ${op} ${(cov.threshold_value * 100).toFixed(0)}%`;
    case 'ebitda': return `EBITDA ${op} €${(cov.threshold_value / 1_000_000).toFixed(1)}m`;
    case 'min_rent': return `Rent ${op} €${(cov.threshold_value / 1_000_000).toFixed(1)}m`;
    default: return `${cov.threshold_metric} ${op} ${cov.threshold_value}`;
  }
}

function isActionable(status: CovenantStatus) {
  return status === 'overdue' || status === 'breached' || status === 'requested' || status === 'pending' || status === 'reminder_sent';
}

/** Pick the most relevant submission: the first actionable one, or the most recently received */
function getRelevantSubmission(cov: CovenantWithSubmissions, today: string) {
  // Apply overdue detection + backfill due dates from period labels
  const subs = cov.submissions.map(s => {
    const due = effectiveDueDate(s.due_date, s.period_label);
    if ((s.status === 'pending' || s.status === 'requested') && due && due < today) {
      return { ...s, due_date: due, status: 'overdue' as CovenantStatus };
    }
    if (!s.due_date && due) {
      return { ...s, due_date: due };
    }
    return s;
  });

  // First: any actionable submission, sorted by priority then due date
  const actionable = subs
    .filter(s => isActionable(s.status))
    .sort((a, b) => {
      const p = statusPriority[a.status] - statusPriority[b.status];
      if (p !== 0) return p;
      if (a.due_date && b.due_date) return a.due_date < b.due_date ? -1 : 1;
      return 0;
    });
  if (actionable.length > 0) return { sub: actionable[0], allSubs: subs };

  // Fall back to most recently received/reviewed
  const completed = subs
    .filter(s => s.status === 'received' || s.status === 'reviewed')
    .sort((a, b) => (b.received_at ?? b.created_at).localeCompare(a.received_at ?? a.created_at));
  if (completed.length > 0) return { sub: completed[0], allSubs: subs };

  return { sub: subs[0] ?? null, allSubs: subs };
}

export function CovenantTab({ loanId }: CovenantTabProps) {
  const { data: covenants, isLoading } = useLoanCovenantsWithSubmissions(loanId);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const updateStatus = useUpdateSubmissionStatus();
  const today = getCurrentDateString();

  const toggle = (id: string) =>
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // Sort by type order, then by tracking year (descending)
  const sorted = useMemo(() => {
    return [...covenants].sort((a, b) => {
      const typeA = typeOrder.indexOf(a.covenant_type);
      const typeB = typeOrder.indexOf(b.covenant_type);
      if (typeA !== typeB) return typeA - typeB;
      return b.tracking_year - a.tracking_year;
    });
  }, [covenants]);

  // Metrics
  const allSubs = covenants.flatMap(c => c.submissions).map(s => {
    const due = effectiveDueDate(s.due_date, s.period_label);
    if ((s.status === 'pending' || s.status === 'requested') && due && due < today) {
      return { ...s, due_date: due, status: 'overdue' as CovenantStatus };
    }
    return s;
  });
  const totalCovenants = covenants.length;
  const actionable = allSubs.filter(s => isActionable(s.status)).length;
  const overdue = allSubs.filter(s => s.status === 'overdue' || s.status === 'breached').length;
  const received = allSubs.filter(s => s.status === 'received' || s.status === 'reviewed').length;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (totalCovenants === 0) {
    return (
      <div className="text-center py-12 text-foreground-muted">
        No covenants tracked for this loan.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <FinancialStrip className="flex-1" items={[
        { label: 'Covenants', value: String(totalCovenants), accent: 'primary', mono: false },
        { label: 'Action Needed', value: String(actionable), accent: actionable > 0 ? 'amber' : 'sage', mono: false },
        { label: 'Overdue / Breach', value: String(overdue), accent: overdue > 0 ? 'destructive' : 'sage', mono: false },
        { label: 'Received', value: String(received), accent: 'sage', mono: false },
      ]} />
        <AddCovenantDialog loanId={loanId} />
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th className="w-8"></th>
            <th>Type</th>
            <th>Year</th>
            <th>Current Period</th>
            <th>Due</th>
            <th>Status</th>
            <th>Threshold</th>
            <th className="w-24">Action</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(cov => {
            const isExpanded = expandedIds.has(cov.id);
            const { sub: relevant, allSubs: covSubs } = getRelevantSubmission(cov, today);
            const threshold = formatThreshold(cov);

            return (
              <CovenantRow
                key={cov.id}
                cov={cov}
                relevantSub={relevant}
                allSubs={covSubs}
                isExpanded={isExpanded}
                threshold={threshold}
                onToggle={() => toggle(cov.id)}
                onStatusChange={(subId, status) => updateStatus.mutate({ submissionId: subId, status })}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CovenantRow({
  cov,
  relevantSub,
  allSubs,
  isExpanded,
  threshold,
  onToggle,
  onStatusChange,
}: {
  cov: CovenantWithSubmissions;
  relevantSub: ReturnType<typeof getRelevantSubmission>['sub'];
  allSubs: ReturnType<typeof getRelevantSubmission>['allSubs'];
  isExpanded: boolean;
  threshold: string | null;
  onToggle: () => void;
  onStatusChange: (subId: string, status: CovenantStatus) => void;
}) {
  // Only show completed + actionable submissions in the expanded detail (not future pending ones)
  const relevantSubs = allSubs.filter(s =>
    s.status !== 'pending' || s.status === relevantSub?.status
  );

  return (
    <>
      <tr
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggle}
        aria-expanded={isExpanded}
      >
        <td className="w-8 text-foreground-muted">
          <span
            role="button"
            aria-expanded={isExpanded}
            aria-label={`Toggle details for ${typeLabels[cov.covenant_type]} ${cov.tracking_year}`}
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
        </td>
        <td className="font-medium">{typeLabels[cov.covenant_type]}</td>
        <td className="text-foreground-secondary font-mono text-xs">{cov.tracking_year}</td>
        <td className="font-mono text-xs">
          {relevantSub?.period_label ?? '—'}
        </td>
        <td className="text-foreground-secondary text-xs font-mono">
          {relevantSub?.due_date || relevantSub?.reminder_date || '—'}
        </td>
        <td>
          {relevantSub ? (
            <CovenantStatusBadge status={relevantSub.status} />
          ) : (
            <span className="text-foreground-muted">—</span>
          )}
        </td>
        <td className="font-mono text-sm">{threshold || '—'}</td>
        <td className="space-x-2">
          {relevantSub && (relevantSub.status === 'pending' || relevantSub.status === 'overdue') && (
            <button
              className="text-xs text-primary/70 hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(relevantSub.id, 'reminder_sent');
              }}
            >
              Remind
            </button>
          )}
          {relevantSub && isActionable(relevantSub.status) && (
            <button
              className="text-xs text-accent-sage hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(relevantSub.id, 'received');
              }}
            >
              Received
            </button>
          )}
          {relevantSub && cov.covenant_type === 'rent_roll' && isActionable(relevantSub.status) && (
            <span onClick={e => e.stopPropagation()}>
              <RentRollUploadDialog
                submissionId={relevantSub.id}
                loanId={cov.loan_id}
                periodLabel={relevantSub.period_label}
              />
            </span>
          )}
        </td>
      </tr>
      {isExpanded && relevantSubs.length > 0 && (
        <tr>
          <td colSpan={8} className="p-0">
            <div className="bg-muted/30 border-b px-6 py-3">
              <div className="flex items-baseline gap-4 mb-2">
                <span className="text-xs text-foreground-tertiary font-medium">
                  {cov.frequency || 'Custom'} frequency
                </span>
                {cov.frequency_detail && (
                  <span className="text-xs text-foreground-muted">{cov.frequency_detail}</span>
                )}
                {cov.notes && (
                  <span className="text-xs text-foreground-muted italic">{cov.notes}</span>
                )}
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-foreground-tertiary">
                    <th className="text-left py-1 font-medium">Period</th>
                    <th className="text-left py-1 font-medium">Due</th>
                    <th className="text-left py-1 font-medium">Status</th>
                    <th className="text-left py-1 font-medium">Received</th>
                    <th className="text-left py-1 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {relevantSubs.map(sub => (
                    <tr key={sub.id} className="border-t border-border/50">
                      <td className="py-1.5 font-mono text-xs">{sub.period_label}</td>
                      <td className="py-1.5 text-foreground-secondary text-xs font-mono">
                        {sub.due_date || sub.reminder_date || '—'}
                      </td>
                      <td className="py-1.5">
                        <CovenantStatusBadge status={sub.status} />
                      </td>
                      <td className="py-1.5 text-foreground-secondary text-xs">
                        {sub.received_at
                          ? `${sub.received_at}${sub.received_by ? ` (${sub.received_by})` : ''}`
                          : '—'}
                      </td>
                      <td className="py-1.5 text-foreground-muted text-xs max-w-[250px] truncate">
                        {sub.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

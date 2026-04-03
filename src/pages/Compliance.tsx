import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAllCovenants, useUpdateSubmissionStatus } from '@/hooks/useCovenants';
import { CovenantStatusBadge } from '@/components/loans/CovenantStatusBadge';
import { FinancialStrip } from '@/components/loans/FinancialStrip';
import { Skeleton } from '@/components/ui/skeleton';
import { CovenantType, CovenantStatus } from '@/types/loan';
import { useIsMobile } from '@/hooks/use-mobile';
import { getCurrentDateString } from '@/lib/simulatedDate';
import { effectiveDueDate } from '@/lib/covenantUtils';
import { ChevronDown, ChevronRight, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { exportComplianceExcel } from '@/lib/exportCompliance';

const typeLabels: Record<CovenantType, string> = {
  valuation: 'Valuation',
  rent_roll: 'Rent Roll',
  annual_accounts: 'Annual Accounts',
  insurance: 'Insurance',
  kyc_check: 'KYC / AML',
  financial_covenant: 'Financial Covenant',
};

type EnrichedSubmission = {
  id: string;
  covenant_id: string;
  loan_id: string;
  period_label: string;
  due_date: string | null;
  reminder_date: string | null;
  status: CovenantStatus;
  received_at: string | null;
  received_by: string | null;
  notes: string | null;
  metadata: Record<string, any>;
  covenant_type: CovenantType;
};

interface LoanRow {
  loan_db_id: string;
  loan_id: string;
  borrower_name: string;
  vehicle: string;
  actionCount: number;
  worstStatus: CovenantStatus | null;
  nextDueDate: string | null;
  nextDueType: CovenantType | null;
  submissions: EnrichedSubmission[];
}

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

/** Pick one submission per covenant type: the most urgent actionable, or most recent completed */
function dedupeByType(subs: EnrichedSubmission[]): EnrichedSubmission[] {
  const byType = new Map<CovenantType, EnrichedSubmission[]>();
  for (const sub of subs) {
    const arr = byType.get(sub.covenant_type) ?? [];
    arr.push(sub);
    byType.set(sub.covenant_type, arr);
  }

  const result: EnrichedSubmission[] = [];
  for (const [, typeSubs] of byType) {
    // Pick the most urgent actionable
    const actionable = typeSubs
      .filter(s => isActionable(s.status))
      .sort((a, b) => {
        const p = statusPriority[a.status] - statusPriority[b.status];
        if (p !== 0) return p;
        if (a.due_date && b.due_date) return a.due_date < b.due_date ? -1 : 1;
        return 0;
      });
    if (actionable.length > 0) {
      result.push(actionable[0]);
      continue;
    }
    // Fall back to most recently completed
    const completed = typeSubs
      .filter(s => s.status === 'received' || s.status === 'reviewed')
      .sort((a, b) => (b.received_at ?? '').localeCompare(a.received_at ?? ''));
    if (completed.length > 0) {
      result.push(completed[0]);
      continue;
    }
    if (typeSubs.length > 0) result.push(typeSubs[0]);
  }

  return result.sort((a, b) => statusPriority[a.status] - statusPriority[b.status]);
}

function isActionable(status: CovenantStatus) {
  return status === 'overdue' || status === 'breached' || status === 'requested' || status === 'pending' || status === 'reminder_sent';
}

export default function Compliance() {
  const [trackingYear] = useState(2026);
  const { covenants, submissions, loans, isLoading } = useAllCovenants(trackingYear);
  const isMobile = useIsMobile();
  const [expandedLoanIds, setExpandedLoanIds] = useState<Set<string>>(new Set());
  const today = getCurrentDateString();

  const handleExport = () => {
    exportComplianceExcel(loans, covenants, submissions, today, trackingYear);
  };

  const toggle = (id: string) =>
    setExpandedLoanIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // Build enriched submissions with covenant type
  const enriched = useMemo(() => {
    const covMap = new Map(covenants.map(c => [c.id, c]));
    const loanMap = new Map(loans.map(l => [l.id, l]));
    return submissions
      .map(sub => {
        const cov = covMap.get(sub.covenant_id);
        const loan = loanMap.get(sub.loan_id);
        if (!cov || !loan) return null;
        return {
          ...sub,
          covenant_type: cov.covenant_type,
        } as EnrichedSubmission;
      })
      .filter(Boolean) as EnrichedSubmission[];
  }, [covenants, submissions, loans]);

  // Auto-detect overdue: mark submissions as overdue if past due_date and still pending/requested
  const withOverdue = useMemo(() => {
    return enriched.map(sub => {
      const due = effectiveDueDate(sub.due_date, sub.period_label);
      if (
        (sub.status === 'pending' || sub.status === 'requested') &&
        due && due < today
      ) {
        return { ...sub, due_date: due, status: 'overdue' as CovenantStatus };
      }
      // Backfill due_date for display even if not overdue
      if (!sub.due_date && due) {
        return { ...sub, due_date: due };
      }
      return sub;
    });
  }, [enriched, today]);

  // Group by loan → one row per loan
  const loanRows = useMemo(() => {
    const loanMap = new Map(loans.map(l => [l.id, l]));
    const byLoan = new Map<string, EnrichedSubmission[]>();
    for (const sub of withOverdue) {
      const arr = byLoan.get(sub.loan_id) ?? [];
      arr.push(sub);
      byLoan.set(sub.loan_id, arr);
    }

    const rows: LoanRow[] = [];
    for (const [loanDbId, subs] of byLoan) {
      const loan = loanMap.get(loanDbId);
      if (!loan) continue;

      const deduped = dedupeByType(subs);
      const actionable = deduped.filter(s => isActionable(s.status));
      const worst = actionable.length > 0
        ? actionable.sort((a, b) => statusPriority[a.status] - statusPriority[b.status])[0].status
        : null;

      // Next due date from actionable items
      const withDue = actionable.filter(s => s.due_date);
      withDue.sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1));
      const nextDue = withDue[0] ?? null;

      rows.push({
        loan_db_id: loanDbId,
        loan_id: loan.loan_id,
        borrower_name: loan.borrower_name,
        vehicle: loan.vehicle,
        actionCount: actionable.length,
        worstStatus: worst,
        nextDueDate: nextDue?.due_date ?? null,
        nextDueType: nextDue?.covenant_type ?? null,
        submissions: deduped,
      });
    }

    // Sort: most action items first, then by worst status
    rows.sort((a, b) => {
      if (a.actionCount === 0 && b.actionCount > 0) return 1;
      if (a.actionCount > 0 && b.actionCount === 0) return -1;
      if (a.worstStatus && b.worstStatus) {
        const diff = statusPriority[a.worstStatus] - statusPriority[b.worstStatus];
        if (diff !== 0) return diff;
      }
      return b.actionCount - a.actionCount;
    });

    return rows;
  }, [withOverdue, loans]);

  // Metrics
  const totalLoans = loanRows.length;
  const loansWithAction = loanRows.filter(r => r.actionCount > 0).length;
  const totalOverdue = withOverdue.filter(s => s.status === 'overdue' || s.status === 'breached').length;
  const totalReceived = withOverdue.filter(s => s.status === 'received' || s.status === 'reviewed').length;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className={isMobile ? 'px-4 pt-4 pb-4 space-y-5' : 'p-6 space-y-6'}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Compliance</h1>
          <p className="text-sm text-foreground-secondary mt-1">
            Covenant tracking across the portfolio — {trackingYear}
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={isLoading || loans.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-md hover:bg-muted/50 transition-colors text-foreground-secondary disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Export
        </button>
      </div>

      <FinancialStrip items={[
        { label: 'Loans Tracked', value: String(totalLoans), accent: 'primary', mono: false },
        { label: 'Action Needed', value: String(loansWithAction), accent: loansWithAction > 0 ? 'amber' : 'sage', mono: false },
        { label: 'Overdue / Breach', value: String(totalOverdue), accent: totalOverdue > 0 ? 'destructive' : 'sage', mono: false },
        { label: 'Received', value: String(totalReceived), accent: 'sage', mono: false },
      ]} />

      <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th className="w-8"></th>
            <th>Loan</th>
            <th className="hidden md:table-cell">Vehicle</th>
            <th>Action Items</th>
            <th className="hidden md:table-cell">Next Due</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {loanRows.map(row => {
            const isExpanded = expandedLoanIds.has(row.loan_db_id);
            return (
              <ComplianceLoanRow
                key={row.loan_db_id}
                row={row}
                isExpanded={isExpanded}
                onToggle={() => toggle(row.loan_db_id)}
              />
            );
          })}
          {loanRows.length === 0 && (
            <tr>
              <td colSpan={6} className="text-center py-12 text-foreground-muted">
                No covenants tracked for {trackingYear}.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function ComplianceLoanRow({
  row,
  isExpanded,
  onToggle,
}: {
  row: LoanRow;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const updateStatus = useUpdateSubmissionStatus();

  return (
    <>
      <tr
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggle}
      >
        <td className="w-8 text-foreground-muted">
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </td>
        <td>
          <Link
            to={`/loans/${row.loan_db_id}`}
            className="text-primary hover:underline font-mono text-xs"
            onClick={e => e.stopPropagation()}
          >
            {row.loan_id}
          </Link>
        </td>
        <td className="hidden md:table-cell text-xs text-foreground-secondary">{row.vehicle}</td>
        <td>
          {row.actionCount > 0 ? (
            <span className="font-mono text-sm font-medium text-accent-amber">{row.actionCount}</span>
          ) : (
            <span className="text-accent-sage text-xs">All clear</span>
          )}
        </td>
        <td className="hidden md:table-cell text-xs text-foreground-secondary">
          {row.nextDueDate ? (
            <span>
              <span className="font-mono">{row.nextDueDate}</span>
              {row.nextDueType && (
                <span className="text-foreground-muted ml-1">({typeLabels[row.nextDueType]})</span>
              )}
            </span>
          ) : (
            <span className="text-foreground-muted">—</span>
          )}
        </td>
        <td>
          {row.worstStatus ? (
            <CovenantStatusBadge status={row.worstStatus} />
          ) : (
            <span className="text-foreground-muted text-xs">—</span>
          )}
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={6} className="p-0">
            <div className="bg-muted/30 border-b px-6 py-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-foreground-tertiary">
                    <th className="text-left py-1 font-medium">Type</th>
                    <th className="text-left py-1 font-medium">Period</th>
                    <th className="text-left py-1 font-medium">Due</th>
                    <th className="text-left py-1 font-medium">Status</th>
                    <th className="text-left py-1 font-medium">Notes</th>
                    <th className="text-left py-1 font-medium w-24">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {row.submissions.map(sub => (
                    <tr key={sub.id} className="border-t border-border/50">
                      <td className="py-1.5 text-xs">{typeLabels[sub.covenant_type]}</td>
                      <td className="py-1.5 font-mono text-xs">{sub.period_label}</td>
                      <td className="py-1.5 text-foreground-secondary text-xs font-mono">
                        {sub.due_date || sub.reminder_date || '—'}
                      </td>
                      <td className="py-1.5">
                        <CovenantStatusBadge status={sub.status} />
                      </td>
                      <td className="py-1.5 text-foreground-muted text-xs max-w-[200px] truncate">
                        {sub.notes || '—'}
                      </td>
                      <td className="py-1.5 space-x-2">
                        {(sub.status === 'pending' || sub.status === 'overdue') && (
                          <button
                            className="text-xs text-primary/70 hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateStatus.mutate({
                                submissionId: sub.id,
                                status: 'reminder_sent',
                              });
                            }}
                          >
                            Send reminder
                          </button>
                        )}
                        {isActionable(sub.status) && (
                          <button
                            className="text-xs text-accent-sage hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateStatus.mutate({
                                submissionId: sub.id,
                                status: 'received',
                              });
                            }}
                          >
                            Mark received
                          </button>
                        )}
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

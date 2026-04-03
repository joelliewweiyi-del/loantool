import { Link } from 'react-router-dom';
import { useOutstandingApprovals, type OutstandingItem, type ApprovalCategory } from '@/hooks/useOutstandingApprovals';
import { useApproveEvent } from '@/hooks/useLoans';
import { useConfirmDrawFromApproval } from '@/hooks/useMonthlyApprovalDraws';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, formatDate } from '@/lib/format';
import { FinancialStrip } from '@/components/loans/FinancialStrip';
import { FourEyesIndicator } from '@/components/approvals/FourEyesIndicator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Check,
  ArrowUpRight,
  Banknote,
  FileText,
  Clock,
  ClipboardCheck,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parse } from 'date-fns';

const categoryConfig: Record<ApprovalCategory, { label: string; shortLabel: string; className: string }> = {
  event_approval: {
    label: 'Event Approval',
    shortLabel: 'Event',
    className: 'bg-primary/10 text-primary',
  },
  draw_confirmation: {
    label: 'Draw Confirmation',
    shortLabel: 'Draw',
    className: 'bg-accent-amber/10 text-accent-amber',
  },
  payment_confirmation: {
    label: 'Payment Confirmation',
    shortLabel: 'Payment',
    className: 'bg-accent-sage/10 text-accent-sage',
  },
  period_approval: {
    label: 'Period Approval',
    shortLabel: 'Period',
    className: 'bg-primary/10 text-primary',
  },
  pik_rollup: {
    label: 'PIK Roll-Up',
    shortLabel: 'PIK',
    className: 'bg-accent-amber/10 text-accent-amber',
  },
};

function CategoryBadge({ category }: { category: ApprovalCategory }) {
  const config = categoryConfig[category];
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold', config.className)}>
      {config.shortLabel}
    </span>
  );
}

function formatMonthLabel(yearMonth: string): string {
  try {
    const date = parse(yearMonth + '-01', 'yyyy-MM-dd', new Date());
    return format(date, 'MMMM yyyy');
  } catch {
    return yearMonth;
  }
}

function getActionLink(item: OutstandingItem): string {
  switch (item.category) {
    case 'event_approval':
    case 'pik_rollup':
      return `/loans/${item.loanUuid}`;
    case 'draw_confirmation':
    case 'payment_confirmation':
    case 'period_approval':
      return `/monthly-approval`;
    default:
      return `/loans/${item.loanUuid}`;
  }
}

export default function OutstandingApprovals() {
  const { groupedByMonth, summary, isLoading } = useOutstandingApprovals();
  const { isController, isPM } = useAuth();
  const approveEvent = useApproveEvent();
  // Use a dummy yearMonth for the draw confirmation mutation — it invalidates all relevant queries
  const confirmDraw = useConfirmDrawFromApproval('');

  const handleApproveEvent = async (item: OutstandingItem) => {
    const { eventId, loanId } = item.actionPayload as { eventId: string; loanId: string };
    await approveEvent.mutateAsync({ eventId, loanId });
  };

  const handleConfirmDraw = async (item: OutstandingItem) => {
    const payload = item.actionPayload as {
      loanUuid: string;
      eventType: 'principal_draw' | 'principal_repayment';
      effectiveDate: string;
      amount: number;
      afasRef: string;
      afasDescription: string;
    };
    await confirmDraw.mutateAsync(payload);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Outstanding Approvals</h1>
        <p className="text-sm text-foreground-secondary">All items requiring action across the portfolio</p>
      </div>

      <FinancialStrip items={[
        { label: 'Draft Events', value: String(summary.draftEvents), accent: summary.draftEvents > 0 ? 'amber' : undefined },
        { label: 'AFAS Draws', value: String(summary.pendingDraws), accent: summary.pendingDraws > 0 ? 'amber' : undefined },
        { label: 'Periods', value: String(summary.pendingPeriods), accent: summary.pendingPeriods > 0 ? 'amber' : undefined },
        { label: 'PIK Roll-Ups', value: String(summary.pikRollups), accent: summary.pikRollups > 0 ? 'amber' : undefined },
        { label: 'Total', value: String(summary.total), accent: summary.total > 0 ? 'primary' : undefined },
      ]} />

      {summary.total === 0 && (
        <div className="text-center py-16 text-foreground-tertiary">
          <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">All clear</p>
          <p className="text-sm">No outstanding approvals</p>
        </div>
      )}

      {groupedByMonth.map(([yearMonth, items]) => (
        <Card key={yearMonth}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{formatMonthLabel(yearMonth)}</CardTitle>
              <span className="text-xs text-foreground-tertiary font-mono">
                {items.length} item{items.length !== 1 ? 's' : ''}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="pl-4">Loan</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th className="text-right">Amount</th>
                  <th className="text-center">Four Eyes</th>
                  <th className="text-right pr-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const canAct =
                    (item.waitingOn === 'controller' && isController) ||
                    (item.waitingOn === 'pm' && isPM);

                  return (
                    <tr
                      key={item.id}
                      className={cn(
                        'transition-colors',
                        idx % 2 === 0 ? 'bg-background' : 'bg-muted/20',
                        canAct && 'border-l-2 border-l-accent-amber'
                      )}
                    >
                      <td className="pl-4 py-3">
                        <Link
                          to={`/loans/${item.loanUuid}`}
                          className="hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="font-mono text-sm font-semibold text-primary">#{item.loanNumericId}</span>
                        </Link>
                        <div className="text-xs text-foreground-tertiary truncate max-w-[160px]">
                          {item.borrowerName}
                        </div>
                      </td>
                      <td className="py-3">
                        <CategoryBadge category={item.category} />
                      </td>
                      <td className="py-3">
                        <span className="text-sm">{item.label}</span>
                        <div className="text-xs text-foreground-tertiary font-mono">
                          {formatDate(item.effectiveDate)}
                        </div>
                      </td>
                      <td className="py-3 text-right font-mono text-sm">
                        {item.amount != null ? formatCurrency(item.amount) : '—'}
                      </td>
                      <td className="py-3 text-center">
                        <FourEyesIndicator
                          initiatedBy={item.initiatedBy}
                          waitingOn={item.waitingOn}
                        />
                      </td>
                      <td className="py-3 text-right pr-4">
                        {item.category === 'event_approval' && isController && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApproveEvent(item)}
                            disabled={approveEvent.isPending}
                            className="h-7 text-xs"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Approve
                          </Button>
                        )}
                        {item.category === 'draw_confirmation' && isPM && item.actionPayload.loanUuid && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleConfirmDraw(item)}
                            disabled={confirmDraw.isPending}
                            className="h-7 text-xs"
                          >
                            <Banknote className="h-3 w-3 mr-1" />
                            Confirm
                          </Button>
                        )}
                        {item.category === 'period_approval' && isController && (
                          <Link to={`/monthly-approval`}>
                            <Button size="sm" variant="ghost" className="h-7 text-xs">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Review
                            </Button>
                          </Link>
                        )}
                        {item.category === 'pik_rollup' && isPM && (
                          <Link to={`/loans/${item.loanUuid}`}>
                            <Button size="sm" variant="outline" className="h-7 text-xs">
                              <ArrowUpRight className="h-3 w-3 mr-1" />
                              Roll Up
                            </Button>
                          </Link>
                        )}
                        {!canAct && (
                          <Link to={getActionLink(item)}>
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-foreground-tertiary">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              View
                            </Button>
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

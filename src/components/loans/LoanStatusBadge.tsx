import { LoanStatus, EventStatus, PeriodStatus } from '@/types/loan';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: LoanStatus | EventStatus | PeriodStatus;
  className?: string;
}

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  open: 'Open',
  submitted: 'Submitted',
  approved: 'Approved',
  sent: 'Sent',
  paid: 'Paid',
  active: 'Active',
  repaid: 'Repaid',
  defaulted: 'Defaulted',
};

const statusClasses: Record<string, string> = {
  // Action needed (amber)
  draft: 'status-badge status-draft',
  open: 'status-badge status-open',
  submitted: 'status-badge status-submitted',
  // Done (sage)
  approved: 'status-badge status-approved',
  sent: 'status-badge status-sent',
  paid: 'status-badge status-paid',
  // Neutral
  active: 'status-badge status-active',
  repaid: 'status-badge status-repaid',
  // Problem
  defaulted: 'status-badge status-defaulted',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={cn('text-xs', statusClasses[status] || 'status-badge status-neutral', className)}>
      {statusLabels[status] || status}
    </span>
  );
}

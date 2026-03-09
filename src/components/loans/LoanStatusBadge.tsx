import { LoanStatus, EventStatus, PeriodStatus } from '@/types/loan';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: LoanStatus | EventStatus | PeriodStatus;
  className?: string;
}

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
    <span className={cn(statusClasses[status] || 'status-badge status-neutral', className)}>
      {status}
    </span>
  );
}

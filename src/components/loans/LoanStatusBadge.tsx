import { LoanStatus, EventStatus, PeriodStatus } from '@/types/loan';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: LoanStatus | EventStatus | PeriodStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusClasses: Record<string, string> = {
    // Loan statuses
    active: 'status-badge status-active',
    repaid: 'status-badge status-repaid',
    defaulted: 'status-badge status-defaulted',
    // Event statuses
    draft: 'status-badge status-draft',
    approved: 'status-badge status-approved',
    // Period statuses
    open: 'status-badge status-open',
    submitted: 'status-badge status-submitted',
    sent: 'status-badge status-sent',
  };

  return (
    <span className={cn(statusClasses[status] || 'status-badge', className)}>
      {status}
    </span>
  );
}

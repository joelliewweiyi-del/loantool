import { CovenantStatus } from '@/types/loan';
import { cn } from '@/lib/utils';

interface CovenantStatusBadgeProps {
  status: CovenantStatus;
  className?: string;
}

const statusClasses: Record<CovenantStatus, string> = {
  pending: 'status-badge status-pending',
  reminder_sent: 'status-badge status-reminder-sent',
  requested: 'status-badge status-requested',
  received: 'status-badge status-received',
  reviewed: 'status-badge status-reviewed',
  not_applicable: 'status-badge status-not-applicable',
  breached: 'status-badge status-breached',
  overdue: 'status-badge status-overdue',
};

const statusLabels: Record<CovenantStatus, string> = {
  pending: 'pending',
  reminder_sent: 'reminder sent',
  requested: 'requested',
  received: 'received',
  reviewed: 'reviewed',
  not_applicable: 'n/a',
  breached: 'breach',
  overdue: 'overdue',
};

export function CovenantStatusBadge({ status, className }: CovenantStatusBadgeProps) {
  return (
    <span className={cn(statusClasses[status] || 'status-badge status-neutral', className)}>
      {statusLabels[status] || status}
    </span>
  );
}

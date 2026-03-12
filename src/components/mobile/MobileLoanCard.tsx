import { useNavigate } from 'react-router-dom';
import { formatCurrency, formatPercent, formatDate } from '@/lib/format';
import { StatusBadge } from '@/components/loans/LoanStatusBadge';
import { MapPin } from 'lucide-react';

interface MobileLoanCardProps {
  loan: any;
}

export function MobileLoanCard({ loan }: MobileLoanCardProps) {
  const navigate = useNavigate();

  return (
    <div
      className="bg-white rounded-xl border border-border/60 shadow-sm px-4 py-3 active:bg-muted/30 transition-colors cursor-pointer"
      onClick={() => navigate(`/loans/${loan.id}`)}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm font-semibold text-primary">{loan.loan_id || '—'}</span>
        <StatusBadge status={loan.status} />
      </div>
      <h3 className="text-base font-semibold mt-0.5 truncate">{loan.borrower_name}</h3>
      {loan.city && (
        <div className="flex items-center gap-1 text-xs text-foreground-tertiary mt-0.5">
          <MapPin className="h-3 w-3" />
          {loan.city}
        </div>
      )}
      <div className="flex items-center gap-4 text-xs mt-2 pt-2 border-t border-border/30">
        <div>
          <span className="text-foreground-muted">Outstanding</span>
          <span className="font-mono font-medium ml-1">{formatCurrency(loan.outstanding)}</span>
        </div>
        <div>
          <span className="text-foreground-muted">Rate</span>
          <span className="font-mono font-medium ml-1">{formatPercent(loan.interest_rate, 2)}</span>
        </div>
        <div>
          <span className="text-foreground-muted">Maturity</span>
          <span className="font-mono font-medium ml-1">{formatDate(loan.maturity_date)}</span>
        </div>
      </div>
    </div>
  );
}

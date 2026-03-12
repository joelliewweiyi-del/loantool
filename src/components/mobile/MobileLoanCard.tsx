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
      className="bg-white rounded-2xl border border-border/50 shadow-sm px-5 py-4 active:bg-muted/30 transition-colors cursor-pointer"
      onClick={() => navigate(`/loans/${loan.id}`)}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm font-semibold text-primary">{loan.loan_id || '—'}</span>
        <StatusBadge status={loan.status} />
      </div>
      <h3 className="text-[17px] font-semibold mt-1 truncate">{loan.borrower_name}</h3>
      {loan.city && (
        <div className="flex items-center gap-1.5 text-xs text-foreground-tertiary mt-1">
          <MapPin className="h-3.5 w-3.5" />
          {loan.city}
        </div>
      )}
      <div className="flex items-center gap-5 text-xs mt-3 pt-3 border-t border-border/30">
        <div className="flex flex-col">
          <span className="text-[10px] text-foreground-muted uppercase tracking-wide">Outstanding</span>
          <span className="font-mono font-medium mt-0.5">{formatCurrency(loan.outstanding)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-foreground-muted uppercase tracking-wide">Rate</span>
          <span className="font-mono font-medium mt-0.5">{formatPercent(loan.interest_rate, 2)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-foreground-muted uppercase tracking-wide">Maturity</span>
          <span className="font-mono font-medium mt-0.5">{formatDate(loan.maturity_date)}</span>
        </div>
      </div>
    </div>
  );
}

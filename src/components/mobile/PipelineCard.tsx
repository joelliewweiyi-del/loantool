import { useNavigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency, formatPercent, formatDate } from '@/lib/format';
import { PIPELINE_STAGES } from '@/lib/constants';
import { useUpdateLoan } from '@/hooks/useLoans';
import { useCreateActivityLog, useLatestActivityPerLoan } from '@/hooks/useActivityLog';
import { Plus, MessageSquare, MapPin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';

interface PipelineCardProps {
  loan: any;
}

export function PipelineCard({ loan }: PipelineCardProps) {
  const navigate = useNavigate();
  const updateLoan = useUpdateLoan();
  const createActivityLog = useCreateActivityLog();
  const { data: latestActivity = {} } = useLatestActivityPerLoan();
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState('');

  const latest = latestActivity[loan.id];

  const handleQuickAdd = async () => {
    if (!note.trim()) return;
    await createActivityLog.mutateAsync({ loan_id: loan.id, content: note.trim() });
    setNote('');
    setNoteOpen(false);
  };

  return (
    <div
      className="bg-white rounded-2xl border border-border/50 shadow-sm overflow-hidden active:bg-muted/30 transition-colors"
    >
      {/* Tappable header → navigates to detail */}
      <div
        className="px-5 pt-4 pb-3 cursor-pointer"
        onClick={() => navigate(`/loans/${loan.id}`)}
      >
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm font-semibold text-primary">{loan.loan_id || '—'}</span>
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-muted font-medium">{loan.category || '—'}</span>
        </div>
        <h3 className="text-[17px] font-semibold mt-1 truncate">{loan.borrower_name}</h3>
        {loan.city && (
          <div className="flex items-center gap-1.5 text-xs text-foreground-tertiary mt-1">
            <MapPin className="h-3.5 w-3.5" />
            {loan.city}
          </div>
        )}
      </div>

      {/* Metrics row */}
      <div className="px-5 py-3 flex items-center gap-5 text-xs border-t border-border/30">
        <div className="flex flex-col">
          <span className="text-[10px] text-foreground-muted uppercase tracking-wide">Commit</span>
          <span className="font-mono font-medium mt-0.5">{formatCurrency(loan.total_commitment || 0)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-foreground-muted uppercase tracking-wide">Rate</span>
          <span className="font-mono font-medium mt-0.5">{loan.interest_rate ? formatPercent(loan.interest_rate, 2) : '—'}</span>
        </div>
        {loan.ltv > 0 && (
          <div className="flex flex-col">
            <span className="text-[10px] text-foreground-muted uppercase tracking-wide">LTV</span>
            <span className="font-mono font-medium mt-0.5">{formatPercent(loan.ltv, 1)}</span>
          </div>
        )}
      </div>

      {/* Stage selector + quick note (non-navigating) */}
      <div className="px-5 py-3 border-t border-border/30 flex items-center gap-3">
        <Select
          value={loan.pipeline_stage || ''}
          onValueChange={(v) => updateLoan.mutate({ id: loan.id, updates: { pipeline_stage: v } as any })}
        >
          <SelectTrigger className="h-9 flex-1 text-xs rounded-lg">
            <SelectValue placeholder="Stage..." />
          </SelectTrigger>
          <SelectContent>
            {PIPELINE_STAGES.map(s => (
              <SelectItem key={s.value} value={s.value}>
                <span>{s.label}</span>
                <span className="ml-1 opacity-50">· {s.description}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover open={noteOpen} onOpenChange={setNoteOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0 shrink-0 relative rounded-lg">
              <MessageSquare className="h-4 w-4" />
              {latest && (
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-accent-amber ring-2 ring-white" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3" align="end">
            <div className="space-y-2">
              {latest && (
                <p className="text-xs text-foreground-secondary line-clamp-2">
                  Last: {latest.content.slice(0, 80)}
                  <span className="text-foreground-muted ml-1">
                    {formatDistanceToNow(new Date(latest.created_at), { addSuffix: true })}
                  </span>
                </p>
              )}
              <Textarea
                placeholder="Quick note..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    handleQuickAdd();
                  }
                }}
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleQuickAdd}
                  disabled={!note.trim() || createActivityLog.isPending}
                >
                  {createActivityLog.isPending ? 'Adding...' : 'Add'}
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Last note preview */}
      {latest && (
        <div className="px-5 py-2.5 bg-muted/30 border-t border-border/20">
          <p className="text-xs text-foreground-secondary line-clamp-1">
            <span className="text-foreground-muted">
              {formatDistanceToNow(new Date(latest.created_at), { addSuffix: false })}:
            </span>{' '}
            {latest.content}
          </p>
        </div>
      )}
    </div>
  );
}

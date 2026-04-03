import { Check, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface FourEyesIndicatorProps {
  initiatedBy: 'pm' | 'controller' | 'system' | 'afas';
  waitingOn: 'pm' | 'controller';
}

const roleLabel: Record<string, string> = {
  pm: 'PM',
  controller: 'Ctrl',
  system: 'System',
  afas: 'AFAS',
};

export function FourEyesIndicator({ initiatedBy, waitingOn }: FourEyesIndicatorProps) {
  const { isPM, isController } = useAuth();

  const isWaitingOnMe =
    (waitingOn === 'pm' && isPM) ||
    (waitingOn === 'controller' && isController);

  return (
    <div className="inline-flex items-center gap-1">
      {/* Step 1: Initiator — done */}
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-accent-sage/15 text-accent-sage">
        <Check className="h-2.5 w-2.5" />
        {roleLabel[initiatedBy]}
      </span>

      <span className="text-foreground-muted text-[10px]">→</span>

      {/* Step 2: Approver — waiting */}
      <span
        className={cn(
          'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-accent-amber/15 text-accent-amber',
          isWaitingOnMe && 'ring-2 ring-accent-amber/30'
        )}
      >
        <Clock className="h-2.5 w-2.5" />
        {roleLabel[waitingOn]}
      </span>
    </div>
  );
}

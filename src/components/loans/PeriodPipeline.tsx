import { Fragment } from 'react';
import { PeriodStatus } from '@/types/loan';
import { cn } from '@/lib/utils';

const stages: PeriodStatus[] = ['open', 'submitted', 'approved', 'sent', 'paid'];

const stageLabels: Record<PeriodStatus, string> = {
  open: 'Open',
  submitted: 'Submitted',
  approved: 'Approved',
  sent: 'Sent',
  paid: 'Paid',
};

interface PeriodPipelineProps {
  current: PeriodStatus;
  variant?: 'horizontal' | 'vertical';
  className?: string;
}

export function PeriodPipeline({ current, variant = 'horizontal', className }: PeriodPipelineProps) {
  const currentIndex = stages.indexOf(current);

  if (variant === 'vertical') {
    return (
      <div role="group" aria-label={`Period status: ${stageLabels[current]}`} className={cn('flex flex-col gap-0', className)}>
        {stages.map((stage, i) => (
          <div key={stage} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div
                title={stageLabels[stage]}
                className={cn(
                  'w-2.5 h-2.5 rounded-full border-2 transition-colors duration-200',
                  i < currentIndex
                    ? 'bg-accent-sage border-accent-sage'
                    : i === currentIndex
                    ? 'bg-primary border-primary ring-2 ring-primary/30'
                    : 'bg-transparent border-border-strong'
                )}
              />
              {i < stages.length - 1 && (
                <div
                  className={cn(
                    'w-px h-5',
                    i < currentIndex ? 'bg-accent-sage' : 'bg-border'
                  )}
                />
              )}
            </div>
            <span
              className={cn(
                'text-xs -mt-0.5',
                i <= currentIndex ? 'text-foreground font-medium' : 'text-foreground-muted'
              )}
            >
              {stageLabels[stage]}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div role="group" aria-label={`Period status: ${stageLabels[current]}`} className={cn('flex items-center gap-0.5', className)} title={stageLabels[current]}>
      {stages.map((stage, i) => (
        <Fragment key={stage}>
          {i > 0 && (
            <div
              className={cn(
                'w-2 h-px',
                i <= currentIndex ? 'bg-accent-sage' : 'bg-border'
              )}
            />
          )}
          <div
            title={stageLabels[stage]}
            className={cn(
              'w-1.5 h-1.5 rounded-full transition-colors duration-200',
              i < currentIndex
                ? 'bg-accent-sage'
                : i === currentIndex
                ? 'bg-primary ring-1 ring-primary/30'
                : 'bg-transparent border border-border-strong'
            )}
          />
        </Fragment>
      ))}
    </div>
  );
}

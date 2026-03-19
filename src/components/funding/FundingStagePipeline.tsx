import { Fragment } from 'react';
import { FundingStage } from '@/types/loan';
import { cn } from '@/lib/utils';

const stages: FundingStage[] = [
  'initial_contact',
  'nda_signed',
  'term_sheet',
  'due_diligence',
  'credit_committee',
  'docs_negotiation',
  'closed',
];

const stageLabels: Record<FundingStage, string> = {
  initial_contact: 'Contact',
  nda_signed: 'NDA',
  term_sheet: 'Term Sheet',
  due_diligence: 'DD',
  credit_committee: 'Credit Cmt',
  docs_negotiation: 'Docs',
  closed: 'Closed',
};

interface FundingStagePipelineProps {
  current: FundingStage;
  variant?: 'horizontal' | 'compact';
  className?: string;
}

export function FundingStagePipeline({ current, variant = 'horizontal', className }: FundingStagePipelineProps) {
  const currentIndex = stages.indexOf(current);

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-0.5', className)} title={stageLabels[current]}>
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
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                i < currentIndex
                  ? 'bg-accent-sage'
                  : i === currentIndex
                  ? 'bg-primary'
                  : 'bg-border-strong'
              )}
            />
          </Fragment>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {stages.map((stage, i) => (
        <Fragment key={stage}>
          {i > 0 && (
            <div
              className={cn(
                'w-3 h-px',
                i <= currentIndex ? 'bg-accent-sage' : 'bg-border'
              )}
            />
          )}
          <div className="flex items-center gap-1.5">
            <div
              className={cn(
                'w-2 h-2 rounded-full border-2 transition-colors',
                i < currentIndex
                  ? 'bg-accent-sage border-accent-sage'
                  : i === currentIndex
                  ? 'bg-primary border-primary'
                  : 'bg-transparent border-border-strong'
              )}
            />
            <span
              className={cn(
                'text-[10px] whitespace-nowrap',
                i <= currentIndex ? 'text-foreground font-medium' : 'text-foreground-muted'
              )}
            >
              {stageLabels[stage]}
            </span>
          </div>
        </Fragment>
      ))}
    </div>
  );
}

export { stages as fundingStages, stageLabels as fundingStageLabels };

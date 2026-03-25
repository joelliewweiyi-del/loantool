import { cn } from '@/lib/utils';
import { PIPELINE_STAGES, getPipelineStage } from '@/lib/constants';

interface PipelineStageBadgeProps {
  stage: string | null | undefined;
  className?: string;
}

const colorMap = {
  neutral: {
    badge: 'bg-muted text-muted-foreground',
    dot: 'bg-muted-foreground',
  },
  amber: {
    badge: 'bg-accent-amber/10 text-accent-amber',
    dot: 'bg-accent-amber',
  },
  sage: {
    badge: 'bg-accent-sage/10 text-accent-sage',
    dot: 'bg-accent-sage',
  },
} as const;

export function PipelineStageBadge({ stage, className }: PipelineStageBadgeProps) {
  const info = getPipelineStage(stage);
  if (!info) return null;

  const stageIndex = PIPELINE_STAGES.findIndex(s => s.value === stage);
  const colors = colorMap[info.color];

  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium', colors.badge, className)}>
      {/* 3-dot mini pipeline */}
      <span className="inline-flex items-center gap-0.5">
        {PIPELINE_STAGES.map((s, i) => (
          <span
            key={s.value}
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              i <= stageIndex ? colors.dot : 'bg-current opacity-20'
            )}
          />
        ))}
      </span>
      {info.label}
    </span>
  );
}

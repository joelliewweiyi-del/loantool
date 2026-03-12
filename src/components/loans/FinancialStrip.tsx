import { cn } from '@/lib/utils';

interface FinancialStripItem {
  label: string;
  value: string;
  accent?: 'primary' | 'amber' | 'sage' | 'destructive';
  mono?: boolean;
}

interface FinancialStripProps {
  items: FinancialStripItem[];
  className?: string;
}

const accentClasses: Record<string, string> = {
  primary: 'text-primary',
  amber: 'text-accent-amber',
  sage: 'text-accent-sage',
  destructive: 'text-destructive',
};

export function FinancialStrip({ items, className }: FinancialStripProps) {
  return (
    <div className={cn('flex flex-wrap items-baseline gap-x-6 gap-y-3 py-3 px-4 border-y border-border max-md:gap-x-4 max-md:px-4 max-md:py-3.5 max-md:gap-y-2.5', className)}>
      {items.map((item, i) => (
        <div key={i} className="flex flex-col">
          <span className="ledger-label mb-0.5 max-md:text-[10px]">{item.label}</span>
          <span
            className={cn(
              'text-base max-md:text-[14px] font-semibold',
              item.mono !== false && 'font-mono tabular-nums',
              item.accent ? accentClasses[item.accent] : ''
            )}
          >
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

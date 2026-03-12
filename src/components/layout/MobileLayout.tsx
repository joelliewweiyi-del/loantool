import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileText, MessageSquare, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileLayoutProps {
  children: ReactNode;
}

const tabs = [
  { name: 'Pipeline', href: '/loans', icon: Briefcase, matchPrefix: '/loans' },
  { name: 'Activity', href: '/activity', icon: MessageSquare, matchExact: '/activity' },
  { name: 'Portfolio', href: '/portfolio', icon: FileText, matchPrefix: '/portfolio' },
];

export function MobileLayout({ children }: MobileLayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Main content — fills available space above tab bar */}
      <main className="flex-1 overflow-auto pt-[env(safe-area-inset-top)] pb-[calc(env(safe-area-inset-bottom)+4rem)]">
        {children}
      </main>

      {/* Bottom tab bar — safe area padding on the outer nav element */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border mobile-tab-bar"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center justify-around h-[3.75rem] px-2">
          {tabs.map((tab) => {
            const isActive = tab.matchExact
              ? location.pathname === tab.matchExact
              : location.pathname === tab.href ||
                location.pathname.startsWith(tab.matchPrefix || tab.href);

            return (
              <Link
                key={tab.name}
                to={tab.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-sidebar-foreground/45 active:text-sidebar-foreground/70'
                )}
              >
                <tab.icon className={cn('h-[22px] w-[22px] shrink-0', isActive && 'stroke-[2.5]')} />
                <span className={cn(
                  'text-[10px] leading-none',
                  isActive ? 'font-semibold' : 'font-medium'
                )}>
                  {tab.name}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

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
      <main className="flex-1 overflow-auto pb-[calc(env(safe-area-inset-bottom)+4rem)]">
        {children}
      </main>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border mobile-tab-bar">
        <div className="flex items-center justify-around h-16 px-2 pb-[env(safe-area-inset-bottom)]">
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
                  'flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg transition-colors min-w-[4.5rem]',
                  isActive
                    ? 'text-primary'
                    : 'text-sidebar-foreground/50 active:text-sidebar-foreground/70'
                )}
              >
                <tab.icon className={cn('h-5 w-5', isActive && 'stroke-[2.5]')} />
                <span className={cn(
                  'text-[10px] leading-tight',
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

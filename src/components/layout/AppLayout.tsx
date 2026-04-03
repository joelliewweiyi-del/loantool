import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileLayout } from './MobileLayout';
import { Button } from '@/components/ui/button';
import {
  FileText,
  LogOut,
  Loader2,
  User,
  ClipboardCheck,
  Download,
  LayoutDashboard,
  MessageSquare,
  Landmark,
  Shield,
  Handshake,
  Calculator,
  Eye,
  type LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import raxLogo from '@/assets/rax-logo.png';

interface AppLayoutProps {
  children: ReactNode;
}

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navigation: NavGroup[] = [
  {
    label: 'Portfolio',
    items: [
      { name: 'Loans', href: '/loans', icon: FileText },
      { name: 'Collateral', href: '/collateral', icon: Landmark },
      { name: 'Activity', href: '/activity', icon: MessageSquare },
      { name: 'Export', href: '/export', icon: Download },
    ],
  },
  {
    label: 'Workflow',
    items: [
      { name: 'Approvals', href: '/approvals', icon: Eye },
      { name: 'Monthly Approval', href: '/monthly-approval', icon: ClipboardCheck },
      { name: 'Calculation Sheet', href: '/calculation-sheet', icon: Calculator },
      { name: 'Compliance', href: '/compliance', icon: Shield },
    ],
  },
  {
    label: 'Funding',
    items: [
      { name: 'Back Leverage', href: '/funding', icon: Handshake },
    ],
  },
  {
    label: 'Integration',
    items: [
      { name: 'AFAS', href: '/afas', icon: LayoutDashboard },
    ],
  },
];

export function AppLayout({ children }: AppLayoutProps) {
  const { user, roles, signOut } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  if (isMobile) {
    return <MobileLayout>{children}</MobileLayout>;
  }

  return (
    <div className="min-h-screen bg-background flex">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md">
        Skip to main content
      </a>
      {/* Sidebar — cool light gray, temperature contrast with warm content */}
      <aside className="w-60 bg-sidebar border-r border-sidebar-border flex flex-col shrink-0">
        <div className="p-4 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-2">
            <img src={raxLogo} alt="RAX LMS" className="h-7 w-auto" />
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-5">
          {navigation.map((group) => (
            <div key={group.label}>
              <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
                {group.label}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = location.pathname === item.href ||
                    (item.href !== '/' && location.pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        'flex items-center gap-3 px-3 py-1.5 rounded-md text-sm transition-colors',
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-foreground font-medium'
                          : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="h-7 w-7 rounded-full bg-sidebar-accent flex items-center justify-center">
              <User className="h-3.5 w-3.5 text-sidebar-foreground/70" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate" title={user?.email || ""}>
                {user?.email}
              </p>
              <p className="text-[11px] text-sidebar-foreground/50 capitalize">
                {roles.join(', ') || 'No role assigned'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start mt-1 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            {signingOut ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4 mr-2" />
            )}
            {signingOut ? 'Signing out...' : 'Sign out'}
          </Button>
        </div>
      </aside>

      {/* Main content — warm parchment */}
      <main id="main-content" className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}

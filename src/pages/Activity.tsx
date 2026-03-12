import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { FinancialStrip } from '@/components/loans/FinancialStrip';
import { useAllActivityLog, type ActivityLogWithLoan } from '@/hooks/useActivityLog';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/lib/format';
import { getCurrentDate } from '@/lib/simulatedDate';
import { ActivityType } from '@/types/loan';
import { Phone, Mail, Users, MapPin, MessageSquare, Search, ExternalLink } from 'lucide-react';
import { format as fnsFormat, formatDistanceToNow, startOfDay, subDays, startOfWeek, startOfMonth } from 'date-fns';
import { AttachmentGallery } from '@/components/activity/PhotoAttach';

const ACTIVITY_TYPES: { value: ActivityType; label: string; icon: typeof Phone }[] = [
  { value: 'call', label: 'Call', icon: Phone },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'meeting', label: 'Meeting', icon: Users },
  { value: 'site_visit', label: 'Site Visit', icon: MapPin },
  { value: 'other', label: 'Other', icon: MessageSquare },
];

function ActivityTypeBadge({ type }: { type: ActivityType | null }) {
  if (!type) return null;
  const config = ACTIVITY_TYPES.find(t => t.value === type);
  if (!config) return null;
  const Icon = config.icon;
  const isAction = type === 'call' || type === 'meeting' || type === 'site_visit';
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-medium ${
      isAction
        ? 'bg-accent-amber/10 text-accent-amber'
        : 'bg-muted text-muted-foreground'
    }`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

type TimeFilter = 'today' | 'week' | 'month' | 'all';

function getTimeFilterStart(filter: TimeFilter): Date | null {
  const now = getCurrentDate();
  switch (filter) {
    case 'today': return startOfDay(now);
    case 'week': return startOfWeek(now, { weekStartsOn: 1 });
    case 'month': return startOfMonth(now);
    case 'all': return null;
  }
}

export default function Activity() {
  const { user } = useAuth();
  const { data: entries, isLoading } = useAllActivityLog();

  const [timeFilter, setTimeFilter] = useState<TimeFilter>('week');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [personFilter, setPersonFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Get unique team members for filter
  const teamMembers = useMemo(() => {
    if (!entries) return [];
    const seen = new Map<string, string>();
    for (const e of entries) {
      if (e.created_by_email && !seen.has(e.created_by)) {
        seen.set(e.created_by, e.created_by_email.split('@')[0]);
      }
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [entries]);

  // Filter entries
  const filtered = useMemo(() => {
    if (!entries) return [];
    const start = getTimeFilterStart(timeFilter);

    return entries.filter(e => {
      if (start && new Date(e.created_at) < start) return false;
      if (typeFilter !== 'all' && e.activity_type !== typeFilter) return false;
      if (personFilter !== 'all' && e.created_by !== personFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !e.content.toLowerCase().includes(q) &&
          !e.borrower_name.toLowerCase().includes(q) &&
          !e.loan_display_id.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [entries, timeFilter, typeFilter, personFilter, search]);

  // Group by date for display
  const grouped = useMemo(() => {
    const groups: { date: string; label: string; entries: ActivityLogWithLoan[] }[] = [];
    let currentDate = '';

    for (const entry of filtered) {
      const date = fnsFormat(new Date(entry.created_at), 'yyyy-MM-dd');
      if (date !== currentDate) {
        currentDate = date;
        groups.push({
          date,
          label: fnsFormat(new Date(entry.created_at), 'EEEE, d MMM yyyy'),
          entries: [],
        });
      }
      groups[groups.length - 1].entries.push(entry);
    }
    return groups;
  }, [filtered]);

  // Stats for financial strip
  const stats = useMemo(() => {
    const total = filtered.length;
    const uniqueLoans = new Set(filtered.map(e => e.loan_id)).size;
    const uniquePeople = new Set(filtered.map(e => e.created_by)).size;
    const calls = filtered.filter(e => e.activity_type === 'call').length;
    const meetings = filtered.filter(e => e.activity_type === 'meeting' || e.activity_type === 'site_visit').length;
    return { total, uniqueLoans, uniquePeople, calls, meetings };
  }, [filtered]);

  return (
    <div className="p-6 max-md:px-4 max-md:py-3 space-y-6 max-md:space-y-4 max-w-5xl">
      <div>
        <h1 className="text-2xl max-md:text-xl font-bold text-primary">Activity</h1>
        <p className="text-sm text-foreground-secondary mt-1 max-md:hidden">All activity across loans</p>
      </div>

      <FinancialStrip items={[
        { label: 'Notes', value: String(stats.total), accent: 'primary' },
        { label: 'Loans Touched', value: String(stats.uniqueLoans), accent: 'amber' },
        { label: 'Team Members', value: String(stats.uniquePeople) },
        { label: 'Calls', value: String(stats.calls) },
        { label: 'Meetings / Visits', value: String(stats.meetings), accent: 'sage' },
      ]} />

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
          {(['today', 'week', 'month', 'all'] as TimeFilter[]).map(f => (
            <Button
              key={f}
              variant={timeFilter === f ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs capitalize"
              onClick={() => setTimeFilter(f)}
            >
              {f === 'week' ? 'This Week' : f === 'month' ? 'This Month' : f === 'today' ? 'Today' : 'All Time'}
            </Button>
          ))}
        </div>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {ACTIVITY_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value}>
                <span className="flex items-center gap-1.5">
                  <t.icon className="h-3 w-3" />
                  {t.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={personFilter} onValueChange={setPersonFilter}>
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue placeholder="Everyone" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Everyone</SelectItem>
            {teamMembers.map(m => (
              <SelectItem key={m.id} value={m.id}>
                {m.id === user?.id ? 'You' : m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground-muted" />
          <Input
            placeholder="Search notes or borrower..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* Feed */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : !filtered.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No activity found for the selected filters
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(group => (
            <div key={group.date}>
              <div className="flex justify-center mb-3">
                <span className="text-[11px] text-foreground-muted bg-muted/60 px-3 py-0.5 rounded-full">
                  {group.label}
                </span>
              </div>

              <div className="space-y-2">
                {group.entries.map(entry => {
                  const isAuthor = user?.id === entry.created_by;
                  const email = entry.created_by_email || (isAuthor ? user?.email : null);
                  const name = email?.split('@')[0] || '?';
                  const initial = name.charAt(0).toUpperCase();
                  const colors = [
                    'bg-primary/20 text-primary',
                    'bg-accent-amber/20 text-accent-amber',
                    'bg-accent-sage/20 text-accent-sage',
                    'bg-destructive/20 text-destructive',
                  ];
                  const colorIdx = name.charCodeAt(0) % colors.length;

                  return (
                    <div key={entry.id} className="flex items-start gap-2.5">
                      <div className={`shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold mt-5 ${colors[colorIdx]}`}>
                        {initial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[11px] font-medium text-primary/70">
                            {isAuthor ? 'You' : name}
                          </span>
                          <Link
                            to={`/loans/${entry.loan_id}`}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-foreground-secondary hover:text-primary transition-colors"
                          >
                            <span className="font-mono">{entry.loan_display_id}</span>
                            <span className="text-foreground-muted">-</span>
                            <span>{entry.borrower_name}</span>
                            <ExternalLink className="h-2.5 w-2.5 opacity-50" />
                          </Link>
                        </div>
                        <div className="bg-white rounded-lg rounded-tl-sm shadow-sm border border-border/40 px-3 py-1.5">
                          {entry.activity_type && (
                            <span className="mr-1.5"><ActivityTypeBadge type={entry.activity_type} /></span>
                          )}
                          <span className="text-sm whitespace-pre-wrap">{entry.content}</span>
                          <AttachmentGallery attachments={entry.attachments} />
                          <span className="inline-flex items-center gap-1 ml-2 align-baseline whitespace-nowrap">
                            {entry.activity_date && (
                              <span className="font-mono text-[10px] text-foreground-muted">{formatDate(entry.activity_date)}</span>
                            )}
                            <span className="text-[10px] text-foreground-muted">
                              {fnsFormat(new Date(entry.created_at), 'HH:mm')}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

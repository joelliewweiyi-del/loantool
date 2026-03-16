import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { FinancialStrip } from '@/components/loans/FinancialStrip';
import { useAllActivityLog, useCreateActivityLog, useUpdateActivityLog, useDeleteActivityLog, type ActivityLogWithLoan } from '@/hooks/useActivityLog';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/lib/format';
import { getCurrentDate } from '@/lib/simulatedDate';
import { ActivityType } from '@/types/loan';
import { Phone, Mail, Users, MapPin, MessageSquare, Search, ExternalLink, Plus, Pencil, Trash2, X, Check, Loader2 } from 'lucide-react';
import { format as fnsFormat } from 'date-fns';
import { AttachmentGallery, PhotoAttach, type PhotoPreview } from '@/components/activity/PhotoAttach';
import { uploadActivityPhotos } from '@/lib/uploadPhoto';
import { useIsMobile } from '@/hooks/use-mobile';

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

export default function Activity() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { data: entries, isLoading } = useAllActivityLog();
  const createLog = useCreateActivityLog();
  const updateLog = useUpdateActivityLog();
  const deleteLog = useDeleteActivityLog();

  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [personFilter, setPersonFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Compose form state
  const [showCompose, setShowCompose] = useState(false);
  const [content, setContent] = useState('');
  const [activityType, setActivityType] = useState<string>('');
  const [activityDate, setActivityDate] = useState(() => fnsFormat(getCurrentDate(), 'yyyy-MM-dd'));
  const [photoPreviews, setPhotoPreviews] = useState<PhotoPreview[]>([]);
  const [uploading, setUploading] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editType, setEditType] = useState<string>('');
  const [editDate, setEditDate] = useState('');

  const handleStartEdit = (entry: ActivityLogWithLoan) => {
    setEditingId(entry.id);
    setEditContent(entry.content);
    setEditType(entry.activity_type || '');
    setEditDate(entry.activity_date || '');
  };

  const handleSaveEdit = async (entry: ActivityLogWithLoan) => {
    if (!editingId || !editContent.trim()) return;
    await updateLog.mutateAsync({
      id: editingId,
      loan_id: entry.loan_id,
      content: editContent.trim(),
      activity_type: (editType || null) as ActivityType | null,
      activity_date: editDate || null,
    });
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!content.trim() && !photoPreviews.length) return;
    setUploading(true);
    try {
      let attachments = null;
      if (photoPreviews.length && user) {
        attachments = await uploadActivityPhotos(
          photoPreviews.map((p) => p.file),
          user.id
        );
      }
      await createLog.mutateAsync({
        loan_id: null,
        content: content.trim() || (photoPreviews.length ? '📷' : ''),
        activity_type: (activityType || null) as ActivityType | null,
        activity_date: activityDate || null,
        attachments,
      });
      setContent('');
      setActivityType('');
      setActivityDate(fnsFormat(getCurrentDate(), 'yyyy-MM-dd'));
      photoPreviews.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setPhotoPreviews([]);
      setShowCompose(false);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (entry: ActivityLogWithLoan) => {
    await deleteLog.mutateAsync({ id: entry.id, loanId: entry.loan_id });
  };

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

    return entries.filter(e => {
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
  }, [entries, typeFilter, personFilter, search]);

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
    const uniqueLoans = new Set(filtered.filter(e => e.loan_id).map(e => e.loan_id)).size;
    const general = filtered.filter(e => !e.loan_id).length;
    const uniquePeople = new Set(filtered.map(e => e.created_by)).size;
    const calls = filtered.filter(e => e.activity_type === 'call').length;
    const meetings = filtered.filter(e => e.activity_type === 'meeting' || e.activity_type === 'site_visit').length;
    return { total, uniqueLoans, general, uniquePeople, calls, meetings };
  }, [filtered]);

  return (
    <div className="p-6 max-md:px-4 max-md:pt-5 max-md:pb-4 space-y-6 max-md:space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Activity</h1>
          <p className="text-sm text-foreground-secondary mt-1 max-md:hidden">All activity across loans</p>
        </div>
        <Button
          size="sm"
          className="h-8"
          onClick={() => setShowCompose(!showCompose)}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          General Note
        </Button>
      </div>

      {/* Compose form for general notes */}
      {showCompose && (
        <div className="space-y-3 border rounded-lg p-4 bg-white">
          <Textarea
            placeholder="Write a general note (not tied to any loan)..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={isMobile ? 2 : 3}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={activityType} onValueChange={setActivityType}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue placeholder="Type (optional)" />
              </SelectTrigger>
              <SelectContent>
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
            <Input
              type="date"
              value={activityDate}
              onChange={(e) => setActivityDate(e.target.value)}
              className="h-8 w-[160px] text-xs"
            />
            <PhotoAttach previews={photoPreviews} onChange={setPhotoPreviews} compact />
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => { setShowCompose(false); setContent(''); setActivityType(''); setPhotoPreviews([]); }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8"
              onClick={handleSubmit}
              disabled={(!content.trim() && !photoPreviews.length) || createLog.isPending || uploading}
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
              {uploading ? 'Uploading...' : createLog.isPending ? 'Adding...' : 'Add Note'}
            </Button>
          </div>
          {!isMobile && <p className="text-xs text-foreground-muted">Ctrl+Enter to submit</p>}
        </div>
      )}

      <FinancialStrip items={isMobile ? [
        { label: 'Notes', value: String(stats.total), accent: 'primary' },
        { label: 'Loans', value: String(stats.uniqueLoans), accent: 'amber' },
        { label: 'Calls', value: String(stats.calls) },
        { label: 'Meetings', value: String(stats.meetings), accent: 'sage' },
      ] : [
        { label: 'Notes', value: String(stats.total), accent: 'primary' },
        { label: 'Loans Touched', value: String(stats.uniqueLoans), accent: 'amber' },
        { label: 'General', value: String(stats.general) },
        { label: 'Team Members', value: String(stats.uniquePeople) },
        { label: 'Calls', value: String(stats.calls) },
        { label: 'Meetings / Visits', value: String(stats.meetings), accent: 'sage' },
      ]} />

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-9 max-md:flex-1 w-[130px] text-xs">
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
            <SelectTrigger className="h-9 max-md:flex-1 w-[130px] text-xs">
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

          <div className="relative flex-1 min-w-[140px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground-muted" />
            <Input
              placeholder="Search notes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-9 pl-8 text-xs"
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

              <div className="space-y-3">
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
                    <div key={entry.id} className="flex items-start gap-3">
                      <div className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold mt-5 ${colors[colorIdx]}`}>
                        {initial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-primary/70">
                            {isAuthor ? 'You' : name}
                          </span>
                          {entry.loan_id ? (
                            <Link
                              to={`/loans/${entry.loan_id}`}
                              className="inline-flex items-center gap-1 text-xs font-medium text-foreground-secondary hover:text-primary transition-colors"
                            >
                              <span className="font-mono">{entry.loan_display_id}</span>
                              <span className="text-foreground-muted">·</span>
                              <span className="truncate max-w-[120px]">{entry.borrower_name}</span>
                              <ExternalLink className="h-2.5 w-2.5 opacity-50 shrink-0" />
                            </Link>
                          ) : (
                            <span className="text-xs text-foreground-muted">General</span>
                          )}
                        </div>
                        <div className="group relative max-w-full bg-white rounded-xl rounded-tl-sm shadow-sm border border-border/40 px-4 py-2.5">
                          {editingId === entry.id ? (
                            <div className="space-y-2">
                              <Textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                rows={3}
                                autoFocus
                                className="text-sm"
                              />
                              <div className="flex items-center gap-2">
                                <Select value={editType} onValueChange={setEditType}>
                                  <SelectTrigger className="h-7 w-[130px] text-xs">
                                    <SelectValue placeholder="Type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ACTIVITY_TYPES.map(t => (
                                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Input
                                  type="date"
                                  value={editDate}
                                  onChange={(e) => setEditDate(e.target.value)}
                                  className="h-7 w-[150px] text-xs"
                                />
                                <div className="flex-1" />
                                <Button size="sm" variant="ghost" className="h-7" onClick={() => setEditingId(null)}>
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="sm" className="h-7" onClick={() => handleSaveEdit(entry)} disabled={updateLog.isPending}>
                                  <Check className="h-3.5 w-3.5 mr-1" />
                                  Save
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {entry.activity_type && (
                                <span className="mr-1.5"><ActivityTypeBadge type={entry.activity_type} /></span>
                              )}
                              <span className="text-[15px] max-md:text-sm whitespace-pre-wrap">{entry.content}</span>
                              <AttachmentGallery attachments={entry.attachments} />
                              <span className="inline-flex items-center gap-1 ml-2 align-baseline whitespace-nowrap">
                                {entry.activity_date && (
                                  <span className="font-mono text-[10px] text-foreground-muted">{formatDate(entry.activity_date)}</span>
                                )}
                                <span className="text-[10px] text-foreground-muted">
                                  {fnsFormat(new Date(entry.created_at), 'HH:mm')}
                                </span>
                                {entry.updated_at && <span className="text-[10px] text-foreground-muted italic">edited</span>}
                              </span>
                              {isAuthor && (
                                <div className="absolute -right-14 top-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => handleStartEdit(entry)}>
                                    <Pencil className="h-2.5 w-2.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                                    onClick={() => handleDelete(entry)}
                                    disabled={deleteLog.isPending}
                                  >
                                    <Trash2 className="h-2.5 w-2.5" />
                                  </Button>
                                </div>
                              )}
                            </>
                          )}
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

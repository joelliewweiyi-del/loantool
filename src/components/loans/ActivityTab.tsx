import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import {
  useLoanActivityLog,
  useCreateActivityLog,
  useUpdateActivityLog,
  useDeleteActivityLog,
} from '@/hooks/useActivityLog';
import { formatDate, formatDateTime, formatActivityType } from '@/lib/format';
import { ActivityType } from '@/types/loan';
import { Plus, Pencil, Trash2, Phone, Mail, Users, MapPin, MessageSquare, X, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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

interface ActivityTabProps {
  loanId: string;
}

export function ActivityTab({ loanId }: ActivityTabProps) {
  const { user } = useAuth();
  const { data: entries, isLoading } = useLoanActivityLog(loanId);
  const createLog = useCreateActivityLog();
  const updateLog = useUpdateActivityLog();
  const deleteLog = useDeleteActivityLog();

  // Add form state
  const [content, setContent] = useState('');
  const [activityType, setActivityType] = useState<string>('');
  const [activityDate, setActivityDate] = useState('');

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editType, setEditType] = useState<string>('');
  const [editDate, setEditDate] = useState('');

  const handleSubmit = async () => {
    if (!content.trim()) return;
    await createLog.mutateAsync({
      loan_id: loanId,
      content: content.trim(),
      activity_type: (activityType || null) as ActivityType | null,
      activity_date: activityDate || null,
    });
    setContent('');
    setActivityType('');
    setActivityDate('');
  };

  const handleStartEdit = (entry: { id: string; content: string; activity_type: ActivityType | null; activity_date: string | null }) => {
    setEditingId(entry.id);
    setEditContent(entry.content);
    setEditType(entry.activity_type || '');
    setEditDate(entry.activity_date || '');
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editContent.trim()) return;
    await updateLog.mutateAsync({
      id: editingId,
      loan_id: loanId,
      content: editContent.trim(),
      activity_type: (editType || null) as ActivityType | null,
      activity_date: editDate || null,
    });
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    await deleteLog.mutateAsync({ id, loanId });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Log</CardTitle>
        <CardDescription>Conversation notes and deal tracking</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add note form */}
        <div className="space-y-3 border-b pb-6">
          <Textarea
            placeholder="Log a note, call, or meeting..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <div className="flex items-center gap-3">
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
              placeholder="Date (optional)"
            />
            {(activityType || activityDate) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground"
                onClick={() => { setActivityType(''); setActivityDate(''); }}
              >
                Clear
              </Button>
            )}
            <div className="flex-1" />
            <Button
              size="sm"
              className="h-8"
              onClick={handleSubmit}
              disabled={!content.trim() || createLog.isPending}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              {createLog.isPending ? 'Adding...' : 'Add Note'}
            </Button>
          </div>
          <p className="text-xs text-foreground-muted">Ctrl+Enter to submit</p>
        </div>

        {/* Timeline */}
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : !entries?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            No activity logged yet
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => {
              const isAuthor = user?.id === entry.created_by;
              const isEditing = editingId === entry.id;

              return (
                <div key={entry.id} className="group border-l-2 border-border pl-4 py-1">
                  {isEditing ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={3}
                        autoFocus
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
                        <Button size="sm" className="h-7" onClick={handleSaveEdit} disabled={updateLog.isPending}>
                          <Check className="h-3.5 w-3.5 mr-1" />
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <ActivityTypeBadge type={entry.activity_type} />
                          {entry.activity_date && (
                            <span className="font-mono text-xs text-foreground-secondary">
                              {formatDate(entry.activity_date)}
                            </span>
                          )}
                        </div>
                        {isAuthor && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleStartEdit(entry)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(entry.id)}
                              disabled={deleteLog.isPending}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <p className="text-sm mt-1 whitespace-pre-wrap">{entry.content}</p>
                      <p className="text-xs text-foreground-muted mt-1">
                        {isAuthor ? 'You' : 'Team member'} · {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                        {entry.updated_at && ' · edited'}
                      </p>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

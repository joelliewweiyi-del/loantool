import { useState } from 'react';
import { FundingCounterparty, FundingNote, FundingStage, ActivityType } from '@/types/loan';
import { FundingStagePipeline, fundingStages, fundingStageLabels } from './FundingStagePipeline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import {
  useUpdateCounterparty,
  useFundingNotes,
  useCreateFundingNote,
  useUpdateFundingNote,
  useDeleteFundingNote,
} from '@/hooks/useFunding';
import { formatDate } from '@/lib/format';
import { getCurrentDate } from '@/lib/simulatedDate';
import { cn } from '@/lib/utils';
import {
  ChevronDown,
  ChevronRight,
  Phone,
  Mail,
  Users,
  MessageSquare,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Calendar,
  User as UserIcon,
} from 'lucide-react';
import { format as fnsFormat } from 'date-fns';

const ACTIVITY_TYPES: { value: ActivityType; label: string; icon: typeof Phone }[] = [
  { value: 'call', label: 'Call', icon: Phone },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'meeting', label: 'Meeting', icon: Users },
  { value: 'other', label: 'Other', icon: MessageSquare },
];

function ActivityTypeBadge({ type }: { type: ActivityType | null }) {
  if (!type) return null;
  const config = ACTIVITY_TYPES.find(t => t.value === type);
  if (!config) return null;
  const Icon = config.icon;
  const isAction = type === 'call' || type === 'meeting';
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

interface CounterpartyPanelProps {
  counterparty: FundingCounterparty;
  defaultExpanded?: boolean;
}

export function CounterpartyPanel({ counterparty, defaultExpanded = false }: CounterpartyPanelProps) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [showCompose, setShowCompose] = useState(false);
  const [editingStage, setEditingStage] = useState(false);
  const [editingFollowup, setEditingFollowup] = useState(false);
  const [editingContact, setEditingContact] = useState(false);
  const [followupDate, setFollowupDate] = useState(counterparty.next_followup || '');
  const [contactName, setContactName] = useState(counterparty.contact_name || '');
  const [contactEmail, setContactEmail] = useState(counterparty.contact_email || '');

  // Note compose state
  const [content, setContent] = useState('');
  const [activityType, setActivityType] = useState<string>('');
  const [activityDate, setActivityDate] = useState(() => fnsFormat(getCurrentDate(), 'yyyy-MM-dd'));

  // Edit note state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editType, setEditType] = useState<string>('');
  const [editDate, setEditDate] = useState('');

  const { data: notes = [], isLoading: notesLoading } = useFundingNotes(expanded ? counterparty.id : undefined);
  const updateCounterparty = useUpdateCounterparty();
  const createNote = useCreateFundingNote();
  const updateNote = useUpdateFundingNote();
  const deleteNote = useDeleteFundingNote();

  const handleStageChange = (stage: string) => {
    updateCounterparty.mutate({ id: counterparty.id, stage: stage as FundingStage });
    setEditingStage(false);
  };

  const handleFollowupSave = () => {
    updateCounterparty.mutate({ id: counterparty.id, next_followup: followupDate || null });
    setEditingFollowup(false);
  };

  const handleContactSave = () => {
    updateCounterparty.mutate({
      id: counterparty.id,
      contact_name: contactName || null,
      contact_email: contactEmail || null,
    });
    setEditingContact(false);
  };

  const handleSubmitNote = async () => {
    if (!content.trim()) return;
    await createNote.mutateAsync({
      counterparty_id: counterparty.id,
      content: content.trim(),
      activity_type: (activityType || null) as ActivityType | null,
      activity_date: activityDate || null,
    });
    setContent('');
    setActivityType('');
    setActivityDate(fnsFormat(getCurrentDate(), 'yyyy-MM-dd'));
    setShowCompose(false);
  };

  const handleStartEdit = (note: FundingNote) => {
    setEditingId(note.id);
    setEditContent(note.content);
    setEditType(note.activity_type || '');
    setEditDate(note.activity_date || '');
  };

  const handleSaveEdit = async (note: FundingNote) => {
    if (!editingId || !editContent.trim()) return;
    await updateNote.mutateAsync({
      id: editingId,
      counterparty_id: note.counterparty_id,
      content: editContent.trim(),
      activity_type: (editType || null) as ActivityType | null,
      activity_date: editDate || null,
    });
    setEditingId(null);
  };

  const isOverdue = counterparty.next_followup && counterparty.next_followup < fnsFormat(getCurrentDate(), 'yyyy-MM-dd');

  return (
    <div className="border border-border/60 rounded-lg bg-white overflow-hidden">
      {/* Header */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-foreground-muted shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-foreground-muted shrink-0" />
        )}

        {/* Name + initial */}
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-sm font-semibold text-primary">{counterparty.name.charAt(0)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-primary">{counterparty.name}</span>
            {editingStage ? (
              <div onClick={e => e.stopPropagation()}>
                <Select value={counterparty.stage} onValueChange={handleStageChange}>
                  <SelectTrigger className="h-6 w-[140px] text-[10px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fundingStages.map(s => (
                      <SelectItem key={s} value={s} className="text-xs">
                        {fundingStageLabels[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <span
                className="text-[10px] font-medium uppercase tracking-wider text-foreground-tertiary cursor-pointer hover:text-primary transition-colors"
                onClick={e => { e.stopPropagation(); setEditingStage(true); }}
                title="Click to change stage"
              >
                {fundingStageLabels[counterparty.stage]}
              </span>
            )}
          </div>
          <FundingStagePipeline current={counterparty.stage} variant="compact" className="mt-1" />
        </div>

        {/* Right side meta */}
        <div className="flex items-center gap-4 shrink-0 text-right">
          {counterparty.contact_name && (
            <span className="text-xs text-foreground-tertiary hidden sm:block">
              {counterparty.contact_name}
            </span>
          )}
          {counterparty.next_followup && (
            <span className={cn(
              'text-xs font-mono tabular-nums',
              isOverdue ? 'text-destructive font-medium' : 'text-foreground-tertiary'
            )}>
              <Calendar className="h-3 w-3 inline mr-1" />
              {formatDate(counterparty.next_followup)}
            </span>
          )}
          <span className="text-xs text-foreground-muted tabular-nums font-mono">
            {notes.length || '—'}
          </span>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-border/40">
          {/* Meta row: contact + follow-up + key terms */}
          <div className="px-4 py-3 flex items-start gap-6 flex-wrap border-b border-border/30 bg-muted/20">
            {/* Contact */}
            <div className="min-w-[160px]">
              <span className="ledger-label mb-1 block">Contact</span>
              {editingContact ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={contactName}
                    onChange={e => setContactName(e.target.value)}
                    placeholder="Name"
                    className="h-7 text-xs w-[120px]"
                  />
                  <Input
                    value={contactEmail}
                    onChange={e => setContactEmail(e.target.value)}
                    placeholder="Email"
                    className="h-7 text-xs w-[160px]"
                  />
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handleContactSave}>
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditingContact(false)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <span
                  className="text-sm text-foreground-secondary cursor-pointer hover:text-primary transition-colors flex items-center gap-1"
                  onClick={() => setEditingContact(true)}
                >
                  <UserIcon className="h-3 w-3 text-foreground-muted" />
                  {counterparty.contact_name || 'Add contact'}
                  {counterparty.contact_email && (
                    <span className="text-foreground-muted text-xs ml-1">({counterparty.contact_email})</span>
                  )}
                </span>
              )}
            </div>

            {/* Follow-up */}
            <div className="min-w-[140px]">
              <span className="ledger-label mb-1 block">Next Follow-up</span>
              {editingFollowup ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={followupDate}
                    onChange={e => setFollowupDate(e.target.value)}
                    className="h-7 text-xs w-[150px]"
                  />
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handleFollowupSave}>
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditingFollowup(false)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <span
                  className={cn(
                    'text-sm cursor-pointer hover:text-primary transition-colors',
                    isOverdue ? 'text-destructive font-medium' : 'text-foreground-secondary'
                  )}
                  onClick={() => { setFollowupDate(counterparty.next_followup || ''); setEditingFollowup(true); }}
                >
                  {counterparty.next_followup ? formatDate(counterparty.next_followup) : 'Set date'}
                  {isOverdue && ' (overdue)'}
                </span>
              )}
            </div>

            {/* Key terms summary */}
            {counterparty.key_terms && Object.keys(counterparty.key_terms).length > 0 && (
              <div>
                <span className="ledger-label mb-1 block">Key Terms</span>
                <div className="flex items-baseline gap-4">
                  {Object.entries(counterparty.key_terms).map(([k, v]) => (
                    <span key={k} className="text-xs">
                      <span className="text-foreground-muted">{k}:</span>{' '}
                      <span className="font-mono font-medium text-foreground-secondary">{String(v)}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notes thread */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-foreground-tertiary uppercase tracking-wider">Thread</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => setShowCompose(!showCompose)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Note
              </Button>
            </div>

            {/* Compose */}
            {showCompose && (
              <div className="space-y-2 mb-4 border rounded-lg p-3 bg-muted/10">
                <Textarea
                  placeholder="Log a call, email, or meeting note..."
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  rows={2}
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      handleSubmitNote();
                    }
                  }}
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={activityType} onValueChange={setActivityType}>
                    <SelectTrigger className="h-7 w-[120px] text-xs">
                      <SelectValue placeholder="Type" />
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
                    onChange={e => setActivityDate(e.target.value)}
                    className="h-7 w-[140px] text-xs"
                  />
                  <div className="flex-1" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => { setShowCompose(false); setContent(''); setActivityType(''); }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="h-7"
                    onClick={handleSubmitNote}
                    disabled={!content.trim() || createNote.isPending}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {createNote.isPending ? 'Adding...' : 'Add'}
                  </Button>
                </div>
                <p className="text-[10px] text-foreground-muted">Ctrl+Enter to submit</p>
              </div>
            )}

            {/* Notes list */}
            {notesLoading ? (
              <div className="text-xs text-foreground-muted py-4 text-center">Loading...</div>
            ) : notes.length === 0 ? (
              <div className="text-xs text-foreground-muted py-4 text-center">
                No notes yet. Add one to start tracking conversations.
              </div>
            ) : (
              <div className="space-y-2">
                {notes.map(note => {
                  const isAuthor = user?.id === note.created_by;
                  const email = note.created_by_email;
                  const name = email?.split('@')[0] || '?';
                  const initial = name.charAt(0).toUpperCase();

                  return (
                    <div key={note.id} className="flex items-start gap-2.5">
                      <div className="shrink-0 h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-semibold text-primary mt-0.5">
                        {initial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[11px] font-medium text-primary/70">
                            {isAuthor ? 'You' : name}
                          </span>
                          <span className="text-[10px] text-foreground-muted">
                            {fnsFormat(new Date(note.created_at), 'dd MMM HH:mm')}
                          </span>
                        </div>
                        <div className="group relative bg-muted/30 rounded-lg rounded-tl-sm px-3 py-2">
                          {editingId === note.id ? (
                            <div className="space-y-2">
                              <Textarea
                                value={editContent}
                                onChange={e => setEditContent(e.target.value)}
                                rows={2}
                                autoFocus
                                className="text-sm"
                              />
                              <div className="flex items-center gap-2">
                                <Select value={editType} onValueChange={setEditType}>
                                  <SelectTrigger className="h-6 w-[110px] text-[10px]">
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
                                  onChange={e => setEditDate(e.target.value)}
                                  className="h-6 w-[130px] text-[10px]"
                                />
                                <div className="flex-1" />
                                <Button size="sm" variant="ghost" className="h-6" onClick={() => setEditingId(null)}>
                                  <X className="h-3 w-3" />
                                </Button>
                                <Button size="sm" className="h-6" onClick={() => handleSaveEdit(note)} disabled={updateNote.isPending}>
                                  <Check className="h-3 w-3 mr-1" />
                                  Save
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {note.activity_type && (
                                <span className="mr-1.5"><ActivityTypeBadge type={note.activity_type} /></span>
                              )}
                              <span className="text-sm whitespace-pre-wrap">{note.content}</span>
                              {note.activity_date && (
                                <span className="inline-flex items-center ml-2 align-baseline">
                                  <span className="font-mono text-[10px] text-foreground-muted">{formatDate(note.activity_date)}</span>
                                </span>
                              )}
                              {note.updated_at && <span className="text-[10px] text-foreground-muted italic ml-1">edited</span>}
                              {isAuthor && (
                                <div className="absolute -right-12 top-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => handleStartEdit(note)}>
                                    <Pencil className="h-2.5 w-2.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                                    onClick={() => deleteNote.mutate({ id: note.id, counterpartyId: note.counterparty_id })}
                                    disabled={deleteNote.isPending}
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
            )}
          </div>
        </div>
      )}
    </div>
  );
}

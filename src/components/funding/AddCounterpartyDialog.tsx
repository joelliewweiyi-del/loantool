import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useCreateCounterparty } from '@/hooks/useFunding';
import { FundingStage } from '@/types/loan';
import { fundingStages, fundingStageLabels } from './FundingStagePipeline';
import { Plus } from 'lucide-react';

export function AddCounterpartyDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [stage, setStage] = useState<FundingStage>('initial_contact');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [notes, setNotes] = useState('');

  const createCounterparty = useCreateCounterparty();

  const handleSubmit = async () => {
    if (!name.trim()) return;
    await createCounterparty.mutateAsync({
      name: name.trim(),
      stage,
      contact_name: contactName.trim() || undefined,
      contact_email: contactEmail.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    setName('');
    setStage('initial_contact');
    setContactName('');
    setContactEmail('');
    setNotes('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-8">
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Counterparty
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-primary">Add Counterparty</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <label className="ledger-label mb-1 block">Name</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Deutsche Bank"
              autoFocus
            />
          </div>
          <div>
            <label className="ledger-label mb-1 block">Stage</label>
            <Select value={stage} onValueChange={v => setStage(v as FundingStage)}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fundingStages.map(s => (
                  <SelectItem key={s} value={s}>{fundingStageLabels[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="ledger-label mb-1 block">Contact Name</label>
              <Input
                value={contactName}
                onChange={e => setContactName(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="ledger-label mb-1 block">Contact Email</label>
              <Input
                value={contactEmail}
                onChange={e => setContactEmail(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
          <div>
            <label className="ledger-label mb-1 block">Notes</label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Optional — general notes about this relationship"
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!name.trim() || createCounterparty.isPending}>
              {createCounterparty.isPending ? 'Adding...' : 'Add'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

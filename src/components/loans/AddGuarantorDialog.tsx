import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useCreateGuarantor, useUpdateGuarantor, useReleaseGuarantor, useDeleteGuarantor } from '@/hooks/useCollateral';
import { useToast } from '@/hooks/use-toast';
import type { LoanGuarantor } from '@/types/loan';

interface AddGuarantorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loanId: string;
  existing?: LoanGuarantor;
  canDelete: boolean;
}

export function AddGuarantorDialog({ open, onOpenChange, loanId, existing, canDelete }: AddGuarantorDialogProps) {
  const createGuarantor = useCreateGuarantor();
  const updateGuarantor = useUpdateGuarantor();
  const releaseGuarantor = useReleaseGuarantor();
  const deleteGuarantor = useDeleteGuarantor();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [cap, setCap] = useState('');
  const [showRelease, setShowRelease] = useState(false);
  const [releaseNotes, setReleaseNotes] = useState('');

  useEffect(() => {
    if (existing) {
      setName(existing.guarantor_name);
      setCap(existing.guarantee_cap?.toString() || '');
    } else {
      setName('');
      setCap('');
    }
    setShowRelease(false);
    setReleaseNotes('');
  }, [existing, open]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }
    try {
      if (existing) {
        await updateGuarantor.mutateAsync({
          id: existing.id,
          loanId,
          guarantor_name: name,
          guarantee_cap: cap ? parseFloat(cap) : null,
        });
        toast({ title: 'Guarantor updated' });
      } else {
        await createGuarantor.mutateAsync({
          loan_id: loanId,
          guarantor_name: name,
          guarantee_cap: cap ? parseFloat(cap) : null,
        });
        toast({ title: 'Guarantor added' });
      }
      onOpenChange(false);
    } catch (err: unknown) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    }
  };

  const handleRelease = async () => {
    if (!existing || !releaseNotes.trim()) return;
    try {
      await releaseGuarantor.mutateAsync({
        id: existing.id,
        loanId,
        statusNotes: releaseNotes,
      });
      toast({ title: 'Guarantor released' });
      onOpenChange(false);
    } catch (err: unknown) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!existing) return;
    if (!confirm('Delete this guarantor? This cannot be undone.')) return;
    try {
      await deleteGuarantor.mutateAsync({ id: existing.id, loanId });
      toast({ title: 'Guarantor deleted' });
      onOpenChange(false);
    } catch (err: unknown) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    }
  };

  const isPending = createGuarantor.isPending || updateGuarantor.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{existing ? 'Edit Guarantor' : 'Add Guarantor'}</DialogTitle>
        </DialogHeader>

        {!showRelease ? (
          <>
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label className="text-xs">Guarantor Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Jan de Vries" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Guarantee Cap (€)</Label>
                <Input type="number" value={cap} onChange={e => setCap(e.target.value)} placeholder="Leave empty if no cap" />
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <div className="flex gap-2 mr-auto">
                {existing && existing.status === 'active' && (
                  <Button variant="outline" size="sm" className="text-accent-amber" onClick={() => setShowRelease(true)}>
                    Release
                  </Button>
                )}
                {existing && canDelete && (
                  <Button variant="outline" size="sm" className="text-destructive" onClick={handleDelete} disabled={deleteGuarantor.isPending}>
                    Delete
                  </Button>
                )}
              </div>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={isPending}>
                {isPending ? 'Saving...' : existing ? 'Save' : 'Add'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-4 py-2">
              <p className="text-sm text-foreground-secondary">
                Release this guarantor from the loan.
              </p>
              <div className="space-y-1">
                <Label className="text-xs">Reason (required)</Label>
                <Input value={releaseNotes} onChange={e => setReleaseNotes(e.target.value)} placeholder="e.g. Guarantee expired" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRelease(false)}>Back</Button>
              <Button onClick={handleRelease} disabled={releaseGuarantor.isPending || !releaseNotes.trim()}>
                {releaseGuarantor.isPending ? 'Releasing...' : 'Release Guarantor'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useUpdateCollateralItem, useReleaseCollateralItem, useDeleteCollateralItem } from '@/hooks/useCollateral';
import { useToast } from '@/hooks/use-toast';
import type { CollateralItem, OwnershipType } from '@/types/loan';

interface EditCollateralDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: CollateralItem;
  canDelete: boolean;
}

export function EditCollateralDialog({ open, onOpenChange, item, canDelete }: EditCollateralDialogProps) {
  const updateItem = useUpdateCollateralItem();
  const releaseItem = useReleaseCollateralItem();
  const deleteItem = useDeleteCollateralItem();
  const { toast } = useToast();

  const [gemeente, setGemeente] = useState(item.gemeente || '');
  const [sectie, setSectie] = useState(item.sectie || '');
  const [perceelnummer, setPerceelnummer] = useState(item.perceelnummer || '');
  const [kadastraleGrootte, setKadastraleGrootte] = useState(item.kadastrale_grootte || '');
  const [ownershipType, setOwnershipType] = useState<OwnershipType>(item.ownership_type);
  const [registrationDate, setRegistrationDate] = useState(item.registration_date || '');
  const [registrationAmount, setRegistrationAmount] = useState(item.registration_amount?.toString() || '');
  const [city, setCity] = useState(item.city || '');
  const [address, setAddress] = useState(item.address || '');
  const [securityProvider, setSecurityProvider] = useState(item.security_provider || '');
  const [notes, setNotes] = useState(item.notes || '');

  // Release state
  const [showRelease, setShowRelease] = useState(false);
  const [releaseStatus, setReleaseStatus] = useState<'released' | 'sold'>('released');
  const [releaseNotes, setReleaseNotes] = useState('');

  const handleSave = async () => {
    try {
      await updateItem.mutateAsync({
        id: item.id,
        loanId: item.loan_id,
        gemeente: gemeente || null,
        sectie: sectie || null,
        perceelnummer: perceelnummer || null,
        kadastrale_grootte: kadastraleGrootte || null,
        ownership_type: ownershipType,
        registration_date: registrationDate || null,
        registration_amount: registrationAmount ? parseFloat(registrationAmount) : null,
        city: city || null,
        address: address || null,
        security_provider: securityProvider || null,
        notes: notes || null,
      });
      toast({ title: 'Collateral item updated' });
      onOpenChange(false);
    } catch (err: unknown) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    }
  };

  const handleRelease = async () => {
    if (!releaseNotes.trim()) {
      toast({ title: 'Please provide a reason', variant: 'destructive' });
      return;
    }
    try {
      await releaseItem.mutateAsync({
        id: item.id,
        loanId: item.loan_id,
        status: releaseStatus,
        statusNotes: releaseNotes,
      });
      toast({ title: `Collateral item ${releaseStatus === 'sold' ? 'marked as sold' : 'released'}` });
      onOpenChange(false);
    } catch (err: unknown) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this collateral item? This cannot be undone.')) return;
    try {
      await deleteItem.mutateAsync({ id: item.id, loanId: item.loan_id });
      toast({ title: 'Collateral item deleted' });
      onOpenChange(false);
    } catch (err: unknown) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Collateral Item</DialogTitle>
        </DialogHeader>

        {!showRelease ? (
          <>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Gemeente</Label>
                  <Input value={gemeente} onChange={e => setGemeente(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Sectie</Label>
                  <Input value={sectie} onChange={e => setSectie(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Perceelnummer</Label>
                  <Input value={perceelnummer} onChange={e => setPerceelnummer(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Kadastrale grootte</Label>
                  <Input value={kadastraleGrootte} onChange={e => setKadastraleGrootte(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Ownership Type</Label>
                  <Select value={ownershipType} onValueChange={v => setOwnershipType(v as OwnershipType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="eigendom">Eigendom</SelectItem>
                      <SelectItem value="erfpacht">Erfpacht</SelectItem>
                      <SelectItem value="appartementsrecht">Appartementsrecht</SelectItem>
                      <SelectItem value="recht_van_opstal">Recht van opstal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Registration Date</Label>
                  <Input type="date" value={registrationDate} onChange={e => setRegistrationDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Registration Amount (€)</Label>
                  <Input type="number" value={registrationAmount} onChange={e => setRegistrationAmount(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">City</Label>
                  <Input value={city} onChange={e => setCity(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Address</Label>
                  <Input value={address} onChange={e => setAddress(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Security Provider</Label>
                <Input value={securityProvider} onChange={e => setSecurityProvider(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Notes</Label>
                <Input value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <div className="flex gap-2 mr-auto">
                {item.status === 'active' && (
                  <Button variant="outline" size="sm" className="text-accent-amber" onClick={() => setShowRelease(true)}>
                    Release / Sold
                  </Button>
                )}
                {canDelete && (
                  <Button variant="outline" size="sm" className="text-destructive" onClick={handleDelete} disabled={deleteItem.isPending}>
                    Delete
                  </Button>
                )}
              </div>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={updateItem.isPending}>
                {updateItem.isPending ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-4 py-2">
              <p className="text-sm text-foreground-secondary">
                Mark this collateral item as released or sold. This action can be reversed by editing the item.
              </p>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={releaseStatus} onValueChange={v => setReleaseStatus(v as 'released' | 'sold')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="released">Released</SelectItem>
                    <SelectItem value="sold">Sold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Reason (required)</Label>
                <Input value={releaseNotes} onChange={e => setReleaseNotes(e.target.value)} placeholder="e.g. Property sold to third party" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRelease(false)}>Back</Button>
              <Button
                onClick={handleRelease}
                disabled={releaseItem.isPending || !releaseNotes.trim()}
                className={releaseStatus === 'sold' ? 'bg-destructive hover:bg-destructive/90' : ''}
              >
                {releaseItem.isPending ? 'Saving...' : releaseStatus === 'sold' ? 'Mark as Sold' : 'Release'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

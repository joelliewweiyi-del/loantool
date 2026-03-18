import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useCreateCollateralItem } from '@/hooks/useCollateral';
import { useToast } from '@/hooks/use-toast';
import type { OwnershipType } from '@/types/loan';

interface AddCollateralDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loanId: string;
}

export function AddCollateralDialog({ open, onOpenChange, loanId }: AddCollateralDialogProps) {
  const createItem = useCreateCollateralItem();
  const { toast } = useToast();

  const [gemeente, setGemeente] = useState('');
  const [sectie, setSectie] = useState('');
  const [perceelnummer, setPerceelnummer] = useState('');
  const [kadastraleGrootte, setKadastraleGrootte] = useState('');
  const [ownershipType, setOwnershipType] = useState<OwnershipType>('eigendom');
  const [registrationDate, setRegistrationDate] = useState('');
  const [registrationAmount, setRegistrationAmount] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [securityProvider, setSecurityProvider] = useState('');
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setGemeente('');
    setSectie('');
    setPerceelnummer('');
    setKadastraleGrootte('');
    setOwnershipType('eigendom');
    setRegistrationDate('');
    setRegistrationAmount('');
    setCity('');
    setAddress('');
    setSecurityProvider('');
    setNotes('');
  };

  const handleSubmit = async () => {
    try {
      await createItem.mutateAsync({
        loan_id: loanId,
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
        status: 'active',
      });
      toast({ title: 'Collateral item added' });
      resetForm();
      onOpenChange(false);
    } catch (err: unknown) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Collateral Item</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Gemeente</Label>
              <Input value={gemeente} onChange={e => setGemeente(e.target.value)} placeholder="e.g. Utrecht" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Sectie</Label>
              <Input value={sectie} onChange={e => setSectie(e.target.value)} placeholder="e.g. A" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Perceelnummer</Label>
              <Input value={perceelnummer} onChange={e => setPerceelnummer(e.target.value)} placeholder="e.g. 4033" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Kadastrale grootte</Label>
              <Input value={kadastraleGrootte} onChange={e => setKadastraleGrootte(e.target.value)} placeholder="e.g. 49,421 m²" />
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
              <Input type="number" value={registrationAmount} onChange={e => setRegistrationAmount(e.target.value)} placeholder="e.g. 4900000" />
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
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createItem.isPending}>
            {createItem.isPending ? 'Adding...' : 'Add Item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

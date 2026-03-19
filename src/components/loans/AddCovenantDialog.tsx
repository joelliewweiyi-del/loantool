import { useState } from 'react';
import { useCreateCovenant } from '@/hooks/useCovenants';
import { CovenantType } from '@/types/loan';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Loader2 } from 'lucide-react';

const typeOptions: { value: CovenantType; label: string }[] = [
  { value: 'valuation', label: 'Valuation' },
  { value: 'rent_roll', label: 'Rent Roll' },
  { value: 'annual_accounts', label: 'Annual Accounts' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'kyc_check', label: 'KYC / AML' },
  { value: 'financial_covenant', label: 'Financial Covenant' },
];

const frequencyOptions = [
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'biannually', label: 'Biannually' },
  { value: 'annually', label: 'Annually' },
  { value: 'once', label: 'Once' },
  { value: 'custom', label: 'Custom' },
];

const metricOptions = [
  { value: 'icr', label: 'ICR' },
  { value: 'ltv', label: 'LTV' },
  { value: 'ebitda', label: 'EBITDA' },
  { value: 'min_rent', label: 'Min Rent' },
];

interface AddCovenantDialogProps {
  loanId: string;
}

export function AddCovenantDialog({ loanId }: AddCovenantDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const createCovenant = useCreateCovenant();

  const [covenantType, setCovenantType] = useState<CovenantType>('valuation');
  const [frequency, setFrequency] = useState('annually');
  const [frequencyDetail, setFrequencyDetail] = useState('');
  const [trackingYear, setTrackingYear] = useState(String(new Date().getFullYear()));
  const [thresholdMetric, setThresholdMetric] = useState('');
  const [thresholdValue, setThresholdValue] = useState('');
  const [thresholdOperator, setThresholdOperator] = useState('gte');
  const [notes, setNotes] = useState('');

  const showThreshold = covenantType === 'financial_covenant' || covenantType === 'rent_roll';

  const handleSubmit = async () => {
    await createCovenant.mutateAsync({
      loan_id: loanId,
      covenant_type: covenantType,
      tracking_year: parseInt(trackingYear),
      frequency,
      frequency_detail: frequencyDetail || null,
      threshold_value: thresholdValue ? parseFloat(thresholdValue) : null,
      threshold_operator: thresholdMetric ? thresholdOperator : null,
      threshold_metric: thresholdMetric || null,
      notes: notes || null,
    });
    setIsOpen(false);
    // Reset
    setCovenantType('valuation');
    setFrequency('annually');
    setFrequencyDetail('');
    setThresholdMetric('');
    setThresholdValue('');
    setNotes('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Covenant
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Covenant</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={covenantType} onValueChange={v => setCovenantType(v as CovenantType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {typeOptions.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tracking Year</Label>
              <Input value={trackingYear} onChange={e => setTrackingYear(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {frequencyOptions.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Detail <span className="text-foreground-muted">(optional)</span></Label>
              <Input
                value={frequencyDetail}
                onChange={e => setFrequencyDetail(e.target.value)}
                placeholder="e.g. Na 18 maanden closing"
              />
            </div>
          </div>

          {showThreshold && (
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Metric</Label>
                <Select value={thresholdMetric} onValueChange={setThresholdMetric}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {metricOptions.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Operator</Label>
                <Select value={thresholdOperator} onValueChange={setThresholdOperator}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gte">≥</SelectItem>
                    <SelectItem value="lte">≤</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Value</Label>
                <Input
                  value={thresholdValue}
                  onChange={e => setThresholdValue(e.target.value)}
                  placeholder="e.g. 1.5"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Notes <span className="text-foreground-muted">(optional)</span></Label>
            <Input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any additional details"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createCovenant.isPending}>
            {createCovenant.isPending ? (
              <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Creating...</>
            ) : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

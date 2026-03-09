import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Rocket } from 'lucide-react';
import { useActivatePipelineLoan } from '@/hooks/useLoans';
import { Loan, PaymentType, CommitmentFeeBasis } from '@/types/loan';
import { VEHICLES, vehicleRequiresFacility } from '@/lib/constants';

interface ActivatePipelineLoanDialogProps {
  loan: Loan;
}

interface ActivateFormData {
  vehicle: string;
  facility: string;
  loan_start_date: string;
  maturity_date: string;
  interest_rate: string;
  interest_payment_type: PaymentType;
  fee_payment_type: PaymentType;
  outstanding: string;
  total_commitment: string;
  commitment_fee_rate: string;
  commitment_fee_basis: CommitmentFeeBasis;
  arrangement_fee: string;
}

export function ActivatePipelineLoanDialog({ loan }: ActivatePipelineLoanDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const activateLoan = useActivatePipelineLoan();

  const [formData, setFormData] = useState<ActivateFormData>({
    vehicle: '',
    facility: loan.facility || '',
    loan_start_date: loan.loan_start_date || '',
    maturity_date: loan.maturity_date || '',
    interest_rate: loan.interest_rate ? String(loan.interest_rate * 100) : '',
    interest_payment_type: loan.interest_payment_type || 'cash',
    fee_payment_type: loan.fee_payment_type || 'pik',
    outstanding: loan.outstanding ? String(loan.outstanding) : '',
    total_commitment: loan.total_commitment ? String(loan.total_commitment) : '',
    commitment_fee_rate: loan.commitment_fee_rate ? String(loan.commitment_fee_rate * 100) : '',
    commitment_fee_basis: loan.commitment_fee_basis || 'undrawn_only',
    arrangement_fee: '',
  });

  const handleChange = (field: keyof ActivateFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isTLF = vehicleRequiresFacility(formData.vehicle);
  const canSubmit = formData.vehicle
    && formData.loan_start_date
    && formData.interest_rate
    && formData.outstanding
    && (!isTLF || formData.facility);

  const handleActivate = async () => {
    await activateLoan.mutateAsync({
      loanId: loan.id,
      vehicle: formData.vehicle,
      loan_start_date: formData.loan_start_date,
      maturity_date: formData.maturity_date || null,
      interest_rate: parseFloat(formData.interest_rate) / 100,
      outstanding: parseFloat(formData.outstanding),
      total_commitment: formData.total_commitment ? parseFloat(formData.total_commitment) : null,
      commitment_fee_rate: formData.commitment_fee_rate ? parseFloat(formData.commitment_fee_rate) / 100 : null,
      commitment_fee_basis: formData.commitment_fee_basis,
      interest_type: formData.interest_payment_type === 'pik' ? 'pik' : 'cash_pay',
      fee_payment_type: formData.fee_payment_type,
      interest_payment_type: formData.interest_payment_type,
      facility: isTLF ? formData.facility || null : null,
      arrangement_fee: formData.arrangement_fee ? parseFloat(formData.arrangement_fee) : null,
    });
    setIsOpen(false);
  };

  // Only show real vehicles (not Pipeline) as target
  const targetVehicles = VEHICLES.filter(v => v.value !== 'Pipeline');

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Rocket className="h-4 w-4 mr-2" />
          Activate Loan
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Activate Pipeline Loan</DialogTitle>
          <DialogDescription>
            Move this loan from Pipeline to an active vehicle. This will create founding events and generate interest periods.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Target Vehicle */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Vehicle
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target Vehicle *</Label>
                <Select value={formData.vehicle} onValueChange={(v) => handleChange('vehicle', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {targetVehicles.map(v => (
                      <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {isTLF && (
                <div className="space-y-2">
                  <Label>Facility Name *</Label>
                  <Input
                    value={formData.facility}
                    onChange={(e) => handleChange('facility', e.target.value)}
                    placeholder="e.g., TLF_DEC_A"
                  />
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Dates */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Dates
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Loan Start Date *</Label>
                <Input
                  type="date"
                  value={formData.loan_start_date}
                  onChange={(e) => handleChange('loan_start_date', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Maturity Date</Label>
                <Input
                  type="date"
                  value={formData.maturity_date}
                  onChange={(e) => handleChange('maturity_date', e.target.value)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Financials */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Opening Balances
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Interest Rate (%) *</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={formData.interest_rate}
                  onChange={(e) => handleChange('interest_rate', e.target.value)}
                  placeholder="e.g., 8.5000"
                />
              </div>
              <div className="space-y-2">
                <Label>Interest Payments</Label>
                <Select value={formData.interest_payment_type} onValueChange={(v) => handleChange('interest_payment_type', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash (Invoiced)</SelectItem>
                    <SelectItem value="pik">PIK (Capitalized)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Outstanding (EUR) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.outstanding}
                  onChange={(e) => handleChange('outstanding', e.target.value)}
                  placeholder="Initial draw amount"
                />
              </div>
              <div className="space-y-2">
                <Label>Total Commitment (EUR)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.total_commitment}
                  onChange={(e) => handleChange('total_commitment', e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label>Commitment Fee Rate (%)</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={formData.commitment_fee_rate}
                  onChange={(e) => handleChange('commitment_fee_rate', e.target.value)}
                  placeholder="e.g., 1.0000"
                />
              </div>
              <div className="space-y-2">
                <Label>Arrangement Fee (EUR)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.arrangement_fee}
                  onChange={(e) => handleChange('arrangement_fee', e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleActivate}
            disabled={!canSubmit || activateLoan.isPending}
          >
            {activateLoan.isPending ? 'Activating...' : 'Activate Loan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Pencil, Plus, Minus, Loader2, X, ImageIcon, FileUp } from 'lucide-react';
import { useUpdateLoan } from '@/hooks/useLoans';
import { uploadLoanPhoto } from '@/lib/uploadLoanPhoto';
import { supabase } from '@/integrations/supabase/client';
import { Loan, InterestType, PaymentType, CommitmentFeeBasis, PaymentTiming, AmortizationFrequency } from '@/types/loan';
import { VEHICLES, DEFAULT_VEHICLE, vehicleRequiresFacility, isPipelineVehicle, PIPELINE_STAGES } from '@/lib/constants';
import { extractTextFromPdf } from '@/lib/pdfExtract';
import { parseLoanDocument, cleanBorrowerName, type ParsedDocumentResult } from '@/lib/parseKredietbrief';
import { cn } from '@/lib/utils';
import { addMonths, format } from 'date-fns';

interface EditLoanDialogProps {
  loan: Loan;
}

interface LoanFormData {
  borrower_name: string;
  loan_start_date: string;
  maturity_date: string;
  vehicle: string;
  facility: string;
  city: string;
  category: string;
  property_status: string;
  earmarked: boolean;
  initial_facility: string;
  red_iv_start_date: string;
  borrower_email: string;
  borrower_address: string;
  property_address: string;
  interest_rate: string;
  interest_type: InterestType;
  fee_payment_type: PaymentType;
  interest_payment_type: PaymentType;
  total_commitment: string;
  commitment_fee_rate: string;
  commitment_fee_basis: CommitmentFeeBasis;
  notice_frequency: string;
  payment_due_rule: string;
  cash_interest_percentage: string;
  guarantor: string;
  valuation: string;
  valuation_date: string;
  rental_income: string;
  remarks: string;
  google_maps_url: string;
  kadastrale_kaart_url: string;
  photo_url: string;
  additional_info: string;
  pipeline_stage: string;
  walt: string;
  walt_comment: string;
  occupancy: string;
  payment_timing: PaymentTiming;
  amortization_amount: string;
  amortization_frequency: string;
  amortization_start_date: string;
  exit_fee_terms: string;
}

export function EditLoanDialog({ loan }: EditLoanDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const updateLoan = useUpdateLoan();
  const [propertyAddresses, setPropertyAddresses] = useState<string[]>(['']);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // PDF upload & parsing state
  const [pdfFilledFields, setPdfFilledFields] = useState<Set<keyof LoanFormData>>(new Set());
  const [pdfStatus, setPdfStatus] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);
  const [pdfParsing, setPdfParsing] = useState(false);
  const durationMonthsRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedResult, setParsedResult] = useState<ParsedDocumentResult | null>(null);
  const [pendingPdfFile, setPendingPdfFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const dragCounterRef = useRef(0);

  const [formData, setFormData] = useState<LoanFormData>({
    borrower_name: '',
    loan_start_date: '',
    maturity_date: '',
    vehicle: DEFAULT_VEHICLE,
    facility: '',
    city: '',
    category: '',
    property_status: '',
    earmarked: false,
    initial_facility: '',
    red_iv_start_date: '',
    borrower_email: '',
    borrower_address: '',
    property_address: '',
    interest_rate: '',
    interest_type: 'cash_pay',
    fee_payment_type: 'pik',
    interest_payment_type: 'cash',
    total_commitment: '',
    commitment_fee_rate: '',
    commitment_fee_basis: 'undrawn_only',
    notice_frequency: 'monthly',
    payment_due_rule: '',
    cash_interest_percentage: '',
    guarantor: '',
    valuation: '',
    valuation_date: '',
    rental_income: '',
    remarks: '',
    google_maps_url: '',
    kadastrale_kaart_url: '',
    photo_url: '',
    additional_info: '',
    pipeline_stage: '',
    walt: '',
    walt_comment: '',
    occupancy: '',
    payment_timing: 'in_arrears' as PaymentTiming,
    amortization_amount: '',
    amortization_frequency: 'none',
    amortization_start_date: '',
    exit_fee_terms: '',
  });

  // Populate form when dialog opens
  useEffect(() => {
    if (isOpen && loan) {
      const addrs = loan.property_address ? loan.property_address.split('\n').filter(Boolean) : [''];
      setPropertyAddresses(addrs.length ? addrs : ['']);
      setFormData({
        borrower_name: loan.borrower_name || '',
        loan_start_date: loan.loan_start_date || '',
        maturity_date: loan.maturity_date || '',
        vehicle: loan.vehicle || DEFAULT_VEHICLE,
        facility: loan.facility || '',
        city: loan.city || '',
        category: loan.category || '',
        property_status: loan.property_status || '',
        earmarked: loan.earmarked ?? false,
        initial_facility: loan.initial_facility || '',
        red_iv_start_date: loan.red_iv_start_date || '',
        borrower_email: loan.borrower_email || '',
        borrower_address: loan.borrower_address || '',
        property_address: loan.property_address || '',
        interest_rate: loan.interest_rate != null ? (loan.interest_rate * 100).toString() : '',
        interest_type: (loan.interest_type as InterestType) || 'cash_pay',
        fee_payment_type: ((loan as any).fee_payment_type as PaymentType) || 'pik',
        interest_payment_type: ((loan as any).interest_payment_type as PaymentType) || 'cash',
        total_commitment: loan.total_commitment != null ? loan.total_commitment.toString() : '',
        commitment_fee_rate: loan.commitment_fee_rate != null ? (loan.commitment_fee_rate * 100).toString() : '',
        commitment_fee_basis: (loan.commitment_fee_basis as CommitmentFeeBasis) || 'undrawn_only',
        notice_frequency: loan.notice_frequency || 'monthly',
        payment_due_rule: loan.payment_due_rule || '',
        cash_interest_percentage: loan.cash_interest_percentage != null ? loan.cash_interest_percentage.toString() : '',
        guarantor: loan.guarantor || '',
        valuation: loan.valuation != null ? loan.valuation.toString() : '',
        valuation_date: loan.valuation_date || '',
        rental_income: loan.rental_income != null ? loan.rental_income.toString() : '',
        remarks: loan.remarks || '',
        google_maps_url: (loan as any).google_maps_url || '',
        kadastrale_kaart_url: (loan as any).kadastrale_kaart_url || '',
        photo_url: (loan as any).photo_url || '',
        additional_info: (loan as any).additional_info || '',
        pipeline_stage: (loan as any).pipeline_stage || '',
        walt: loan.walt != null ? loan.walt.toString() : '',
        walt_comment: loan.walt_comment || '',
        occupancy: loan.occupancy != null ? (loan.occupancy * 100).toString() : '',
        payment_timing: (loan as any).payment_timing || 'in_arrears',
        amortization_amount: (loan as any).amortization_amount != null ? (loan as any).amortization_amount.toString() : '',
        amortization_frequency: (loan as any).amortization_frequency || 'none',
        amortization_start_date: (loan as any).amortization_start_date || '',
        exit_fee_terms: (loan as any).exit_fee_terms || '',
      });
    }
  }, [isOpen, loan]);

  const handleChange = (field: keyof LoanFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Auto-compute maturity_date when loan_start_date changes and duration was parsed from PDF
  useEffect(() => {
    if (durationMonthsRef.current && formData.loan_start_date) {
      const start = new Date(formData.loan_start_date);
      if (!isNaN(start.getTime())) {
        const maturity = addMonths(start, durationMonthsRef.current);
        setFormData(prev => ({ ...prev, maturity_date: format(maturity, 'yyyy-MM-dd') }));
        setPdfFilledFields(prev => new Set([...prev, 'maturity_date']));
      }
    }
  }, [formData.loan_start_date]);

  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (event.target.value) event.target.value = '';

    setPendingPdfFile(file);
    setPdfStatus(null);
    setPdfFilledFields(new Set());
    setParsedResult(null);
    durationMonthsRef.current = null;
    setPdfParsing(true);

    try {
      const text = await extractTextFromPdf(file);
      const result = await parseLoanDocument(text);

      if (result.documentType === 'unknown') {
        const errorMsg = result.warnings.length > 0
          ? result.warnings[0]
          : 'Document not recognised as a kredietbrief or credit proposal.';
        setPdfStatus({ type: 'error', message: errorMsg });
        setPdfParsing(false);
        return;
      }

      setParsedResult(result);

      const filled = new Set<keyof LoanFormData>();
      const newFormData = { ...formData };

      for (const [key, value] of Object.entries(result.fields)) {
        if (key === '_duration_months') {
          durationMonthsRef.current = parseInt(value, 10);
          continue;
        }
        if (key === 'vehicle') continue;
        if (key === 'earmarked') {
          newFormData.earmarked = value === 'true';
          filled.add('earmarked');
          continue;
        }
        if (value && key in newFormData) {
          (newFormData as any)[key] = value;
          filled.add(key as keyof LoanFormData);
        }
      }

      if (durationMonthsRef.current && newFormData.loan_start_date) {
        const start = new Date(newFormData.loan_start_date);
        if (!isNaN(start.getTime())) {
          newFormData.maturity_date = format(addMonths(start, durationMonthsRef.current), 'yyyy-MM-dd');
          filled.add('maturity_date');
        }
      }

      setFormData(newFormData);
      if (newFormData.property_address) {
        setPropertyAddresses(newFormData.property_address.split('\n').filter(Boolean));
      }
      setPdfFilledFields(filled);

      const docLabel = result.documentType === 'credit_proposal' ? 'credit proposal' : 'kredietbrief';
      const fieldCount = filled.size;
      const warnCount = result.warnings.length;
      if (warnCount > 0) {
        setPdfStatus({
          type: 'warning',
          message: `Filled ${fieldCount} fields from ${docLabel}. ${warnCount} could not be parsed.`,
        });
      } else {
        setPdfStatus({
          type: 'success',
          message: `Filled ${fieldCount} fields from ${docLabel}.`,
        });
      }
    } catch (err) {
      console.error('PDF parsing failed:', err);
      const detail = err instanceof Error ? err.message : String(err);
      setPdfStatus({ type: 'error', message: `Failed to read PDF: ${detail}` });
    } finally {
      setPdfParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file?.type === 'application/pdf') {
      const dt = new DataTransfer();
      dt.items.add(file);
      if (fileInputRef.current) {
        fileInputRef.current.files = dt.files;
        fileInputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        handlePdfUpload({ target: { files: dt.files } } as any);
      }
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes('Files')) setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const pdfFieldClass = (field: keyof LoanFormData) =>
    pdfFilledFields.has(field) ? 'border-l-2 border-l-accent-sage pl-2.5' : '';

  const PdfPill = ({ field }: { field: keyof LoanFormData }) =>
    pdfFilledFields.has(field) ? (
      <span className="text-[10px] bg-accent-sage/15 text-accent-sage px-1 rounded ml-1 font-normal">PDF</span>
    ) : null;

  const parsedFieldLabels: Record<string, string> = {
    loan_number: 'Loan ID', vehicle: 'Vehicle', borrower_name: 'Borrower',
    borrower_address: 'Borrower Address', total_commitment: 'Commitment',
    interest_rate: 'Interest Rate', arrangement_fee: 'Arr. Fee',
    commitment_fee_rate: 'Commit. Fee', city: 'City', category: 'Category',
    property_status: 'Property Status', earmarked: 'Earmarked',
    property_address: 'Property Address', notice_frequency: 'Frequency',
    payment_due_rule: 'Due Rule', rental_income: 'Rental Income',
    valuation: 'Valuation', ltv: 'LTV', walt: 'WALT', occupancy: 'Occupancy',
    additional_info: 'Description', remarks: 'Remarks',
  };

  const formatParsedValue = (key: string, value: string): string => {
    if (['total_commitment', 'arrangement_fee', 'rental_income', 'valuation'].includes(key)) {
      const num = parseFloat(value);
      if (!isNaN(num)) return `€${num.toLocaleString('nl-NL')}`;
    }
    if (['interest_rate', 'commitment_fee_rate', 'ltv', 'occupancy'].includes(key)) return `${value}%`;
    if (key === 'walt') return `${value} yrs`;
    if (key === 'earmarked') return value === 'true' ? 'Yes' : 'No';
    if (key === 'additional_info' && value.length > 80) return value.slice(0, 80) + '…';
    return value;
  };

  const handleSave = async () => {
    const payload = {
      id: loan.id,
      borrower_name: formData.borrower_name,
      loan_start_date: formData.loan_start_date || null,
      maturity_date: formData.maturity_date || null,
      interest_rate: formData.interest_rate ? parseFloat(formData.interest_rate) / 100 : null,
      interest_type: formData.interest_payment_type === 'pik' ? 'pik' : 'cash_pay',
      fee_payment_type: formData.fee_payment_type,
      interest_payment_type: formData.interest_payment_type,
      total_commitment: formData.total_commitment ? parseFloat(formData.total_commitment) : null,
      commitment_fee_rate: formData.commitment_fee_rate ? parseFloat(formData.commitment_fee_rate) / 100 : null,
      commitment_fee_basis: formData.commitment_fee_basis,
      notice_frequency: formData.notice_frequency,
      payment_due_rule: formData.payment_due_rule || null,
      vehicle: formData.vehicle,
      facility: vehicleRequiresFacility(formData.vehicle) ? formData.facility || null : null,
      city: formData.city || null,
      category: formData.category || null,
      property_status: formData.property_status || null,
      earmarked: formData.earmarked,
      initial_facility: formData.initial_facility || null,
      red_iv_start_date: formData.red_iv_start_date || null,
      borrower_email: formData.borrower_email || null,
      borrower_address: formData.borrower_address || null,
      property_address: propertyAddresses.filter(a => a.trim()).join('\n') || null,
      guarantor: formData.guarantor || null,
      valuation: formData.valuation ? parseFloat(formData.valuation) : null,
      valuation_date: formData.valuation_date || null,
      rental_income: formData.rental_income ? parseFloat(formData.rental_income) : null,
      ltv: (() => {
        const val = formData.valuation ? parseFloat(formData.valuation) : 0;
        if (!val) return null;
        const commitment = formData.total_commitment ? parseFloat(formData.total_commitment) : 0;
        const outstanding = loan.outstanding ?? 0;
        return Math.max(commitment, outstanding) / val;
      })(),
      remarks: formData.remarks || null,
      cash_interest_percentage: formData.cash_interest_percentage ? parseFloat(formData.cash_interest_percentage) : null,
      google_maps_url: formData.google_maps_url || null,
      kadastrale_kaart_url: formData.kadastrale_kaart_url || null,
      photo_url: formData.photo_url || null,
      additional_info: formData.additional_info || null,
      pipeline_stage: isPipelineVehicle(formData.vehicle) ? formData.pipeline_stage || null : null,
      walt: formData.walt ? parseFloat(formData.walt) : null,
      walt_comment: formData.walt_comment || null,
      occupancy: formData.occupancy ? parseFloat(formData.occupancy) / 100 : null,
      payment_timing: formData.payment_timing,
      amortization_amount: formData.amortization_amount ? parseFloat(formData.amortization_amount) : null,
      amortization_frequency: formData.amortization_frequency && formData.amortization_frequency !== 'none' ? formData.amortization_frequency : null,
      amortization_start_date: formData.amortization_start_date || null,
      exit_fee_terms: formData.exit_fee_terms || null,
    };

    await updateLoan.mutateAsync({ id: loan.id, updates: payload as unknown as Partial<Loan> });

    // Upload the parsed PDF to loan-documents storage
    if (pendingPdfFile) {
      try {
        const filePath = `${loan.id}/${pendingPdfFile.name}`;
        await supabase.storage
          .from('loan-documents')
          .upload(filePath, pendingPdfFile, { upsert: true });
        const { data: user } = await supabase.auth.getUser();
        await supabase.from('loan_documents').insert({
          loan_id: loan.id,
          file_name: pendingPdfFile.name,
          file_path: filePath,
          file_size: pendingPdfFile.size,
          content_type: pendingPdfFile.type || 'application/pdf',
          uploaded_by: user.user!.id,
        });
      } catch (err) {
        console.error('Failed to upload PDF to documents:', err);
      }
    }

    setIsOpen(false);
  };

  const isTLF = vehicleRequiresFacility(formData.vehicle);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) {
        setPdfFilledFields(new Set());
        setPdfStatus(null);
        setParsedResult(null);
        durationMonthsRef.current = null;
        setPendingPdfFile(null);
        setDragOver(false);
        dragCounterRef.current = 0;
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="h-4 w-4 mr-2" />
          Edit Loan
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {dragOver && (
          <div className="absolute inset-0 z-50 bg-primary/5 border-2 border-dashed border-primary rounded-lg flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <FileUp className="h-10 w-10 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-primary">Drop PDF here</p>
            </div>
          </div>
        )}
        <DialogHeader>
          <DialogTitle>Edit Loan</DialogTitle>
          <DialogDescription>
            Update the loan details. Note: Loan ID cannot be changed.
          </DialogDescription>
          <div className="flex items-center gap-3 pt-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handlePdfUpload}
              className="hidden"
              id="edit-loan-pdf-upload"
            />
            <label
              htmlFor="edit-loan-pdf-upload"
              className={cn(
                'inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md border border-border cursor-pointer hover:bg-muted transition-colors',
                pdfParsing && 'opacity-50 pointer-events-none'
              )}
            >
              {pdfParsing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileUp className="h-4 w-4" />
              )}
              Upload Document
            </label>
            <div className="flex flex-col gap-0.5">
              {pdfStatus && (
                <span className={cn(
                  'text-xs',
                  pdfStatus.type === 'success' && 'text-accent-sage',
                  pdfStatus.type === 'warning' && 'text-accent-amber',
                  pdfStatus.type === 'error' && 'text-destructive',
                )}>
                  {pdfStatus.message}
                </span>
              )}
              {pendingPdfFile && (
                <span className="text-[11px] text-foreground-tertiary">
                  {pendingPdfFile.name} will be stored in documents
                </span>
              )}
            </div>
          </div>
          {parsedResult && (
            <details open className="mt-3 border border-accent-sage/40 rounded-lg overflow-hidden">
              <summary className="px-4 py-2.5 bg-accent-sage/5 cursor-pointer text-sm font-medium select-none hover:bg-accent-sage/10 transition-colors">
                Parsed from {parsedResult.documentType === 'credit_proposal' ? 'credit proposal' : 'kredietbrief'} — {Object.keys(parsedResult.fields).filter(k => !k.startsWith('_')).length} fields detected
              </summary>
              <div className="px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                {Object.entries(parsedResult.fields)
                  .filter(([key]) => !key.startsWith('_'))
                  .map(([key, value]) => (
                    <div key={key} className="flex justify-between gap-2">
                      <span className="text-foreground-secondary truncate">{parsedFieldLabels[key] || key}</span>
                      <span className="font-mono text-xs text-right shrink-0">{formatParsedValue(key, value)}</span>
                    </div>
                  ))}
                {parsedResult.warnings.map((w, i) => (
                  <div key={`warn-${i}`} className="flex justify-between gap-2 text-accent-amber">
                    <span className="truncate">{w}</span>
                    <span>—</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Identity Section */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Identity
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vehicle</Label>
                <Select 
                  value={formData.vehicle} 
                  onValueChange={(v) => handleChange('vehicle', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VEHICLES.map(v => (
                      <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {isTLF && (
                <div className="space-y-2">
                  <Label htmlFor="facility">Facility Name</Label>
                  <Input
                    id="facility"
                    value={formData.facility}
                    onChange={(e) => handleChange('facility', e.target.value)}
                    placeholder="e.g., TLF_DEC_A"
                  />
                </div>
              )}
              {isPipelineVehicle(formData.vehicle) && (
                <div className="space-y-2">
                  <Label>Pipeline Stage</Label>
                  <Select value={formData.pipeline_stage} onValueChange={(v) => handleChange('pipeline_stage', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {PIPELINE_STAGES.map(s => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="edit-initial_facility">Initial Facility</Label>
                <Input
                  id="edit-initial_facility"
                  value={formData.initial_facility}
                  onChange={(e) => handleChange('initial_facility', e.target.value)}
                  placeholder="e.g., TLFOKT25"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="borrower_name">Borrower Legal Name</Label>
                <Input
                  id="borrower_name"
                  value={formData.borrower_name}
                  onChange={(e) => handleChange('borrower_name', e.target.value)}
                  placeholder="Enter borrower name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-guarantor">Guarantor</Label>
                <Input
                  id="edit-guarantor"
                  value={formData.guarantor}
                  onChange={(e) => handleChange('guarantor', e.target.value)}
                  placeholder="e.g., Holding B.V."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loan_start_date">Loan Start Date</Label>
                <Input
                  id="loan_start_date"
                  type="date"
                  value={formData.loan_start_date}
                  onChange={(e) => handleChange('loan_start_date', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-red_iv_start_date">RED IV Start Date</Label>
                <Input
                  id="edit-red_iv_start_date"
                  type="date"
                  value={formData.red_iv_start_date}
                  onChange={(e) => handleChange('red_iv_start_date', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maturity_date">Maturity Date</Label>
                <Input
                  id="maturity_date"
                  type="date"
                  value={formData.maturity_date}
                  onChange={(e) => handleChange('maturity_date', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="e.g., Amsterdam"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  placeholder="e.g., Office, Residential"
                />
              </div>
              <div className="space-y-2">
                <Label>Property Status</Label>
                <Select
                  value={formData.property_status}
                  onValueChange={(v) => handleChange('property_status', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Leased">Leased</SelectItem>
                    <SelectItem value="Redevelopment">Redevelopment</SelectItem>
                    <SelectItem value="Development">Development</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Checkbox
                  id="edit-earmarked"
                  checked={formData.earmarked}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, earmarked: checked === true }))}
                />
                <Label htmlFor="edit-earmarked" className="cursor-pointer">Earmarked</Label>
              </div>
            </div>
          </fieldset>

          <Separator />

          {/* Payment Types Section */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Payment Types
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="interest_rate">Interest Rate (%)</Label>
                <Input
                  id="interest_rate"
                  type="number"
                  step="0.0001"
                  value={formData.interest_rate}
                  onChange={(e) => handleChange('interest_rate', e.target.value)}
                  placeholder="e.g., 8.5000"
                />
              </div>
              <div className="space-y-2">
                <Label>Interest Payments</Label>
                <Select 
                  value={formData.interest_payment_type} 
                  onValueChange={(v) => handleChange('interest_payment_type', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="pik">PIK</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {formData.interest_payment_type === 'pik'
                    ? 'Monthly interest rolled into principal'
                    : 'Monthly interest invoiced for payment'}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Arrangement Fees</Label>
                <Select
                  value={formData.fee_payment_type}
                  onValueChange={(v) => handleChange('fee_payment_type', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pik">Withheld</SelectItem>
                    <SelectItem value="cash">Cash Invoice</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {formData.fee_payment_type === 'pik'
                    ? 'Withheld from initial funding'
                    : 'Separate cash invoice to borrower'}
                </p>
              </div>
            </div>
            {formData.interest_payment_type === 'cash' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cash_interest_percentage">Cash Interest %</Label>
                  <Input
                    id="cash_interest_percentage"
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    value={formData.cash_interest_percentage}
                    onChange={(e) => handleChange('cash_interest_percentage', e.target.value)}
                    placeholder="100 (default)"
                  />
                  <p className="text-xs text-muted-foreground">
                    % of interest paid in cash. Leave empty for 100%. Remainder from interest depot.
                  </p>
                </div>
              </div>
            )}
          </fieldset>

          <Separator />

          {/* Structure Section */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Commitment Structure
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="total_commitment">Total Commitment (EUR)</Label>
                <Input
                  id="total_commitment"
                  type="number"
                  step="0.01"
                  value={formData.total_commitment}
                  onChange={(e) => handleChange('total_commitment', e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="commitment_fee_rate">Commitment Fee Rate (%)</Label>
                <Input
                  id="commitment_fee_rate"
                  type="number"
                  step="0.0001"
                  value={formData.commitment_fee_rate}
                  onChange={(e) => handleChange('commitment_fee_rate', e.target.value)}
                  placeholder="e.g., 1.0000"
                />
              </div>
              <div className="space-y-2">
                <Label>Commitment Fee Basis</Label>
                <Select 
                  value={formData.commitment_fee_basis} 
                  onValueChange={(v) => handleChange('commitment_fee_basis', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="undrawn_only">Undrawn Only</SelectItem>
                    <SelectItem value="total_commitment">Total Commitment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </fieldset>

          <Separator />

          {/* Valuation Section */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Valuation
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-valuation">Valuation (EUR)</Label>
                <Input
                  id="edit-valuation"
                  type="number"
                  step="0.01"
                  value={formData.valuation}
                  onChange={(e) => handleChange('valuation', e.target.value)}
                  placeholder="e.g., 5000000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-valuation_date">Valuation Date</Label>
                <Input
                  id="edit-valuation_date"
                  type="date"
                  value={formData.valuation_date}
                  onChange={(e) => handleChange('valuation_date', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-rental_income">Rental Income (EUR)</Label>
                <Input
                  id="edit-rental_income"
                  type="number"
                  step="0.01"
                  value={formData.rental_income}
                  onChange={(e) => handleChange('rental_income', e.target.value)}
                  placeholder="e.g., 120000"
                />
              </div>
            </div>
            {formData.valuation && (
              <p className="text-xs text-muted-foreground">
                LTV is auto-calculated as max(commitment, outstanding) / valuation
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-walt">WALT (years)</Label>
                <Input
                  id="edit-walt"
                  type="number"
                  step="0.1"
                  value={formData.walt}
                  onChange={(e) => handleChange('walt', e.target.value)}
                  placeholder="e.g., 5.2"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-walt_comment">WALT Comment</Label>
                <Input
                  id="edit-walt_comment"
                  value={formData.walt_comment}
                  onChange={(e) => handleChange('walt_comment', e.target.value)}
                  placeholder="e.g., Peildatum 01-01-2026, bron: taxatierapport"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-occupancy">Occupancy (%)</Label>
                <Input
                  id="edit-occupancy"
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={formData.occupancy}
                  onChange={(e) => handleChange('occupancy', e.target.value)}
                  placeholder="e.g., 95"
                />
              </div>
            </div>
          </fieldset>

          <Separator />

          {/* Payments & Notices Section */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Payments & Notices
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Notice Frequency</Label>
                <Select
                  value={formData.notice_frequency}
                  onValueChange={(v) => handleChange('notice_frequency', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Payment Timing</Label>
                <Select
                  value={formData.payment_timing}
                  onValueChange={(v) => handleChange('payment_timing', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_arrears">In Arrears (after period end)</SelectItem>
                    <SelectItem value="in_advance">In Advance (vooraf, at period start)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_due_rule">Payment Due Date Rule</Label>
                <Input
                  id="payment_due_rule"
                  value={formData.payment_due_rule}
                  onChange={(e) => handleChange('payment_due_rule', e.target.value)}
                  placeholder="e.g., 5 business days after period end"
                />
              </div>
            </div>
          </fieldset>

          <Separator />

          {/* Amortization Section */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Scheduled Amortization
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amortization_amount">Amount (EUR)</Label>
                <Input
                  id="amortization_amount"
                  type="number"
                  step="0.01"
                  value={formData.amortization_amount}
                  onChange={(e) => handleChange('amortization_amount', e.target.value)}
                  placeholder="e.g., 67500"
                />
              </div>
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select
                  value={formData.amortization_frequency}
                  onValueChange={(v) => handleChange('amortization_frequency', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="semi_annual">Semi-Annual</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amortization_start_date">First Payment Date</Label>
                <Input
                  id="amortization_start_date"
                  type="date"
                  value={formData.amortization_start_date}
                  onChange={(e) => handleChange('amortization_start_date', e.target.value)}
                />
              </div>
            </div>
            {formData.amortization_amount && formData.amortization_frequency && (
              <p className="text-xs text-muted-foreground">
                EUR {parseFloat(formData.amortization_amount).toLocaleString()} {formData.amortization_frequency} repayment will appear on interest notices and in totalDue.
              </p>
            )}
          </fieldset>

          <Separator />

          {/* Exit Fee Terms */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Exit Fee / Prepayment Terms
            </legend>
            <div className="space-y-2">
              <Label htmlFor="exit_fee_terms">Exit Fee Terms</Label>
              <textarea
                id="exit_fee_terms"
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.exit_fee_terms}
                onChange={(e) => handleChange('exit_fee_terms', e.target.value)}
                placeholder="e.g., Tranche 1 (25M): full remaining-term interest. Tranche 2 (2M): only if >50% per year."
                rows={3}
              />
            </div>
          </fieldset>

          <Separator />

          {/* Address Section */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Addresses & Contact
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-borrower_address">Borrower Address</Label>
                <Input
                  id="edit-borrower_address"
                  value={formData.borrower_address}
                  onChange={(e) => handleChange('borrower_address', e.target.value)}
                  placeholder="e.g., Keizersgracht 127, 1015CJ Amsterdam"
                />
              </div>
              <div className="space-y-2">
                <Label>Property Addresses</Label>
                {propertyAddresses.map((addr, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={addr}
                      onChange={(e) => {
                        const updated = [...propertyAddresses];
                        updated[idx] = e.target.value;
                        setPropertyAddresses(updated);
                      }}
                      placeholder="e.g., Oudenoord 330-340, Utrecht"
                    />
                    {propertyAddresses.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => setPropertyAddresses(propertyAddresses.filter((_, i) => i !== idx))}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-1"
                  onClick={() => setPropertyAddresses([...propertyAddresses, ''])}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Address
                </Button>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="edit-borrower_email">Borrower Email</Label>
                <Input
                  id="edit-borrower_email"
                  value={formData.borrower_email}
                  onChange={(e) => handleChange('borrower_email', e.target.value)}
                  placeholder="e.g., contact@borrower.nl; cfo@borrower.nl"
                />
              </div>
            </div>
          </fieldset>

          <Separator />

          {/* Remarks Section */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Notes
            </legend>
            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Input
                id="remarks"
                value={formData.remarks}
                onChange={(e) => handleChange('remarks', e.target.value)}
                placeholder="Any additional notes..."
              />
            </div>
          </fieldset>

          <Separator />

          {/* Property Detail Section */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Property Detail (Loan Tape)
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-google_maps_url">Google Maps URL</Label>
                <Input
                  id="edit-google_maps_url"
                  value={formData.google_maps_url}
                  onChange={(e) => handleChange('google_maps_url', e.target.value)}
                  placeholder="https://maps.app.goo.gl/..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-kadastrale_kaart_url">Kadastrale Kaart URL</Label>
                <Input
                  id="edit-kadastrale_kaart_url"
                  value={formData.kadastrale_kaart_url}
                  onChange={(e) => handleChange('kadastrale_kaart_url', e.target.value)}
                  placeholder="https://kadastralekaart.com/..."
                />
              </div>
              <div className="space-y-2">
                <Label>Property Photo</Label>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    e.target.value = '';
                    setPhotoUploading(true);
                    try {
                      const publicUrl = await uploadLoanPhoto(file, loan.loan_id || loan.id);
                      handleChange('photo_url', publicUrl);
                    } catch (err) {
                      console.error('Photo upload failed:', err);
                    } finally {
                      setPhotoUploading(false);
                    }
                  }}
                />
                {formData.photo_url ? (
                  <div className="relative w-full h-32 rounded-md overflow-hidden border border-border bg-muted">
                    <img
                      src={formData.photo_url}
                      alt="Property"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-1 right-1 flex gap-1">
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChange('photo_url', '')}
                        className="h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {photoUploading && (
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <Loader2 className="h-5 w-5 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={photoUploading}
                    className="w-full h-32 rounded-md border-2 border-dashed border-border hover:border-primary/40 bg-muted/30 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground-secondary transition-colors cursor-pointer"
                  >
                    {photoUploading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <ImageIcon className="h-6 w-6" />
                        <span className="text-xs">Click to upload photo</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-additional_info">Additional Information</Label>
              <textarea
                id="edit-additional_info"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.additional_info}
                onChange={(e) => handleChange('additional_info', e.target.value)}
                placeholder="Detailed description for loan tape..."
                rows={4}
              />
            </div>
          </fieldset>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateLoan.isPending}
          >
            {updateLoan.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

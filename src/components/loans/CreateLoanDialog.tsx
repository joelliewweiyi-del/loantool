import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Minus, FileUp, Loader2, ExternalLink, Upload, X, ImageIcon } from 'lucide-react';
import { useCreateLoan } from '@/hooks/useLoans';
import { uploadLoanPhoto } from '@/lib/uploadLoanPhoto';
import { supabase } from '@/integrations/supabase/client';
import { InterestType, PaymentType, CommitmentFeeBasis } from '@/types/loan';
import { VEHICLES, DEFAULT_VEHICLE, vehicleRequiresFacility, isPipelineVehicle, PIPELINE_STAGES } from '@/lib/constants';
import { extractTextFromPdf } from '@/lib/pdfExtract';
import { parseLoanDocument, cleanBorrowerName, type ParsedDocumentResult } from '@/lib/parseKredietbrief';
import { cn } from '@/lib/utils';
import { addMonths, format } from 'date-fns';

interface LoanFormData {
  // Identity
  loan_number: string;
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
  // Payment Types
  interest_rate: string;
  interest_type: InterestType; // Legacy field - keep for backward compatibility
  fee_payment_type: PaymentType;
  interest_payment_type: PaymentType;
  // Structure
  outstanding: string;
  total_commitment: string;
  commitment_fee_rate: string;
  commitment_fee_basis: CommitmentFeeBasis;
  // Fees
  arrangement_fee: string;
  // Valuation & Asset
  valuation: string;
  valuation_date: string;
  ltv: string;
  rental_income: string;
  walt: string;
  walt_comment: string;
  occupancy: string;
  guarantor: string;
  photo_url: string;
  // Pipeline
  pipeline_stage: string;
  // Payments & Notices
  notice_frequency: string;
  payment_due_rule: string;
  cash_interest_percentage: string;
  // Notes & Links
  remarks: string;
  additional_info: string;
  google_maps_url: string;
  kadastrale_kaart_url: string;
}

const initialFormData: LoanFormData = {
  loan_number: '',
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
  outstanding: '',
  total_commitment: '',
  commitment_fee_rate: '',
  commitment_fee_basis: 'undrawn_only',
  arrangement_fee: '',
  valuation: '',
  valuation_date: '',
  ltv: '',
  rental_income: '',
  walt: '',
  walt_comment: '',
  occupancy: '',
  guarantor: '',
  photo_url: '',
  pipeline_stage: 'prospect',
  notice_frequency: 'monthly',
  payment_due_rule: '',
  cash_interest_percentage: '',
  remarks: '',
  additional_info: '',
  google_maps_url: '',
  kadastrale_kaart_url: '',
};

export function CreateLoanDialog({ defaultVehicle }: { defaultVehicle?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<LoanFormData>({
    ...initialFormData,
    vehicle: defaultVehicle || DEFAULT_VEHICLE,
  });
  const createLoan = useCreateLoan();

  // PDF upload state
  const [pdfFilledFields, setPdfFilledFields] = useState<Set<keyof LoanFormData>>(new Set());
  const [pdfStatus, setPdfStatus] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);
  const [pdfParsing, setPdfParsing] = useState(false);
  const durationMonthsRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedResult, setParsedResult] = useState<ParsedDocumentResult | null>(null);
  const [propertyAddresses, setPropertyAddresses] = useState<string[]>(['']);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const dragCounterRef = useRef(0);
  const [pendingPdfFile, setPendingPdfFile] = useState<File | null>(null);
  // Sync vehicle when tab changes (only when dialog is closed / form is pristine)
  useEffect(() => {
    if (!isOpen && defaultVehicle) {
      setFormData(prev => ({ ...prev, vehicle: defaultVehicle }));
    }
  }, [defaultVehicle, isOpen]);

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

    // Store file for upload after loan creation
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
        // Don't override vehicle — always use the user's default (TLF)
        if (key === 'vehicle') continue;
        if (key === 'earmarked') {
          newFormData.earmarked = value === 'true';
          filled.add('earmarked');
          continue;
        }
        if (value && key in initialFormData) {
          (newFormData as any)[key] = value;
          filled.add(key as keyof LoanFormData);
        }
      }

      // If we have duration and a start date already, compute maturity
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
      // Reuse the same handler by creating a synthetic event
      const dt = new DataTransfer();
      dt.items.add(file);
      if (fileInputRef.current) {
        fileInputRef.current.files = dt.files;
        fileInputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        // Fallback: call handlePdfUpload directly
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

  const handleChange = (field: keyof LoanFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    const payload = {
      loan_id: formData.loan_number,
      borrower_name: formData.borrower_name ? cleanBorrowerName(formData.borrower_name) : '',
      loan_start_date: formData.loan_start_date || null,
      maturity_date: formData.maturity_date || null,
      interest_rate: formData.interest_rate ? parseFloat(formData.interest_rate) / 100 : null,
      interest_type: formData.interest_payment_type === 'pik' ? 'pik' : 'cash_pay', // Derive legacy field
      fee_payment_type: formData.fee_payment_type,
      interest_payment_type: formData.interest_payment_type,
      outstanding: formData.outstanding ? parseFloat(formData.outstanding) : null,
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
      initial_facility: isTLF ? (formData.facility || null) : (formData.initial_facility || null),
      red_iv_start_date: formData.red_iv_start_date || null,
      borrower_email: formData.borrower_email || null,
      borrower_address: formData.borrower_address || null,
      property_address: propertyAddresses.filter(a => a.trim()).join('\n') || null,
      arrangement_fee: formData.arrangement_fee ? parseFloat(formData.arrangement_fee) : null,
      valuation: formData.valuation ? parseFloat(formData.valuation) : null,
      valuation_date: formData.valuation_date || null,
      ltv: formData.ltv ? parseFloat(formData.ltv) / 100 : null,
      rental_income: formData.rental_income ? parseFloat(formData.rental_income) : null,
      walt: formData.walt ? parseFloat(formData.walt) : null,
      walt_comment: formData.walt_comment || null,
      occupancy: formData.occupancy ? parseFloat(formData.occupancy) / 100 : null,
      guarantor: formData.guarantor || null,
      photo_url: formData.photo_url || null,
      pipeline_stage: isPipeline ? formData.pipeline_stage : null,
      cash_interest_percentage: formData.cash_interest_percentage ? parseFloat(formData.cash_interest_percentage) : null,
      remarks: formData.remarks || null,
      additional_info: formData.additional_info || null,
      google_maps_url: formData.google_maps_url || null,
      kadastrale_kaart_url: formData.kadastrale_kaart_url || null,
    };

    const createdLoan = await createLoan.mutateAsync(payload);

    // Upload the dropped/uploaded PDF to loan-documents storage
    if (pendingPdfFile && createdLoan?.id) {
      try {
        const filePath = `${createdLoan.id}/${pendingPdfFile.name}`;
        await supabase.storage
          .from('loan-documents')
          .upload(filePath, pendingPdfFile, { upsert: true });
        const { data: user } = await supabase.auth.getUser();
        await supabase.from('loan_documents').insert({
          loan_id: createdLoan.id,
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
    setFormData({ ...initialFormData, vehicle: defaultVehicle || DEFAULT_VEHICLE });
    setPropertyAddresses(['']);
    setPdfFilledFields(new Set());
    setPdfStatus(null);
    setParsedResult(null);
    durationMonthsRef.current = null;
    setPendingPdfFile(null);
    setPhotoPreview(null);
    setPhotoUploading(false);
  };

  const isTLF = vehicleRequiresFacility(formData.vehicle);
  const isPipeline = isPipelineVehicle(formData.vehicle);
  const canSubmit = formData.loan_number && (isPipeline || formData.loan_start_date) && (!isTLF || formData.facility);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) {
        setPdfFilledFields(new Set());
        setPdfStatus(null);
        setParsedResult(null);
        durationMonthsRef.current = null;
        setPhotoPreview(null);
        setPhotoUploading(false);
      }
    }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Loan
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
          <DialogTitle>Create New Loan</DialogTitle>
          <DialogDescription>
            Enter the key loan details. All monetary values in EUR.
          </DialogDescription>
          <div className="flex items-center gap-3 pt-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handlePdfUpload}
              className="hidden"
              id="kredietbrief-upload"
            />
            <label
              htmlFor="kredietbrief-upload"
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
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Identity
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vehicle *<PdfPill field="vehicle" /></Label>
                <Select
                  value={formData.vehicle}
                  onValueChange={(v) => handleChange('vehicle', v)}
                >
                  <SelectTrigger className={pdfFieldClass('vehicle')}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VEHICLES.map(v => (
                      <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isPipeline && (
                  <p className="text-xs text-foreground-tertiary mt-1">
                    Pipeline loans are prospective deals. Convert to RED IV or TLF when the deal closes.
                  </p>
                )}
              </div>
              {isTLF && (
                <div className="space-y-2">
                  <Label htmlFor="facility">Facility Name *</Label>
                  <Input
                    id="facility"
                    value={formData.facility}
                    onChange={(e) => handleChange('facility', e.target.value)}
                    placeholder="e.g., TLF_DEC_A"
                    required
                  />
                </div>
              )}
              {isPipeline && (
                <div className="space-y-2">
                  <Label>Pipeline Stage</Label>
                  <Select value={formData.pipeline_stage} onValueChange={(v) => handleChange('pipeline_stage', v)}>
                    <SelectTrigger>
                      <SelectValue />
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
              {!isTLF && !isPipeline && (
                <div className="space-y-2">
                  <Label htmlFor="initial_facility">Initial Facility</Label>
                  <Input
                    id="initial_facility"
                    value={formData.initial_facility}
                    onChange={(e) => handleChange('initial_facility', e.target.value)}
                    placeholder="e.g., TLFOKT25"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="loan_number">Loan ID *<PdfPill field="loan_number" /></Label>
                <Input
                  id="loan_number"
                  value={formData.loan_number}
                  onChange={(e) => handleChange('loan_number', e.target.value)}
                  placeholder="e.g., 484"
                  required
                  className={pdfFieldClass('loan_number')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="borrower_name">Borrower Legal Name<PdfPill field="borrower_name" /></Label>
                <Input
                  id="borrower_name"
                  value={formData.borrower_name}
                  onChange={(e) => handleChange('borrower_name', e.target.value)}
                  onBlur={() => {
                    if (formData.borrower_name) {
                      handleChange('borrower_name', cleanBorrowerName(formData.borrower_name));
                    }
                  }}
                  placeholder="Enter borrower name"
                  className={pdfFieldClass('borrower_name')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loan_start_date">Loan Start Date{!isPipeline && ' *'}</Label>
                <Input
                  id="loan_start_date"
                  type="date"
                  value={formData.loan_start_date}
                  onChange={(e) => handleChange('loan_start_date', e.target.value)}
                  required={!isPipeline}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="red_iv_start_date">RED IV Start Date</Label>
                <Input
                  id="red_iv_start_date"
                  type="date"
                  value={formData.red_iv_start_date}
                  onChange={(e) => handleChange('red_iv_start_date', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maturity_date">Maturity Date<PdfPill field="maturity_date" /></Label>
                <Input
                  id="maturity_date"
                  type="date"
                  value={formData.maturity_date}
                  onChange={(e) => handleChange('maturity_date', e.target.value)}
                  className={pdfFieldClass('maturity_date')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City<PdfPill field="city" /></Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="e.g., Amsterdam"
                  className={pdfFieldClass('city')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category<PdfPill field="category" /></Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  placeholder="e.g., Office, Residential"
                  className={pdfFieldClass('category')}
                />
              </div>
              <div className="space-y-2">
                <Label>Property Status<PdfPill field="property_status" /></Label>
                <Select
                  value={formData.property_status}
                  onValueChange={(v) => handleChange('property_status', v)}
                >
                  <SelectTrigger className={pdfFieldClass('property_status')}>
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
                  id="earmarked"
                  checked={formData.earmarked}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, earmarked: checked === true }))}
                />
                <Label htmlFor="earmarked" className="cursor-pointer">Earmarked<PdfPill field="earmarked" /></Label>
              </div>
            </div>
          </div>

          <Separator />

          {/* Address Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Addresses & Contact
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="borrower_address">Borrower Address<PdfPill field="borrower_address" /></Label>
                <Input
                  id="borrower_address"
                  value={formData.borrower_address}
                  onChange={(e) => handleChange('borrower_address', e.target.value)}
                  placeholder="e.g., Keizersgracht 127, 1015CJ Amsterdam"
                  className={pdfFieldClass('borrower_address')}
                />
              </div>
              <div className="space-y-2">
                <Label>Property Addresses<PdfPill field="property_address" /></Label>
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
                      className={idx === 0 ? pdfFieldClass('property_address') : ''}
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
              <div className="space-y-2 col-span-2">
                <Label htmlFor="borrower_email">Borrower Email</Label>
                <Input
                  id="borrower_email"
                  value={formData.borrower_email}
                  onChange={(e) => handleChange('borrower_email', e.target.value)}
                  placeholder="e.g., contact@borrower.nl; cfo@borrower.nl"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Payment Types Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Payment Types
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="interest_rate">Interest Rate (%)<PdfPill field="interest_rate" /></Label>
                <Input
                  id="interest_rate"
                  type="number"
                  step="0.0001"
                  value={formData.interest_rate}
                  onChange={(e) => handleChange('interest_rate', e.target.value)}
                  placeholder="e.g., 8.5000"
                  className={pdfFieldClass('interest_rate')}
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
                    <SelectItem value="cash">Cash (Invoiced)</SelectItem>
                    <SelectItem value="pik">PIK (Capitalized)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {formData.interest_payment_type === 'pik'
                    ? 'Monthly interest rolled into principal'
                    : 'Monthly interest invoiced for payment'}
                </p>
              </div>
            </div>
            {formData.interest_payment_type === 'cash' && (
              <div className="grid grid-cols-3 gap-4">
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
          </div>

          <Separator />

          {/* Structure Section */}
          <div className="space-y-4">
            {!isPipeline && (
              <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-300 dark:border-orange-700 rounded-lg p-3">
                <h3 className="text-sm font-semibold text-orange-900 dark:text-orange-100 flex items-center gap-2">
                  ⚠️ Opening Balances — As of Start Date Only
                </h3>
                <p className="text-xs text-orange-800 dark:text-orange-200 mt-1">
                  <strong>Important:</strong> Only enter amounts effective on <strong>{formData.loan_start_date || 'the loan start date'}</strong>.
                  Draws, fees, or changes occurring on later dates must be added as separate events after loan creation.
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              {!isPipeline && (
                <div className="space-y-2">
                  <Label htmlFor="outstanding">Outstanding (EUR)</Label>
                  <Input
                    id="outstanding"
                    type="number"
                    step="0.01"
                    value={formData.outstanding}
                    onChange={(e) => handleChange('outstanding', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="total_commitment">Total Commitment (EUR)<PdfPill field="total_commitment" /></Label>
                <Input
                  id="total_commitment"
                  type="number"
                  step="0.01"
                  value={formData.total_commitment}
                  onChange={(e) => handleChange('total_commitment', e.target.value)}
                  placeholder="Optional"
                  className={pdfFieldClass('total_commitment')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="commitment_fee_rate">Commitment Fee Rate (%)<PdfPill field="commitment_fee_rate" /></Label>
                <Input
                  id="commitment_fee_rate"
                  type="number"
                  step="0.0001"
                  value={formData.commitment_fee_rate}
                  onChange={(e) => handleChange('commitment_fee_rate', e.target.value)}
                  placeholder="e.g., 1.0000"
                  className={pdfFieldClass('commitment_fee_rate')}
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
          </div>

          <Separator />

          {/* Valuation & Asset Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Valuation & Asset
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="valuation">Valuation (EUR)<PdfPill field="valuation" /></Label>
                <Input
                  id="valuation"
                  type="number"
                  step="0.01"
                  value={formData.valuation}
                  onChange={(e) => handleChange('valuation', e.target.value)}
                  placeholder="0"
                  className={pdfFieldClass('valuation')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valuation_date">Valuation Date</Label>
                <Input
                  id="valuation_date"
                  type="date"
                  value={formData.valuation_date}
                  onChange={(e) => handleChange('valuation_date', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ltv">LTV (%)<PdfPill field="ltv" /></Label>
                <Input
                  id="ltv"
                  type="number"
                  step="0.01"
                  value={formData.ltv}
                  onChange={(e) => handleChange('ltv', e.target.value)}
                  placeholder="e.g., 34"
                  className={pdfFieldClass('ltv')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rental_income">Rental Income (EUR/yr)<PdfPill field="rental_income" /></Label>
                <Input
                  id="rental_income"
                  type="number"
                  step="0.01"
                  value={formData.rental_income}
                  onChange={(e) => handleChange('rental_income', e.target.value)}
                  placeholder="0"
                  className={pdfFieldClass('rental_income')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="walt">WALT (years)<PdfPill field="walt" /></Label>
                <Input
                  id="walt"
                  type="number"
                  step="0.1"
                  value={formData.walt}
                  onChange={(e) => handleChange('walt', e.target.value)}
                  placeholder="e.g., 4.5"
                  className={pdfFieldClass('walt')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="occupancy">Occupancy (%)<PdfPill field="occupancy" /></Label>
                <Input
                  id="occupancy"
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={formData.occupancy}
                  onChange={(e) => handleChange('occupancy', e.target.value)}
                  placeholder="e.g., 95"
                  className={pdfFieldClass('occupancy')}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="walt_comment">WALT Comment</Label>
                <Input
                  id="walt_comment"
                  value={formData.walt_comment}
                  onChange={(e) => handleChange('walt_comment', e.target.value)}
                  placeholder="e.g., HEMA anchor tenant until 2035"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guarantor">Guarantor</Label>
                <Input
                  id="guarantor"
                  value={formData.guarantor}
                  onChange={(e) => handleChange('guarantor', e.target.value)}
                  placeholder="e.g., Personal guarantee from sponsor"
                />
              </div>
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
                    // Show local preview immediately
                    const previewUrl = URL.createObjectURL(file);
                    setPhotoPreview(previewUrl);
                    // Upload to Supabase
                    const publicUrl = await uploadLoanPhoto(file, formData.loan_number || 'new');
                    handleChange('photo_url', publicUrl);
                  } catch (err) {
                    console.error('Photo upload failed:', err);
                    setPhotoPreview(null);
                    handleChange('photo_url', '');
                  } finally {
                    setPhotoUploading(false);
                  }
                }}
              />
              {formData.photo_url || photoPreview ? (
                <div className="relative w-full h-32 rounded-md overflow-hidden border border-border bg-muted">
                  <img
                    src={formData.photo_url || photoPreview || ''}
                    alt="Property"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      handleChange('photo_url', '');
                      setPhotoPreview(null);
                    }}
                    className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
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
              {formData.photo_url && (
                <Input
                  value={formData.photo_url}
                  readOnly
                  className="text-xs text-muted-foreground"
                />
              )}
            </div>
          </div>

          <Separator />

          {/* Fees Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Fees — As of Start Date
            </h3>
            <p className="text-xs text-muted-foreground -mt-2">
              Only enter fees effective on {formData.loan_start_date || 'the loan start date'}. Fees charged on later dates must be added as separate events.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="arrangement_fee">Arrangement Fee (EUR)<PdfPill field="arrangement_fee" /></Label>
                <Input
                  id="arrangement_fee"
                  type="number"
                  step="0.01"
                  value={formData.arrangement_fee}
                  onChange={(e) => handleChange('arrangement_fee', e.target.value)}
                  placeholder="0.00"
                  className={pdfFieldClass('arrangement_fee')}
                />
                <Select 
                  value={formData.fee_payment_type} 
                  onValueChange={(v) => handleChange('fee_payment_type', v)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pik">PIK</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {formData.fee_payment_type === 'pik' 
                    ? 'Will be capitalised into principal' 
                    : 'Will be withheld from borrower'}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Payments & Notices Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Payments & Notices
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Notice Frequency<PdfPill field="notice_frequency" /></Label>
                <Select
                  value={formData.notice_frequency}
                  onValueChange={(v) => handleChange('notice_frequency', v)}
                >
                  <SelectTrigger className={pdfFieldClass('notice_frequency')}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_due_rule">Payment Due Date Rule<PdfPill field="payment_due_rule" /></Label>
                <Input
                  id="payment_due_rule"
                  value={formData.payment_due_rule}
                  onChange={(e) => handleChange('payment_due_rule', e.target.value)}
                  placeholder="e.g., 5 business days after period end"
                  className={pdfFieldClass('payment_due_rule')}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Notes & Links Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Notes & Links
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks</Label>
                <Input
                  id="remarks"
                  value={formData.remarks}
                  onChange={(e) => handleChange('remarks', e.target.value)}
                  placeholder="Short note about this loan..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="additional_info">Description<PdfPill field="additional_info" /></Label>
                <Textarea
                  id="additional_info"
                  value={formData.additional_info}
                  onChange={(e) => handleChange('additional_info', e.target.value)}
                  placeholder="Detailed loan description — auto-generated from document upload..."
                  rows={4}
                  className={pdfFieldClass('additional_info')}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="google_maps_url">Google Maps</Label>
                  <div className="flex gap-2">
                    <Input
                      id="google_maps_url"
                      value={formData.google_maps_url}
                      onChange={(e) => handleChange('google_maps_url', e.target.value)}
                      placeholder="Paste Google Maps link"
                      className="flex-1"
                    />
                    {formData.google_maps_url && (
                      <a href={formData.google_maps_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-border hover:bg-muted">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kadastrale_kaart_url">Kadasterkaart</Label>
                  <div className="flex gap-2">
                    <Input
                      id="kadastrale_kaart_url"
                      value={formData.kadastrale_kaart_url}
                      onChange={(e) => handleChange('kadastrale_kaart_url', e.target.value)}
                      placeholder="Paste Kadasterkaart link"
                      className="flex-1"
                    />
                    {formData.kadastrale_kaart_url && (
                      <a href={formData.kadastrale_kaart_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-border hover:bg-muted">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreate} 
            disabled={!canSubmit || createLoan.isPending}
          >
            {createLoan.isPending ? 'Creating...' : 'Create Loan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

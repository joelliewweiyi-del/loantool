import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle, Download } from 'lucide-react';
import { useBatchCreateLoans, BatchLoanInput, BatchCreateResult } from '@/hooks/useBatchCreateLoans';
import Papa from 'papaparse';

interface ParsedRow {
  loan_id: string;
  borrower_name: string;
  loan_start_date: string;
  maturity_date?: string;
  interest_rate?: string;
  interest_type?: string;
  outstanding?: string;
  total_commitment?: string;
  commitment_fee_rate?: string;
  commitment_fee_basis?: string;
  notice_frequency?: string;
  vehicle?: string;
  facility?: string;
  city?: string;
  category?: string;
  arrangement_fee?: string;
  payment_due_rule?: string;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

const EXPECTED_COLUMNS = [
  'loan_id',
  'borrower_name',
  'loan_start_date',
  'maturity_date',
  'interest_rate',
  'interest_type',
  'outstanding',
  'total_commitment',
  'commitment_fee_rate',
  'commitment_fee_basis',
  'notice_frequency',
  'vehicle',
  'facility',
  'city',
  'category',
  'arrangement_fee',
  'payment_due_rule',
];

const TEMPLATE_CSV = `loan_id,borrower_name,loan_start_date,maturity_date,interest_rate,interest_type,outstanding,total_commitment,commitment_fee_rate,commitment_fee_basis,notice_frequency,vehicle,facility,city,category,arrangement_fee,payment_due_rule
501,Example Borrower BV,2025-01-15,2027-01-15,8.5,cash_pay,1000000,1500000,1,undrawn_only,monthly,RED IV,,,Amsterdam,Office,25000,5 business days after period end
502,Another Borrower,2025-02-01,,10,pik,500000,,,,,TLF,TLF_DEC_A,,Rotterdam,Residential,,`;

export function BatchUploadDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [parsedLoans, setParsedLoans] = useState<BatchLoanInput[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [results, setResults] = useState<BatchCreateResult[] | null>(null);
  const [fileName, setFileName] = useState<string>('');
  
  const batchCreate = useBatchCreateLoans();

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'loan_upload_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const validateRow = (row: ParsedRow, index: number): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    if (!row.loan_id?.trim()) {
      errors.push({ row: index + 1, field: 'loan_id', message: 'Loan ID is required' });
    }
    
    if (!row.loan_start_date?.trim()) {
      errors.push({ row: index + 1, field: 'loan_start_date', message: 'Loan start date is required' });
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(row.loan_start_date.trim())) {
      errors.push({ row: index + 1, field: 'loan_start_date', message: 'Invalid date format (use YYYY-MM-DD)' });
    }

    if (row.vehicle === 'TLF' && !row.facility?.trim()) {
      errors.push({ row: index + 1, field: 'facility', message: 'Facility name required for TLF vehicle' });
    }

    if (row.interest_type && !['cash_pay', 'pik'].includes(row.interest_type.toLowerCase())) {
      errors.push({ row: index + 1, field: 'interest_type', message: 'Must be cash_pay or pik' });
    }

    return errors;
  };

  const parseNumber = (value: string | undefined): number | null => {
    if (!value?.trim()) return null;
    const num = parseFloat(value.replace(/,/g, ''));
    return isNaN(num) ? null : num;
  };

  const transformRow = (row: ParsedRow): BatchLoanInput => {
    const interestRate = parseNumber(row.interest_rate);
    const commitmentFeeRate = parseNumber(row.commitment_fee_rate);
    
    return {
      loan_id: row.loan_id.trim(),
      borrower_name: row.borrower_name?.trim() || row.loan_id.trim(),
      loan_start_date: row.loan_start_date.trim(),
      maturity_date: row.maturity_date?.trim() || null,
      interest_rate: interestRate ? interestRate / 100 : null, // Convert % to decimal
      interest_type: row.interest_type?.toLowerCase() || 'cash_pay',
      outstanding: parseNumber(row.outstanding),
      total_commitment: parseNumber(row.total_commitment),
      commitment_fee_rate: commitmentFeeRate ? commitmentFeeRate / 100 : null, // Convert % to decimal
      commitment_fee_basis: row.commitment_fee_basis?.trim() || 'undrawn_only',
      notice_frequency: row.notice_frequency?.trim() || 'monthly',
      vehicle: row.vehicle?.trim() || 'RED IV',
      facility: row.facility?.trim() || null,
      city: row.city?.trim() || null,
      category: row.category?.trim() || null,
      arrangement_fee: parseNumber(row.arrangement_fee),
      payment_due_rule: row.payment_due_rule?.trim() || null,
    };
  };

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setResults(null);
    setValidationErrors([]);

    Papa.parse<ParsedRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const allErrors: ValidationError[] = [];
        const validLoans: BatchLoanInput[] = [];

        result.data.forEach((row, index) => {
          const rowErrors = validateRow(row, index);
          if (rowErrors.length > 0) {
            allErrors.push(...rowErrors);
          } else {
            validLoans.push(transformRow(row));
          }
        });

        setValidationErrors(allErrors);
        setParsedLoans(validLoans);
      },
      error: (error) => {
        setValidationErrors([{ row: 0, field: 'file', message: `Parse error: ${error.message}` }]);
      }
    });

    // Reset input
    event.target.value = '';
  }, []);

  const handleUpload = async () => {
    if (parsedLoans.length === 0) return;
    
    const uploadResults = await batchCreate.mutateAsync(parsedLoans);
    setResults(uploadResults);
  };

  const resetState = () => {
    setParsedLoans([]);
    setValidationErrors([]);
    setResults(null);
    setFileName('');
  };

  const handleClose = () => {
    setIsOpen(false);
    resetState();
  };

  const successCount = results?.filter(r => r.success).length ?? 0;
  const failCount = results?.filter(r => !r.success).length ?? 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetState(); }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Batch Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Batch Upload Loans</DialogTitle>
          <DialogDescription>
            Upload a CSV file to create multiple loans with founding events and periods.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Template Download */}
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
            <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">Download Template</p>
              <p className="text-xs text-muted-foreground">
                Use this template to format your loan data correctly
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Template
            </Button>
          </div>

          {/* File Upload */}
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Click to upload CSV file</p>
              <p className="text-xs text-muted-foreground mt-1">
                {fileName || 'No file selected'}
              </p>
            </label>
          </div>

          {/* Column Reference */}
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              View expected columns
            </summary>
            <div className="mt-2 p-3 bg-muted/50 rounded text-xs font-mono">
              {EXPECTED_COLUMNS.join(', ')}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              <strong>Required:</strong> loan_id, loan_start_date (YYYY-MM-DD format), facility (if vehicle=TLF)<br />
              <strong>Rates:</strong> Enter as percentages (e.g., 8.5 for 8.5%)<br />
              <strong>interest_type:</strong> cash_pay or pik<br />
              <strong>vehicle:</strong> RED IV or TLF
            </p>
          </details>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-2">Validation errors found:</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {validationErrors.slice(0, 10).map((err, i) => (
                    <li key={i}>Row {err.row}: {err.field} - {err.message}</li>
                  ))}
                  {validationErrors.length > 10 && (
                    <li>...and {validationErrors.length - 10} more errors</li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Preview Table */}
          {parsedLoans.length > 0 && !results && (
            <div>
              <p className="text-sm font-medium mb-2">
                Preview ({parsedLoans.length} loans ready to create)
              </p>
              <div className="border rounded-lg overflow-auto max-h-64">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Loan ID</TableHead>
                      <TableHead>Borrower</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Outstanding</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedLoans.slice(0, 10).map((loan, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{loan.loan_id}</TableCell>
                        <TableCell>{loan.borrower_name}</TableCell>
                        <TableCell>{loan.loan_start_date}</TableCell>
                        <TableCell>{loan.vehicle}</TableCell>
                        <TableCell>{loan.outstanding?.toLocaleString() || '-'}</TableCell>
                        <TableCell>{loan.interest_rate ? `${(loan.interest_rate * 100).toFixed(2)}%` : '-'}</TableCell>
                        <TableCell>{loan.interest_type}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {parsedLoans.length > 10 && (
                  <p className="text-xs text-muted-foreground p-2 text-center">
                    ...and {parsedLoans.length - 10} more loans
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Results */}
          {results && (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                {successCount > 0 && (
                  <div className="flex items-center gap-2 text-primary">
                    <CheckCircle2 className="h-5 w-5" />
                    <span>{successCount} created successfully</span>
                  </div>
                )}
                {failCount > 0 && (
                  <div className="flex items-center gap-2 text-destructive">
                    <XCircle className="h-5 w-5" />
                    <span>{failCount} failed</span>
                  </div>
                )}
              </div>

              {failCount > 0 && (
                <div className="border rounded-lg overflow-auto max-h-48">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Loan ID</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.filter(r => !r.success).map((result, i) => (
                        <TableRow key={i}>
                          <TableCell>{result.loan_id}</TableCell>
                          <TableCell>
                            <XCircle className="h-4 w-4 text-destructive" />
                          </TableCell>
                          <TableCell className="text-sm text-destructive">{result.error}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {results ? 'Close' : 'Cancel'}
          </Button>
          {!results && (
            <Button
              onClick={handleUpload}
              disabled={parsedLoans.length === 0 || batchCreate.isPending}
            >
              {batchCreate.isPending ? 'Creating...' : `Create ${parsedLoans.length} Loans`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  useBatchUploadLoans, 
  validateAndParseLoans, 
  CSVLoanRow, 
  ParsedLoan,
  ValidationError 
} from '@/hooks/useBatchUploadLoans';
import { Upload, FileSpreadsheet, CheckCircle, XCircle, Download, AlertTriangle } from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/format';

export function BatchUploadDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const [parsedLoans, setParsedLoans] = useState<ParsedLoan[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [fileName, setFileName] = useState<string>('');
  
  const batchUpload = useBatchUploadLoans();

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    Papa.parse<CSVLoanRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const { loans, errors } = validateAndParseLoans(results.data);
        setParsedLoans(loans);
        setValidationErrors(errors);
        setStep('preview');
      },
      error: (error) => {
        setValidationErrors([{ row: 0, field: 'file', message: error.message }]);
        setStep('preview');
      },
    });
  }, []);

  const handleUpload = async () => {
    if (parsedLoans.length === 0) return;
    
    await batchUpload.mutateAsync(parsedLoans);
    setStep('result');
  };

  const handleClose = () => {
    setIsOpen(false);
    // Reset state after dialog closes
    setTimeout(() => {
      setStep('upload');
      setParsedLoans([]);
      setValidationErrors([]);
      setFileName('');
    }, 200);
  };

  const downloadTemplate = () => {
    const headers = [
      'borrower_name',
      'loan_name',
      'vehicle',
      'facility',
      'city',
      'category',
      'loan_start_date',
      'maturity_date',
      'interest_rate',
      'interest_type',
      'loan_type',
      'outstanding',
      'total_commitment',
      'commitment_fee_rate',
      'commitment_fee_basis',
      'notice_frequency',
      'payment_due_rule',
      'external_loan_id',
    ];
    
    const exampleRow = [
      'Acme Properties BV',
      'Acme Office Tower',
      'RED IV',
      '',
      'Amsterdam',
      'Office',
      '2024-01-15',
      '2029-01-15',
      '8.5%',
      'pik',
      'term_loan',
      '5000000',
      '7500000',
      '1.5%',
      'undrawn_only',
      'monthly',
      'last_business_day',
      'LOAN-001',
    ];
    
    const csv = [headers.join(','), exampleRow.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'loan_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => open ? setIsOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Batch Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {step === 'upload' && 'Upload Loans CSV'}
            {step === 'preview' && 'Preview Import'}
            {step === 'result' && 'Import Complete'}
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Upload a CSV file with loan data to batch import multiple loans.'}
            {step === 'preview' && `Review ${parsedLoans.length} loans before importing.`}
            {step === 'result' && 'Your loans have been imported.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-6 py-4">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                Upload a CSV or Excel file with loan data
              </p>
              <Input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="max-w-xs mx-auto"
              />
            </div>
            
            <div className="flex items-center justify-center">
              <Button variant="link" onClick={downloadTemplate} className="text-sm">
                <Download className="h-4 w-4 mr-2" />
                Download CSV Template
              </Button>
            </div>

            <div className="text-sm text-muted-foreground space-y-2">
              <p className="font-medium">Required columns:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><code className="bg-muted px-1 rounded">borrower_name</code> - Required for all loans</li>
                <li><code className="bg-muted px-1 rounded">facility</code> - Required for TLF vehicle</li>
              </ul>
              <p className="font-medium mt-3">Optional columns:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><code className="bg-muted px-1 rounded">vehicle</code> - "RED IV" (default) or "TLF"</li>
                <li><code className="bg-muted px-1 rounded">interest_type</code> - "cash_pay" (default) or "pik"</li>
                <li><code className="bg-muted px-1 rounded">interest_rate</code> - e.g. "8.5%" or "0.085"</li>
                <li><code className="bg-muted px-1 rounded">outstanding</code>, <code className="bg-muted px-1 rounded">total_commitment</code> - Currency amounts</li>
              </ul>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            {validationErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-2">{validationErrors.length} validation error(s):</p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {validationErrors.slice(0, 5).map((err, i) => (
                      <li key={i}>
                        Row {err.row}: {err.field} - {err.message}
                      </li>
                    ))}
                    {validationErrors.length > 5 && (
                      <li>...and {validationErrors.length - 5} more errors</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {parsedLoans.length > 0 && (
              <>
                <div className="text-sm text-muted-foreground">
                  File: <span className="font-medium">{fileName}</span> • 
                  <span className="text-green-600 ml-2">{parsedLoans.length} valid rows</span>
                  {validationErrors.length > 0 && (
                    <span className="text-destructive ml-2">{validationErrors.length} errors</span>
                  )}
                </div>
                
                <ScrollArea className="h-[400px] border rounded-md">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="text-left p-2">#</th>
                        <th className="text-left p-2">Borrower</th>
                        <th className="text-left p-2">Loan Name</th>
                        <th className="text-left p-2">Vehicle</th>
                        <th className="text-left p-2">Type</th>
                        <th className="text-right p-2">Outstanding</th>
                        <th className="text-right p-2">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedLoans.map((loan, i) => (
                        <tr key={i} className="border-b">
                          <td className="p-2 text-muted-foreground">{i + 1}</td>
                          <td className="p-2 font-medium">{loan.borrower_name}</td>
                          <td className="p-2">{loan.loan_name || '—'}</td>
                          <td className="p-2">
                            <span className="text-xs px-1.5 py-0.5 rounded bg-muted">
                              {loan.vehicle}
                            </span>
                          </td>
                          <td className="p-2">
                            {loan.interest_type === 'pik' ? (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">PIK</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">Cash</span>
                            )}
                          </td>
                          <td className="p-2 text-right font-mono">
                            {loan.outstanding ? formatCurrency(loan.outstanding) : '—'}
                          </td>
                          <td className="p-2 text-right font-mono">
                            {loan.interest_rate ? formatPercent(loan.interest_rate, 2) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              </>
            )}
          </div>
        )}

        {step === 'result' && batchUpload.data && (
          <div className="py-8 text-center space-y-4">
            {batchUpload.data.failed === 0 ? (
              <>
                <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
                <p className="text-xl font-medium">
                  Successfully imported {batchUpload.data.success} loans
                </p>
              </>
            ) : (
              <>
                <AlertTriangle className="h-16 w-16 mx-auto text-amber-500" />
                <p className="text-xl font-medium">
                  {batchUpload.data.success} imported, {batchUpload.data.failed} failed
                </p>
                {batchUpload.data.errors.length > 0 && (
                  <div className="text-left mt-4 p-4 bg-destructive/10 rounded-md">
                    <p className="text-sm font-medium text-destructive mb-2">Errors:</p>
                    <ul className="text-sm text-destructive space-y-1">
                      {batchUpload.data.errors.slice(0, 5).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <DialogFooter>
          {step === 'upload' && (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}
          
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button 
                onClick={handleUpload} 
                disabled={parsedLoans.length === 0 || batchUpload.isPending}
              >
                {batchUpload.isPending ? 'Importing...' : `Import ${parsedLoans.length} Loans`}
              </Button>
            </>
          )}
          
          {step === 'result' && (
            <Button onClick={handleClose}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

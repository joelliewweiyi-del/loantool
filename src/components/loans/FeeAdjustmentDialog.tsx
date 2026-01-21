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
  useBatchFeeAdjustment, 
  validateAndParseFees, 
  CSVFeeRow, 
  ParsedFeeAdjustment,
  FeeValidationError 
} from '@/hooks/useBatchFeeAdjustment';
import { Settings2, FileSpreadsheet, CheckCircle, Download, AlertTriangle, Info } from 'lucide-react';
import { formatCurrency } from '@/lib/format';

export function FeeAdjustmentDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const [parsedAdjustments, setParsedAdjustments] = useState<ParsedFeeAdjustment[]>([]);
  const [validationErrors, setValidationErrors] = useState<FeeValidationError[]>([]);
  const [fileName, setFileName] = useState<string>('');
  
  const batchAdjust = useBatchFeeAdjustment();

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    Papa.parse<CSVFeeRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const { adjustments, errors } = validateAndParseFees(results.data);
        setParsedAdjustments(adjustments);
        setValidationErrors(errors);
        setStep('preview');
      },
      error: (error) => {
        setValidationErrors([{ row: 0, field: 'file', message: error.message }]);
        setStep('preview');
      },
    });
  }, []);

  const handleAdjust = async () => {
    if (parsedAdjustments.length === 0) return;
    
    await batchAdjust.mutateAsync(parsedAdjustments);
    setStep('result');
  };

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => {
      setStep('upload');
      setParsedAdjustments([]);
      setValidationErrors([]);
      setFileName('');
    }, 200);
  };

  const downloadTemplate = () => {
    const headers = ['loan_id', 'arrangement_fee'];
    const exampleRows = [
      ['504', '70000'],
      ['505', '85000'],
    ];
    
    const csv = [headers.join(','), ...exampleRows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fee_adjustment_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => open ? setIsOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="h-4 w-4 mr-2" />
          Adjust Fees
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {step === 'upload' && 'Split Arrangement Fees'}
            {step === 'preview' && 'Preview Adjustments'}
            {step === 'result' && 'Adjustment Complete'}
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Upload a CSV to split founding principal draws into net cash + capitalized arrangement fees.'}
            {step === 'preview' && `Review ${parsedAdjustments.length} fee adjustments before applying.`}
            {step === 'result' && 'Your adjustments have been applied to the event ledger.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-6 py-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                This tool adjusts loans where the full principal was uploaded, but part of it was actually an arrangement fee (afsluitprovisie) withheld at funding.
                <br /><br />
                <strong>What happens:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Creates a reversing repayment for the fee amount</li>
                  <li>Creates a <code className="bg-muted px-1 rounded">fee_invoice</code> event with PIK capitalization</li>
                  <li>Net result: Outstanding stays the same, but ledger shows the breakdown</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                Upload a CSV with loan_id and arrangement_fee columns
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
                <li><code className="bg-muted px-1 rounded">loan_id</code> - The loan identifier (e.g. 504)</li>
                <li><code className="bg-muted px-1 rounded">arrangement_fee</code> - Fee amount to split out (e.g. 70000)</li>
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

            {parsedAdjustments.length > 0 && (
              <>
                <div className="text-sm text-muted-foreground">
                  File: <span className="font-medium">{fileName}</span> • 
                  <span className="text-green-600 ml-2">{parsedAdjustments.length} valid rows</span>
                  {validationErrors.length > 0 && (
                    <span className="text-destructive ml-2">{validationErrors.length} errors</span>
                  )}
                </div>
                
                <ScrollArea className="h-[300px] border rounded-md">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="text-left p-2">Loan ID</th>
                        <th className="text-right p-2">Arrangement Fee</th>
                        <th className="text-left p-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedAdjustments.map((adj, i) => (
                        <tr key={i} className="border-b">
                          <td className="p-2 font-medium">{adj.loan_id}</td>
                          <td className="p-2 text-right font-mono">
                            {formatCurrency(adj.arrangement_fee)}
                          </td>
                          <td className="p-2 text-xs text-muted-foreground">
                            Split from principal draw → Fee invoice (PIK)
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    This will create 2 new events per loan: a reversing repayment and a fee_invoice with PIK capitalization.
                    The net outstanding balance will remain unchanged.
                  </AlertDescription>
                </Alert>
              </>
            )}
          </div>
        )}

        {step === 'result' && batchAdjust.data && (
          <div className="py-8 text-center space-y-4">
            {batchAdjust.data.failed === 0 ? (
              <>
                <CheckCircle className="h-16 w-16 mx-auto text-primary" />
                <p className="text-xl font-medium">
                  Successfully adjusted {batchAdjust.data.success} loans
                </p>
                <p className="text-sm text-muted-foreground">
                  Each loan now shows the arrangement fee breakdown in the Event Ledger.
                </p>
              </>
            ) : (
              <>
                <AlertTriangle className="h-16 w-16 mx-auto text-amber-500" />
                <p className="text-xl font-medium">
                  {batchAdjust.data.success} adjusted, {batchAdjust.data.failed} failed
                </p>
                {batchAdjust.data.errors.length > 0 && (
                  <Alert variant="destructive" className="text-left mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <ul className="text-sm space-y-1">
                        {batchAdjust.data.errors.slice(0, 5).map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
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
                onClick={handleAdjust} 
                disabled={parsedAdjustments.length === 0 || batchAdjust.isPending}
              >
                {batchAdjust.isPending ? 'Adjusting...' : `Adjust ${parsedAdjustments.length} Loans`}
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

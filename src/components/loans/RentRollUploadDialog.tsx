import { useState, useCallback } from 'react';
import { useUploadRentRoll } from '@/hooks/useCovenants';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, FileSpreadsheet } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import * as XLSX from 'xlsx';

interface RentRollUploadDialogProps {
  submissionId: string;
  loanId: string;
  periodLabel: string;
}

interface ParsedEntry {
  tenant_name: string | null;
  lease_start: string | null;
  lease_end: string | null;
  notice_period: string | null;
  renewal_period: string | null;
  sqm: number | null;
  annual_rent: number | null;
  notes: string | null;
}

function excelDateToString(serial: number): string | null {
  if (!serial || serial < 1) return null;
  // Excel serial date: days since 1900-01-01 (with the 1900 leap year bug)
  const date = new Date((serial - 25569) * 86400 * 1000);
  return date.toISOString().split('T')[0];
}

function parseValue(val: any): string | null {
  if (val === undefined || val === null || val === '') return null;
  return String(val).trim();
}

function parseNumber(val: any): number | null {
  if (val === undefined || val === null || val === '') return null;
  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^\d.-]/g, ''));
  return isNaN(n) ? null : n;
}

function parseDate(val: any): string | null {
  if (val === undefined || val === null || val === '') return null;
  if (typeof val === 'number') return excelDateToString(val);
  const s = String(val).trim();
  // Try ISO format
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
  // Try dd-mm-yyyy or dd/mm/yyyy
  const m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}

function parseExcel(data: ArrayBuffer): ParsedEntry[] {
  const wb = XLSX.read(data, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

  // Find header row (contains "Huurder" or "tenant")
  let headerIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i] as any[];
    if (row && row.some(c => String(c ?? '').toLowerCase().includes('huurder'))) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) headerIdx = 2; // Default: row 3 (0-indexed)

  const entries: ParsedEntry[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i] as any[];
    if (!row || row.length < 3) continue;

    // Columns: #, Huurder, Start, Eind, Opzegtermijn, Verlenging, M², Contracthuur, WALT, Opmerking
    const tenantName = parseValue(row[1]);
    if (!tenantName) continue; // Skip empty rows

    entries.push({
      tenant_name: tenantName,
      lease_start: parseDate(row[2]),
      lease_end: parseDate(row[3]),
      notice_period: parseValue(row[4]),
      renewal_period: parseValue(row[5]),
      sqm: parseNumber(row[6]),
      annual_rent: parseNumber(row[7]),
      // Skip row[8] = WALT (calculated)
      notes: parseValue(row[9]),
    });
  }
  return entries;
}

export function RentRollUploadDialog({ submissionId, loanId, periodLabel }: RentRollUploadDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [entries, setEntries] = useState<ParsedEntry[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const uploadRentRoll = useUploadRentRoll();

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const data = await file.arrayBuffer();
    const parsed = parseExcel(data);
    setEntries(parsed);
  }, []);

  const handleUpload = async () => {
    await uploadRentRoll.mutateAsync({
      submissionId,
      loanId,
      entries,
    });
    setIsOpen(false);
    setEntries([]);
    setFileName(null);
  };

  const totalRent = entries.reduce((sum, e) => sum + (e.annual_rent ?? 0), 0);
  const totalSqm = entries.reduce((sum, e) => sum + (e.sqm ?? 0), 0);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button className="text-xs text-primary hover:underline">
          Upload rent roll
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Rent Roll — {periodLabel}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center gap-3">
            <label className="cursor-pointer flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded-md hover:bg-muted/50 transition-colors">
              <FileSpreadsheet className="h-4 w-4 text-foreground-secondary" />
              <span className="text-sm text-foreground-secondary">
                {fileName ?? 'Choose Excel file (.xlsx)'}
              </span>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFile}
                className="hidden"
              />
            </label>
          </div>

          {entries.length > 0 && (
            <>
              <div className="text-xs text-foreground-secondary">
                {entries.length} tenants parsed — Total rent: {formatCurrency(totalRent)} — Total area: {totalSqm.toLocaleString()} m²
              </div>
              <table className="data-table text-xs">
                <thead>
                  <tr>
                    <th>Tenant</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>m²</th>
                    <th>Annual Rent</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, i) => (
                    <tr key={i}>
                      <td>{entry.tenant_name || '—'}</td>
                      <td className="font-mono">{entry.lease_start || '—'}</td>
                      <td className="font-mono">{entry.lease_end || '—'}</td>
                      <td className="font-mono text-right">{entry.sqm?.toLocaleString() ?? '—'}</td>
                      <td className="font-mono text-right">{entry.annual_rent ? formatCurrency(entry.annual_rent) : '—'}</td>
                      <td className="text-foreground-muted truncate max-w-[150px]">{entry.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button
            onClick={handleUpload}
            disabled={entries.length === 0 || uploadRentRoll.isPending}
          >
            {uploadRentRoll.isPending ? (
              <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Uploading...</>
            ) : (
              <><Upload className="h-4 w-4 mr-1" /> Upload {entries.length} entries</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

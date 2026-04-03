import { useState } from 'react';
import { useLoans } from '@/hooks/useLoans';
import { useAllRentRollIncomes } from '@/hooks/useCovenants';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, FileSpreadsheet, Loader2, Table2, DatabaseZap, FileText, PackageOpen, Building2, Globe } from 'lucide-react';
import { RentRollPanel } from '@/components/loans/RentRollPanel';
import { supabase } from '@/integrations/supabase/client';
import {
  downloadSummaryLoanTapeXlsx,
  downloadDetailedLoanTapeXlsx,
  downloadInvestorPortalCsv,
  downloadFullExportXlsx,
  LoanWithEvents,
} from '@/lib/exportLoanTape';
import { getCurrentDateString } from '@/lib/simulatedDate';
import { LoanEvent } from '@/types/loan';
import { VEHICLES, DEFAULT_VEHICLE, type Vehicle } from '@/lib/constants';
import { generateInfoPack, generateTranslationPack } from '@/lib/infoPack';
import { toast } from 'sonner';

type ExportType = 'summary' | 'detailed' | 'csv' | 'full';

export default function Export() {
  const [activeVehicle, setActiveVehicle] = useState<Vehicle | 'all'>('all');
  const { data: loans, isLoading } = useLoans();
  const { data: rentRollIncomes } = useAllRentRollIncomes();
  const [exporting, setExporting] = useState<ExportType | null>(null);
  const [infoPackLoading, setInfoPackLoading] = useState(false);
  const [translationPackLoading, setTranslationPackLoading] = useState(false);

  const handleInfoPack = async () => {
    const allLoans = loans || [];
    const earmarked = allLoans.filter(l => (l as any).earmarked);
    const nonEarmarked = allLoans.filter(l => !(l as any).earmarked);
    if (allLoans.length === 0) {
      toast.error('No loans found');
      return;
    }
    setInfoPackLoading(true);
    try {
      const loanDisplayIds: Record<string, string> = {};
      for (const l of allLoans) {
        loanDisplayIds[l.id] = (l as any).loan_id || l.id;
      }
      const blob = await generateInfoPack({
        earmarkedIds: earmarked.map(l => l.id),
        nonEarmarkedIds: nonEarmarked.map(l => l.id),
        loanDisplayIds,
        onProgress: (current, total) => {
          toast.loading(`Downloading files... ${current}/${total}`, { id: 'info-pack' });
        },
      });
      toast.success(`Info pack ready (${earmarked.length} earmarked, ${nonEarmarked.length} non-earmarked)`, { id: 'info-pack' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `info-pack-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate info pack', { id: 'info-pack' });
    } finally {
      setInfoPackLoading(false);
    }
  };

  const handleTranslationPack = async () => {
    const earmarked = (loans || []).filter(l => (l as any).earmarked);
    if (earmarked.length === 0) {
      toast.error('No earmarked loans found');
      return;
    }
    setTranslationPackLoading(true);
    try {
      const loanDisplayIds: Record<string, string> = {};
      for (const l of earmarked) {
        loanDisplayIds[l.id] = (l as any).loan_id || l.id;
      }
      const blob = await generateTranslationPack({
        loanIds: earmarked.map(l => l.id),
        loanDisplayIds,
        onProgress: (current, total) => {
          toast.loading(`Downloading translations... ${current}/${total}`, { id: 'translation-pack' });
        },
      });
      toast.success('Translation pack ready', { id: 'translation-pack' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `translations-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate translation pack', { id: 'translation-pack' });
    } finally {
      setTranslationPackLoading(false);
    }
  };

  const vehicleLoans = (loans || []).filter(
    (l) => activeVehicle === 'all' || l.vehicle === activeVehicle
  );

  const handleExport = async (type: ExportType) => {
    if (!vehicleLoans.length) return;
    setExporting(type);
    try {
      const loanIds = vehicleLoans.map((l) => l.id);
      const { data: events } = await supabase
        .from('loan_events')
        .select('*')
        .in('loan_id', loanIds)
        .eq('status', 'approved');

      const asOfDate = getCurrentDateString();
      const loansWithEvents: LoanWithEvents[] = vehicleLoans.map((loan) => ({
        loan,
        events: ((events || []) as unknown as LoanEvent[]).filter(
          (e) => e.loan_id === loan.id
        ),
      }));

      const label = activeVehicle === 'all' ? 'All' : activeVehicle;

      if (type === 'summary') {
        await downloadSummaryLoanTapeXlsx(loansWithEvents, asOfDate, label, rentRollIncomes);
      } else if (type === 'detailed') {
        await downloadDetailedLoanTapeXlsx(loansWithEvents, asOfDate, label, rentRollIncomes);
      } else if (type === 'csv') {
        downloadInvestorPortalCsv(loansWithEvents, asOfDate, rentRollIncomes);
      } else {
        await downloadFullExportXlsx(loansWithEvents, asOfDate, label, rentRollIncomes);
      }
    } finally {
      setExporting(null);
    }
  };

  const exports: Array<{
    type: ExportType;
    title: string;
    description: string;
    columns: number;
    icon: typeof FileSpreadsheet;
  }> = [
    {
      type: 'summary',
      title: 'Summary Tape',
      description:
        'Split by Income Producing / Non-Income Producing with subtotals. Core loan metrics only.',
      columns: 16,
      icon: FileSpreadsheet,
    },
    {
      type: 'detailed',
      title: 'Detailed Tape',
      description:
        'Full operational view including facility info, valuation dates, and property links.',
      columns: 24,
      icon: Table2,
    },
    {
      type: 'full',
      title: 'Full Database Export',
      description:
        'All loan fields including borrower contact info, AFAS codes, and property addresses.',
      columns: 39,
      icon: DatabaseZap,
    },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Export Loan Tapes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Download loan portfolio data in different formats.
          </p>
        </div>
        <RentRollPanel />
      </div>

      <Tabs
        value={activeVehicle}
        onValueChange={(v) => setActiveVehicle(v as Vehicle | 'all')}
      >
        <TabsList>
          {VEHICLES.map((v) => (
            <TabsTrigger key={v.value} value={v.value}>
              {v.label}
            </TabsTrigger>
          ))}
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      <p className="text-sm text-muted-foreground">
        {isLoading
          ? 'Loading loans...'
          : `${vehicleLoans.length} loans selected (${activeVehicle === 'all' ? 'all vehicles' : activeVehicle})`}
      </p>

      <div className="grid gap-4">
        {exports.map((exp) => {
          const isActive = exporting === exp.type;
          const Icon = exp.icon;

          return (
            <Card key={exp.type}>
              <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-3">
                <div className="rounded-md border p-2">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base">{exp.title}</CardTitle>
                  <CardDescription className="mt-1">{exp.description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between pt-0">
                <span className="text-xs text-muted-foreground">{exp.columns} columns</span>
                <div className="flex gap-2">
                  {exp.type === 'detailed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleExport('csv')}
                      disabled={!!exporting || isLoading || !vehicleLoans.length}
                    >
                      {exporting === 'csv' ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <FileText className="h-4 w-4 mr-2" />
                      )}
                      {exporting === 'csv' ? 'Exporting...' : '.csv'}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => handleExport(exp.type)}
                    disabled={!!exporting || isLoading || !vehicleLoans.length}
                  >
                    {isActive ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    {isActive ? 'Exporting...' : 'Download'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Info Pack — earmarked loans document bundle */}
        <Card>
          <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-3">
            <div className="rounded-md border p-2">
              <PackageOpen className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base">Info Pack</CardTitle>
              <CardDescription className="mt-1">
                Download all uploaded documents as a zip file, split into Earmarked and Non-Earmarked sections.
                Folder structure: Section / Loan ID / filename.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex items-center justify-between pt-0">
            <span className="text-xs text-muted-foreground">
              {(loans || []).filter(l => (l as any).earmarked).length} earmarked · {(loans || []).filter(l => !(l as any).earmarked).length} non-earmarked
            </span>
            <Button
              size="sm"
              onClick={handleInfoPack}
              disabled={infoPackLoading || isLoading}
            >
              {infoPackLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {infoPackLoading ? 'Packing...' : 'Download'}
            </Button>
          </CardContent>
        </Card>

        {/* English Translations zip */}
        <Card>
          <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-3">
            <div className="rounded-md border p-2">
              <Globe className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base">English Translations</CardTitle>
              <CardDescription className="mt-1">
                Download all -EN.html translation files for earmarked loans as a single zip.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex items-center justify-between pt-0">
            <span className="text-xs text-muted-foreground">
              {(loans || []).filter(l => (l as any).earmarked).length} earmarked loans
            </span>
            <Button
              size="sm"
              onClick={handleTranslationPack}
              disabled={translationPackLoading || isLoading}
            >
              {translationPackLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {translationPackLoading ? 'Packing...' : 'Download'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

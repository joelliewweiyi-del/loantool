import { useState } from 'react';
import { useLoans } from '@/hooks/useLoans';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, FileSpreadsheet, Loader2, Table2, DatabaseZap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  downloadSummaryLoanTapeXlsx,
  downloadDetailedLoanTapeXlsx,
  downloadFullExportXlsx,
  LoanWithEvents,
} from '@/lib/exportLoanTape';
import { getCurrentDateString } from '@/lib/simulatedDate';
import { LoanEvent } from '@/types/loan';
import { VEHICLES, DEFAULT_VEHICLE, type Vehicle } from '@/lib/constants';

type ExportType = 'summary' | 'detailed' | 'full';

export default function Export() {
  const [activeVehicle, setActiveVehicle] = useState<Vehicle | 'all'>(DEFAULT_VEHICLE);
  const { data: loans, isLoading } = useLoans();
  const [exporting, setExporting] = useState<ExportType | null>(null);

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
        await downloadSummaryLoanTapeXlsx(loansWithEvents, asOfDate, label);
      } else if (type === 'detailed') {
        await downloadDetailedLoanTapeXlsx(loansWithEvents, asOfDate, label);
      } else {
        await downloadFullExportXlsx(loansWithEvents, asOfDate, label);
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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Export Loan Tapes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Download loan portfolio data in different formats.
        </p>
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
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

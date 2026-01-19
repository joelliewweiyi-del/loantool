import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, FileText, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useState } from "react";

interface AfasInvoice {
  InvoiceNr?: string;
  DebtorId?: string;
  DebtorName?: string;
  InvoiceDate?: string;
  DueDate?: string;
  Amount?: number;
  OpenAmount?: number;
  Description?: string;
  GlAccount?: string;
  Gl?: string;
  [key: string]: unknown;
}

interface AfasResponse {
  success: boolean;
  total_in_afas: number;
  filtered_count: number;
  gl_code_filter: string;
  available_fields: string[];
  invoices: AfasInvoice[];
  error?: string;
}

const GL_CODE_LABELS: Record<string, string> = {
  '9350': 'Rente regulier',
  '9351': 'Rente commitment',
  '9352': 'Exit fee',
  '9353': 'Boete late betalingen',
  '8170': 'Afsluitprovisie',
  '1750': 'Leningen',
  '1751': 'Leningen commitment',
};

export default function AfasInvoices() {
  const [showAll, setShowAll] = useState(false);

  const { data, isLoading, error, refetch, isFetching } = useQuery<AfasResponse>({
    queryKey: ['afas-invoices', showAll],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-afas-invoices', {
        body: {},
        method: 'GET',
      });
      
      // Try with query params
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-afas-invoices?show_all=${showAll}`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch AFAS invoices');
      }
      
      return response.json();
    },
  });

  const totalAmount = data?.invoices?.reduce((sum, inv) => sum + (inv.Amount || 0), 0) || 0;
  const totalOpen = data?.invoices?.reduce((sum, inv) => sum + (inv.OpenAmount || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AFAS Invoices</h1>
          <p className="text-muted-foreground">
            Direct view of booked invoices in AFAS Profit
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="show-all"
              checked={showAll}
              onCheckedChange={setShowAll}
            />
            <Label htmlFor="show-all">Show all GL codes</Label>
          </div>
          <Button onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Invoices</CardDescription>
            <CardTitle className="text-2xl">
              {isLoading ? <Skeleton className="h-8 w-16" /> : data?.filtered_count || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {data?.total_in_afas ? `of ${data.total_in_afas} total in AFAS` : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Invoiced</CardDescription>
            <CardTitle className="text-2xl">
              {isLoading ? <Skeleton className="h-8 w-24" /> : formatCurrency(totalAmount)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Open</CardDescription>
            <CardTitle className="text-2xl">
              {isLoading ? <Skeleton className="h-8 w-24" /> : formatCurrency(totalOpen)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>GL Code Filter</CardDescription>
            <CardTitle className="text-lg">
              {isLoading ? (
                <Skeleton className="h-6 w-20" />
              ) : showAll ? (
                'All codes'
              ) : (
                <span>{data?.gl_code_filter} - {GL_CODE_LABELS[data?.gl_code_filter || ''] || 'Unknown'}</span>
              )}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Available Fields Debug Info */}
      {data?.available_fields && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Available AFAS Fields
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {data.available_fields.map((field) => (
                <Badge key={field} variant="outline" className="text-xs">
                  {field}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Error Loading AFAS Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
          </CardContent>
        </Card>
      )}

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>
            {showAll ? 'All invoices from AFAS' : 'Interest invoices (GL 9350 - Rente regulier)'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : data?.invoices && data.invoices.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice Nr</TableHead>
                    <TableHead>Debtor</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>GL Code</TableHead>
                    <TableHead>Invoice Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Open</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.invoices.map((invoice, idx) => {
                    const glCode = invoice.GlAccount?.toString() || invoice.Gl?.toString() || '';
                    return (
                      <TableRow key={invoice.InvoiceNr || idx}>
                        <TableCell className="font-mono">{invoice.InvoiceNr || '-'}</TableCell>
                        <TableCell>
                          <div>
                            <span className="font-medium">{invoice.DebtorId}</span>
                            {invoice.DebtorName && (
                              <span className="text-muted-foreground ml-2 text-sm">
                                {invoice.DebtorName}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate" title={invoice.Description}>
                          {invoice.Description || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {glCode}
                            {GL_CODE_LABELS[glCode] && (
                              <span className="ml-1 text-muted-foreground">
                                ({GL_CODE_LABELS[glCode]})
                              </span>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>{invoice.InvoiceDate?.substring(0, 10) || '-'}</TableCell>
                        <TableCell>{invoice.DueDate?.substring(0, 10) || '-'}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(invoice.Amount || 0)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {invoice.OpenAmount !== undefined && invoice.OpenAmount !== null
                            ? formatCurrency(invoice.OpenAmount)
                            : '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No invoices found in AFAS</p>
              {!showAll && (
                <p className="text-sm mt-2">Try enabling "Show all GL codes" to see all invoices</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

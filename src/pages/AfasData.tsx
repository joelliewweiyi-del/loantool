import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Database, FileText, BookOpen, Receipt, AlertCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

interface ConnectorData {
  success: boolean;
  connector?: string;
  data?: Record<string, unknown>[];
  schema?: { fields?: { fieldId: string; dataType: string; label?: string }[] };
  error?: string;
  count?: number;
}

const CONNECTORS = [
  { id: 'Profit_Debtor_Invoices', name: 'Debtor Invoices', icon: Receipt, description: 'Open debtor invoices from AFAS' },
  { id: 'profit_transactions', name: 'Transactions', icon: FileText, description: 'Financial transactions' },
  { id: 'profit_journals', name: 'Journals', icon: BookOpen, description: 'Journal entries' },
];

function ConnectorSection({ connectorId, connectorName, icon: Icon, description }: { 
  connectorId: string; 
  connectorName: string; 
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}) {
  const [schemaOpen, setSchemaOpen] = useState(false);

  const { data, isLoading, error, refetch, isFetching } = useQuery<ConnectorData>({
    queryKey: ['afas-connector', connectorId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('test-afas-read', {
        body: { connector: connectorId }
      });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const records = data?.data || [];
  const schema = data?.schema?.fields || [];

  // Get all unique keys from the data
  const allKeys = records.length > 0 
    ? [...new Set(records.flatMap(record => Object.keys(record)))]
    : [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{connectorName}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {data?.success && (
              <Badge variant="secondary">{records.length} records</Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : error || !data?.success ? (
          <div className="flex items-center gap-2 text-destructive p-4 bg-destructive/10 rounded-lg">
            <AlertCircle className="h-5 w-5" />
            <span>{data?.error || (error as Error)?.message || 'Failed to fetch data'}</span>
          </div>
        ) : (
          <>
            {/* Schema Info */}
            {schema.length > 0 && (
              <Collapsible open={schemaOpen} onOpenChange={setSchemaOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Schema ({schema.length} fields)
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${schemaOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 p-3 bg-muted rounded-lg">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
                      {schema.map((field) => (
                        <div key={field.fieldId} className="p-2 bg-background rounded border">
                          <div className="font-mono font-medium truncate" title={field.fieldId}>
                            {field.fieldId}
                          </div>
                          <div className="text-muted-foreground flex items-center gap-1">
                            <Badge variant="outline" className="text-[10px] px-1">
                              {field.dataType}
                            </Badge>
                            {field.label && (
                              <span className="truncate" title={field.label}>{field.label}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Data Table */}
            {records.length > 0 ? (
              <ScrollArea className="h-[400px] rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {allKeys.slice(0, 10).map((key) => (
                        <TableHead key={key} className="whitespace-nowrap font-mono text-xs">
                          {key}
                        </TableHead>
                      ))}
                      {allKeys.length > 10 && (
                        <TableHead className="text-muted-foreground">
                          +{allKeys.length - 10} more
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record, idx) => (
                      <TableRow key={idx}>
                        {allKeys.slice(0, 10).map((key) => (
                          <TableCell key={key} className="font-mono text-xs whitespace-nowrap max-w-[200px] truncate">
                            {formatCellValue(record[key])}
                          </TableCell>
                        ))}
                        {allKeys.length > 10 && (
                          <TableCell className="text-muted-foreground text-xs">...</TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No records found
              </div>
            )}

            {/* Raw JSON Preview */}
            {records.length > 0 && (
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between">
                    <span>Raw JSON (first record)</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ScrollArea className="h-[200px] mt-2">
                    <pre className="p-3 bg-muted rounded-lg text-xs font-mono overflow-auto">
                      {JSON.stringify(records[0], null, 2)}
                    </pre>
                  </ScrollArea>
                </CollapsibleContent>
              </Collapsible>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') {
    // Format as currency if it looks like a money value
    if (Math.abs(value) >= 100) {
      return new Intl.NumberFormat('nl-NL', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      }).format(value);
    }
    return value.toString();
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export default function AfasData() {
  const [activeTab, setActiveTab] = useState(CONNECTORS[0].id);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AFAS Data Explorer</h1>
          <p className="text-muted-foreground">
            Browse raw data from all available AFAS connectors
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          Environment: 36537
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          {CONNECTORS.map((connector) => (
            <TabsTrigger key={connector.id} value={connector.id} className="flex items-center gap-2">
              <connector.icon className="h-4 w-4" />
              {connector.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {CONNECTORS.map((connector) => (
          <TabsContent key={connector.id} value={connector.id} className="mt-4">
            <ConnectorSection
              connectorId={connector.id}
              connectorName={connector.name}
              icon={connector.icon}
              description={connector.description}
            />
          </TabsContent>
        ))}
      </Tabs>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Available Fields Summary</CardTitle>
          <CardDescription>
            Key fields identified across connectors for loan matching
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium text-sm mb-2">Debtor Invoices</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li><code className="bg-background px-1 rounded">InvoiceNr</code> - Invoice number</li>
                <li><code className="bg-background px-1 rounded">DebtorId</code> - Debtor code</li>
                <li><code className="bg-background px-1 rounded">Description</code> - For loan matching</li>
                <li><code className="bg-background px-1 rounded">AmtInvoice</code> - Total amount</li>
                <li><code className="bg-background px-1 rounded">Balance</code> - Open amount</li>
              </ul>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium text-sm mb-2">Transactions</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li><code className="bg-background px-1 rounded">TransactionNr</code> - Transaction ID</li>
                <li><code className="bg-background px-1 rounded">JournalId</code> - Journal code</li>
                <li><code className="bg-background px-1 rounded">Date</code> - Transaction date</li>
                <li><code className="bg-background px-1 rounded">Amount</code> - Amount</li>
                <li className="text-warning">⚠️ No dimension/cost center fields</li>
              </ul>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium text-sm mb-2">Journals</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li><code className="bg-background px-1 rounded">JournalId</code> - Journal ID</li>
                <li><code className="bg-background px-1 rounded">Description</code> - Journal name</li>
                <li><code className="bg-background px-1 rounded">Type</code> - Journal type</li>
                <li className="text-warning">⚠️ Reference data only</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 p-3 bg-warning/10 border border-warning/30 rounded-lg">
            <p className="text-sm text-warning-foreground">
              <strong>Note:</strong> The <code>verbijzonderingsas</code> (dimension/cost center) field is not available in standard connectors. 
              Loan matching relies on parsing the <code>Description</code> field from Debtor Invoices.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

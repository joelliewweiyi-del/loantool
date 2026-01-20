import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Download, Database, Landmark, Building2, FileText, AlertCircle } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';

// Administration books available in AFAS (1-10)
const ADMINISTRATIONS = [
  { id: 'all', label: 'All Administrations' },
  { id: '1', label: '01 - Administration 1' },
  { id: '2', label: '02 - Administration 2' },
  { id: '3', label: '03 - Administration 3' },
  { id: '4', label: '04 - Administration 4' },
  { id: '5', label: '05 - RAX RED IV B.V.' },
  { id: '6', label: '06 - Administration 6' },
  { id: '7', label: '07 - Administration 7' },
  { id: '8', label: '08 - Administration 8' },
  { id: '9', label: '09 - Administration 9' },
  { id: '10', label: '10 - Administration 10' },
];

interface AfasRows {
  rows?: Record<string, unknown>[];
  skip?: number;
  take?: number;
}

interface ConnectorData {
  success: boolean;
  connector?: string;
  data?: AfasRows | Record<string, unknown>[];
  schema?: { fields?: { fieldId: string; dataType: string; label?: string }[] };
  error?: string;
  count?: number;
}

const CONNECTORS = [
  { 
    id: 'Profit_Transactions_Allocated', 
    name: 'Allocated Transactions', 
    description: 'Verbijzonderde grootboekkaart - GL transactions with cost allocation',
    icon: FileText
  },
  { 
    id: 'Profit_Balance_Allocated', 
    name: 'Allocated Balances', 
    description: 'Verbijzonderde kolommenbalans - GL balances with dimensions',
    icon: Landmark
  },
  { 
    id: 'Profit_Debtor', 
    name: 'Debtors', 
    description: 'Debtor master data',
    icon: Building2
  },
];

function downloadCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(';'), // Use semicolon for Excel compatibility
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle null, undefined, and escape quotes
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        // Escape quotes and wrap in quotes if contains special chars
        if (stringValue.includes(';') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(';')
    )
  ];
  
  const csvContent = csvRows.join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function ConnectorPanel({ 
  connectorId, 
  connectorName, 
  description, 
  icon: Icon,
  unitId 
}: { 
  connectorId: string; 
  connectorName: string; 
  description: string;
  icon: React.ElementType;
  unitId: string;
}) {
  const [schemaOpen, setSchemaOpen] = useState(false);

  const { data, isLoading, error, refetch, isFetching } = useQuery<ConnectorData>({
    queryKey: ['afas-gl-explorer', connectorId, unitId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('test-afas-read', {
        body: { 
          connector: connectorId,
          unitId: unitId === 'all' ? null : unitId,
          take: 10000 // No practical limit - fetch all
        }
      });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Handle nested response
  const rawData = data?.data;
  const records: Record<string, unknown>[] = Array.isArray(rawData) 
    ? rawData 
    : ((rawData as AfasRows)?.rows || []);
  const schema = data?.schema?.fields || [];

  const allKeys: string[] = records.length > 0 
    ? [...new Set(records.flatMap(record => Object.keys(record)))]
    : [];

  const isNotAuthorized = data?.error?.includes('niet geautoriseerd') || data?.error?.includes('Could not read');

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{connectorName}</CardTitle>
              <CardDescription className="text-xs">{description}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isLoading ? (
              <Skeleton className="h-5 w-16" />
            ) : data?.success ? (
              <Badge variant="secondary" className="text-xs">{records.length.toLocaleString()} rows</Badge>
            ) : isNotAuthorized ? (
              <Badge variant="outline" className="text-xs text-warning border-warning/50 bg-warning/10">Not Authorized</Badge>
            ) : (
              <Badge variant="destructive" className="text-xs">Error</Badge>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`h-3 w-3 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => downloadCSV(records, connectorId)}
              disabled={records.length === 0}
            >
              <Download className="h-3 w-3 mr-1" />
              CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden flex flex-col gap-3">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        ) : error || !data?.success ? (
          isNotAuthorized ? (
            <div className="flex items-center gap-2 text-warning p-3 bg-warning/10 border border-warning/30 rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Connector not authorized. Enable <code className="font-mono bg-warning/20 px-1 rounded">{connectorId}</code> in AFAS for your token.</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-destructive p-3 bg-destructive/10 rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{data?.error || (error as Error)?.message || 'Failed to fetch'}</span>
            </div>
          )
        ) : (
          <>
            {/* Schema toggle */}
            {schema.length > 0 && (
              <Collapsible open={schemaOpen} onOpenChange={setSchemaOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                    {schemaOpen ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
                    Schema ({schema.length} fields)
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="flex flex-wrap gap-1 p-2 bg-muted/50 rounded text-xs max-h-32 overflow-auto">
                    {schema.map((field) => (
                      <Badge key={field.fieldId} variant="outline" className="text-[10px]">
                        {field.fieldId} <span className="text-muted-foreground">({field.dataType})</span>
                      </Badge>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Data table */}
            <ScrollArea className="flex-1 border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    {allKeys.map((key) => (
                      <TableHead key={key} className="text-xs whitespace-nowrap px-2 py-1 bg-muted/50">
                        {key}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.slice(0, 500).map((record, idx) => (
                    <TableRow key={idx}>
                      {allKeys.map((key) => (
                        <TableCell key={key} className="text-xs whitespace-nowrap px-2 py-1 max-w-[200px] truncate">
                          {record[key] !== null && record[key] !== undefined 
                            ? String(record[key]) 
                            : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
            {records.length > 500 && (
              <p className="text-xs text-muted-foreground text-center">
                Showing 500 of {records.length.toLocaleString()} rows. Download CSV for full data.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function AfasGLExplorer() {
  const [unitId, setUnitId] = useState('5');
  const [activeTab, setActiveTab] = useState(CONNECTORS[0].id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6" />
            AFAS GL Explorer
          </h1>
          <p className="text-muted-foreground text-sm">
            Explore allocated transactions, balances, and debtor data with full export
          </p>
        </div>
        <Select value={unitId} onValueChange={setUnitId}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Select administration" />
          </SelectTrigger>
          <SelectContent>
            {ADMINISTRATIONS.map((admin) => (
              <SelectItem key={admin.id} value={admin.id}>
                {admin.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          {CONNECTORS.map((connector) => {
            const Icon = connector.icon;
            return (
              <TabsTrigger key={connector.id} value={connector.id} className="gap-2">
                <Icon className="h-4 w-4" />
                {connector.name}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {CONNECTORS.map((connector) => (
          <TabsContent key={connector.id} value={connector.id} className="h-[calc(100vh-280px)]">
            <ConnectorPanel
              connectorId={connector.id}
              connectorName={connector.name}
              description={connector.description}
              icon={connector.icon}
              unitId={unitId}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

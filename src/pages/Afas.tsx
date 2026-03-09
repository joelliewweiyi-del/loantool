import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AfasDashboard from './AfasDashboard';
import AfasData from './AfasData';

export default function Afas() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';

  const handleTabChange = (value: string) => {
    setSearchParams(value === 'dashboard' ? {} : { tab: value });
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">AFAS Integration</h1>
        <p className="text-sm text-foreground-secondary">Connector status, payment data, and debtor information</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="data">Data Explorer</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="mt-4">
          <AfasDashboard embedded />
        </TabsContent>
        <TabsContent value="data" className="mt-4">
          <AfasData embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}

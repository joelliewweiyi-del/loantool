import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, startOfMonth, subMonths, addMonths } from 'date-fns';
import { getCurrentDate } from '@/lib/simulatedDate';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import AfasDashboard from './AfasDashboard';
import AfasData from './AfasData';

export default function Afas() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';

  const [currentMonth, setCurrentMonth] = useState(() =>
    format(startOfMonth(getCurrentDate()), 'yyyy-MM')
  );

  const displayMonth = useMemo(() => {
    const [year, month] = currentMonth.split('-').map(Number);
    return format(new Date(year, month - 1), 'MMMM yyyy');
  }, [currentMonth]);

  const handlePrevMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    setCurrentMonth(format(subMonths(new Date(year, month - 1), 1), 'yyyy-MM'));
  };

  const handleNextMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    setCurrentMonth(format(addMonths(new Date(year, month - 1), 1), 'yyyy-MM'));
  };

  const handleTabChange = (value: string) => {
    setSearchParams(value === 'dashboard' ? {} : { tab: value });
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">AFAS Integration</h1>
          <p className="text-sm text-foreground-secondary">Connector status, payment data, and debtor information</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium w-[130px] text-center">{displayMonth}</span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="data">Data Explorer</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="mt-4">
          <AfasDashboard embedded selectedMonth={currentMonth} />
        </TabsContent>
        <TabsContent value="data" className="mt-4">
          <AfasData embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}

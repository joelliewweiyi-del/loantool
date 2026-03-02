import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Fetches specific keys from the app_config table.
 * Returns a Record<string, string> mapping key → value.
 */
export function useAppConfig(keys: string[]) {
  return useQuery({
    queryKey: ['app-config', keys],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_config')
        .select('key, value')
        .in('key', keys);
      if (error) throw error;
      const config: Record<string, string> = {};
      for (const row of data || []) {
        config[row.key] = row.value;
      }
      return config;
    },
    staleTime: 5 * 60 * 1000, // 5 min — config rarely changes
  });
}

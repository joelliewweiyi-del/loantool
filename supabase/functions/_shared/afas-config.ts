import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Get AFAS token: reads from app_config table first, falls back to env var.
 * This allows the token to be updated via the UI when it rotates daily.
 */
export async function getAfasToken(): Promise<string | null> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'AFAS_TOKEN')
      .single();

    if (data?.value) {
      console.log('Using AFAS token from app_config (DB)');
      return data.value;
    }
  } catch (e) {
    console.log('Could not read AFAS token from DB, falling back to env:', e);
  }

  const envToken = Deno.env.get('AFAS_TOKEN') ?? null;
  if (envToken) console.log('Using AFAS token from environment variable');
  return envToken;
}

export function getAfasEnvId(): string | null {
  return Deno.env.get('AFAS_ENVIRONMENT_ID') ?? null;
}

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

/**
 * Reads AFAS_USE_TEST_ENV from app_config (DB), falls back to env var.
 * Default: 'true' (test environment).
 */
export async function getAfasUseTestEnv(): Promise<boolean> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'AFAS_USE_TEST_ENV')
      .single();

    if (data?.value !== undefined && data?.value !== null) {
      const useTest = data.value !== 'false';
      console.log(`AFAS env from app_config: ${useTest ? 'TEST' : 'PRODUCTION'}`);
      return useTest;
    }
  } catch {
    // No DB row, fall back to env var
  }

  const useTest = (Deno.env.get('AFAS_USE_TEST_ENV') ?? 'true') !== 'false';
  console.log(`AFAS env from env var: ${useTest ? 'TEST' : 'PRODUCTION'}`);
  return useTest;
}

/**
 * AFAS_USE_TEST_ENV=true  → resttest.afas.online  (default)
 * AFAS_USE_TEST_ENV=false → rest.afas.online
 *
 * Reads toggle from app_config (DB-first), env var fallback.
 */
export async function getAfasBaseUrl(): Promise<string | null> {
  const envId = getAfasEnvId();
  if (!envId) return null;
  const useTest = await getAfasUseTestEnv();
  const host = useTest ? 'resttest.afas.online' : 'rest.afas.online';
  return `https://${envId}.${host}/profitrestservices`;
}

/**
 * Build the Authorization header value for AFAS.
 * Uses TextEncoder to handle any non-Latin1 chars in the XML token.
 */
export function buildAfasAuthHeader(token: string): string {
  // Use Uint8Array + manual base64 to avoid btoa issues with special chars
  const bytes = new TextEncoder().encode(token);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  const encoded = btoa(binary);
  console.log('Token starts with:', token.substring(0, 30));
  console.log('Base64 length:', encoded.length);
  return `AfasToken ${encoded}`;
}

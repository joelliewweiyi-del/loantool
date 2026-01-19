import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const afasToken = Deno.env.get('AFAS_TOKEN');
    const afasEnvId = Deno.env.get('AFAS_ENVIRONMENT_ID');

    if (!afasToken || !afasEnvId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing AFAS credentials' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch AFAS debtor invoices
    const baseUrl = `https://${afasEnvId}.rest.afas.online/profitrestservices`;
    const connectorName = 'Profit_Debtor_Invoices';
    
    console.log('Fetching all invoices from AFAS...');
    
    const response = await fetch(`${baseUrl}/connectors/${connectorName}?take=1000`, {
      method: 'GET',
      headers: {
        'Authorization': `AfasToken ${btoa(afasToken)}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AFAS API error: ${response.status} - ${errorText}`);
    }

    const afasData = await response.json();
    const allInvoices = afasData.rows || [];
    
    console.log(`Fetched ${allInvoices.length} total invoices from AFAS`);
    console.log('Sample invoice fields:', Object.keys(allInvoices[0] || {}));

    // Return the raw AFAS data
    return new Response(
      JSON.stringify({
        success: true,
        total_in_afas: allInvoices.length,
        filtered_count: allInvoices.length,
        available_fields: Object.keys(allInvoices[0] || {}),
        invoices: allInvoices,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    console.error('AFAS fetch error:', errMessage);

    return new Response(
      JSON.stringify({ success: false, error: errMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

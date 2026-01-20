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

    const baseUrl = `https://${afasEnvId}.rest.afas.online/profitrestservices`;
    
    // Try multiple possible debtor connectors
    const connectorNames = [
      'Profit_Debtor',
      'Profit_Debtors', 
      'KnDebtor',
      'Profit_DebtorOverview'
    ];

    let debtors: Record<string, unknown>[] = [];
    let usedConnector = '';
    let lastError = '';

    for (const connectorName of connectorNames) {
      try {
        console.log(`Trying connector: ${connectorName}`);
        
        const response = await fetch(`${baseUrl}/connectors/${connectorName}?take=500`, {
          method: 'GET',
          headers: {
            'Authorization': `AfasToken ${btoa(afasToken)}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          debtors = data.rows || [];
          usedConnector = connectorName;
          console.log(`Success with ${connectorName}: ${debtors.length} debtors`);
          break;
        } else {
          lastError = await response.text();
          console.log(`${connectorName} failed: ${response.status}`);
        }
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
        console.log(`${connectorName} error: ${lastError}`);
      }
    }

    if (debtors.length === 0) {
      // List available connectors for debugging
      console.log('No debtor connector worked, fetching available connectors...');
      
      try {
        const metaResponse = await fetch(`${baseUrl}/metainfo`, {
          method: 'GET',
          headers: {
            'Authorization': `AfasToken ${btoa(afasToken)}`,
            'Content-Type': 'application/json',
          },
        });

        if (metaResponse.ok) {
          const metaData = await metaResponse.json();
          const getConnectors = metaData.getConnectors || [];
          const debtorRelated = getConnectors.filter((c: { id: string }) => 
            c.id.toLowerCase().includes('debtor') || 
            c.id.toLowerCase().includes('debiteur') ||
            c.id.toLowerCase().includes('customer') ||
            c.id.toLowerCase().includes('klant')
          );

          return new Response(
            JSON.stringify({
              success: false,
              error: `No debtor data found. Last error: ${lastError}`,
              tried_connectors: connectorNames,
              available_debtor_connectors: debtorRelated.map((c: { id: string }) => c.id),
              all_get_connectors_count: getConnectors.length,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (metaError) {
        console.log('Meta info fetch failed:', metaError);
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: `No debtor connector accessible. Last error: ${lastError}`,
          tried_connectors: connectorNames,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get sample fields from first debtor
    const availableFields = Object.keys(debtors[0] || {});
    
    console.log(`Fetched ${debtors.length} debtors from ${usedConnector}`);
    console.log('Available fields:', availableFields);

    return new Response(
      JSON.stringify({
        success: true,
        connector_used: usedConnector,
        total_debtors: debtors.length,
        available_fields: availableFields,
        debtors: debtors,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    console.error('AFAS debtor fetch error:', errMessage);

    return new Response(
      JSON.stringify({ success: false, error: errMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

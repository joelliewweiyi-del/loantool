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
        JSON.stringify({ 
          success: false, 
          error: 'Missing AFAS credentials' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const baseUrl = `https://${afasEnvId}.rest.afas.online/profitrestservices`;
    
    // Try to read from Pocket_Financial_Entry_Invoices GetConnector
    // This connector should return financial entry invoices
    const connectorName = 'Pocket_Financial_Entry_Invoices';
    const getUrl = `${baseUrl}/connectors/${connectorName}?skip=0&take=5`;
    
    console.log('Fetching from:', getUrl);

    const response = await fetch(getUrl, {
      method: 'GET',
      headers: {
        'Authorization': `AfasToken ${btoa(afasToken)}`,
        'Content-Type': 'application/json',
      },
    });

    const responseText = await response.text();
    console.log('Response Status:', response.status);

    if (response.ok) {
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        data = responseText;
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Successfully retrieved data from ${connectorName}`,
          status: response.status,
          data: data
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // If the specific connector doesn't exist, try listing available connectors
      console.log('Primary connector failed, trying to list available connectors...');
      
      const listUrl = `${baseUrl}/connectorinfo`;
      const listResponse = await fetch(listUrl, {
        method: 'GET',
        headers: {
          'Authorization': `AfasToken ${btoa(afasToken)}`,
          'Content-Type': 'application/json',
        },
      });
      
      const listText = await listResponse.text();
      let availableConnectors;
      try {
        availableConnectors = JSON.parse(listText);
      } catch {
        availableConnectors = listText;
      }

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Connector ${connectorName} not accessible`,
          status: response.status,
          details: responseText,
          availableConnectors: availableConnectors
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    console.error('Error reading from AFAS:', errMessage);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errMessage 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

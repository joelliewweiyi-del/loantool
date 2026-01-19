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
    
    // Try to read from Profit_Debtor_Invoices GetConnector (authorized)
    const connectorName = 'Profit_Debtor_Invoices';
    
    // First, get the connector's metainfo to understand available fields
    const metaUrl = `${baseUrl}/metainfo/get/${connectorName}`;
    console.log('Fetching metainfo:', metaUrl);
    
    const metaResponse = await fetch(metaUrl, {
      method: 'GET',
      headers: {
        'Authorization': `AfasToken ${btoa(afasToken)}`,
        'Content-Type': 'application/json',
      },
    });
    
    let schema = null;
    let primaryField = null;
    
    if (metaResponse.ok) {
      const metaText = await metaResponse.text();
      try {
        schema = JSON.parse(metaText);
        // Extract first field name to use for sorting (orderbyfieldids is REQUIRED)
        if (schema.fields && schema.fields.length > 0) {
          primaryField = schema.fields[0].fieldId;
        }
      } catch {
        schema = metaText;
      }
    }
    
    console.log('Schema:', JSON.stringify(schema)?.substring(0, 500));
    console.log('Primary field for sorting:', primaryField);
    
    // Build filters - orderbyfieldids is MANDATORY when using skip/take
    const filters = primaryField ? [
      `?skip=0&take=5&orderbyfieldids=${primaryField}`, // Proper pagination with required sort
      `?orderbyfieldids=${primaryField}`, // Just sorting, no pagination
    ] : [
      '', // No filter (fallback if no schema)
    ];
    
    const attempts: Array<{filter: string, status: number, response: string}> = [];
    let successData = null;
    
    for (const filter of filters) {
      const getUrl = `${baseUrl}/connectors/${connectorName}${filter}`;
      console.log('Trying:', getUrl);
      
      const testResponse = await fetch(getUrl, {
        method: 'GET',
        headers: {
          'Authorization': `AfasToken ${btoa(afasToken)}`,
          'Content-Type': 'application/json',
        },
      });
      
      const testText = await testResponse.text();
      console.log('Response:', testResponse.status, testText.substring(0, 300));
      
      attempts.push({ filter: filter || '(no filter)', status: testResponse.status, response: testText.substring(0, 500) });
      
      if (testResponse.ok) {
        try {
          successData = JSON.parse(testText);
        } catch {
          successData = testText;
        }
        break;
      }
    }
    
    if (successData) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Successfully retrieved data from ${connectorName}`,
          data: successData,
          schema: schema,
          attempts: attempts
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Could not read from ${connectorName}`,
        attempts: attempts,
        connectorSchema: schema,
        hint: 'The connector may have a configuration issue in AFAS. Check the profitLogReference in AFAS logs.'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
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

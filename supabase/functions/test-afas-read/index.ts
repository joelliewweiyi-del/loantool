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
    const connectorName = 'Pocket_Financial_Entry_Invoices';
    
    // Try with different filter approaches
    const filters = [
      '?skip=0&take=1', // Minimal pagination
      '', // No filter
      '?filterfieldids=Jaar&filtervalues=2024&operatortypes=1', // Year filter
      '?filterfieldids=Administratie&filtervalues=05&operatortypes=1', // Admin code filter
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
          attempts: attempts
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // All attempts failed - get connector schema to understand required fields
    console.log('All filter attempts failed, fetching connector schema...');
    
    const schemaUrl = `${baseUrl}/metainfo/get/${connectorName}`;
    const schemaResponse = await fetch(schemaUrl, {
      method: 'GET',
      headers: {
        'Authorization': `AfasToken ${btoa(afasToken)}`,
        'Content-Type': 'application/json',
      },
    });
    
    let schema = null;
    if (schemaResponse.ok) {
      try {
        schema = JSON.parse(await schemaResponse.text());
      } catch {
        schema = await schemaResponse.text();
      }
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Could not read from ${connectorName}`,
        attempts: attempts,
        connectorSchema: schema,
        hint: 'The connector may require specific filter parameters. Check the schema for required fields.'
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

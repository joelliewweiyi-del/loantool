import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const afasToken = Deno.env.get('AFAS_TOKEN');
    const afasEnvId = Deno.env.get('AFAS_ENVIRONMENT_ID');

    console.log('Testing AFAS connection...');
    console.log('Environment ID:', afasEnvId ? `${afasEnvId.substring(0, 8)}...` : 'NOT SET');
    console.log('Token present:', afasToken ? 'YES' : 'NO');

    if (!afasToken || !afasEnvId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing AFAS credentials',
          details: {
            hasToken: !!afasToken,
            hasEnvId: !!afasEnvId
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // AFAS REST API base URL
    const baseUrl = `https://${afasEnvId}.rest.afas.online/profitrestservices`;
    
    // Test connection by fetching connector metadata
    // Using a simple GET request to check if authentication works
    const testUrl = `${baseUrl}/metainfo`;
    
    console.log('Calling AFAS API:', testUrl);

    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Authorization': `AfasToken ${btoa(afasToken)}`,
        'Content-Type': 'application/json',
      },
    });

    const responseText = await response.text();
    console.log('AFAS Response Status:', response.status);
    console.log('AFAS Response:', responseText.substring(0, 500));

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
          message: 'AFAS connection successful!',
          status: response.status,
          data
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Try alternative endpoint - get available connectors
      const connectorsUrl = `${baseUrl}/connectorinfo`;
      console.log('Trying alternative endpoint:', connectorsUrl);
      
      const altResponse = await fetch(connectorsUrl, {
        method: 'GET',
        headers: {
          'Authorization': `AfasToken ${btoa(afasToken)}`,
          'Content-Type': 'application/json',
        },
      });

      const altResponseText = await altResponse.text();
      console.log('Alt Response Status:', altResponse.status);
      console.log('Alt Response:', altResponseText.substring(0, 500));

      if (altResponse.ok) {
        let altData;
        try {
          altData = JSON.parse(altResponseText);
        } catch {
          altData = altResponseText;
        }
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'AFAS connection successful (via connectorinfo)!',
            status: altResponse.status,
            availableConnectors: altData
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'AFAS API returned an error',
          status: response.status,
          details: responseText,
          altStatus: altResponse.status,
          altDetails: altResponseText
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : undefined;
    console.error('Error testing AFAS connection:', errMessage);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errMessage,
        stack: errStack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

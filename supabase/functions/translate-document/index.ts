const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are a professional document translator for RAX Finance, a Dutch real estate private credit fund.

You will receive the raw text extracted from a Dutch credit proposal or loan agreement (kredietbrief / verkort voorstel). Your job is to produce a faithful English translation that preserves the original document's structure as closely as possible.

RULES:
1. Translate ALL Dutch text to clear, professional English.
2. RECONSTRUCT the document structure faithfully: headings, sections, tables, bullet points, numbered lists. Use the text patterns to identify structure:
   - Lines in ALL CAPS or short bold-looking lines → headings (<h2>, <h3>)
   - "Key: Value" patterns or aligned columns → tables (<table>)
   - Numbered items → ordered lists
   - Dash/bullet items → unordered lists
   - Paragraphs of running text → <p> tags
3. DO NOT translate:
   - Legal entity names (e.g. "RAX RED IV B.V.", borrower names ending in B.V./C.V./N.V.)
   - Proper nouns, street addresses, city names
   - Loan reference numbers (e.g. "RAX 518")
   - IBAN numbers, KvK numbers, registration numbers
4. Keep ALL numbers, dates, currency amounts, and percentages exactly as they appear.
5. Output clean semantic HTML using: <h1>, <h2>, <h3>, <h4>, <p>, <table>, <tr>, <th>, <td>, <ul>, <ol>, <li>, <strong>, <em>, <hr>.
6. For key-value pairs (like loan terms), use a two-column <table> with the term label in <th> and value in <td>.
7. Do NOT add any commentary, notes, or explanations. Output ONLY the translated HTML content.
8. Do NOT wrap output in code blocks. Output raw HTML directly.
9. Translate section headers like "KREDIETBRIEF" → "LOAN AGREEMENT", "Kredietnemer" → "Borrower", "Kredietgever" → "Lender", "Hoofdsom" → "Principal Amount", "Rente" → "Interest", "Looptijd" → "Term", "Zekerheid" → "Security/Collateral", etc.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'ANTHROPIC_API_KEY not configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const text = body?.text;
    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: `Missing or invalid "text" field. Got keys: ${Object.keys(body || {}).join(', ')}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Anthropic API directly with fetch
    const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 16384,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Translate this Dutch credit document to English. Preserve all structure and formatting:\n\n${text}`,
          },
        ],
      }),
    });

    if (!apiResponse.ok) {
      const errBody = await apiResponse.text();
      return new Response(
        JSON.stringify({ success: false, error: `Anthropic API ${apiResponse.status}: ${errBody}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await apiResponse.json();

    const textBlock = result.content?.find((block: { type: string }) => block.type === 'text');
    if (!textBlock) {
      return new Response(
        JSON.stringify({ success: false, error: 'Model did not return text output' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let html = textBlock.text;
    // Strip code block wrappers and any full HTML document wrapper the model may add
    html = html.replace(/^```html\s*/i, '').replace(/\s*```\s*$/i, '');
    html = html.replace(/<!DOCTYPE html>[\s\S]*?<body[^>]*>/i, '').replace(/<\/body>[\s\S]*$/i, '');
    html = html.replace(/<html[^>]*>/i, '').replace(/<\/html>/i, '');
    html = html.replace(/<head>[\s\S]*?<\/head>/i, '');
    html = html.trim();

    return new Response(
      JSON.stringify({
        success: true,
        html,
        title: 'Credit Proposal — English Translation',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: `Caught: ${String(err)}` }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EXTRACTION_TOOL = {
  name: 'extract_loan_fields',
  description: 'Extract structured loan fields from a Dutch real estate credit document.',
  input_schema: {
    type: 'object' as const,
    properties: {
      document_type: {
        type: 'string',
        enum: ['kredietbrief', 'credit_proposal', 'unknown'],
        description: 'The type of document: "kredietbrief" (formal loan letter), "credit_proposal" (verkort voorstel / credit proposal), or "unknown".',
      },
      loan_number: {
        type: ['string', 'null'],
        description: 'The RAX loan reference number (digits only, e.g. "518" from "RAX 518").',
      },
      vehicle: {
        type: ['string', 'null'],
        enum: ['RED IV', 'TLF', null],
        description: 'The investment vehicle. "RED IV" (RAX RED IV B.V.) or "TLF". Determined from the kredietgever/lender entity name.',
      },
      borrower_name: {
        type: ['string', 'null'],
        description: 'The legal entity name of the borrower (kredietnemer). MUST end at "B.V." — do not include anything after it (no "een besloten vennootschap..." etc). Normalize the suffix to "B.V." regardless of how it appears in the document (BV, B.V, b.v. etc).',
      },
      borrower_address: {
        type: ['string', 'null'],
        description: 'The registered address of the borrower entity. Format: "Street, PostalCode, City".',
      },
      total_commitment: {
        type: ['number', 'null'],
        description: 'The total loan commitment (hoofdsom / loan amount) in EUR as a plain number. Convert Dutch formatting: "4.200.000" → 4200000, "4.2 miljoen" → 4200000.',
      },
      interest_rate: {
        type: ['number', 'null'],
        description: 'The ANNUALIZED interest rate as a percentage number (e.g. 9.6 for 9.6%). IMPORTANT: These documents almost always quote the MONTHLY rate — you must multiply by 12 to annualize. E.g. "0,80% per maand" → 9.6.',
      },
      arrangement_fee: {
        type: ['number', 'null'],
        description: 'The arrangement fee (afsluitprovisie / Rax Finance fee) in EUR as a plain number.',
      },
      commitment_fee_rate: {
        type: ['number', 'null'],
        description: 'The commitment fee rate as a percentage number (e.g. 1.0 for 1%).',
      },
      city: {
        type: ['string', 'null'],
        description: 'The city or cities where the financed properties are located. If multiple cities, join with " / " (e.g. "Amsterdam / Almere / Amersfoort").',
      },
      category: {
        type: ['string', 'null'],
        enum: ['Residential', 'Office', 'Retail', 'Commercial', 'Mixed', null],
        description: 'The property category. "Mixed" if multiple types. Derive from property descriptions (woningen=Residential, kantoor=Office, winkel=Retail, bedrijfsruimte=Commercial).',
      },
      property_status: {
        type: ['string', 'null'],
        enum: ['Leased', 'Redevelopment', 'Development', null],
        description: '"Leased" if properties are rented out, "Redevelopment" if under renovation, "Development" if new build / ground position.',
      },
      property_address: {
        type: ['string', 'null'],
        description: 'The primary property address (first/main property if multiple).',
      },
      notice_frequency: {
        type: ['string', 'null'],
        enum: ['monthly', 'quarterly', null],
        description: 'How often interest notices are sent. Derive from "Rentebetaalperiode" or payment terms.',
      },
      payment_due_rule: {
        type: ['string', 'null'],
        description: 'The rule for when interest payments are due (e.g. "De laatste kalenderdag van de maand").',
      },
      rental_income: {
        type: ['number', 'null'],
        description: 'Total annual rental income in EUR. Sum all "Huur" / "Verhuurd voor" amounts. Convert monthly to annual if needed. Handle "k" shorthand (300k = 300000).',
      },
      valuation: {
        type: ['number', 'null'],
        description: 'Total property valuation (taxatiewaarde) in EUR. Sum all taxatiewaarde amounts if multiple properties.',
      },
      ltv: {
        type: ['number', 'null'],
        description: 'Loan-to-value ratio as a percentage number (e.g. 34 for 34%). Use the LTV figure, not LTC.',
      },
      duration_months: {
        type: ['integer', 'null'],
        description: 'Loan duration in months. Convert years to months if needed.',
      },
      earmarked: {
        type: 'boolean',
        description: 'True if the property generates rental income (income-producing).',
      },
      walt: {
        type: ['number', 'null'],
        description: 'Weighted Average Lease Term (WALT) in years. Look for "WALT", "gewogen gemiddelde looptijd", or lease expiry details. Calculate from lease end dates if not explicitly stated. Return as decimal (e.g. 4.97).',
      },
      occupancy: {
        type: ['number', 'null'],
        description: 'Occupancy rate as a percentage number (e.g. 95 for 95%). Look for "bezettingsgraad", "occupancy", "fully leased" (=100), "vacant" (=0). Return null if not determinable.',
      },
      remarks: {
        type: ['string', 'null'],
        description: 'A single-sentence summary of the loan (max 15 words). Format: "[Loan type] of [asset type] in [city]". Examples: "Acquisition financing of leased office property in Den Bosch", "Construction loan for residential redevelopment in Muiden", "Bridge loan secured on residential portfolio in Amsterdam".',
      },
      additional_info: {
        type: ['string', 'null'],
        description: `A professional loan description paragraph (100-200 words) summarizing the deal for internal records. Write in English, third-person, present tense. Cover: what is being financed, asset type & location, key metrics (LTV, rental income, lease terms), borrower profile, risk mitigants, and conclude with an overall assessment. Match this writing style exactly:

Example 1: "Financing of a light-industrial warehouse in Baarn, near the A1-highway. Consists of 15.358m2 LFA (plot size 15.425m2). The property is in good condition and leased (owner-user) for €900.000 per annum; €59/m2 LFA. LTV (61%) is good, but to further guarantee a solid financing position we arranged a €1.000.000 guarantee from the sponsor. Overall, the transaction presents a well-structured and balanced financing facility with appropriate downside protection."

Example 2: "This financing concerns the acquisition of a fully leased office property in 's-Hertogenbosch. The asset consists of three connected towers with a flexible layout. The property is modern, recently renovated, energy efficient and generates stable rental income. Exit risk is limited; supported by strong occupancy and long-term redevelopment potential."

Do NOT fabricate numbers not in the document. Use only facts from the text.`,
      },
    },
    required: ['document_type'],
  },
};

const SYSTEM_PROMPT = `You are a specialist at extracting structured data from Dutch real estate loan documents for RAX Finance, a private credit fund.

You will receive the raw text extracted from a PDF — either a "kredietbrief" (formal loan agreement letter) or a "credit proposal" (verkort voorstel / investment memo).

Your job is to extract loan fields accurately. Key rules:

1. INTEREST RATES: Documents almost always quote MONTHLY rates (e.g. "0,80% per maand"). You MUST annualize by multiplying by 12. So "0,80% per maand" = 9.6% annualized. Only skip annualization if the document explicitly says "per jaar" or "annually".

2. AMOUNTS: Dutch formatting uses dots for thousands and commas for decimals. "4.200.000" = 4200000. Also handle "miljoen"/"mio" (4.2 miljoen = 4200000) and "k" shorthand (300k = 300000).

3. BORROWER NAME: The legal entity name ends at "B.V." (or variations BV, B.V, b.v.). Truncate there and normalize to "B.V." Do NOT include "een besloten vennootschap met beperkte aansprakelijkheid" or anything after B.V. For C.V. entities, end at "C.V."

4. VEHICLE: Determined from the lender (kredietgever). "RAX RED IV B.V." → "RED IV". "RAX TLF" → "TLF". Also check the risk analysis section for mentions of "RED IV" or "TLF".

5. RENTAL INCOME: Sum all individual property rental amounts. Watch for "ex. BTW" (exclude VAT). Convert to annual if quoted differently.

6. CITIES: Extract from property descriptions. Include all cities where properties are located.

7. Return null for any field you cannot confidently determine. Do NOT guess.

Use the extract_loan_fields tool to return your results.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'ANTHROPIC_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { text } = await req.json();
    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing or invalid "text" field' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: [EXTRACTION_TOOL],
      tool_choice: { type: 'tool', name: 'extract_loan_fields' },
      messages: [
        {
          role: 'user',
          content: `Extract all loan fields from this document:\n\n${text}`,
        },
      ],
    });

    // Find the tool_use block in the response
    const toolUse = message.content.find((block: { type: string }) => block.type === 'tool_use');
    if (!toolUse || toolUse.type !== 'tool_use') {
      return new Response(
        JSON.stringify({ success: false, error: 'Model did not return structured output' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const extracted = toolUse.input as Record<string, unknown>;

    // Convert the typed response into string fields matching the frontend form
    const fields: Record<string, string> = {};
    const documentType = (extracted.document_type as string) || 'unknown';

    if (extracted.loan_number) fields.loan_number = String(extracted.loan_number);
    if (extracted.vehicle) fields.vehicle = String(extracted.vehicle);
    if (extracted.borrower_name) fields.borrower_name = String(extracted.borrower_name);
    if (extracted.borrower_address) fields.borrower_address = String(extracted.borrower_address);
    if (extracted.total_commitment != null) fields.total_commitment = String(extracted.total_commitment);
    if (extracted.interest_rate != null) fields.interest_rate = String(extracted.interest_rate);
    if (extracted.arrangement_fee != null) fields.arrangement_fee = String(extracted.arrangement_fee);
    if (extracted.commitment_fee_rate != null) fields.commitment_fee_rate = String(extracted.commitment_fee_rate);
    if (extracted.city) fields.city = String(extracted.city);
    if (extracted.category) fields.category = String(extracted.category);
    if (extracted.property_status) fields.property_status = String(extracted.property_status);
    if (extracted.property_address) fields.property_address = String(extracted.property_address);
    if (extracted.notice_frequency) fields.notice_frequency = String(extracted.notice_frequency);
    if (extracted.payment_due_rule) fields.payment_due_rule = String(extracted.payment_due_rule);
    if (extracted.rental_income != null) fields.rental_income = String(extracted.rental_income);
    if (extracted.valuation != null) fields.valuation = String(extracted.valuation);
    if (extracted.ltv != null) fields.ltv = String(extracted.ltv);
    if (extracted.duration_months != null) fields._duration_months = String(extracted.duration_months);
    if (extracted.earmarked === true) fields.earmarked = 'true';
    if (extracted.earmarked === false) fields.earmarked = 'false';
    if (extracted.walt != null) fields.walt = String(extracted.walt);
    if (extracted.occupancy != null) fields.occupancy = String(extracted.occupancy);
    if (extracted.remarks) fields.remarks = String(extracted.remarks);
    if (extracted.additional_info) fields.additional_info = String(extracted.additional_info);

    return new Response(
      JSON.stringify({
        success: true,
        fields,
        documentType,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('parse-loan-document error:', err);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

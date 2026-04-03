-- Update get_loans_for_portal() to output European format matching Portal's existing data:
-- - Numbers: comma decimal separator (e.g. "4200000,00")
-- - Dates: dd/mm/yyyy (e.g. "17/08/2026")
-- - Percentages: comma decimal + % sign (e.g. "9,60%")
-- - Duration: years as European decimal (e.g. "0,45")
-- - Earmarked: uppercase (TRUE/FALSE)
-- - Facility: uses vehicle field (RED IV)

CREATE OR REPLACE FUNCTION public.get_loans_for_portal()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  FROM (
    SELECT
      lps.loan_id                                        AS "Loan ID",
      lps.vehicle                                        AS "Facility",
      lps.city                                           AS "City",
      lps.category                                       AS "Category",
      -- European number format: comma as decimal separator
      REPLACE(TO_CHAR(ROUND(lps.effective_commitment, 2), 'FM999999999990D00'), '.', ',')
                                                         AS "Total Commitment",
      REPLACE(TO_CHAR(ROUND(lps.outstanding, 2), 'FM999999999990D00'), '.', ',')
                                                         AS "Outstanding Loan Amount",
      REPLACE(TO_CHAR(ROUND(lps.undrawn, 2), 'FM999999999990D00'), '.', ',')
                                                         AS "Undrawn Amount",
      -- Rate & LTV: European percentage format (e.g. "9,60%")
      REPLACE(TO_CHAR(ROUND(lps.current_rate * 100, 2), 'FM990D00'), '.', ',') || '%'
                                                         AS "Interest Rate",
      REPLACE(TO_CHAR(ROUND(lps.ltv * 100, 2), 'FM990D00'), '.', ',') || '%'
                                                         AS "LTV",
      -- Dates: dd/mm/yyyy
      TO_CHAR(lps.loan_start_date, 'DD/MM/YYYY')        AS "Start Date",
      TO_CHAR(lps.maturity_date, 'DD/MM/YYYY')           AS "Maturity",
      -- Duration in years with European decimal (e.g. "0,45")
      CASE
        WHEN lps.maturity_date IS NOT NULL AND lps.loan_start_date IS NOT NULL
        THEN REPLACE(
          TO_CHAR(
            ROUND((lps.maturity_date - lps.loan_start_date)::numeric / 365.25, 2),
            'FM990D00'
          ), '.', ','
        )
        ELSE NULL
      END                                                AS "Duration",
      REPLACE(TO_CHAR(ROUND(lps.valuation, 2), 'FM999999999990D00'), '.', ',')
                                                         AS "Valuation (as-is)",
      REPLACE(TO_CHAR(ROUND(lps.rental_income, 2), 'FM999999999990D00'), '.', ',')
                                                         AS "Rental Income",
      lps.remarks                                        AS "Remarks",
      UPPER(COALESCE(lps.earmarked, false)::text)        AS "Earmarked",
      -- Extra columns from loans table (not in the view)
      l.google_maps_url                                  AS "google_maps",
      l.kadastrale_kaart_url                             AS "kadastralekaart",
      l.photo_url                                        AS "Photo",
      l.additional_info                                  AS "Additional Information"
    FROM loan_portfolio_summary lps
    JOIN loans l ON l.id = lps.id
    WHERE lps.vehicle = 'RED IV'
      AND lps.loan_status = 'active'
    ORDER BY lps.loan_id
  ) t;
$$;

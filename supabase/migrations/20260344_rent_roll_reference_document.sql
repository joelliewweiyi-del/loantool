-- Add reference_document column to rent_roll_entries
-- Tracks the source document each entry was parsed from

ALTER TABLE public.rent_roll_entries
ADD COLUMN reference_document text;

-- Backfill RAX507 entries with their source document
UPDATE rent_roll_entries rre
SET reference_document = '87 Jorishof - Overzicht opbrengst en expiratie.pdf'
FROM covenant_submissions cs
JOIN loan_covenants lc ON cs.covenant_id = lc.id
JOIN loans l ON cs.loan_id = l.id
WHERE rre.submission_id = cs.id
  AND l.loan_id = '507'
  AND lc.covenant_type = 'rent_roll'
  AND cs.period_label = 'Q1 2026';

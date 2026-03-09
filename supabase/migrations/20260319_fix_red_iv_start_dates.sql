-- Fix incorrect RED IV entry dates: 2024-12-31 → 2025-12-31
UPDATE loans
SET red_iv_start_date = '2025-12-31'
WHERE red_iv_start_date = '2024-12-31';

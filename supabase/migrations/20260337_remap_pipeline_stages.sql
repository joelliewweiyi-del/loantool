-- Remap pipeline stages: prospect/soft/hard → prospect/hard/signed
-- Order matters: rename 'hard' → 'signed' FIRST, then 'soft' → 'hard'
UPDATE loans SET pipeline_stage = 'signed' WHERE pipeline_stage = 'hard';
UPDATE loans SET pipeline_stage = 'hard' WHERE pipeline_stage = 'soft';

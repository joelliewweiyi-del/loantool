-- Add pipeline_stage column for tracking Pipeline loan progression
-- Stages: prospect (early), soft (kredietbrief sent), hard (kredietbrief signed)
ALTER TABLE loans ADD COLUMN pipeline_stage TEXT;

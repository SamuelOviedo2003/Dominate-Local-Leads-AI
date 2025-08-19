-- Add stage column to leads table for stage-based filtering
-- Stage 1: Recent leads (initial stage)
-- Stage 2: Salesman leads (progressed stage)

-- Add stage column to leads table
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS stage SMALLINT DEFAULT 1 CHECK (stage IN (1, 2));

-- Create index for efficient stage-based filtering
CREATE INDEX IF NOT EXISTS idx_leads_stage_business_created 
ON leads (stage, business_id, created_at DESC);

-- Create index for stage filtering with date ranges
CREATE INDEX IF NOT EXISTS idx_leads_stage_created_business 
ON leads (stage, created_at, business_id);

-- Update existing leads to have stage = 1 (recent leads) by default
-- This ensures backward compatibility with existing data
UPDATE leads 
SET stage = 1 
WHERE stage IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN leads.stage IS 'Lead stage: 1 = Recent Leads, 2 = Salesman Leads';

-- Add constraint to ensure stage values are valid
ALTER TABLE leads 
ADD CONSTRAINT check_leads_stage_valid 
CHECK (stage IN (1, 2));
-- Add support for stage 3 (Bookings) to leads table
-- Extends existing stage column to support new stage value

-- Drop existing constraint to allow stage 3
ALTER TABLE leads 
DROP CONSTRAINT IF EXISTS check_leads_stage_valid;

-- Update the stage column check constraint to include stage 3
ALTER TABLE leads 
ADD CONSTRAINT check_leads_stage_valid 
CHECK (stage IN (1, 2, 3));

-- Update column comment to reflect new stage definitions
COMMENT ON COLUMN leads.stage IS 'Lead stage: 1 = New Leads (stage 1), 2 = New Leads (stage 2), 3 = Bookings';

-- Update existing indexes to handle stage 3 efficiently
-- The existing indexes will work fine with stage 3 as they are range-based

-- Verify the constraint change worked
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE table_name = 'leads' AND constraint_name = 'check_leads_stage_valid';

-- Show current stage distribution for verification
SELECT stage, COUNT(*) as count 
FROM leads 
GROUP BY stage 
ORDER BY stage;
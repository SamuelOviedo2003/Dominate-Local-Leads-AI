-- Database schema enhancement for color caching
-- Add these columns to the business_clients table

ALTER TABLE business_clients 
ADD COLUMN IF NOT EXISTS extracted_colors JSONB,
ADD COLUMN IF NOT EXISTS color_extraction_timestamp TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS color_cache_version INTEGER DEFAULT 1;

-- Create index for faster color lookups
CREATE INDEX IF NOT EXISTS idx_business_clients_color_cache 
ON business_clients (business_id, color_extraction_timestamp) 
WHERE extracted_colors IS NOT NULL;

-- Create index for cache cleanup queries
CREATE INDEX IF NOT EXISTS idx_business_clients_color_timestamp 
ON business_clients (color_extraction_timestamp) 
WHERE extracted_colors IS NOT NULL;

-- Example extracted_colors JSONB structure:
/*
{
  "primary": "#FF6B35",
  "primaryDark": "#B23E1A", 
  "primaryLight": "#FF9F66",
  "accent": "#334155",
  "textColor": "#FFFFFF",
  "isLightLogo": false
}
*/

-- Add RLS policy for color data access
CREATE POLICY "Users can access business colors based on their business_id" 
ON business_clients 
FOR SELECT 
USING (
  business_id IN (
    SELECT DISTINCT business_id 
    FROM user_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Function to clean up old color cache entries
CREATE OR REPLACE FUNCTION cleanup_color_cache()
RETURNS void AS $$
BEGIN
  -- Remove color cache older than 7 days
  UPDATE business_clients 
  SET 
    extracted_colors = NULL,
    color_extraction_timestamp = NULL
  WHERE 
    color_extraction_timestamp < NOW() - INTERVAL '7 days'
    AND extracted_colors IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cleanup function (run daily)
-- Note: This requires pg_cron extension
-- SELECT cron.schedule('cleanup-color-cache', '0 2 * * *', 'SELECT cleanup_color_cache();');
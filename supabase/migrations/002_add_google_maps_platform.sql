-- Allow 'google_maps' as a platform value in leads and outreach_logs.
-- Google Maps scraping produces business leads that don't fit the social-profile
-- platforms (instagram / twitter / linkedin) but share the same table structure.

ALTER TABLE leads
  DROP CONSTRAINT IF EXISTS leads_platform_check,
  ADD  CONSTRAINT leads_platform_check
    CHECK (platform IN ('instagram', 'twitter', 'linkedin', 'google_maps'));

ALTER TABLE outreach_logs
  DROP CONSTRAINT IF EXISTS outreach_logs_platform_check,
  ADD  CONSTRAINT outreach_logs_platform_check
    CHECK (platform IN ('instagram', 'twitter', 'linkedin', 'google_maps'));

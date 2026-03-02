-- Simple key-value config table for runtime settings (e.g. AFAS token that rotates daily)
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- RLS: only authenticated users with admin or controller role can read/write
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read app_config"
  ON app_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Controllers and admins can update app_config"
  ON app_config FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('controller', 'admin')
    )
  );

-- Allow service_role full access (for edge functions)
CREATE POLICY "Service role full access to app_config"
  ON app_config FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

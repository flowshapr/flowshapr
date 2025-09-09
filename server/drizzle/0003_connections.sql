-- Create connections table for storing external provider credentials per flow
CREATE TABLE IF NOT EXISTS "connection" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "provider" text NOT NULL,
  "api_key" text NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "flow_id" text NOT NULL REFERENCES "flow"("id") ON DELETE CASCADE,
  "project_id" text NOT NULL REFERENCES "project"("id") ON DELETE CASCADE,
  "created_by" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "connection_flow_idx" ON "connection" ("flow_id");
CREATE INDEX IF NOT EXISTS "connection_project_idx" ON "connection" ("project_id");
CREATE INDEX IF NOT EXISTS "connection_provider_idx" ON "connection" ("provider");


-- Flow-scoped API keys to make flows the top-level container
CREATE TABLE IF NOT EXISTS "flow_api_key" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "key" text NOT NULL,
  "prefix" text NOT NULL,
  "scopes" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "rate_limit" integer,
  "is_active" boolean NOT NULL DEFAULT true,
  "last_used_at" timestamp with time zone,
  "usage_count" integer NOT NULL DEFAULT 0,
  "expires_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "flow_id" text NOT NULL REFERENCES "flow"("id") ON DELETE CASCADE,
  "created_by" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "flow_api_key_flow_idx" ON "flow_api_key" ("flow_id");
CREATE INDEX IF NOT EXISTS "flow_api_key_key_idx" ON "flow_api_key" ("key");
CREATE INDEX IF NOT EXISTS "flow_api_key_active_idx" ON "flow_api_key" ("is_active");


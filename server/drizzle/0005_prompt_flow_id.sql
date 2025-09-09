-- Migrate prompts to be flow-scoped. Adds flow_id column and index.
ALTER TABLE "prompt" ADD COLUMN IF NOT EXISTS "flow_id" text REFERENCES "flow"("id") ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS "prompt_flow_idx" ON "prompt" ("flow_id");

-- Optional: In absence of a clear migration mapping from project->flow, new prompts should set flow_id.
-- Existing rows will have flow_id NULL until a mapping strategy is applied.


-- Flows are top-level: remove project-scoped columns and indexes

-- Flow: drop project_id and its index
ALTER TABLE "flow" DROP COLUMN IF EXISTS "project_id";
DROP INDEX IF EXISTS "flow_project_idx";

-- Prompt: drop project_id and its index
ALTER TABLE "prompt" DROP COLUMN IF EXISTS "project_id";
DROP INDEX IF EXISTS "prompt_project_idx";

-- Trace: drop project_id and its index
ALTER TABLE "trace" DROP COLUMN IF EXISTS "project_id";
DROP INDEX IF EXISTS "trace_project_idx";

-- Dataset: add flow_id, drop project_id, update index
ALTER TABLE "dataset" ADD COLUMN IF NOT EXISTS "flow_id" text;
ALTER TABLE "dataset" DROP COLUMN IF EXISTS "project_id";
DROP INDEX IF EXISTS "dataset_project_idx";
CREATE INDEX IF NOT EXISTS "dataset_flow_idx" ON "dataset" ("flow_id");
ALTER TABLE "dataset" ADD CONSTRAINT dataset_flow_id_fkey FOREIGN KEY ("flow_id") REFERENCES "flow"("id") ON DELETE CASCADE;

-- Connection: drop project_id and its index
ALTER TABLE "connection" DROP COLUMN IF EXISTS "project_id";
DROP INDEX IF EXISTS "connection_project_idx";

-- Note: project and project_member tables remain for now; plan a later migration to drop them once data is migrated.
-- Remove legacy project-level API keys and project tables
DROP TABLE IF EXISTS "api_key" CASCADE;
DROP TABLE IF EXISTS "project_member" CASCADE;
DROP TABLE IF EXISTS "project" CASCADE;
DROP TYPE IF EXISTS "project_member_role";

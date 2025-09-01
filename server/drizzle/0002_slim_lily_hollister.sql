-- Add alias column as nullable first
ALTER TABLE "flow" ADD COLUMN "alias" text;--> statement-breakpoint
-- Add organization_id column as nullable first
ALTER TABLE "flow" ADD COLUMN "organization_id" text;--> statement-breakpoint

-- Update existing flows with generated aliases based on name and a random suffix
UPDATE "flow" SET "alias" = LOWER(REGEXP_REPLACE("name", '[^a-zA-Z0-9]', '-', 'g')) || '-' || SUBSTR(MD5(RANDOM()::text), 1, 8) WHERE "alias" IS NULL;--> statement-breakpoint

-- For organization_id, we'll need to get the first organization ID from projects table
-- This assumes flows are linked to projects which have organization_id
UPDATE "flow" SET "organization_id" = (
  SELECT "organization_id" FROM "project" WHERE "project"."id" = "flow"."project_id" LIMIT 1
) WHERE "organization_id" IS NULL;--> statement-breakpoint

-- Now make the columns NOT NULL
ALTER TABLE "flow" ALTER COLUMN "alias" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "flow" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "flow" ADD CONSTRAINT "flow_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "flow_alias_idx" ON "flow" USING btree ("alias");--> statement-breakpoint
CREATE INDEX "flow_org_idx" ON "flow" USING btree ("organization_id");--> statement-breakpoint
ALTER TABLE "flow" ADD CONSTRAINT "flow_alias_org_unique" UNIQUE("alias","organization_id");
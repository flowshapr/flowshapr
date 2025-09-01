CREATE TYPE "public"."flow_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."project_member_role" AS ENUM('owner', 'admin', 'developer', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."trace_status" AS ENUM('running', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "api_key" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"key" text NOT NULL,
	"prefix" text NOT NULL,
	"scopes" jsonb,
	"rate_limit" integer,
	"last_used_at" timestamp,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"project_id" text NOT NULL,
	"created_by" text NOT NULL,
	CONSTRAINT "api_key_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "dataset" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"data" jsonb NOT NULL,
	"schema" jsonb,
	"metadata" jsonb,
	"tags" jsonb,
	"item_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"project_id" text NOT NULL,
	"created_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flow" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"version" text DEFAULT '1.0.0' NOT NULL,
	"is_latest" boolean DEFAULT true NOT NULL,
	"status" "flow_status" DEFAULT 'draft' NOT NULL,
	"nodes" jsonb NOT NULL,
	"edges" jsonb NOT NULL,
	"metadata" jsonb,
	"config" jsonb,
	"deployment_settings" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"published_at" timestamp,
	"project_id" text NOT NULL,
	"created_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flow_version" (
	"id" text PRIMARY KEY NOT NULL,
	"version" text NOT NULL,
	"changelog" text,
	"nodes" jsonb NOT NULL,
	"edges" jsonb NOT NULL,
	"metadata" jsonb,
	"config" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"flow_id" text NOT NULL,
	"created_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"settings" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"organization_id" text NOT NULL,
	"team_id" text,
	"created_by" text NOT NULL,
	CONSTRAINT "project_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "project_member" (
	"id" text PRIMARY KEY NOT NULL,
	"role" "project_member_role" DEFAULT 'viewer' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"project_id" text NOT NULL,
	"user_id" text NOT NULL,
	"invited_by" text
);
--> statement-breakpoint
CREATE TABLE "prompt" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"template" text NOT NULL,
	"variables" jsonb,
	"tags" jsonb,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"project_id" text NOT NULL,
	"created_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trace" (
	"id" text PRIMARY KEY NOT NULL,
	"execution_id" text NOT NULL,
	"input" jsonb,
	"output" jsonb,
	"node_traces" jsonb,
	"duration" integer,
	"status" "trace_status" DEFAULT 'running' NOT NULL,
	"error_message" text,
	"version" text,
	"user_agent" text,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"flow_id" text NOT NULL,
	"project_id" text NOT NULL,
	"executed_by" text
);
--> statement-breakpoint
ALTER TABLE "api_key" ADD CONSTRAINT "api_key_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_key" ADD CONSTRAINT "api_key_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dataset" ADD CONSTRAINT "dataset_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dataset" ADD CONSTRAINT "dataset_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow" ADD CONSTRAINT "flow_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow" ADD CONSTRAINT "flow_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow_version" ADD CONSTRAINT "flow_version_flow_id_flow_id_fk" FOREIGN KEY ("flow_id") REFERENCES "public"."flow"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow_version" ADD CONSTRAINT "flow_version_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_member" ADD CONSTRAINT "project_member_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_member" ADD CONSTRAINT "project_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_member" ADD CONSTRAINT "project_member_invited_by_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt" ADD CONSTRAINT "prompt_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt" ADD CONSTRAINT "prompt_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trace" ADD CONSTRAINT "trace_flow_id_flow_id_fk" FOREIGN KEY ("flow_id") REFERENCES "public"."flow"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trace" ADD CONSTRAINT "trace_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trace" ADD CONSTRAINT "trace_executed_by_user_id_fk" FOREIGN KEY ("executed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_key_project_idx" ON "api_key" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "api_key_key_idx" ON "api_key" USING btree ("key");--> statement-breakpoint
CREATE INDEX "api_key_active_idx" ON "api_key" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "dataset_project_idx" ON "dataset" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "dataset_name_idx" ON "dataset" USING btree ("name");--> statement-breakpoint
CREATE INDEX "flow_project_idx" ON "flow" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "flow_status_idx" ON "flow" USING btree ("status");--> statement-breakpoint
CREATE INDEX "flow_latest_idx" ON "flow" USING btree ("is_latest");--> statement-breakpoint
CREATE INDEX "flow_version_flow_idx" ON "flow_version" USING btree ("flow_id");--> statement-breakpoint
CREATE INDEX "flow_version_version_idx" ON "flow_version" USING btree ("flow_id","version");--> statement-breakpoint
CREATE INDEX "project_slug_idx" ON "project" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "project_org_idx" ON "project" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "project_team_idx" ON "project" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "project_member_project_user_idx" ON "project_member" USING btree ("project_id","user_id");--> statement-breakpoint
CREATE INDEX "prompt_project_idx" ON "prompt" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "prompt_name_idx" ON "prompt" USING btree ("name");--> statement-breakpoint
CREATE INDEX "trace_flow_idx" ON "trace" USING btree ("flow_id");--> statement-breakpoint
CREATE INDEX "trace_project_idx" ON "trace" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "trace_execution_idx" ON "trace" USING btree ("execution_id");--> statement-breakpoint
CREATE INDEX "trace_status_idx" ON "trace" USING btree ("status");--> statement-breakpoint
CREATE INDEX "trace_created_at_idx" ON "trace" USING btree ("created_at");
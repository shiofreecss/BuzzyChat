CREATE TABLE "nations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"display_name" text NOT NULL,
	"active" boolean DEFAULT true,
	CONSTRAINT "nations_name_unique" UNIQUE("name"),
	CONSTRAINT "nations_code_unique" UNIQUE("code")
);

ALTER TABLE "users" ADD COLUMN "nation" text;

ALTER TABLE "users" ADD COLUMN "preferred_nation" text;

ALTER TABLE "messages" ADD COLUMN "nation_id" integer;

ALTER TABLE "messages" ADD COLUMN "is_global" boolean DEFAULT false; 
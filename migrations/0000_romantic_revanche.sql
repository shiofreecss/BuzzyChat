CREATE TABLE "friends" (
	"id" serial PRIMARY KEY NOT NULL,
	"requestor_address" text NOT NULL,
	"recipient_address" text NOT NULL,
	"status" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"from_address" text NOT NULL,
	"to_address" text,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"read" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "reactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_id" serial NOT NULL,
	"from_address" text NOT NULL,
	"emoji" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"address" text NOT NULL,
	"username" text,
	"nickname" text,
	"is_online" boolean DEFAULT false,
	"last_seen" timestamp DEFAULT now(),
	CONSTRAINT "users_address_unique" UNIQUE("address"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);

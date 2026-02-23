CREATE TABLE IF NOT EXISTS "token_blacklists" (
	"id" serial PRIMARY KEY NOT NULL,
	"token_identifier" varchar(255) NOT NULL,
	"user_id" integer NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "token_blacklists_token_identifier_unique" UNIQUE("token_identifier")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "token_blacklists" ADD CONSTRAINT "token_blacklists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

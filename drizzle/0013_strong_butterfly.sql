CREATE TABLE "sahama_series_progress" (
	"id" text PRIMARY KEY NOT NULL,
	"member_id" text NOT NULL,
	"series_slug" text NOT NULL,
	"done_days" integer DEFAULT 0 NOT NULL,
	"last_done_on" date,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp,
	CONSTRAINT "sahama_series_progress_member_series" UNIQUE("member_id","series_slug")
);
--> statement-breakpoint
ALTER TABLE "sahama_series_progress" ADD CONSTRAINT "sahama_series_progress_member_id_users_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
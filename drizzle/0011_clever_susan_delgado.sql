CREATE TYPE "public"."sahama_origin" AS ENUM('content', 'operator');--> statement-breakpoint
CREATE TYPE "public"."sahama_tier" AS ENUM('free', 'plus');--> statement-breakpoint
CREATE TYPE "public"."sahama_time_of_day" AS ENUM('morning', 'midday', 'evening', 'any');--> statement-breakpoint
CREATE TABLE "sahama_articles" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"origin" "sahama_origin" DEFAULT 'operator' NOT NULL,
	"title" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"body" text NOT NULL,
	"tier" "sahama_tier" DEFAULT 'plus' NOT NULL,
	"image_path" text,
	"published" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sahama_articles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "sahama_checkins" (
	"id" text PRIMARY KEY NOT NULL,
	"member_id" text NOT NULL,
	"suggestion_id" text,
	"ritual_slug" text NOT NULL,
	"note" text NOT NULL,
	"reply" text,
	"replied_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sahama_kept" (
	"id" text PRIMARY KEY NOT NULL,
	"member_id" text NOT NULL,
	"ritual_slug" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sahama_kept_member_ritual" UNIQUE("member_id","ritual_slug")
);
--> statement-breakpoint
CREATE TABLE "sahama_profiles" (
	"member_id" text PRIMARY KEY NOT NULL,
	"concerns" text[] DEFAULT '{}' NOT NULL,
	"usual_minutes" integer NOT NULL,
	"vata" integer NOT NULL,
	"pitta" integer NOT NULL,
	"kapha" integer NOT NULL,
	"dosha_answers" jsonb NOT NULL,
	"dosha_taken_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sahama_rituals" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"origin" "sahama_origin" DEFAULT 'operator' NOT NULL,
	"title" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"body" text NOT NULL,
	"minutes" integer NOT NULL,
	"time_of_day" "sahama_time_of_day" DEFAULT 'any' NOT NULL,
	"doshas" text[] DEFAULT '{}' NOT NULL,
	"concerns" text[] DEFAULT '{}' NOT NULL,
	"tier" "sahama_tier" DEFAULT 'plus' NOT NULL,
	"image_path" text,
	"article_slug" text,
	"published" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sahama_rituals_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "sahama_suggestions" (
	"id" text PRIMARY KEY NOT NULL,
	"member_id" text NOT NULL,
	"ritual_slug" text NOT NULL,
	"minutes" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sahama_weekly_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"member_id" text NOT NULL,
	"week_start" date NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sahama_weekly_reviews_member_week" UNIQUE("member_id","week_start")
);
--> statement-breakpoint
ALTER TABLE "sahama_checkins" ADD CONSTRAINT "sahama_checkins_member_id_users_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sahama_checkins" ADD CONSTRAINT "sahama_checkins_suggestion_id_sahama_suggestions_id_fk" FOREIGN KEY ("suggestion_id") REFERENCES "public"."sahama_suggestions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sahama_kept" ADD CONSTRAINT "sahama_kept_member_id_users_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sahama_profiles" ADD CONSTRAINT "sahama_profiles_member_id_users_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sahama_suggestions" ADD CONSTRAINT "sahama_suggestions_member_id_users_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sahama_weekly_reviews" ADD CONSTRAINT "sahama_weekly_reviews_member_id_users_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sahama_checkins_member_idx" ON "sahama_checkins" USING btree ("member_id","created_at");--> statement-breakpoint
CREATE INDEX "sahama_rituals_published_idx" ON "sahama_rituals" USING btree ("published","tier");--> statement-breakpoint
CREATE INDEX "sahama_suggestions_member_idx" ON "sahama_suggestions" USING btree ("member_id","created_at");
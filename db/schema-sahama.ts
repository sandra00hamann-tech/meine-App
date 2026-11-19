// Sahama Ayurveda — the app's own tables.
//
// Two kinds of rows live here, and the split is the whole design
// (docs/content-authority.md, case 2, and docs/app.md):
//
//  · CONTENT — rituals and articles. Authored by the operator: either in the
//    repo (content/sahama/*.json, written into every environment by the
//    applier scripts/content/appliers/sahama.mjs) or on the admin surface in
//    ONE environment. The `origin` column says which, and the applier only
//    ever touches `origin = 'content'` rows — two writers, never one row.
//
//  · STATE — what one member did: her profile (Dosha result, what occupies
//    her, how much time she has), the cards she was shown, her check-ins and
//    the replies to them, the rituals she kept, her weekly reviews. Keyed on
//    the member and on ritual SLUGS, never on content-row ids, so a ritual
//    re-applied or edited never orphans what somebody did with it.
//    Every one of these tables is personal data: docs/data-protection.md
//    § 16 and lib/privacy/export.ts name them.

import {
  pgTable,
  pgEnum,
  text,
  integer,
  boolean,
  timestamp,
  date,
  jsonb,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { users } from "./schema-core";

/** Who owns a content row — the applier (`content`) or the admin surface (`operator`). */
export const sahamaOriginEnum = pgEnum("sahama_origin", ["content", "operator"]);

/** Free for every signed-in member, or only with the `sahama` plan. */
export const sahamaTierEnum = pgEnum("sahama_tier", ["free", "plus"]);

/** When in the day a ritual fits. `any` fits every time of day. */
export const sahamaTimeOfDayEnum = pgEnum("sahama_time_of_day", [
  "morning",
  "midday",
  "evening",
  "any",
]);

// ── Content ──────────────────────────────────────────────────────────────

export const sahamaRituals = pgTable(
  "sahama_rituals",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    slug: text("slug").notNull().unique(),
    origin: sahamaOriginEnum("origin").notNull().default("operator"),
    title: text("title").notNull(),
    /** One line under the title on the card. */
    summary: text("summary").notNull().default(""),
    /** The ritual itself, as short paragraphs / steps separated by blank lines. */
    body: text("body").notNull(),
    /** How long it takes, in minutes — the card is offered when she has at least this much. */
    minutes: integer("minutes").notNull(),
    timeOfDay: sahamaTimeOfDayEnum("time_of_day").notNull().default("any"),
    /** Doshas it suits especially ("vata" | "pitta" | "kapha"); empty = suits all. */
    doshas: text("doshas").array().notNull().default([]),
    /** Concern codes it answers (lib/sahama/concerns.ts); empty = general. */
    concerns: text("concerns").array().notNull().default([]),
    /**
     * A hint per Dosha, shown under the ritual to members whose result leads
     * with that Dosha: { vata?: string, pitta?: string, kapha?: string }.
     * The same ritual is not right for everyone in the same way — warm cooked
     * food suits Vata, Pitta does well with cooling, fresh food (operator,
     * 2026-11-19).
     */
    doshaTips: jsonb("dosha_tips").$type<Partial<Record<"vata" | "pitta" | "kapha", string>>>().notNull().default({}),
    tier: sahamaTierEnum("tier").notNull().default("plus"),
    /** Media PATH of the card picture (content/media-manifest.json), never a media id. */
    imagePath: text("image_path"),
    /** Slug of the article behind "Mehr dazu", if any. */
    articleSlug: text("article_slug"),
    published: boolean("published").notNull().default(true),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("sahama_rituals_published_idx").on(t.published, t.tier)],
);

export const sahamaArticles = pgTable("sahama_articles", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  slug: text("slug").notNull().unique(),
  origin: sahamaOriginEnum("origin").notNull().default("operator"),
  title: text("title").notNull(),
  summary: text("summary").notNull().default(""),
  body: text("body").notNull(),
  tier: sahamaTierEnum("tier").notNull().default("plus"),
  imagePath: text("image_path"),
  published: boolean("published").notNull().default(true),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── State: one member ────────────────────────────────────────────────────

/** One row per member: the Dosha result and the two start answers. */
export const sahamaProfiles = pgTable("sahama_profiles", {
  memberId: text("member_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  /** Concern codes she picked (lib/sahama/concerns.ts). */
  concerns: text("concerns").array().notNull().default([]),
  /** Minutes she usually has: 5, 10 or 20. */
  usualMinutes: integer("usual_minutes").notNull(),
  /** Dosha shares in percent, summing to 100. */
  vata: integer("vata").notNull(),
  pitta: integer("pitta").notNull(),
  kapha: integer("kapha").notNull(),
  /** Her answers as { questionId: "vata" | "pitta" | "kapha" } — kept so a retake can be compared. */
  doshaAnswers: jsonb("dosha_answers").notNull(),
  doshaTakenAt: timestamp("dosha_taken_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/** Every card Sahama handed her — the basis of "today's ritual" and the weekly review. */
export const sahamaSuggestions = pgTable(
  "sahama_suggestions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    memberId: text("member_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ritualSlug: text("ritual_slug").notNull(),
    /** The minutes she said she had when the card was chosen. */
    minutes: integer("minutes").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("sahama_suggestions_member_idx").on(t.memberId, t.createdAt)],
);

/** A check-in after a ritual, and Sahama's reply to it. The first row dates activation. */
export const sahamaCheckins = pgTable(
  "sahama_checkins",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    memberId: text("member_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    suggestionId: text("suggestion_id").references(() => sahamaSuggestions.id, {
      onDelete: "set null",
    }),
    ritualSlug: text("ritual_slug").notNull(),
    /** What she wrote. */
    note: text("note").notNull(),
    /** Sahama's reply (AI), or null when none was written (free tries used up, or no provider). */
    reply: text("reply"),
    repliedAt: timestamp("replied_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("sahama_checkins_member_idx").on(t.memberId, t.createdAt)],
);

/** Rituals she chose to keep. */
export const sahamaKept = pgTable(
  "sahama_kept",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    memberId: text("member_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ritualSlug: text("ritual_slug").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique("sahama_kept_member_ritual").on(t.memberId, t.ritualSlug)],
);

/** One review per member and week (Monday). */
export const sahamaWeeklyReviews = pgTable(
  "sahama_weekly_reviews",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    memberId: text("member_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    weekStart: date("week_start").notNull(),
    /** The observation Sahama wrote for that week. */
    body: text("body").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique("sahama_weekly_reviews_member_week").on(t.memberId, t.weekStart)],
);

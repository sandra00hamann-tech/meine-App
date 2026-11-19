// Sahama — the operator's content editor: rituals and articles.
//
// Callers are pages and actions under /dashboard/admin/sahama, every one of
// which opens with requireOwner(); the role is re-read there, never taken from
// a form. This file adds no check of its own beyond the rules of the content.
//
// Two origins, one column (docs/app.md → Content authority):
//  · a row the operator creates here is `origin = 'operator'`;
//  · a row she EDITS that came from the repo becomes hers — `origin` flips to
//    'operator', and the applier (scripts/content/appliers/sahama.mjs) leaves
//    it alone from then on. Nothing she typed is ever overwritten by a deploy.
//  · only her own rows can be deleted; a repo row is hidden (published=false),
//    because the next apply would only bring a deleted one back.

import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { sahamaArticles, sahamaRituals } from "@/db/schema";
import { acceptUpload } from "@/lib/media/manage";
import { guardUploadEntry } from "@/lib/media/upload-endpoint";

import {
  CONCERNS,
  DOSHAS,
  MINUTE_OPTIONS,
  TIMES_OF_DAY,
  type Dosha,
  type TimeOfDay,
} from "./catalog";
import { SahamaError } from "./rules";

export type RitualRow = typeof sahamaRituals.$inferSelect;
export type ArticleRow = typeof sahamaArticles.$inferSelect;

/** A media row the operator uploaded here is referenced as `media:<id>` (one environment only). */
export const UPLOADED_IMAGE_PREFIX = "media:";

/** Lowercase, hyphens, umlauts spelled out — the same shape the repo files use. */
export function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60)
      .replace(/-+$/g, "") || "eintrag"
  );
}

export interface RitualInput {
  title: string;
  summary: string;
  body: string;
  minutes: number;
  timeOfDay: TimeOfDay;
  doshas: Dosha[];
  concerns: string[];
  doshaTips: Partial<Record<Dosha, string>>;
  tier: "free" | "plus";
  published: boolean;
  articleSlug: string | null;
  position: number;
}

export interface ArticleInput {
  title: string;
  summary: string;
  body: string;
  tier: "free" | "plus";
  published: boolean;
  position: number;
}

const text = (form: FormData, key: string) =>
  String(form.get(key) ?? "").trim();

/** Reads and checks the ritual form. Throws a SahamaError code on the first problem. */
export function parseRitualForm(form: FormData): RitualInput {
  const title = text(form, "title");
  const body = text(form, "body");
  if (!title || title.length > 120) throw new SahamaError("sahamaTitleMissing");
  if (body.length < 20 || body.length > 6000)
    throw new SahamaError("sahamaBodyMissing");
  const minutes = Number(text(form, "minutes"));
  if (!(MINUTE_OPTIONS as readonly number[]).includes(minutes))
    throw new SahamaError("sahamaMinutesInvalid");
  const timeOfDay = text(form, "timeOfDay") as TimeOfDay;
  const doshaTips: Partial<Record<Dosha, string>> = {};
  for (const d of DOSHAS) {
    const tip = text(form, `tip_${d}`).slice(0, 600);
    if (tip) doshaTips[d] = tip;
  }
  const position = Number(text(form, "position"));
  return {
    title,
    summary: text(form, "summary").slice(0, 200),
    body,
    minutes,
    timeOfDay: (TIMES_OF_DAY as readonly string[]).includes(timeOfDay)
      ? timeOfDay
      : "any",
    doshas: form
      .getAll("doshas")
      .filter((d): d is Dosha => (DOSHAS as readonly unknown[]).includes(d)),
    concerns: form
      .getAll("concerns")
      .filter((c): c is string => (CONCERNS as readonly unknown[]).includes(c)),
    doshaTips,
    tier: text(form, "tier") === "free" ? "free" : "plus",
    published: form.get("published") === "on" || form.get("published") === "1",
    articleSlug: ((s) => (s && s !== "__none" ? s : null))(
      text(form, "articleSlug"),
    ),
    position:
      Number.isInteger(position) && position >= 0 && position < 100000
        ? position
        : 500,
  };
}

export function parseArticleForm(form: FormData): ArticleInput {
  const title = text(form, "title");
  const body = text(form, "body");
  if (!title || title.length > 160) throw new SahamaError("sahamaTitleMissing");
  if (body.length < 20 || body.length > 30000)
    throw new SahamaError("sahamaBodyMissing");
  const position = Number(text(form, "position"));
  return {
    title,
    summary: text(form, "summary").slice(0, 240),
    body,
    tier: text(form, "tier") === "free" ? "free" : "plus",
    published: form.get("published") === "on" || form.get("published") === "1",
    position:
      Number.isInteger(position) && position >= 0 && position < 100000
        ? position
        : 500,
  };
}

// ── Reading ─────────────────────────────────────────────────────────────

export function allRituals(): Promise<RitualRow[]> {
  return db
    .select()
    .from(sahamaRituals)
    .orderBy(asc(sahamaRituals.position), asc(sahamaRituals.title));
}

export function allArticles(): Promise<ArticleRow[]> {
  return db
    .select()
    .from(sahamaArticles)
    .orderBy(asc(sahamaArticles.position), asc(sahamaArticles.title));
}

export async function ritualForEdit(slug: string): Promise<RitualRow | null> {
  const [row] = await db
    .select()
    .from(sahamaRituals)
    .where(eq(sahamaRituals.slug, slug));
  return row ?? null;
}

export async function articleForEdit(slug: string): Promise<ArticleRow | null> {
  const [row] = await db
    .select()
    .from(sahamaArticles)
    .where(eq(sahamaArticles.slug, slug));
  return row ?? null;
}

async function freeSlug(
  table: typeof sahamaRituals | typeof sahamaArticles,
  base: string,
): Promise<string> {
  for (let i = 1; i < 100; i += 1) {
    const candidate = i === 1 && base !== "neu" ? base : `${base}-${i}`;
    const [hit] = await db
      .select({ slug: table.slug })
      .from(table)
      .where(eq(table.slug, candidate));
    if (!hit) return candidate;
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

// ── Writing ─────────────────────────────────────────────────────────────

/** Creates (slug null) or updates a ritual. Every write makes the row the operator's. */
export async function saveRitual(
  slug: string | null,
  input: RitualInput,
  imagePath?: string | null,
): Promise<string> {
  const values = {
    ...input,
    origin: "operator" as const,
    updatedAt: new Date(),
  };
  if (imagePath !== undefined) Object.assign(values, { imagePath });
  if (slug) {
    const [row] = await db
      .update(sahamaRituals)
      .set(values)
      .where(eq(sahamaRituals.slug, slug))
      .returning();
    if (!row) throw new SahamaError("sahamaNoRitual");
    return row.slug;
  }
  const newSlug = await freeSlug(sahamaRituals, slugify(input.title));
  await db
    .insert(sahamaRituals)
    .values({ ...values, slug: newSlug, imagePath: imagePath ?? null });
  return newSlug;
}

export async function saveArticle(
  slug: string | null,
  input: ArticleInput,
): Promise<string> {
  const values = {
    ...input,
    origin: "operator" as const,
    updatedAt: new Date(),
  };
  if (slug) {
    const [row] = await db
      .update(sahamaArticles)
      .set(values)
      .where(eq(sahamaArticles.slug, slug))
      .returning();
    if (!row) throw new SahamaError("sahamaNoArticle");
    return row.slug;
  }
  const newSlug = await freeSlug(sahamaArticles, slugify(input.title));
  await db.insert(sahamaArticles).values({ ...values, slug: newSlug });
  return newSlug;
}

/** Deletes HER ritual. A repo ritual is hidden instead — a deploy would bring it back. */
export async function deleteRitual(slug: string): Promise<void> {
  const row = await ritualForEdit(slug);
  if (!row) return;
  if (row.origin !== "operator") throw new SahamaError("sahamaDeleteOnlyOwn");
  await db.delete(sahamaRituals).where(eq(sahamaRituals.slug, slug));
}

export async function deleteArticle(slug: string): Promise<void> {
  const row = await articleForEdit(slug);
  if (!row) return;
  if (row.origin !== "operator") throw new SahamaError("sahamaDeleteOnlyOwn");
  await db.delete(sahamaArticles).where(eq(sahamaArticles.slug, slug));
}

/**
 * Stores a picture for a ritual through the media pipeline — both guards, in
 * order (docs/visuals.md → Putting files in): the hourly share and the kill
 * switch, then the bytes sniffed, metadata stripped, no SVG. `public`, fixed by
 * this door and never by the form: a card picture gives nothing away.
 */
export async function uploadRitualImage(
  viewer: { memberId: string; role: string },
  file: File,
  alt: string,
): Promise<string> {
  guardUploadEntry(viewer.memberId);
  const row = await acceptUpload({
    ownerId: viewer.memberId,
    role: viewer.role,
    namespace: "sahama",
    category: "ritual",
    visibility: "public",
    bytes: new Uint8Array(await file.arrayBuffer()),
    claimedMime: file.type || null,
    filename: file.name || null,
    alt,
    onlyKinds: ["image"],
  });
  return `${UPLOADED_IMAGE_PREFIX}${row.id}`;
}

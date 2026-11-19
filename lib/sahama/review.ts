// Sahama — kept rituals and the weekly review (both with the plan).
//
// Every function takes the member id from its caller's session. Access is
// hasSahamaPlan() (→ hasPlan(memberId, "sahama")), asked HERE so the page and
// the actions cannot disagree. The review's text is written once per week by
// the task `sahama.review`; the week's numbers are computed live and need no
// model at all.

import { and, asc, desc, eq, gte, inArray, lt } from "drizzle-orm";

import { db } from "@/db";
import {
  sahamaCheckins,
  sahamaKept,
  sahamaRituals,
  sahamaSuggestions,
  sahamaWeeklyReviews,
} from "@/db/schema";
import { runTask } from "@/lib/ai/run";

import { hasSahamaPlan, mayUseRitual } from "./access";
import type { TimeOfDay } from "./catalog";
import { profileFor, sharesOf, weeklyRitual } from "./manage";
import {
  MIN_CHECKINS_FOR_REVIEW,
  buildReviewRequest,
  weekBounds,
  weekNumbers,
  weekStartOf,
  type WeekCheckin,
} from "./review-rules";
import { SahamaError, type DoshaShares } from "./rules";

export type SahamaRitualRow = typeof sahamaRituals.$inferSelect;

async function requirePlan(memberId: string) {
  if (!(await hasSahamaPlan(memberId)))
    throw new SahamaError("sahamaNeedsPlan");
}

// ── Kept rituals ─────────────────────────────────────────────────────────

export async function keptSlugs(memberId: string): Promise<Set<string>> {
  const rows = await db
    .select({ slug: sahamaKept.ritualSlug })
    .from(sahamaKept)
    .where(eq(sahamaKept.memberId, memberId));
  return new Set(rows.map((r) => r.slug));
}

/** Her kept rituals that still exist and are published, newest kept first. */
export async function keptRituals(
  memberId: string,
): Promise<SahamaRitualRow[]> {
  const kept = await db
    .select({ slug: sahamaKept.ritualSlug })
    .from(sahamaKept)
    .where(eq(sahamaKept.memberId, memberId))
    .orderBy(desc(sahamaKept.createdAt));
  if (kept.length === 0) return [];
  const rows = await db
    .select()
    .from(sahamaRituals)
    .where(
      and(
        inArray(
          sahamaRituals.slug,
          kept.map((k) => k.slug),
        ),
        eq(sahamaRituals.published, true),
      ),
    );
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  return kept
    .map((k) => bySlug.get(k.slug))
    .filter((r): r is SahamaRitualRow => Boolean(r));
}

/** Keep or let go of a ritual. Only a ritual she may open can be kept. */
export async function setKept(
  memberId: string,
  slug: string,
  keep: boolean,
): Promise<void> {
  await requirePlan(memberId);
  if (!keep) {
    await db
      .delete(sahamaKept)
      .where(
        and(eq(sahamaKept.memberId, memberId), eq(sahamaKept.ritualSlug, slug)),
      );
    return;
  }
  const [ritual] = await db
    .select({ slug: sahamaRituals.slug })
    .from(sahamaRituals)
    .where(
      and(eq(sahamaRituals.slug, slug), eq(sahamaRituals.published, true)),
    );
  if (!ritual) throw new SahamaError("sahamaNoRitual");
  await db
    .insert(sahamaKept)
    .values({ memberId, ritualSlug: slug })
    .onConflictDoNothing();
}

/** Makes a ritual she may open her card for today ("noch einmal machen"). */
export async function chooseRitualNow(
  memberId: string,
  slug: string,
): Promise<void> {
  const [ritual] = await db
    .select()
    .from(sahamaRituals)
    .where(
      and(eq(sahamaRituals.slug, slug), eq(sahamaRituals.published, true)),
    );
  const holdsPlan = await hasSahamaPlan(memberId);
  const weekly = holdsPlan ? null : ((await weeklyRitual())?.slug ?? null);
  if (!ritual || !mayUseRitual(ritual, holdsPlan, weekly))
    throw new SahamaError("sahamaNoRitual");
  await db
    .insert(sahamaSuggestions)
    .values({ memberId, ritualSlug: slug, minutes: ritual.minutes });
}

// ── The weekly review ────────────────────────────────────────────────────

export async function weekCheckins(
  memberId: string,
  weekStart: string,
): Promise<WeekCheckin[]> {
  const { from, to } = weekBounds(weekStart);
  const rows = await db
    .select({
      at: sahamaCheckins.createdAt,
      note: sahamaCheckins.note,
      title: sahamaRituals.title,
      timeOfDay: sahamaRituals.timeOfDay,
    })
    .from(sahamaCheckins)
    .leftJoin(sahamaRituals, eq(sahamaRituals.slug, sahamaCheckins.ritualSlug))
    .where(
      and(
        eq(sahamaCheckins.memberId, memberId),
        gte(sahamaCheckins.createdAt, from),
        lt(sahamaCheckins.createdAt, to),
      ),
    )
    .orderBy(asc(sahamaCheckins.createdAt));
  return rows.map((r) => ({
    at: r.at,
    note: r.note,
    ritualTitle: r.title ?? "—",
    ritualTimeOfDay: (r.timeOfDay ?? "any") as TimeOfDay,
  }));
}

export async function storedReviews(memberId: string, limit = 6) {
  return db
    .select()
    .from(sahamaWeeklyReviews)
    .where(eq(sahamaWeeklyReviews.memberId, memberId))
    .orderBy(desc(sahamaWeeklyReviews.weekStart))
    .limit(limit);
}

/**
 * Writes Sahama's observation for the CURRENT week, once. Refuses without the
 * plan, with fewer than MIN_CHECKINS_FOR_REVIEW check-ins, or when this week's
 * review exists already.
 */
export async function writeWeeklyReview(
  memberId: string,
  labels: {
    dosha: (shares: DoshaShares) => string;
    time: (t: string) => string;
  },
  now = new Date(),
): Promise<string> {
  await requirePlan(memberId);
  const profile = await profileFor(memberId);
  if (!profile) throw new SahamaError("sahamaNoProfile");
  const weekStart = weekStartOf(now);
  const [existing] = await db
    .select({ body: sahamaWeeklyReviews.body })
    .from(sahamaWeeklyReviews)
    .where(
      and(
        eq(sahamaWeeklyReviews.memberId, memberId),
        eq(sahamaWeeklyReviews.weekStart, weekStart),
      ),
    );
  if (existing) return existing.body;

  const checkins = await weekCheckins(memberId, weekStart);
  if (checkins.length < MIN_CHECKINS_FOR_REVIEW)
    throw new SahamaError("sahamaReviewTooEarly");
  const numbers = weekNumbers(checkins);
  const request = buildReviewRequest({
    dosha: labels.dosha(sharesOf(profile)),
    numbers,
    favouriteTimeLabel: numbers.favouriteTime
      ? labels.time(numbers.favouriteTime)
      : null,
    notes: checkins.map((c, i) => ({
      label: `Check-in ${i + 1} (${c.ritualTitle})`,
      text: c.note,
    })),
  });
  const result = await runTask("sahama.review", { ...request, memberId });
  const body = result.text.trim();
  if (!body) throw new SahamaError("sahamaReviewFailed");
  await db
    .insert(sahamaWeeklyReviews)
    .values({ memberId, weekStart, body })
    .onConflictDoNothing();
  return body;
}

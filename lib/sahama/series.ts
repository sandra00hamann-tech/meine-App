// Sahama — the Ritual-Reihen (series): what exists, where a member stands,
// and the three things she can do (start, mark today's day done, start over).
//
// Gate: an Abo-only feature (docs/plan.md, 2026-11-20). Every act asks
// hasSahamaPlan() — the one access question in lib/sahama/access.ts — and
// refuses with `sahamaNeedsPlan` without it. Reading the list is open to every
// signed-in member: a free member sees what the Abo holds.
//
// The series themselves are repo content (content/sahama/series.json, read
// here, no table); her progress is `sahama_series_progress`, keyed on the
// series slug (docs/data-protection.md § 16).

import { and, desc, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";

import seriesFile from "@/content/sahama/series.json";
import { db } from "@/db";
import { sahamaRituals, sahamaSeriesProgress } from "@/db/schema";

import { hasSahamaPlan } from "./access";
import { berlinDay } from "./review-rules";
import { SahamaError } from "./rules";
import {
  isComingBack,
  parseSeriesFile,
  seriesState,
  type Series,
  type SeriesState,
} from "./series-rules";

const SERIES: Series[] = parseSeriesFile(seriesFile);

export type SeriesProgressRow = typeof sahamaSeriesProgress.$inferSelect;
export type SeriesRitual = typeof sahamaRituals.$inferSelect;

export function allSeries(): Series[] {
  return SERIES;
}

export function seriesBySlug(slug: string): Series | null {
  return SERIES.find((s) => s.slug === slug) ?? null;
}

/** Her progress in every series she ever started, by series slug. */
export async function progressFor(
  memberId: string,
): Promise<Map<string, SeriesProgressRow>> {
  const rows = await db
    .select()
    .from(sahamaSeriesProgress)
    .where(eq(sahamaSeriesProgress.memberId, memberId));
  return new Map(rows.map((r) => [r.seriesSlug, r]));
}

export function stateOf(
  series: Series,
  progress: SeriesProgressRow | null | undefined,
  now = new Date(),
): SeriesState {
  return seriesState(progress ?? null, series.days.length, berlinDay(now));
}

/** The published rituals a series names, by slug. A missing one is absent from the map. */
export async function ritualsOf(
  series: Series,
): Promise<Map<string, SeriesRitual>> {
  const slugs = [...new Set(series.days.map((d) => d.ritual))];
  const rows = await db
    .select()
    .from(sahamaRituals)
    .where(
      and(
        inArray(sahamaRituals.slug, slugs),
        eq(sahamaRituals.published, true),
      ),
    );
  return new Map(rows.map((r) => [r.slug, r]));
}

async function requirePlan(memberId: string): Promise<void> {
  if (!(await hasSahamaPlan(memberId)))
    throw new SahamaError("sahamaNeedsPlan");
}

function requireSeries(slug: string): Series {
  const series = seriesBySlug(slug);
  if (!series) throw new SahamaError("sahamaNoSeries");
  return series;
}

/** Starts a series. Starting one she already runs leaves it where it is. */
export async function startSeries(
  memberId: string,
  slug: string,
): Promise<void> {
  requireSeries(slug);
  await requirePlan(memberId);
  await db
    .insert(sahamaSeriesProgress)
    .values({ memberId, seriesSlug: slug })
    .onConflictDoNothing();
}

/** Starts a series over from day 1 — the page asks first. */
export async function restartSeries(
  memberId: string,
  slug: string,
): Promise<void> {
  requireSeries(slug);
  await requirePlan(memberId);
  await db
    .insert(sahamaSeriesProgress)
    .values({ memberId, seriesSlug: slug })
    .onConflictDoUpdate({
      target: [sahamaSeriesProgress.memberId, sahamaSeriesProgress.seriesSlug],
      set: {
        doneDays: 0,
        lastDoneOn: null,
        finishedAt: null,
        startedAt: new Date(),
        updatedAt: new Date(),
      },
    });
}

/**
 * Marks today's day done. One UPDATE whose WHERE is the whole rule — not yet
 * done today, not finished — so a double click (or a second tab) counts once.
 * Returns the state after the step.
 */
export async function markTodayDone(
  memberId: string,
  slug: string,
  now = new Date(),
): Promise<SeriesState> {
  const series = requireSeries(slug);
  await requirePlan(memberId);
  const today = berlinDay(now);
  const length = series.days.length;
  const [row] = await db
    .update(sahamaSeriesProgress)
    .set({
      doneDays: sql`${sahamaSeriesProgress.doneDays} + 1`,
      lastDoneOn: today,
      updatedAt: now,
      finishedAt: sql`case when ${sahamaSeriesProgress.doneDays} + 1 >= ${length} then now() else null end`,
    })
    .where(
      and(
        eq(sahamaSeriesProgress.memberId, memberId),
        eq(sahamaSeriesProgress.seriesSlug, slug),
        lt(sahamaSeriesProgress.doneDays, length),
        or(
          isNull(sahamaSeriesProgress.lastDoneOn),
          sql`${sahamaSeriesProgress.lastDoneOn} <> ${today}`,
        ),
      ),
    )
    .returning();
  if (!row) throw new SahamaError("sahamaSeriesNotOpen");
  return stateOf(series, row, now);
}

export interface TodayInSeries {
  series: Series;
  /** The open day (1-based), or — when `doneToday` — the day she just did. */
  day: number;
  note: string;
  ritual: SeriesRitual | null;
  comingBack: boolean;
  /**
   * She did today's day already. The card stays on "Heute" and says so: the
   * "erledigt" button lives on that card, and an act whose card vanished
   * would have reported nothing (docs/ux.md: every action reports back).
   */
  doneToday: boolean;
  finished: boolean;
}

/**
 * The series day for the card on "Heute": a day open today wins (the series
 * she touched last, when several run); otherwise the series she did a day of
 * TODAY, so the card can say "erledigt". Null without the plan: the feature
 * is the Abo's, and a free member is not reminded of a series she cannot
 * continue.
 */
export async function todayInSeries(
  memberId: string,
  holdsPlan: boolean,
  now = new Date(),
): Promise<TodayInSeries | null> {
  if (!holdsPlan) return null;
  const today = berlinDay(now);
  const rows = await db
    .select()
    .from(sahamaSeriesProgress)
    .where(
      and(
        eq(sahamaSeriesProgress.memberId, memberId),
        or(
          isNull(sahamaSeriesProgress.finishedAt),
          eq(sahamaSeriesProgress.lastDoneOn, today),
        ),
      ),
    )
    .orderBy(desc(sahamaSeriesProgress.updatedAt));
  let doneTodayPick: TodayInSeries | null = null;
  for (const row of rows) {
    const series = seriesBySlug(row.seriesSlug);
    if (!series) continue;
    const state = stateOf(series, row, now);
    if (state.status === "open") {
      const day = series.days[state.day - 1];
      const rituals = await ritualsOf(series);
      return {
        series,
        day: state.day,
        note: day.note,
        ritual: rituals.get(day.ritual) ?? null,
        comingBack: isComingBack(row, today),
        doneToday: false,
        finished: false,
      };
    }
    if (!doneTodayPick && row.lastDoneOn === today) {
      const doneDay = Math.min(row.doneDays, series.days.length);
      const day = series.days[doneDay - 1];
      const rituals = await ritualsOf(series);
      doneTodayPick = {
        series,
        day: doneDay,
        note: day.note,
        ritual: rituals.get(day.ritual) ?? null,
        comingBack: false,
        doneToday: true,
        finished: state.status === "finished",
      };
    }
  }
  return doneTodayPick;
}

// Sahama — the pure half of the Ritual-Reihen (series): reading the series
// file, and where a member stands in one. No database and no session here
// (series-rules.test.ts).
//
// The rhythm (decided 2026-11-20): one day of a series per calendar day in
// Berlin. She marks today's day done; the next one opens on the following
// day. A pause costs nothing — the series waits where she left it, and the
// page says so without reproach (docs/product-brief.md → "ohne Vorwurf").

export interface SeriesDay {
  ritual: string;
  note: string;
}

export interface Series {
  slug: string;
  title: string;
  summary: string;
  intro: string;
  days: SeriesDay[];
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * The series file, checked. Throws on a shape that would break a page —
 * a missing title, a day without a ritual, a duplicate slug — so a broken
 * file fails the test run rather than a member's first click.
 */
export function parseSeriesFile(data: unknown): Series[] {
  const list = (data as { series?: unknown })?.series;
  if (!Array.isArray(list)) throw new Error("series.json: no `series` list");
  const seen = new Set<string>();
  return list.map((raw, i) => {
    const s = raw as Partial<Series>;
    const where = `series.json: series ${i + 1}`;
    if (typeof s.slug !== "string" || !SLUG.test(s.slug))
      throw new Error(`${where}: slug must be lowercase-with-hyphens`);
    if (seen.has(s.slug))
      throw new Error(`${where}: duplicate slug "${s.slug}"`);
    seen.add(s.slug);
    for (const field of ["title", "summary", "intro"] as const) {
      if (typeof s[field] !== "string" || s[field]!.trim() === "")
        throw new Error(`${where} (${s.slug}): ${field} is missing`);
    }
    if (!Array.isArray(s.days) || s.days.length === 0)
      throw new Error(`${where} (${s.slug}): no days`);
    const days = s.days.map((d, j) => {
      if (typeof d?.ritual !== "string" || !SLUG.test(d.ritual))
        throw new Error(
          `${where} (${s.slug}), day ${j + 1}: ritual slug missing`,
        );
      if (typeof d.note !== "string" || d.note.trim() === "")
        throw new Error(`${where} (${s.slug}), day ${j + 1}: note missing`);
      return { ritual: d.ritual, note: d.note };
    });
    return {
      slug: s.slug,
      title: s.title!,
      summary: s.summary!,
      intro: s.intro!,
      days,
    };
  });
}

export interface SeriesProgressFacts {
  doneDays: number;
  /** "YYYY-MM-DD" (Berlin) of the last day she marked done, or null. */
  lastDoneOn: string | null;
}

export type SeriesState =
  /** Never started. */
  | { status: "notStarted" }
  /** Day `day` (1-based) is open today. */
  | { status: "open"; day: number }
  /** She did today's day; day `nextDay` opens tomorrow. */
  | { status: "doneToday"; nextDay: number }
  /** Every day done. */
  | { status: "finished" };

/** Where she stands in a series of `length` days, on Berlin day `today`. */
export function seriesState(
  progress: SeriesProgressFacts | null,
  length: number,
  today: string,
): SeriesState {
  if (!progress) return { status: "notStarted" };
  const done = Math.max(0, Math.min(progress.doneDays, length));
  if (done >= length) return { status: "finished" };
  if (progress.lastDoneOn === today)
    return { status: "doneToday", nextDay: done + 1 };
  return { status: "open", day: done + 1 };
}

/** Whole Berlin days between two "YYYY-MM-DD" days (b after a → positive). */
export function daysBetween(a: string, b: string): number {
  return Math.round(
    (Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000,
  );
}

/**
 * Did she pause? True when the series is open today and her last done day
 * lies two or more days back — the page then welcomes her back instead of
 * saying nothing.
 */
export function isComingBack(
  progress: SeriesProgressFacts | null,
  today: string,
): boolean {
  if (!progress?.lastDoneOn) return false;
  return daysBetween(progress.lastDoneOn, today) >= 2;
}

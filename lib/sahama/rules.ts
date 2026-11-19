// Sahama — the pure rules: scoring the Dosha test, choosing a ritual card.
//
// No database and no session here, so every rule is tested without either
// (lib/sahama/rules.test.ts). Errors are CODES (SahamaError.code), turned into
// sentences by the page that shows them (messages → errors.*).

import {
  DOSHAS,
  DOSHA_QUESTIONS,
  isConcern,
  isDosha,
  isMinuteOption,
  type Concern,
  type Dosha,
  type DoshaAnswers,
  type MinuteOption,
  type TimeOfDay,
} from "./catalog";

export const SAHAMA_ERROR_CODES = [
  /** Not every Dosha question was answered. */
  "sahamaDoshaIncomplete",
  /** The minutes are not one of MINUTE_OPTIONS. */
  "sahamaMinutesInvalid",
  /** No ritual fits — nothing published, nothing allowed, or nothing short enough. */
  "sahamaNoRitual",
  /** She has no profile yet — the Dosha test comes first. */
  "sahamaNoProfile",
] as const;
export type SahamaErrorCode = (typeof SAHAMA_ERROR_CODES)[number];

export class SahamaError extends Error {
  constructor(public readonly code: SahamaErrorCode) {
    super(code);
    this.name = "SahamaError";
  }
}

export interface DoshaShares {
  vata: number;
  pitta: number;
  kapha: number;
}

/**
 * Turns the twelve answers into percentages that add up to exactly 100.
 * Throws `sahamaDoshaIncomplete` unless every question has a valid answer —
 * a result from half a test would be presented as if it were whole.
 */
export function scoreDosha(answers: DoshaAnswers): DoshaShares {
  const counts: Record<Dosha, number> = { vata: 0, pitta: 0, kapha: 0 };
  for (const question of DOSHA_QUESTIONS) {
    const answer = answers[question];
    if (!isDosha(answer)) throw new SahamaError("sahamaDoshaIncomplete");
    counts[answer] += 1;
  }
  const total = DOSHA_QUESTIONS.length;
  // Largest remainder, so the three shares always sum to 100.
  const raw = DOSHAS.map((d) => ({ d, exact: (counts[d] * 100) / total }));
  const floored = raw.map((r) => ({ ...r, value: Math.floor(r.exact) }));
  let missing = 100 - floored.reduce((sum, r) => sum + r.value, 0);
  const byRemainder = [...floored].sort(
    (a, b) => b.exact - b.value - (a.exact - a.value) || DOSHAS.indexOf(a.d) - DOSHAS.indexOf(b.d),
  );
  for (const r of byRemainder) {
    if (missing <= 0) break;
    r.value += 1;
    missing -= 1;
  }
  const shares = { vata: 0, pitta: 0, kapha: 0 } as DoshaShares;
  for (const r of floored) shares[r.d] = r.value;
  return shares;
}

/**
 * The Doshas that shape her result, strongest first: one; two when the second
 * is within 15 points of the first ("Vata-Pitta"); all three when even the
 * third is (Tridosha — rare, and then every Dosha's hint applies).
 */
export function leadingDoshas(shares: DoshaShares): Dosha[] {
  const sorted = [...DOSHAS].sort((a, b) => shares[b] - shares[a] || DOSHAS.indexOf(a) - DOSHAS.indexOf(b));
  const [first, second, third] = sorted;
  if (shares[first] - shares[third] <= 15) return [first, second, third];
  if (shares[first] - shares[second] <= 15) return [first, second];
  return [first];
}

/** Keeps only known concern codes, each once. */
export function cleanConcerns(values: unknown[]): Concern[] {
  return [...new Set(values.filter(isConcern))];
}

export function parseMinutes(value: unknown): MinuteOption {
  const n = typeof value === "string" ? Number(value) : value;
  if (!isMinuteOption(n)) throw new SahamaError("sahamaMinutesInvalid");
  return n;
}

/** The time of day in Germany — her rituals follow her clock, not the server's. */
export function timeOfDayAt(now: Date, timeZone = "Europe/Berlin"): Exclude<TimeOfDay, "any"> {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone }).format(now),
  );
  if (hour >= 4 && hour < 11) return "morning";
  if (hour >= 11 && hour < 16) return "midday";
  return "evening";
}

export interface RitualForChoice {
  slug: string;
  minutes: number;
  timeOfDay: TimeOfDay;
  doshas: string[];
  concerns: string[];
  position: number;
  /** Whether THIS member may open it — decided by the caller through mayUseTier(). */
  allowed: boolean;
}

export interface ChoiceInput {
  rituals: RitualForChoice[];
  minutes: number;
  leading: Dosha[];
  concerns: string[];
  timeOfDay: Exclude<TimeOfDay, "any">;
  /** Slugs shown recently, newest first — they are offered again only if nothing else fits. */
  recent: string[];
}

/** The score of one ritual for one situation; higher is better. Exported for its tests. */
export function ritualScore(r: RitualForChoice, input: ChoiceInput): number {
  let score = 0;
  if (input.leading[0] && r.doshas.includes(input.leading[0])) score += 3;
  if (input.leading[1] && r.doshas.includes(input.leading[1])) score += 1;
  if (r.doshas.length === 0) score += 1;
  score += 2 * r.concerns.filter((c) => input.concerns.includes(c)).length;
  if (r.timeOfDay === input.timeOfDay) score += 3;
  else if (r.timeOfDay === "any") score += 1;
  else score -= 2;
  // Use the time she has: a 5-minute card for 20 free minutes is a weaker fit.
  if (r.minutes * 2 >= input.minutes) score += 1;
  const seen = input.recent.indexOf(r.slug);
  if (seen !== -1) score -= 10 - Math.min(seen, 5);
  return score;
}

/**
 * Chooses the card for this moment: only rituals she may open and that fit
 * into her minutes, best score first, ties by the operator's order. Throws
 * `sahamaNoRitual` when nothing fits — the page says so rather than showing
 * an empty card.
 */
export function chooseRitual(input: ChoiceInput): string {
  const candidates = input.rituals.filter((r) => r.allowed && r.minutes <= input.minutes);
  if (candidates.length === 0) throw new SahamaError("sahamaNoRitual");
  const ranked = candidates
    .map((r) => ({ r, score: ritualScore(r, input) }))
    .sort((a, b) => b.score - a.score || a.r.position - b.r.position || a.r.slug.localeCompare(b.r.slug));
  return ranked[0].r.slug;
}

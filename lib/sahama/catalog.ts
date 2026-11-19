// Sahama — the fixed vocabularies: Doshas, concerns, minutes, the Dosha test.
//
// Codes only. Every sentence a member reads for these lives in
// messages/<code>.json under `sahama.*` (CLAUDE.md → Languages); this file
// says WHICH questions and answers exist and which Dosha an answer counts for.
// Importable from client components: no database, no server-only code.

export const DOSHAS = ["vata", "pitta", "kapha"] as const;
export type Dosha = (typeof DOSHAS)[number];

/** What can occupy her at the start — each a lifestyle situation, never a complaint. */
export const CONCERNS = [
  "rushed_morning",
  "no_break",
  "hard_to_unwind",
  "afternoon_dip",
  "busy_mind",
  "irregular_meals",
] as const;
export type Concern = (typeof CONCERNS)[number];

/** The time budgets Sahama plans in. */
export const MINUTE_OPTIONS = [5, 10, 20] as const;
export type MinuteOption = (typeof MINUTE_OPTIONS)[number];

export const TIMES_OF_DAY = ["morning", "midday", "evening", "any"] as const;
export type TimeOfDay = (typeof TIMES_OF_DAY)[number];

/**
 * The Dosha test: twelve questions, each answered with the one of three
 * descriptions that fits best. Every answer counts for exactly one Dosha, so
 * the order of the options on screen is the order of DOSHAS.
 *
 * It is an ORIENTATION about one's constitution, and every text says so
 * (messages → sahama.dosha.disclaimer) — never a diagnosis.
 */
export const DOSHA_QUESTIONS = [
  "frame",
  "skin",
  "temperature",
  "appetite",
  "sleep",
  "energy",
  "pace",
  "mind",
  "stress",
  "weather",
  "routine",
  "speech",
] as const;
export type DoshaQuestion = (typeof DOSHA_QUESTIONS)[number];

export type DoshaAnswers = Partial<Record<DoshaQuestion, Dosha>>;

export function isDosha(value: unknown): value is Dosha {
  return typeof value === "string" && (DOSHAS as readonly string[]).includes(value);
}

export function isConcern(value: unknown): value is Concern {
  return typeof value === "string" && (CONCERNS as readonly string[]).includes(value);
}

export function isMinuteOption(value: unknown): value is MinuteOption {
  return typeof value === "number" && (MINUTE_OPTIONS as readonly number[]).includes(value);
}

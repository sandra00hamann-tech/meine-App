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
 * The Dosha test: 24 questions in three parts of eight (body; food, sleep and
 * energy; mind and feeling), each answered with the one of three descriptions
 * that fits best. Every answer counts for exactly one Dosha. Agreed with the
 * operator 2026-11-19 — twelve questions were too few to tell constitution
 * from the mood of the week.
 *
 * It is an ORIENTATION about one's constitution, and every text says so
 * (messages → sahama.dosha.disclaimer) — never a diagnosis.
 */
export const DOSHA_SECTIONS = [
  {
    id: "body",
    questions: [
      "frame",
      "weight",
      "skin",
      "hair",
      "joints",
      "extremities",
      "eyes",
      "temperature",
    ],
  },
  {
    id: "daily",
    questions: [
      "appetite",
      "thirst",
      "afterMeal",
      "taste",
      "sleep",
      "energy",
      "pace",
      "weather",
    ],
  },
  {
    id: "mind",
    questions: [
      "mind",
      "memory",
      "decisions",
      "stress",
      "wellbeing",
      "routine",
      "money",
      "speech",
    ],
  },
] as const;

export const DOSHA_QUESTIONS = DOSHA_SECTIONS.flatMap((s) => s.questions);
export type DoshaQuestion =
  (typeof DOSHA_SECTIONS)[number]["questions"][number];

export type DoshaAnswers = Partial<Record<DoshaQuestion, Dosha>>;

export function isDosha(value: unknown): value is Dosha {
  return (
    typeof value === "string" && (DOSHAS as readonly string[]).includes(value)
  );
}

export function isConcern(value: unknown): value is Concern {
  return (
    typeof value === "string" && (CONCERNS as readonly string[]).includes(value)
  );
}

export function isMinuteOption(value: unknown): value is MinuteOption {
  return (
    typeof value === "number" &&
    (MINUTE_OPTIONS as readonly number[]).includes(value)
  );
}

/**
 * The order the three answers are SHOWN in, per question. Fixed rather than
 * random (a random order differs between server and browser render), and
 * varied so that "the first answer is always Vata" is not a pattern anybody
 * can learn while answering.
 */
const ORDERS: readonly (readonly Dosha[])[] = [
  ["vata", "pitta", "kapha"],
  ["pitta", "kapha", "vata"],
  ["kapha", "vata", "pitta"],
  ["vata", "kapha", "pitta"],
  ["kapha", "pitta", "vata"],
  ["pitta", "vata", "kapha"],
];

export function answerOrder(questionIndex: number): readonly Dosha[] {
  return ORDERS[(questionIndex * 5) % ORDERS.length];
}

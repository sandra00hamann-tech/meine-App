// Sahama — the pure half of the weekly review: which week a moment belongs
// to (in Berlin, Monday to Sunday), what the week's numbers say, and the
// request for Sahama's observation. No database and no provider here
// (review-rules.test.ts). Her check-in notes are the only customer-written
// strings and travel fenced (buildFencedRequest); everything else is
// app-worded facts.

import { buildFencedRequest } from "@/lib/ai/customer-text";

import type { TimeOfDay } from "./catalog";

const TZ = "Europe/Berlin";

/** "YYYY-MM-DD" of a moment's calendar day in Berlin. */
export function berlinDay(at: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
}

/** The Monday ("YYYY-MM-DD") of the Berlin week a moment falls in. */
export function weekStartOf(at: Date): string {
  const day = berlinDay(at);
  const d = new Date(`${day}T12:00:00Z`);
  const weekday = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - weekday);
  return d.toISOString().slice(0, 10);
}

/** The instant a Berlin week starts and ends (for querying), from its Monday. */
export function weekBounds(weekStart: string): { from: Date; to: Date } {
  // Monday 00:00 Berlin. Berlin is UTC+1 or +2; probe both and keep the one
  // whose Berlin day is the Monday at 00:xx.
  const candidates = [-1, -2].map((h) => new Date(`${weekStart}T00:00:00Z`).getTime() + h * 3600_000);
  const fromMs =
    candidates.find((ms) => berlinDay(new Date(ms)) === weekStart && berlinDay(new Date(ms - 1)) !== weekStart) ??
    candidates[0];
  const from = new Date(fromMs);
  const to = new Date(fromMs + 7 * 24 * 3600_000 + 2 * 3600_000); // +2h covers the autumn DST hour
  // Trim `to` back to the next Monday's start.
  const nextMonday = new Date(`${weekStart}T12:00:00Z`);
  nextMonday.setUTCDate(nextMonday.getUTCDate() + 7);
  const nextStart = nextMonday.toISOString().slice(0, 10);
  let toMs = to.getTime();
  while (berlinDay(new Date(toMs - 1)) === nextStart) toMs -= 3600_000;
  return { from, to: new Date(toMs) };
}

export interface WeekCheckin {
  at: Date;
  ritualTitle: string;
  ritualTimeOfDay: TimeOfDay;
  note: string;
}

export interface WeekNumbers {
  checkins: number;
  /** Distinct Berlin days with at least one check-in. */
  days: number;
  /** The time of day she checked in most (by the ritual's time of day; "any" counts by the clock). */
  favouriteTime: Exclude<TimeOfDay, "any"> | null;
  /** Ritual titles, most frequent first, each once. */
  rituals: string[];
}

function clockTime(at: Date): Exclude<TimeOfDay, "any"> {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: TZ }).format(at));
  if (hour >= 4 && hour < 11) return "morning";
  if (hour >= 11 && hour < 16) return "midday";
  return "evening";
}

export function weekNumbers(checkins: WeekCheckin[]): WeekNumbers {
  const days = new Set(checkins.map((c) => berlinDay(c.at)));
  const times: Record<string, number> = {};
  const titles = new Map<string, number>();
  for (const c of checkins) {
    const t = c.ritualTimeOfDay === "any" ? clockTime(c.at) : c.ritualTimeOfDay;
    times[t] = (times[t] ?? 0) + 1;
    titles.set(c.ritualTitle, (titles.get(c.ritualTitle) ?? 0) + 1);
  }
  const order = ["morning", "midday", "evening"] as const;
  let favouriteTime: WeekNumbers["favouriteTime"] = null;
  let best = 0;
  for (const t of order) {
    if ((times[t] ?? 0) > best) {
      best = times[t];
      favouriteTime = t;
    }
  }
  const rituals = [...titles.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  return { checkins: checkins.length, days: days.size, favouriteTime, rituals };
}

/** Enough to write about? One check-in is a moment, not a week. */
export const MIN_CHECKINS_FOR_REVIEW = 2;

export const REVIEW_INSTRUCTION = [
  "Du bist Sahama, die Ayurveda-Begleiterin der App „Sahama Ayurveda“. Du schreibst einer Frau ihren kurzen Wochenrückblick.",
  "",
  "So schreibst du:",
  "- Auf Deutsch, per du, warm und wertschätzend, ohne erhobenen Zeigefinger.",
  "- Vier bis sechs Sätze, keine Überschrift, keine Aufzählung, höchstens ein Emoji.",
  "- Nenne eine konkrete Beobachtung aus den Zahlen und Check-ins der Woche (zum Beispiel, zu welcher Tageszeit sie am häufigsten etwas für sich getan hat oder welches Ritual ihr gutgetan hat).",
  "- Greif auf, was ihr laut ihren Check-ins gutgetan hat. Erfinde nichts, was nicht in den Check-ins steht.",
  "- Schließ mit einer kleinen, freundlichen Anregung für die nächste Woche, die zu ihrem Dosha passt – als Einladung, nicht als Pflicht. Ayurveda als Tradition formulieren („im Ayurveda gilt …“).",
  "- Wenige Check-ins sind kein Grund für Kritik. Jeder Moment für sich zählt.",
  "",
  "Was du nie tust: keine Diagnosen, keine Heilversprechen, keine Kräuter, Präparate, Kuren oder Fasten, keine Vorhersagen, kein Vorschlag für Gespräch, Anruf oder Termin. Wenn sie von echten Beschwerden schreibt, empfiehl freundlich, das ärztlich abklären zu lassen.",
].join("\n");

export function buildReviewRequest(input: {
  dosha: string;
  numbers: WeekNumbers;
  favouriteTimeLabel: string | null;
  notes: { label: string; text: string }[];
}) {
  return buildFencedRequest({
    instruction: REVIEW_INSTRUCTION,
    about: [
      { label: "Ihr Dosha", value: input.dosha },
      { label: "Check-ins diese Woche", value: String(input.numbers.checkins) },
      { label: "An so vielen Tagen", value: String(input.numbers.days) },
      { label: "Häufigste Tageszeit", value: input.favouriteTimeLabel ?? "keine eindeutige" },
      { label: "Rituale der Woche", value: input.numbers.rituals.join("; ") || "keine" },
    ],
    work: input.notes,
    ask: "Schreib ihr jetzt ihren Wochenrückblick.",
  });
}

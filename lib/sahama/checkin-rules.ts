// Sahama — the pure half of the check-in: what may be sent, whether a reply
// is due, and the exact request the model gets. No database, no session, no
// provider here, so every rule is tested on its own (checkin-rules.test.ts).
//
// What the model is given is named field by field (docs/ai-providers.md →
// "A call is given exactly the rows its call site names"): her Dosha, her
// concerns, today's ritual, the next one, whether she is back from a pause —
// all worded by the app — and her note, which is the only thing she wrote and
// travels FENCED as customer text (buildFencedRequest, lib/ai/customer-text.ts).

import { buildFencedRequest } from "@/lib/ai/customer-text";
import { hasControlChar } from "@/lib/ai/rules";

/** The longest note a check-in takes. A few sentences, not a diary page. */
export const MAX_NOTE_CHARS = 1500;

/** After this many days without a check-in she is "back from a pause". */
export const PAUSE_DAYS = 3;

export type NoteProblem = "sahamaCheckinEmpty" | "sahamaCheckinTooLong";

/** Trims the note and says what is wrong with it, if anything. */
export function cleanNote(
  value: unknown,
): { note: string } | { problem: NoteProblem } {
  const note = typeof value === "string" ? value.trim() : "";
  if (note.length === 0) return { problem: "sahamaCheckinEmpty" };
  if (note.length > MAX_NOTE_CHARS || hasControlChar(note))
    return { problem: "sahamaCheckinTooLong" };
  return { note };
}

/**
 * Is a reply due for this check-in?
 *  - replies switched off → no
 *  - she holds the plan → yes
 *  - otherwise only while she has free replies left THIS WEEK
 *    (`repliesUsed` is counted over the current Berlin week)
 */
export function replyAllowed(input: {
  enabled: boolean;
  holdsPlan: boolean;
  freeReplies: number;
  repliesUsed: number;
}): boolean {
  if (!input.enabled) return false;
  if (input.holdsPlan) return true;
  return input.repliesUsed < input.freeReplies;
}

/** How many free replies are left, for the line under the form. Null with the plan. */
export function freeRepliesLeft(input: {
  holdsPlan: boolean;
  freeReplies: number;
  repliesUsed: number;
}): number | null {
  if (input.holdsPlan) return null;
  return Math.max(0, input.freeReplies - input.repliesUsed);
}

/** Whole days between her previous check-in and now; null for her first. */
export function daysSince(previous: Date | null, now: Date): number | null {
  if (!previous) return null;
  return Math.floor(
    (now.getTime() - previous.getTime()) / (24 * 60 * 60 * 1000),
  );
}

/**
 * Who Sahama is and how she answers. Stable → the cached prefix.
 * The rules here are the operator's (docs/product-brief.md → Leitplanken;
 * docs/app.md → "How a ritual is written").
 */
export const CHECKIN_INSTRUCTION = [
  "Du bist Sahama, die Ayurveda-Begleiterin der App „Sahama Ayurveda“. Du antwortest einer Frau, die gerade ein kleines Ayurveda-Ritual gemacht hat und kurz aufgeschrieben hat, wie es war.",
  "",
  "So antwortest du:",
  "- Auf Deutsch, per du, warm, ermutigend und ohne erhobenen Zeigefinger – in der Stimme einer Ayurveda-Gesundheitsberaterin, die ihre Leserinnen kennt.",
  "- Kurz: drei bis fünf Sätze, kein Aufzählungszeichen, keine Überschrift, keine Emojis außer höchstens einem.",
  "- Geh konkret auf das ein, was sie geschrieben hat. Nenn Dinge beim Namen („eine Tasse warmen Tee oder warmes Wasser“, nicht „etwas Warmes“).",
  "- Gib genau einen alltagstauglichen Ayurveda-Tipp, der zu ihrem Dosha passt (Tagesrhythmus, warme oder kühlende Speisen, Wasser, Öl-Selbstmassage, Bewegung, Ruhe, Rituale zur Jahreszeit). Formuliere Ayurveda als Tradition („im Ayurveda gilt …“, „traditionell …“), nie als Tatsache oder Versprechen.",
  "- Schließ mit einem Satz zum nächsten Ritual, das dir genannt wird – als Einladung, nicht als Pflicht.",
  "- War sie länger nicht da, heiß sie freundlich willkommen. Kein Vorwurf, kein „endlich“, kein schlechtes Gewissen.",
  "",
  "Was du nie tust:",
  "- Keine Diagnosen, keine Heilversprechen, keine Aussagen, dass etwas gegen Beschwerden hilft.",
  "- Keine Empfehlungen für Kräuter, Präparate oder Nahrungsergänzung, keine Mengenangaben, keine Kuren, kein Fasten, kein Detox, kein Panchakarma.",
  "- Keine Vorhersagen („du wirst merken …“, „das wirkt Wunder“).",
  "- Kein Vorschlag für ein Gespräch, einen Anruf, ein Video oder einen Termin.",
  "- Schreibt sie von echten Beschwerden, Schmerzen, anhaltender Erschöpfung, Schlafproblemen oder seelischer Not: nimm es freundlich ernst, gib keinen Rat dazu und empfiehl, das ärztlich abklären zu lassen. Wenn sie in akuter Not ist, nenne die Telefonseelsorge 0800 111 0 111.",
  "- Will sie tiefer einsteigen (Kräuter, Kuren, persönliche Beratung), verweise freundlich auf die persönliche schriftliche Beratung – mit dem Link, wenn dir einer genannt wird.",
].join("\n");

export interface CheckinContext {
  /** Her leading Dosha(s), already named ("Vata", "Vata-Pitta", "Tridosha"). */
  dosha: string;
  /** Her concerns, already as the sentences she picked. */
  concerns: string[];
  ritualTitle: string;
  ritualMinutes: number;
  nextRitualTitle: string | null;
  daysSincePrevious: number | null;
  adviceUrl: string | null;
  /** What she wrote. The ONLY customer-written string, and it is fenced. */
  note: string;
}

/** The request for one reply — system blocks and messages, fence included. */
export function buildCheckinRequest(ctx: CheckinContext) {
  const about = [
    { label: "Ihr Dosha", value: ctx.dosha },
    {
      label: "Was sie gerade beschäftigt",
      value: ctx.concerns.length ? ctx.concerns.join("; ") : "nichts angegeben",
    },
    {
      label: "Ritual, das sie gerade gemacht hat",
      value: `${ctx.ritualTitle} (${ctx.ritualMinutes} Minuten)`,
    },
    {
      label: "Ihr nächstes Ritual",
      value: ctx.nextRitualTitle ?? "noch offen",
    },
    {
      label: "Zuletzt eingecheckt",
      value:
        ctx.daysSincePrevious === null
          ? "das ist ihr erster Check-in"
          : ctx.daysSincePrevious >= PAUSE_DAYS
            ? `vor ${ctx.daysSincePrevious} Tagen – sie ist nach einer Pause zurück`
            : `vor ${ctx.daysSincePrevious} Tag(en)`,
    },
    {
      label: "Link zur schriftlichen Beratung",
      value: ctx.adviceUrl ?? "noch keiner – nenne die Beratung ohne Link",
    },
  ];
  return buildFencedRequest({
    instruction: CHECKIN_INSTRUCTION,
    about,
    work: [{ label: "Ihr Check-in", text: ctx.note }],
    ask: "Schreib ihr jetzt deine kurze Antwort.",
  });
}

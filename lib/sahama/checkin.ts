// Sahama — the check-in: save her note, write the reply when one is due,
// and line up her next ritual card.
//
// Order, and why (docs/ai-providers.md → "What it costs, and in which order"):
//   profile + current card → note valid → under the rate limit →
//   SAVE THE NOTE → reply due? (plan, or free replies left) → the call → save reply
// The note is written BEFORE the model is asked, so a provider outage never
// loses what she wrote; a failed reply leaves `reply` null and the page says so.
// The member id comes from the caller's session (requireActiveUser), never a form.

import { and, count, desc, eq, isNotNull, lt } from "drizzle-orm";

import { db } from "@/db";
import { sahamaCheckins, sahamaSuggestions } from "@/db/schema";
import { runTask } from "@/lib/ai/run";
import { isLimited, record, type Limit } from "@/lib/rate-limit";

import { hasSahamaPlan } from "./access";
import { buildCheckinRequest, cleanNote, daysSince, freeRepliesLeft, replyAllowed } from "./checkin-rules";
import { sahamaConfig } from "./config";
import { currentRitual, profileFor, sharesOf, suggestRitual } from "./manage";
import { SahamaError } from "./rules";

const BUCKET = "sahama-checkin";
/** A cost brake, not a security control: ten check-ins an hour is plenty. */
const LIMIT: Limit = { max: 10, windowMs: 60 * 60 * 1000 };

export type CheckinRow = typeof sahamaCheckins.$inferSelect;

export interface CheckinOutcome {
  checkin: CheckinRow;
  /** Why there is no reply, when there is none. */
  noReply: null | "switchedOff" | "noFreeRepliesLeft" | "replyFailed";
  nextRitualTitle: string | null;
}

/** Replies she has already received — what the free tries are counted against. */
export async function repliesUsed(memberId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(sahamaCheckins)
    .where(and(eq(sahamaCheckins.memberId, memberId), isNotNull(sahamaCheckins.reply)));
  return Number(row?.n ?? 0);
}

/** Her latest check-ins, newest first. */
export async function recentCheckins(memberId: string, limit = 5): Promise<CheckinRow[]> {
  return db
    .select()
    .from(sahamaCheckins)
    .where(eq(sahamaCheckins.memberId, memberId))
    .orderBy(desc(sahamaCheckins.createdAt))
    .limit(limit);
}

/** What the form needs to say under itself. */
export async function checkinStatus(memberId: string) {
  const config = sahamaConfig();
  const holdsPlan = await hasSahamaPlan(memberId);
  const used = await repliesUsed(memberId);
  return {
    repliesOn: config.checkinReplies,
    freeLeft: freeRepliesLeft({ holdsPlan, freeReplies: config.freeReplies, repliesUsed: used }),
  };
}

export async function checkIn(
  memberId: string,
  rawNote: unknown,
  labels: { dosha: (shares: ReturnType<typeof sharesOf>) => string; concern: (code: string) => string },
): Promise<CheckinOutcome> {
  const profile = await profileFor(memberId);
  if (!profile) throw new SahamaError("sahamaNoProfile");
  const current = await currentRitual(memberId);
  if (!current) throw new SahamaError("sahamaNoRitual");

  const cleaned = cleanNote(rawNote);
  if ("problem" in cleaned) throw new SahamaError(cleaned.problem);

  if (isLimited(BUCKET, memberId, LIMIT)) throw new SahamaError("sahamaCheckinTooOften");
  record(BUCKET, memberId, LIMIT);

  const now = new Date();
  const [previous] = await db
    .select({ at: sahamaCheckins.createdAt })
    .from(sahamaCheckins)
    .where(and(eq(sahamaCheckins.memberId, memberId), lt(sahamaCheckins.createdAt, now)))
    .orderBy(desc(sahamaCheckins.createdAt))
    .limit(1);

  // Which suggestion this check-in belongs to: her current card's.
  const [suggestion] = await db
    .select({ id: sahamaSuggestions.id })
    .from(sahamaSuggestions)
    .where(and(eq(sahamaSuggestions.memberId, memberId), eq(sahamaSuggestions.ritualSlug, current.ritual.slug)))
    .orderBy(desc(sahamaSuggestions.createdAt))
    .limit(1);

  // 1. Save the note — before anything can fail.
  const [checkin] = await db
    .insert(sahamaCheckins)
    .values({ memberId, suggestionId: suggestion?.id ?? null, ritualSlug: current.ritual.slug, note: cleaned.note })
    .returning();

  // 2. Her next card, so the reply can invite her to it.
  let nextRitualTitle: string | null = null;
  try {
    nextRitualTitle = (await suggestRitual(memberId, profile.usualMinutes, now)).title;
  } catch (error) {
    if (!(error instanceof SahamaError)) throw error;
  }

  // 3. Is a reply due?
  const config = sahamaConfig();
  const holdsPlan = await hasSahamaPlan(memberId);
  if (!config.checkinReplies) return { checkin, noReply: "switchedOff", nextRitualTitle };
  const used = await repliesUsed(memberId);
  if (!replyAllowed({ enabled: true, holdsPlan, freeReplies: config.freeReplies, repliesUsed: used })) {
    return { checkin, noReply: "noFreeRepliesLeft", nextRitualTitle };
  }

  // 4. The call. A failure keeps the note and says so; it never throws at her.
  try {
    const request = buildCheckinRequest({
      dosha: labels.dosha(sharesOf(profile)),
      concerns: profile.concerns.map(labels.concern),
      ritualTitle: current.ritual.title,
      ritualMinutes: current.ritual.minutes,
      nextRitualTitle,
      daysSincePrevious: daysSince(previous?.at ?? null, now),
      adviceUrl: config.adviceUrl,
      note: cleaned.note,
    });
    const result = await runTask("sahama.checkin", { ...request, memberId });
    const reply = result.text.trim();
    if (!reply) return { checkin, noReply: "replyFailed", nextRitualTitle };
    const [saved] = await db
      .update(sahamaCheckins)
      .set({ reply, repliedAt: new Date() })
      .where(and(eq(sahamaCheckins.id, checkin.id), eq(sahamaCheckins.memberId, memberId)))
      .returning();
    return { checkin: saved, noReply: null, nextRitualTitle };
  } catch (error) {
    console.error("[sahama] check-in reply failed:", error);
    return { checkin, noReply: "replyFailed", nextRitualTitle };
  }
}


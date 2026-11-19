// Sahama — the database half: profiles, ritual cards, suggestions.
//
// Every function takes the member id from its CALLER, and every caller is a
// page or action that got it from requireActiveUser() — never from a form.
// The choices themselves are lib/sahama/rules.ts; this file only reads and
// writes.

import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { sahamaProfiles, sahamaRituals, sahamaSuggestions } from "@/db/schema";

import type { Concern, DoshaAnswers, MinuteOption, TimeOfDay } from "./catalog";
import { hasSahamaPlan, mayUseTier } from "./access";
import {
  SahamaError,
  chooseRitual,
  leadingDoshas,
  scoreDosha,
  timeOfDayAt,
  type DoshaShares,
} from "./rules";

export type SahamaProfile = typeof sahamaProfiles.$inferSelect;
export type SahamaRitual = typeof sahamaRituals.$inferSelect;

export async function profileFor(memberId: string): Promise<SahamaProfile | null> {
  const [row] = await db.select().from(sahamaProfiles).where(eq(sahamaProfiles.memberId, memberId));
  return row ?? null;
}

export function sharesOf(profile: SahamaProfile): DoshaShares {
  return { vata: profile.vata, pitta: profile.pitta, kapha: profile.kapha };
}

/**
 * Saves the Dosha test and the two start answers (insert, or replace on a
 * retake). Scoring throws `sahamaDoshaIncomplete` BEFORE anything is written.
 */
export async function saveStart(
  memberId: string,
  input: { answers: DoshaAnswers; concerns: Concern[]; minutes: MinuteOption },
): Promise<SahamaProfile> {
  const shares = scoreDosha(input.answers);
  const values = {
    concerns: input.concerns,
    usualMinutes: input.minutes,
    ...shares,
    doshaAnswers: input.answers,
    doshaTakenAt: new Date(),
    updatedAt: new Date(),
  };
  const [row] = await db
    .insert(sahamaProfiles)
    .values({ memberId, ...values })
    .onConflictDoUpdate({ target: sahamaProfiles.memberId, set: values })
    .returning();
  return row;
}

/**
 * Chooses a ritual for this member and moment, records it as her current
 * card, and returns it. Free members choose among free rituals only.
 */
export async function suggestRitual(
  memberId: string,
  minutes: number,
  now = new Date(),
): Promise<SahamaRitual> {
  const profile = await profileFor(memberId);
  if (!profile) throw new SahamaError("sahamaNoProfile");
  const holdsPlan = await hasSahamaPlan(memberId);

  const rituals = await db
    .select()
    .from(sahamaRituals)
    .where(eq(sahamaRituals.published, true))
    .orderBy(asc(sahamaRituals.position));
  const recent = await db
    .select({ slug: sahamaSuggestions.ritualSlug })
    .from(sahamaSuggestions)
    .where(eq(sahamaSuggestions.memberId, memberId))
    .orderBy(desc(sahamaSuggestions.createdAt))
    .limit(6);

  const slug = chooseRitual({
    rituals: rituals.map((r) => ({
      slug: r.slug,
      minutes: r.minutes,
      timeOfDay: r.timeOfDay as TimeOfDay,
      doshas: r.doshas,
      concerns: r.concerns,
      position: r.position,
      allowed: mayUseTier(r.tier, holdsPlan),
    })),
    minutes,
    leading: leadingDoshas(sharesOf(profile)),
    concerns: profile.concerns,
    timeOfDay: timeOfDayAt(now),
    recent: recent.map((r) => r.slug),
  });

  await db.insert(sahamaSuggestions).values({ memberId, ritualSlug: slug, minutes });
  return rituals.find((r) => r.slug === slug)!;
}

/**
 * Her current card: the latest suggestion, if its ritual still exists, is
 * published and is still hers to open (a plan that ended takes plus cards
 * with it). Null otherwise — the page then offers a new card.
 */
export async function currentRitual(
  memberId: string,
): Promise<{ ritual: SahamaRitual; minutes: number; shownAt: Date } | null> {
  const [latest] = await db
    .select({ slug: sahamaSuggestions.ritualSlug, minutes: sahamaSuggestions.minutes, at: sahamaSuggestions.createdAt })
    .from(sahamaSuggestions)
    .where(eq(sahamaSuggestions.memberId, memberId))
    .orderBy(desc(sahamaSuggestions.createdAt))
    .limit(1);
  if (!latest) return null;
  const [ritual] = await db
    .select()
    .from(sahamaRituals)
    .where(and(eq(sahamaRituals.slug, latest.slug), eq(sahamaRituals.published, true)));
  if (!ritual) return null;
  if (!mayUseTier(ritual.tier, await hasSahamaPlan(memberId))) return null;
  return { ritual, minutes: latest.minutes, shownAt: latest.at };
}

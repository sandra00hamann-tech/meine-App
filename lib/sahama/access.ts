// Sahama — the ONE access question for content: may this member open it?
//
// Free content is open to every signed-in member; `plus` content needs the
// `sahama` plan. The page, the card chooser and (later) the assistant's
// content source all ask HERE, never a second hasPlan() of their own — two
// checks that agree today are two checks that drift (CLAUDE.md → Content
// sources). Access comes from the entitlement API, never a billing table.
// Rituals ask mayUseRitual(), which adds the weekly free ritual to the tier.

import { hasPlan } from "@/lib/entitlements/manage";

/** The Product Key of the Sahama subscription (config/digistore-products.json). */
export const SAHAMA_PLAN = "sahama";

export type SahamaTier = "free" | "plus";

/** Does this member hold the subscription? Asked once per request and passed on. */
export async function hasSahamaPlan(memberId: string): Promise<boolean> {
  return hasPlan(memberId, SAHAMA_PLAN);
}

/** May a member with (or without) the plan open content of this tier? */
export function mayUseTier(tier: SahamaTier, holdsPlan: boolean): boolean {
  return tier === "free" || holdsPlan;
}

/**
 * The "Ritual der Woche": every Berlin week one subscription ritual is open to
 * everybody (operator, 2026-11-19 — the free tier has to stay alive over
 * months, not run out after a week). Rotates through all plus rituals in the
 * operator's order, one per week, so none repeats before all have had a turn.
 */
const ROTATION_START = Date.UTC(2026, 0, 5); // a Monday

export function weeklyRitualSlug(
  plusSlugsInOrder: readonly string[],
  weekStart: string,
): string | null {
  if (plusSlugsInOrder.length === 0) return null;
  const weeks = Math.floor(
    (Date.parse(`${weekStart}T00:00:00Z`) - ROTATION_START) /
      (7 * 24 * 3600 * 1000),
  );
  const n = plusSlugsInOrder.length;
  return plusSlugsInOrder[((weeks % n) + n) % n];
}

/** May she open this ritual? Free ones, this week's ritual, or anything with the plan. */
export function mayUseRitual(
  ritual: { tier: SahamaTier; slug: string },
  holdsPlan: boolean,
  weeklySlug: string | null,
): boolean {
  return mayUseTier(ritual.tier, holdsPlan) || ritual.slug === weeklySlug;
}

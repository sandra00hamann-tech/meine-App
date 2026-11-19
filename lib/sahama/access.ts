// Sahama — the ONE access question for content: may this member open it?
//
// Free content is open to every signed-in member; `plus` content needs the
// `sahama` plan. The page, the card chooser and (later) the assistant's
// content source all ask HERE, never a second hasPlan() of their own — two
// checks that agree today are two checks that drift (CLAUDE.md → Content
// sources). Access comes from the entitlement API, never a billing table.

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

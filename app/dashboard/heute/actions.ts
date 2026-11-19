"use server";

// "How much time do you have right now?" — chooses a new ritual card for the
// minutes she picked. The member is the session's; the minutes are validated
// against MINUTE_OPTIONS before anything is chosen.

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { requireActiveUser } from "@/lib/authz";
import { suggestRitual } from "@/lib/sahama/manage";
import { SahamaError, parseMinutes } from "@/lib/sahama/rules";

export type { ActionState } from "@/lib/action-state";
import type { ActionState } from "@/lib/action-state";

export async function newCardAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const session = await requireActiveUser();
  const t = await getTranslations("errors");
  try {
    const minutes = parseMinutes(form.get("minutes"));
    const ritual = await suggestRitual(session.user.id, minutes);
    revalidatePath("/dashboard/heute");
    revalidatePath("/dashboard");
    return { error: null, ok: ritual.title };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof SahamaError) return { error: t(error.code), ok: null };
    console.error("[sahama] choosing a new card failed:", error);
    return { error: t("unknown"), ok: null };
  }
}

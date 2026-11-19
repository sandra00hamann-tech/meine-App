"use server";

// The Dosha test's one action: save the answers and the two start questions,
// choose her first ritual card, and send her to it.
//
// SECURITY: requireActiveUser() first — a server action is an endpoint of its
// own. The member is ALWAYS the session's; nothing here reads an id from the
// form. The scoring and the choice are lib/sahama/rules.ts; codes become
// sentences here, in the language of the member clicking.

import { redirect, unstable_rethrow } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { requireActiveUser } from "@/lib/authz";
import { DOSHA_QUESTIONS, type DoshaAnswers } from "@/lib/sahama/catalog";
import { saveStart, suggestRitual } from "@/lib/sahama/manage";
import { SahamaError, cleanConcerns, parseMinutes } from "@/lib/sahama/rules";

export type { ActionState } from "@/lib/action-state";
import type { ActionState } from "@/lib/action-state";

export async function saveDoshaAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const session = await requireActiveUser();
  try {
    const answers: DoshaAnswers = {};
    for (const q of DOSHA_QUESTIONS) {
      const value = form.get(`q_${q}`);
      if (typeof value === "string") answers[q] = value as DoshaAnswers[typeof q];
    }
    const minutes = parseMinutes(form.get("minutes"));
    const concerns = cleanConcerns(form.getAll("concerns"));

    await saveStart(session.user.id, { answers, concerns, minutes });
    await suggestRitual(session.user.id, minutes);
  } catch (error) {
    unstable_rethrow(error);
    const t = await getTranslations("errors");
    if (error instanceof SahamaError) return { error: t(error.code), ok: null };
    console.error("[sahama] saving the Dosha test failed:", error);
    return { error: t("unknown"), ok: null };
  }
  revalidatePath("/dashboard");
  // `start` is a reference, not a message: /dashboard/heute checks that a
  // profile exists and only then says what happened (FlashToast).
  redirect("/dashboard/heute?start=1");
}

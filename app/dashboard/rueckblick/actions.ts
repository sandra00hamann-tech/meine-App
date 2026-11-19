"use server";

// The review page's actions: write this week's review, and make a kept
// ritual today's card again. requireActiveUser() first on each; the member is
// the session's, the plan is checked inside lib/sahama/review.ts.

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { requireActiveUser } from "@/lib/authz";
import { chooseRitualNow, writeWeeklyReview } from "@/lib/sahama/review";
import { SahamaError, leadingDoshas } from "@/lib/sahama/rules";

export type { ActionState } from "@/lib/action-state";
import type { ActionState } from "@/lib/action-state";

export async function writeReviewAction(_prev: ActionState, _form: FormData): Promise<ActionState> {
  const session = await requireActiveUser();
  const t = await getTranslations("sahama");
  try {
    const body = await writeWeeklyReview(session.user.id, {
      dosha: (shares) => {
        const lead = leadingDoshas(shares);
        return lead.length === 3 ? t("dosha.result.triTitle") : lead.map((d) => t(`doshaName.${d}`)).join("-");
      },
      time: (time) => t(`review.favouriteTime.${time}`),
    });
    revalidatePath("/dashboard/rueckblick");
    return { error: null, ok: body };
  } catch (error) {
    unstable_rethrow(error);
    const te = await getTranslations("errors");
    if (error instanceof SahamaError) return { error: te(error.code), ok: null };
    console.error("[sahama] weekly review failed:", error);
    return { error: te("sahamaReviewFailed"), ok: null };
  }
}

export async function againTodayAction(form: FormData): Promise<void> {
  const session = await requireActiveUser();
  const slug = String(form.get("slug") ?? "");
  try {
    await chooseRitualNow(session.user.id, slug);
  } catch (error) {
    unstable_rethrow(error);
    if (!(error instanceof SahamaError)) throw error;
    redirect("/dashboard/rueckblick");
  }
  revalidatePath("/dashboard/heute");
  // `again` is a reference: /dashboard/heute only says something when it is set.
  redirect("/dashboard/heute?again=1");
}

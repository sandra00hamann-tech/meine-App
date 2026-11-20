"use server";

// The Ritual-Reihen's acts: start, mark today's day done, start over, and
// "take today's ritual as my card". Every one opens with requireActiveUser();
// the member is the session's, the series a slug from the form that
// lib/sahama/series.ts looks up and gates (hasSahamaPlan) itself.

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { requireActiveUser } from "@/lib/authz";
import { chooseRitualNow } from "@/lib/sahama/review";
import { SahamaError } from "@/lib/sahama/rules";
import {
  markTodayDone,
  restartSeries,
  seriesBySlug,
  startSeries,
} from "@/lib/sahama/series";

import type { ActionState } from "@/lib/action-state";

function refresh(slug: string) {
  revalidatePath("/dashboard/reihen");
  revalidatePath(`/dashboard/reihen/${slug}`);
  revalidatePath("/dashboard/heute");
  revalidatePath("/dashboard");
}

async function failure(error: unknown, what: string): Promise<ActionState> {
  unstable_rethrow(error);
  const te = await getTranslations("errors");
  if (error instanceof SahamaError) return { error: te(error.code), ok: null };
  console.error(`[sahama] series ${what} failed:`, error);
  return { error: te("unknown"), ok: null };
}

export async function startSeriesAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const session = await requireActiveUser();
  const slug = String(form.get("slug") ?? "");
  const t = await getTranslations("sahama.series");
  try {
    await startSeries(session.user.id, slug);
    refresh(slug);
    return { error: null, ok: t("startedToast") };
  } catch (error) {
    return failure(error, "start");
  }
}

export async function markDoneAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const session = await requireActiveUser();
  const slug = String(form.get("slug") ?? "");
  const t = await getTranslations("sahama.series");
  try {
    const state = await markTodayDone(session.user.id, slug);
    refresh(slug);
    return {
      error: null,
      ok: state.status === "finished" ? t("finishedToast") : t("doneToast"),
    };
  } catch (error) {
    return failure(error, "mark done");
  }
}

/** From the AlertDialog — progress is reset, the page says so with a toast. */
export async function restartSeriesAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const session = await requireActiveUser();
  const slug = String(form.get("slug") ?? "");
  const t = await getTranslations("sahama.series");
  try {
    await restartSeries(session.user.id, slug);
    refresh(slug);
    return { error: null, ok: t("restartedToast") };
  } catch (error) {
    return failure(error, "restart");
  }
}

/**
 * "Als Karte für heute nehmen" — today's series ritual becomes her card on
 * Heute, where the check-in lives. A plain form action: it leaves for Heute,
 * which says so through its `again` flash (a reference, not a message).
 */
export async function takeAsTodayAction(form: FormData): Promise<void> {
  const session = await requireActiveUser();
  const slug = String(form.get("slug") ?? "");
  const ritual = String(form.get("ritual") ?? "");
  const series = seriesBySlug(slug);
  if (!series || !series.days.some((d) => d.ritual === ritual)) {
    redirect("/dashboard/reihen");
  }
  try {
    await chooseRitualNow(session.user.id, ritual);
  } catch (error) {
    unstable_rethrow(error);
    if (!(error instanceof SahamaError)) throw error;
    redirect(`/dashboard/reihen/${slug}`);
  }
  revalidatePath("/dashboard/heute");
  redirect("/dashboard/heute?again=1");
}

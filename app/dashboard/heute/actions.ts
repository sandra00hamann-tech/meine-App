"use server";

// "How much time do you have right now?" — chooses a new ritual card for the
// minutes she picked. The member is the session's; the minutes are validated
// against MINUTE_OPTIONS before anything is chosen.

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { requireActiveUser } from "@/lib/authz";
import { suggestRitual } from "@/lib/sahama/manage";
import { checkIn } from "@/lib/sahama/checkin";
import { setKept } from "@/lib/sahama/review";
import { SahamaError, leadingDoshas as leadingOf, parseMinutes } from "@/lib/sahama/rules";

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

// ── The check-in ─────────────────────────────────────────────────────────


export interface CheckinState {
  error: string | null;
  /** The note as she wrote it — kept in the form after a refusal. */
  note: string;
  reply: string | null;
  noReply: null | "switchedOff" | "noFreeRepliesLeft" | "replyFailed";
  nextRitualTitle: string | null;
  /** Bumps on every success so the form can clear itself. */
  savedAt: number | null;
}

export async function checkinAction(_prev: CheckinState, form: FormData): Promise<CheckinState> {
  const session = await requireActiveUser();
  const note = typeof form.get("note") === "string" ? String(form.get("note")) : "";
  const t = await getTranslations("sahama");
  try {
    const outcome = await checkIn(session.user.id, note, {
      dosha: (shares) => {
        const lead = leadingOf(shares);
        return lead.length === 3 ? t("dosha.result.triTitle") : lead.map((d) => t(`doshaName.${d}`)).join("-");
      },
      concern: (code) => t(`concerns.${code}`),
    });
    revalidatePath("/dashboard/heute");
    revalidatePath("/dashboard");
    return {
      error: null,
      note: "",
      reply: outcome.checkin.reply,
      noReply: outcome.noReply,
      nextRitualTitle: outcome.nextRitualTitle,
      savedAt: Date.now(),
    };
  } catch (error) {
    unstable_rethrow(error);
    const te = await getTranslations("errors");
    const message = error instanceof SahamaError ? te(error.code) : te("unknown");
    if (!(error instanceof SahamaError)) console.error("[sahama] check-in failed:", error);
    return { error: message, note, reply: null, noReply: null, nextRitualTitle: null, savedAt: null };
  }
}

// ── Keep a ritual ────────────────────────────────────────────────────────

export async function keepAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const session = await requireActiveUser();
  const slug = String(form.get("slug") ?? "");
  const keep = form.get("keep") === "1";
  const t = await getTranslations("sahama.keep");
  try {
    await setKept(session.user.id, slug, keep);
    revalidatePath("/dashboard/heute");
    revalidatePath("/dashboard/rueckblick");
    return { error: null, ok: keep ? t("keptToast") : t("unkeptToast") };
  } catch (error) {
    unstable_rethrow(error);
    const te = await getTranslations("errors");
    if (error instanceof SahamaError) return { error: te(error.code), ok: null };
    console.error("[sahama] keep failed:", error);
    return { error: te("unknown"), ok: null };
  }
}

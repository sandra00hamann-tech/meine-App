"use server";

// The content editor's actions. requireOwner() is the first line of every one
// (a server action is an endpoint of its own; the page guarding itself
// protects nothing here). Codes become sentences here, in the operator's
// language. Success ends in a redirect to the list, whose FlashToast says what
// happened (`saved` / `deleted` are references, never sentences).

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { requireOwner } from "@/lib/authz";
import { MediaError } from "@/lib/media/rules";
import {
  deleteArticle,
  deleteRitual,
  parseArticleForm,
  parseRitualForm,
  saveArticle,
  saveRitual,
  uploadRitualImage,
} from "@/lib/sahama/content-admin";
import { SahamaError } from "@/lib/sahama/rules";

export type { ActionState } from "@/lib/action-state";
import type { ActionState } from "@/lib/action-state";

const LIST = "/dashboard/admin/sahama";

async function refusal(error: unknown): Promise<ActionState> {
  unstable_rethrow(error);
  const te = await getTranslations("errors");
  if (error instanceof SahamaError || error instanceof MediaError)
    return { error: te(error.code), ok: null };
  console.error("[sahama] editor action failed:", error);
  return { error: te("unknown"), ok: null };
}

function refresh() {
  revalidatePath(LIST);
  revalidatePath("/dashboard/heute");
  revalidatePath("/dashboard/wissen");
}

export async function saveRitualAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const session = await requireOwner();
  const slug = String(form.get("slug") ?? "") || null;
  try {
    const input = parseRitualForm(form);
    let imagePath: string | null | undefined;
    const file = form.get("image");
    if (file instanceof File && file.size > 0) {
      imagePath = await uploadRitualImage(
        { memberId: session.user.id, role: session.user.role ?? "owner" },
        file,
        String(form.get("imageAlt") ?? "").trim() || input.title,
      );
    } else if (form.get("removeImage") === "1") {
      imagePath = null;
    }
    await saveRitual(slug, input, imagePath);
  } catch (error) {
    return refusal(error);
  }
  refresh();
  redirect(`${LIST}?saved=ritual`);
}

export async function saveArticleAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireOwner();
  const slug = String(form.get("slug") ?? "") || null;
  try {
    await saveArticle(slug, parseArticleForm(form));
  } catch (error) {
    return refusal(error);
  }
  refresh();
  redirect(`${LIST}?saved=article&tab=artikel`);
}

export async function deleteRitualAction(form: FormData): Promise<void> {
  await requireOwner();
  await deleteRitual(String(form.get("slug") ?? ""));
  refresh();
  redirect(`${LIST}?deleted=1`);
}

export async function deleteArticleAction(form: FormData): Promise<void> {
  await requireOwner();
  await deleteArticle(String(form.get("slug") ?? ""));
  refresh();
  redirect(`${LIST}?deleted=1&tab=artikel`);
}

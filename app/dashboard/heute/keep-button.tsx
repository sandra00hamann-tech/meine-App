"use client";

// "Behalten" on today's card — puts the ritual into her favourites (with the
// plan; the page only renders this for members who hold it). The result is a
// toast on the same page (useActionToast).

import { Heart } from "lucide-react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { useActionToast } from "@/hooks/use-action-toast";
import { EMPTY_ACTION_STATE } from "@/lib/action-state";

import { keepAction } from "./actions";

export function KeepButton({ slug, kept }: { slug: string; kept: boolean }) {
  const t = useTranslations("sahama.keep");
  const [state, formAction, pending] = useActionState(keepAction, EMPTY_ACTION_STATE);
  useActionToast(state);
  return (
    <form action={formAction} className="print:hidden">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="keep" value={kept ? "0" : "1"} />
      <Button type="submit" variant={kept ? "secondary" : "outline"} disabled={pending} aria-pressed={kept}>
        <Heart aria-hidden className={kept ? "fill-current" : undefined} />
        {kept ? t("kept") : t("keep")}
      </Button>
    </form>
  );
}

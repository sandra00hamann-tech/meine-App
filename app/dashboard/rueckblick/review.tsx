"use client";

// Sahama's weekly observation: the stored text, or the button that writes it.
// The AI notice is mounted unconditionally above it (lib/ai/disclosure.mjs
// names this file, surface "sahamaReview").

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { AiDisclosure } from "@/components/ai-disclosure";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EMPTY_ACTION_STATE } from "@/lib/action-state";

import { writeReviewAction } from "./actions";

export function Review({ stored, canWrite }: { stored: string | null; canWrite: boolean }) {
  const t = useTranslations("sahama.review");
  const [state, formAction, pending] = useActionState(writeReviewAction, EMPTY_ACTION_STATE);
  const body = stored ?? state.ok;

  return (
    <div className="space-y-3">
      <AiDisclosure surface="sahamaReview" />
      {body ? (
        <div className="bg-muted max-h-96 space-y-2 overflow-y-auto rounded-lg p-4" aria-live="polite">
          <p className="text-sm font-semibold">{t("observationTitle")}</p>
          <p className="leading-relaxed whitespace-pre-line">{body}</p>
        </div>
      ) : canWrite ? (
        <form action={formAction} className="space-y-3">
          <Button type="submit" disabled={pending}>
            {pending ? t("writing") : t("write")}
          </Button>
          {state.error && <Callout variant="danger">{state.error}</Callout>}
        </form>
      ) : (
        <p className="text-muted-foreground text-sm">{t("tooEarly")}</p>
      )}
    </div>
  );
}

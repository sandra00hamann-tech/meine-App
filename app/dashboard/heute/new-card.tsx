"use client";

// Three buttons — 5, 10, 20 minutes — each asks for a new card. The result
// replaces the card above (the page revalidates); a refusal stays on screen.

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EMPTY_ACTION_STATE } from "@/lib/action-state";
import { MINUTE_OPTIONS } from "@/lib/sahama/catalog";

import { newCardAction } from "./actions";

export function NewCard({ current }: { current?: number }) {
  const t = useTranslations("sahama.today");
  const [state, formAction, pending] = useActionState(
    newCardAction,
    EMPTY_ACTION_STATE,
  );

  return (
    <form action={formAction} className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {MINUTE_OPTIONS.map((m) => (
          <Button
            key={m}
            type="submit"
            name="minutes"
            value={String(m)}
            variant={m === current ? "default" : "outline"}
            disabled={pending}
          >
            {t("newCard", { count: m })}
          </Button>
        ))}
      </div>
      {state.error && <Callout variant="danger">{state.error}</Callout>}
    </form>
  );
}

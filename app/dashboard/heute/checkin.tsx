"use client";

// "Wie war's?" — the check-in under today's card, and Sahama's reply above
// the form once it arrives (docs/api-map.md: the result sits ABOVE the form,
// and a refused form keeps what was typed). The AI notice is mounted
// unconditionally above the reply area: lib/ai/disclosure.mjs names this file.

import Link from "next/link";
import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { AiDisclosure } from "@/components/ai-disclosure";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { checkinAction, type CheckinState } from "./actions";

const INITIAL: CheckinState = { error: null, note: "", reply: null, noReply: null, nextRitualTitle: null, savedAt: null };

export function Checkin({ freeLeft, repliesOn }: { freeLeft: number | null; repliesOn: boolean }) {
  const t = useTranslations("sahama.checkin");
  const [state, formAction, pending] = useActionState(checkinAction, INITIAL);

  return (
    <Card className="print:hidden">
      <CardHeader>
        <CardTitle level="h2" className="text-xl">
          {t("title")}
        </CardTitle>
        <CardDescription>{t("hint")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <AiDisclosure surface="sahamaCheckin" />

        {state.savedAt && state.reply && (
          <div className="bg-muted max-h-96 space-y-2 overflow-y-auto rounded-lg p-4" aria-live="polite">
            <p className="text-sm font-semibold">{t("replyTitle")}</p>
            <p className="leading-relaxed whitespace-pre-line">{state.reply}</p>
          </div>
        )}
        {state.savedAt && state.noReply === "noFreeRepliesLeft" && (
          <Callout variant="info" title={t("noFreeLeftTitle")}>
            <p>{t("noFreeLeftText")}</p>
            <Button asChild size="sm" className="mt-3 no-underline">
              <Link href="/plans?needs=sahama">{t("noFreeLeftAction")}</Link>
            </Button>
          </Callout>
        )}
        {state.savedAt && state.noReply === "replyFailed" && <Callout variant="warning">{t("replyFailed")}</Callout>}
        {state.savedAt && state.noReply === "switchedOff" && <Callout variant="success">{t("switchedOff")}</Callout>}
        {state.savedAt && state.nextRitualTitle && (
          <p className="text-muted-foreground text-sm">{t("next", { title: state.nextRitualTitle })}</p>
        )}

        <form action={formAction} className="space-y-3" key={state.savedAt ?? "new"}>
          <Label htmlFor="checkin-note" className="sr-only">
            {t("title")}
          </Label>
          <Textarea
            id="checkin-note"
            name="note"
            rows={4}
            maxLength={1500}
            placeholder={t("placeholder")}
            defaultValue={state.note}
            required
          />
          {state.error && <Callout variant="danger">{state.error}</Callout>}
          <div className="flex flex-wrap items-center gap-4">
            <Button type="submit" disabled={pending}>
              {pending ? t("submitting") : t("submit")}
            </Button>
            {repliesOn && freeLeft !== null && (
              <p className="text-muted-foreground text-sm">{t("freeLeft", { count: freeLeft })}</p>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

"use client";

// The Dosha test as one form: 24 questions in three parts, then what occupies her and
// how much time she has. A failed submit keeps every answer: all choices live
// in React state, and the submit BUILDS the FormData from that state and hands
// it to the action itself (onSubmit + startTransition) instead of using
// <form action>. React resets a form after a <form action> runs, and that
// reset cleared the inputs behind the radio and checkbox widgets while the
// screen still showed them ticked — measured 2026-11-19: a member who forgot
// one question lost the other eleven on the second submit without seeing it.
// The refusal stays on screen as a Callout above the button.

import * as React from "react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { EMPTY_ACTION_STATE } from "@/lib/action-state";
import { CONCERNS, DOSHA_QUESTIONS, DOSHA_SECTIONS, MINUTE_OPTIONS, answerOrder } from "@/lib/sahama/catalog";

import { saveDoshaAction } from "./actions";

export function DoshaForm({
  initialConcerns = [],
  initialMinutes,
}: {
  initialConcerns?: string[];
  initialMinutes?: number;
}) {
  const t = useTranslations("sahama");
  const [state, formAction, pending] = useActionState(saveDoshaAction, EMPTY_ACTION_STATE);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [concerns, setConcerns] = React.useState<string[]>(initialConcerns);
  const [minutes, setMinutes] = React.useState<string>(String(initialMinutes ?? 10));
  const done = Object.keys(answers).length;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData();
    for (const [q, value] of Object.entries(answers)) data.set(`q_${q}`, value);
    for (const c of concerns) data.append("concerns", c);
    data.set("minutes", minutes);
    React.startTransition(() => formAction(data));
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <p className="text-lg leading-relaxed font-medium">{t("dosha.intro")}</p>
      {DOSHA_SECTIONS.map((section) => (
        <section key={section.id} aria-labelledby={`part_${section.id}`} className="space-y-4">
          <h2 id={`part_${section.id}`} className="pt-2 text-lg font-semibold">
            {t(`dosha.sections.${section.id}`)}
          </h2>
          <ol className="space-y-4">
            {section.questions.map((q) => {
              const index = DOSHA_QUESTIONS.indexOf(q);
              return (
                <li key={q}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        <span className="text-muted-foreground mr-2">{index + 1}.</span>
                        {t(`dosha.questions.${q}.text`)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <RadioGroup
                        value={answers[q] ?? ""}
                        onValueChange={(value) => setAnswers((prev) => ({ ...prev, [q]: value }))}
                        aria-label={t(`dosha.questions.${q}.text`)}
                        className="gap-3"
                      >
                        {answerOrder(index).map((d) => (
                          <div key={d} className="flex items-start gap-3">
                            <RadioGroupItem value={d} id={`q_${q}_${d}`} className="mt-0.5" />
                            <Label htmlFor={`q_${q}_${d}`} className="leading-snug font-normal">
                              {t(`dosha.questions.${q}.${d}`)}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ol>
        </section>
      ))}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("dosha.concernsTitle")}</CardTitle>
          <CardDescription>{t("dosha.concernsHint")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {CONCERNS.map((c) => (
            <div key={c} className="flex items-start gap-3">
              <Checkbox
                id={`concern_${c}`}
                checked={concerns.includes(c)}
                onCheckedChange={(checked) =>
                  setConcerns((prev) => (checked === true ? [...new Set([...prev, c])] : prev.filter((x) => x !== c)))
                }
                className="mt-0.5"
              />
              <Label htmlFor={`concern_${c}`} className="leading-snug font-normal">
                {t(`concerns.${c}`)}
              </Label>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("dosha.minutesTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={minutes}
            onValueChange={setMinutes}
            aria-label={t("dosha.minutesTitle")}
            className="flex flex-wrap gap-6"
          >
            {MINUTE_OPTIONS.map((m) => (
              <div key={m} className="flex items-center gap-2">
                <RadioGroupItem value={String(m)} id={`minutes_${m}`} />
                <Label htmlFor={`minutes_${m}`} className="font-normal">
                  {t("minutes", { count: m })}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {state.error && <Callout variant="danger">{state.error}</Callout>}

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? t("dosha.submitting") : t("dosha.submit")}
        </Button>
        <p className="text-muted-foreground text-sm" aria-live="polite">
          {t("dosha.progress", { done, total: DOSHA_QUESTIONS.length })}
        </p>
      </div>
    </form>
  );
}

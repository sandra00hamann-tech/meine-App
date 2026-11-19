"use client";

// The article editor — same submit pattern as the ritual editor (no form
// reset on a refusal). Body format: paragraphs separated by a blank line, a
// line starting with "## " is a subheading.

import * as React from "react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { EMPTY_ACTION_STATE } from "@/lib/action-state";

import { saveArticleAction } from "./actions";

export interface ArticleFormValues {
  slug: string | null;
  title: string;
  summary: string;
  body: string;
  tier: string;
  published: boolean;
  position: number;
}

export function ArticleForm({ values }: { values: ArticleFormValues }) {
  const t = useTranslations("sahamaAdmin");
  const [state, formAction, pending] = useActionState(
    saveArticleAction,
    EMPTY_ACTION_STATE,
  );

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    React.startTransition(() => formAction(data));
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <input type="hidden" name="slug" value={values.slug ?? ""} />
      <Card>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">{t("fields.title")}</Label>
            <Input
              id="title"
              name="title"
              defaultValue={values.title}
              required
              maxLength={160}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="summary">{t("fields.summary")}</Label>
            <Input
              id="summary"
              name="summary"
              defaultValue={values.summary}
              maxLength={240}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="body">{t("fields.body")}</Label>
            <Textarea
              id="body"
              name="body"
              defaultValue={values.body}
              rows={18}
              required
            />
            <p className="text-muted-foreground text-xs">
              {t("fields.articleBodyHint")}
            </p>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t("fields.tier")}</legend>
            <RadioGroup
              name="tier"
              defaultValue={values.tier}
              className="flex flex-wrap gap-6"
            >
              {(["free", "plus"] as const).map((tier) => (
                <div key={tier} className="flex items-center gap-2">
                  <RadioGroupItem value={tier} id={`tier_${tier}`} />
                  <Label htmlFor={`tier_${tier}`} className="font-normal">
                    {t(`tier.${tier}`)}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </fieldset>
          <div className="flex items-center gap-2">
            <Checkbox
              id="published"
              name="published"
              value="1"
              defaultChecked={values.published}
            />
            <Label htmlFor="published" className="font-normal">
              {t("fields.published")}
            </Label>
          </div>
          <div className="space-y-2">
            <Label htmlFor="position">{t("fields.position")}</Label>
            <Input
              id="position"
              name="position"
              type="number"
              step="1"
              min="0"
              defaultValue={values.position}
              className="w-32"
            />
            <p className="text-muted-foreground text-xs">
              {t("fields.positionHint")}
            </p>
          </div>
        </CardContent>
      </Card>
      {state.error && <Callout variant="danger">{state.error}</Callout>}
      <Button type="submit" disabled={pending}>
        {pending ? t("saving") : t("save")}
      </Button>
    </form>
  );
}

"use client";

// The ritual editor. Submits through onSubmit + startTransition with the
// form's own FormData — never <form action>, whose automatic reset would wipe
// her edits when the server refuses something (same reason as the Dosha
// form, measured 2026-11-19). A refusal stays on screen as a Callout above
// the button; a success leaves for the list, which says so.

import * as React from "react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MediaUpload } from "@/components/ui/media-upload";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EMPTY_ACTION_STATE } from "@/lib/action-state";
import {
  CONCERNS,
  DOSHAS,
  MINUTE_OPTIONS,
  TIMES_OF_DAY,
} from "@/lib/sahama/catalog";

import { saveRitualAction } from "./actions";

export interface RitualFormValues {
  slug: string | null;
  title: string;
  summary: string;
  body: string;
  minutes: number;
  timeOfDay: string;
  doshas: string[];
  concerns: string[];
  doshaTips: Record<string, string | undefined>;
  tier: string;
  published: boolean;
  articleSlug: string | null;
  position: number;
  imageUrl: string | null;
}

const NO_ARTICLE = "__none";

export function RitualForm({
  values,
  articles,
  ceilingBytes,
  ceilingLabel,
}: {
  values: RitualFormValues;
  articles: { slug: string; title: string }[];
  ceilingBytes: number;
  ceilingLabel: string;
}) {
  const t = useTranslations("sahamaAdmin");
  const ts = useTranslations("sahama");
  const [state, formAction, pending] = useActionState(
    saveRitualAction,
    EMPTY_ACTION_STATE,
  );
  const [blocked, setBlocked] = React.useState(false);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    React.startTransition(() => formAction(data));
  }

  return (
    <form onSubmit={submit} className="space-y-6" encType="multipart/form-data">
      <input type="hidden" name="slug" value={values.slug ?? ""} />

      <Card>
        <CardHeader>
          <CardTitle level="h2" className="text-lg">
            {t("ritual.textTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">{t("fields.title")}</Label>
            <Input
              id="title"
              name="title"
              defaultValue={values.title}
              required
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="summary">{t("fields.summary")}</Label>
            <Input
              id="summary"
              name="summary"
              defaultValue={values.summary}
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="body">{t("fields.body")}</Label>
            <Textarea
              id="body"
              name="body"
              defaultValue={values.body}
              rows={10}
              required
            />
            <p className="text-muted-foreground text-xs">
              {t("fields.bodyHint")}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle level="h2" className="text-lg">
            {t("ritual.whenTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">
              {t("fields.minutes")}
            </legend>
            <RadioGroup
              name="minutes"
              defaultValue={String(values.minutes)}
              className="flex flex-wrap gap-6"
            >
              {MINUTE_OPTIONS.map((m) => (
                <div key={m} className="flex items-center gap-2">
                  <RadioGroupItem value={String(m)} id={`minutes_${m}`} />
                  <Label htmlFor={`minutes_${m}`} className="font-normal">
                    {ts("minutes", { count: m })}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">
              {t("fields.timeOfDay")}
            </legend>
            <RadioGroup
              name="timeOfDay"
              defaultValue={values.timeOfDay}
              className="flex flex-wrap gap-6"
            >
              {TIMES_OF_DAY.map((tod) => (
                <div key={tod} className="flex items-center gap-2">
                  <RadioGroupItem value={tod} id={`tod_${tod}`} />
                  <Label htmlFor={`tod_${tod}`} className="font-normal">
                    {ts(`timeOfDay.${tod}`)}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">
              {t("fields.doshas")}
            </legend>
            <p className="text-muted-foreground text-xs">
              {t("fields.doshasHint")}
            </p>
            <div className="flex flex-wrap gap-6">
              {DOSHAS.map((d) => (
                <div key={d} className="flex items-center gap-2">
                  <Checkbox
                    id={`dosha_${d}`}
                    name="doshas"
                    value={d}
                    defaultChecked={values.doshas.includes(d)}
                  />
                  <Label htmlFor={`dosha_${d}`} className="font-normal">
                    {ts(`doshaName.${d}`)}
                  </Label>
                </div>
              ))}
            </div>
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">
              {t("fields.concerns")}
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {CONCERNS.map((c) => (
                <div key={c} className="flex items-start gap-2">
                  <Checkbox
                    id={`concern_${c}`}
                    name="concerns"
                    value={c}
                    defaultChecked={values.concerns.includes(c)}
                    className="mt-0.5"
                  />
                  <Label
                    htmlFor={`concern_${c}`}
                    className="leading-snug font-normal"
                  >
                    {ts(`concerns.${c}`)}
                  </Label>
                </div>
              ))}
            </div>
          </fieldset>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle level="h2" className="text-lg">
            {t("ritual.tipsTitle")}
          </CardTitle>
          <CardDescription>{t("ritual.tipsHint")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {DOSHAS.map((d) => (
            <div key={d} className="space-y-2">
              <Label htmlFor={`tip_${d}`}>
                {ts("card.tipsFor", { name: ts(`doshaName.${d}`) })}
              </Label>
              <Textarea
                id={`tip_${d}`}
                name={`tip_${d}`}
                defaultValue={values.doshaTips[d] ?? ""}
                rows={2}
                maxLength={600}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle level="h2" className="text-lg">
            {t("ritual.imageTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {values.imageUrl && (
            <div className="space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- signed media URL */}
              <img
                src={values.imageUrl}
                alt=""
                className="aspect-video w-full max-w-sm rounded-lg object-cover"
              />
              <div className="flex items-center gap-2">
                <Checkbox id="removeImage" name="removeImage" value="1" />
                <Label htmlFor="removeImage" className="font-normal">
                  {t("fields.removeImage")}
                </Label>
              </div>
            </div>
          )}
          <MediaUpload
            id="ritual-image"
            name="image"
            label={
              values.imageUrl ? t("fields.replaceImage") : t("fields.image")
            }
            mimeTypes={["image/jpeg", "image/png", "image/webp"]}
            ceilingBytes={ceilingBytes}
            tooLarge={() => t("fields.imageTooLarge", { max: ceilingLabel })}
            hint={t("fields.imageHint", { max: ceilingLabel })}
            onBlocked={setBlocked}
          />
          <div className="space-y-2">
            <Label htmlFor="imageAlt">{t("fields.imageAlt")}</Label>
            <Input
              id="imageAlt"
              name="imageAlt"
              maxLength={200}
              placeholder={t("fields.imageAltPlaceholder")}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle level="h2" className="text-lg">
            {t("fields.visibilityTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
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
            <Label htmlFor="articleSlug">{t("fields.article")}</Label>
            <Select
              name="articleSlug"
              defaultValue={values.articleSlug ?? NO_ARTICLE}
            >
              <SelectTrigger id="articleSlug" className="w-full sm:w-96">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_ARTICLE}>
                  {t("fields.noArticle")}
                </SelectItem>
                {articles.map((a) => (
                  <SelectItem key={a.slug} value={a.slug}>
                    {a.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
      <Button type="submit" disabled={pending || blocked}>
        {pending ? t("saving") : t("save")}
      </Button>
    </form>
  );
}

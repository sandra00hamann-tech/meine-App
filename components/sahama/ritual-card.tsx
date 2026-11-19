// The ritual card — Sahama's signature element (docs/design.md): the picture
// on top, the title in the heading face, minutes and time of day as badges,
// the steps below. Rituals are the operator's own German text (content, not
// interface), so they are rendered as written; the labels around them go
// through messages → sahama.*.
//
// The picture slot shows nothing until the ritual has an image path — a
// placeholder picture would be one more thing to replace, not a design.

import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { slugifyAnchor } from "@/lib/content-source/anchors";
import type { Dosha } from "@/lib/sahama/catalog";
import type { SahamaRitual } from "@/lib/sahama/manage";

/** Splits the body into its paragraphs (blank-line separated). */
export function paragraphsOf(body: string): string[] {
  return body
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export async function RitualCard({
  ritual,
  leading = [],
  imageUrl,
  children,
}: {
  ritual: SahamaRitual;
  /** Her leading Dosha(s) — each one's hint is shown under the steps. */
  leading?: Dosha[];
  /** A URL the caller resolved through the media layer AFTER mayAccess(); null for none. */
  imageUrl?: string | null;
  /** Actions under the card. */
  children?: React.ReactNode;
}) {
  const t = await getTranslations("sahama");

  return (
    <Card id={slugifyAnchor(ritual.slug)} className="scroll-mt-20 overflow-hidden pt-0">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- media URLs are signed and short-lived
        <img src={imageUrl} alt="" className="aspect-video w-full object-cover" />
      ) : (
        <div aria-hidden className="bg-muted h-2 w-full" />
      )}
      <CardHeader>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{t("today.minutesBadge", { count: ritual.minutes })}</Badge>
          <Badge variant="secondary">{t(`timeOfDay.${ritual.timeOfDay}`)}</Badge>
          <Badge variant="outline">{ritual.tier === "free" ? t("card.freeBadge") : t("card.plusBadge")}</Badge>
        </div>
        <CardTitle className="text-2xl leading-tight font-semibold">{ritual.title}</CardTitle>
        {ritual.summary && <CardDescription className="text-base">{ritual.summary}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        <h3 className="text-muted-foreground text-sm font-medium">{t("today.steps")}</h3>
        <div className="space-y-3 leading-relaxed">
          {paragraphsOf(ritual.body).map((p, i) => (
            <p key={i} className="whitespace-pre-line">
              {p}
            </p>
          ))}
        </div>
        {leading
          .filter((d) => ritual.doshaTips[d])
          .map((d) => (
            <div key={d} className="bg-muted space-y-1 rounded-lg p-4">
              <p className="text-sm font-semibold">{t("card.tipsFor", { name: t(`doshaName.${d}`) })}</p>
              <p className="leading-relaxed">{ritual.doshaTips[d]}</p>
            </div>
          ))}
        {children && <div className="flex flex-wrap gap-3 pt-2">{children}</div>}
      </CardContent>
    </Card>
  );
}

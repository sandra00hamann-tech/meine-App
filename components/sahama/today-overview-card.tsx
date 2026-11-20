// The FIRST card on /dashboard (docs/ux.md § 0): what she came for. Without
// a profile it invites her to the Dosha test; with one it shows today's
// ritual — title, minutes, one line — and the way to the full card.
// Links: /dashboard/heute and /dashboard/dosha (app/dashboard/overview-links.test.ts).

import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { currentRitual, profileFor } from "@/lib/sahama/manage";

export async function TodayOverviewCard({ memberId }: { memberId: string }) {
  const t = await getTranslations("sahama");
  const tNav = await getTranslations("nav");
  const profile = await profileFor(memberId);

  if (!profile) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle level="h2">{t("dashboard.startTitle")}</CardTitle>
          <CardDescription className="text-base">
            {t("dashboard.startText")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/dashboard/dosha">{t("dashboard.startAction")}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const current = await currentRitual(memberId);
  return (
    <Card className="mb-6">
      <CardHeader>
        <p className="text-muted-foreground text-sm">{t("dashboard.title")}</p>
        {current ? (
          <>
            <CardTitle level="h2" className="text-xl">
              {current.ritual.title}
            </CardTitle>
            {current.ritual.summary && (
              <CardDescription className="text-base">
                {current.ritual.summary}
              </CardDescription>
            )}
          </>
        ) : (
          <CardTitle level="h2" className="text-xl">
            {t("today.noCardTitle")}
          </CardTitle>
        )}
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-3">
        {current && (
          <Badge variant="secondary">
            {t("today.minutesBadge", { count: current.ritual.minutes })}
          </Badge>
        )}
        <Button asChild>
          <Link href="/dashboard/heute">{t("dashboard.openAction")}</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/dashboard/reihen">{tNav("series")}</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/dashboard/dosha">{tNav("dosha")}</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/dashboard/wissen">{tNav("knowledge")}</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/dashboard/rueckblick">{tNav("review")}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

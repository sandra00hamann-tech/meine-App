// /dashboard/rueckblick — her week and her kept rituals.
//
// Gate: requireActiveUser(); everything on the page comes with the plan —
// hasSahamaPlan() → hasPlan(memberId, "sahama"). Without it the page says
// what she would get and links /plans?needs=sahama (the lock is shown, the
// content is not). The week is Monday–Sunday in Berlin (lib/sahama/review-rules.ts).

import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { CalendarHeart, Heart } from "lucide-react";

import { PrintButton } from "@/components/sahama/print-button";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireActiveUser } from "@/lib/authz";
import { hasSahamaPlan } from "@/lib/sahama/access";
import { keptRituals, storedReviews, weekCheckins } from "@/lib/sahama/review";
import { MIN_CHECKINS_FOR_REVIEW, weekNumbers, weekStartOf } from "@/lib/sahama/review-rules";

import { againTodayAction } from "./actions";
import { Review } from "./review";

export default async function ReviewPage() {
  const session = await requireActiveUser();
  const t = await getTranslations("sahama");
  const format = await getFormatter();

  if (!(await hasSahamaPlan(session.user.id))) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader eyebrow={t("review.eyebrow")} title={t("review.title")} description={t("review.description")} />
        <Callout variant="info" title={t("review.lockedTitle")}>
          <p>{t("review.lockedText")}</p>
          <Button asChild size="sm" className="mt-3 no-underline">
            <Link href="/plans?needs=sahama">{t("review.lockedAction")}</Link>
          </Button>
        </Callout>
      </div>
    );
  }

  const weekStart = weekStartOf(new Date());
  const [checkins, reviews, kept] = await Promise.all([
    weekCheckins(session.user.id, weekStart),
    storedReviews(session.user.id),
    keptRituals(session.user.id),
  ]);
  const numbers = weekNumbers(checkins);
  const thisWeek = reviews.find((r) => r.weekStart === weekStart) ?? null;
  const past = reviews.filter((r) => r.weekStart !== weekStart);
  const dateOf = (day: string) =>
    format.dateTime(new Date(`${day}T12:00:00Z`), { dateStyle: "long", timeZone: "Europe/Berlin" });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="print:hidden">
        <PageHeader eyebrow={t("review.eyebrow")} title={t("review.title")} description={t("review.description")} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle level="h2" className="text-xl">
            {t("review.weekTitle")}
          </CardTitle>
          <CardDescription>{t("review.weekRange", { date: dateOf(weekStart) })}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {numbers.checkins === 0 ? (
            <p className="text-muted-foreground">{t("review.emptyWeek")}</p>
          ) : (
            <>
              <p className="text-lg font-medium">
                {t("review.checkins", { count: numbers.checkins })} · {t("review.days", { count: numbers.days })}
              </p>
              {numbers.favouriteTime && (
                <p className="leading-relaxed">
                  {t("review.favourite", { time: t(`review.favouriteTime.${numbers.favouriteTime}`) })}
                </p>
              )}
              <div className="space-y-2">
                <p className="text-muted-foreground text-sm">{t("review.rituals")}</p>
                <div className="flex flex-wrap gap-2">
                  {numbers.rituals.map((title) => (
                    <Badge key={title} variant="secondary">
                      {title}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
          <Review stored={thisWeek?.body ?? null} canWrite={numbers.checkins >= MIN_CHECKINS_FOR_REVIEW} />
          {(thisWeek || numbers.checkins > 0) && <PrintButton />}
        </CardContent>
      </Card>

      <section className="space-y-3 print:hidden" aria-labelledby="kept-title">
        <h2 id="kept-title" className="text-lg font-semibold">
          {t("review.keptTitle")}
        </h2>
        {kept.length === 0 ? (
          <EmptyState icon={Heart} title={t("review.keptTitle")} description={t("review.keptEmpty")} />
        ) : (
          <ul className="space-y-3">
            {kept.map((r) => (
              <li key={r.slug}>
                <Card>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{r.title}</p>
                      <p className="text-muted-foreground text-sm">{t("today.minutesBadge", { count: r.minutes })}</p>
                    </div>
                    <form action={againTodayAction}>
                      <input type="hidden" name="slug" value={r.slug} />
                      <Button type="submit" variant="outline" size="sm">
                        {t("review.again")}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {past.length > 0 && (
        <section className="space-y-3 print:hidden" aria-labelledby="past-title">
          <h2 id="past-title" className="text-lg font-semibold">
            {t("review.pastTitle")}
          </h2>
          <ul className="space-y-3">
            {past.map((r) => (
              <li key={r.id}>
                <Card>
                  <CardContent className="space-y-2">
                    <p className="text-muted-foreground text-sm">{t("review.weekRange", { date: dateOf(r.weekStart) })}</p>
                    <p className="leading-relaxed whitespace-pre-line">{r.body}</p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}
      {numbers.checkins === 0 && past.length === 0 && kept.length === 0 && (
        <EmptyState icon={CalendarHeart} title={t("review.weekTitle")} description={t("review.emptyWeek")} />
      )}
    </div>
  );
}

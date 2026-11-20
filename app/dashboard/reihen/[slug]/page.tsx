// /dashboard/reihen/[slug] — one Ritual-Reihe: the intro, today's day, and
// every day with what is done. Gate: requireActiveUser(); starting and
// continuing need hasSahamaPlan() (asked again inside lib/sahama/series.ts
// on every act). Without the plan she sees the intro and the list of days and
// the way to the subscription — never a button that would only refuse.
// An unknown slug is a 404. Linked from /dashboard/reihen.

import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireActiveUser } from "@/lib/authz";
import { hasSahamaPlan } from "@/lib/sahama/access";
import { ritualImageUrl } from "@/lib/sahama/media";
import { berlinDay } from "@/lib/sahama/review-rules";
import {
  progressFor,
  ritualsOf,
  seriesBySlug,
  stateOf,
} from "@/lib/sahama/series";
import { isComingBack } from "@/lib/sahama/series-rules";

import { takeAsTodayAction } from "../actions";
import {
  MarkDoneButton,
  RestartSeriesButton,
  StartSeriesButton,
} from "../series-buttons";

export default async function SeriesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await requireActiveUser();
  const t = await getTranslations("sahama.series");
  const ts = await getTranslations("sahama");
  const { slug } = await params;
  const series = seriesBySlug(slug);
  if (!series) notFound();

  const [holdsPlan, progressMap, rituals] = await Promise.all([
    hasSahamaPlan(session.user.id),
    progressFor(session.user.id),
    ritualsOf(series),
  ]);
  const progress = progressMap.get(slug) ?? null;
  const state = stateOf(series, progress);
  const total = series.days.length;
  const doneDays =
    state.status === "finished"
      ? total
      : state.status === "open"
        ? state.day - 1
        : state.status === "doneToday"
          ? state.nextDay - 1
          : 0;
  const todayIndex = state.status === "open" ? state.day - 1 : -1;
  const todayDay = todayIndex >= 0 ? series.days[todayIndex] : null;
  const todayRitual = todayDay ? (rituals.get(todayDay.ritual) ?? null) : null;
  const todayImage =
    holdsPlan && todayRitual
      ? await ritualImageUrl(todayRitual.imagePath, {
          memberId: session.user.id,
          role: session.user.role ?? null,
        })
      : null;
  const comingBack =
    state.status === "open" && isComingBack(progress, berlinDay(new Date()));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/dashboard/reihen"
        className="text-primary text-sm underline-offset-4 hover:underline"
      >
        ← {t("back")}
      </Link>
      <PageHeader
        eyebrow={t("title")}
        title={series.title}
        description={series.summary}
      />
      <p className="leading-relaxed">{series.intro}</p>

      {!holdsPlan ? (
        <Callout variant="info" title={t("lockedTitle")}>
          <p>{t("lockedText")}</p>
          <Button asChild className="mt-3">
            <Link href="/plans?needs=sahama">{t("lockedAction")}</Link>
          </Button>
        </Callout>
      ) : state.status === "notStarted" ? (
        <StartSeriesButton slug={slug} />
      ) : state.status === "finished" ? (
        <Callout variant="success" title={t("statusFinished", { total })}>
          <p>{t("finishedToast")}</p>
        </Callout>
      ) : state.status === "doneToday" ? (
        <Callout
          variant="info"
          title={t("statusDoneToday", { done: doneDays, total })}
        />
      ) : (
        <Card>
          <CardHeader>
            <p className="text-muted-foreground text-sm">
              {t("statusOpen", { day: state.day, total })}
            </p>
            {comingBack && <p className="text-sm">{t("comingBack")}</p>}
            <CardTitle level="h2" className="text-xl">
              {todayRitual ? todayRitual.title : t("ritualMissing")}
            </CardTitle>
            {todayRitual && (
              <CardDescription>
                {ts("minutes", { count: todayRitual.minutes })}
                {todayRitual.summary ? ` · ${todayRitual.summary}` : ""}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {todayImage && (
              // eslint-disable-next-line @next/next/no-img-element -- signed media URL
              <img
                src={todayImage}
                alt=""
                className="aspect-video w-full rounded-lg object-cover"
              />
            )}
            <p className="leading-relaxed">{todayDay?.note}</p>
            <div className="flex flex-wrap gap-3">
              {todayRitual && (
                <form action={takeAsTodayAction}>
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="ritual" value={todayRitual.slug} />
                  <Button type="submit" variant="outline">
                    {t("take")}
                  </Button>
                </form>
              )}
              <MarkDoneButton slug={slug} day={state.day} />
            </div>
          </CardContent>
        </Card>
      )}

      <section aria-labelledby="series-days" className="space-y-3">
        <h2 id="series-days" className="text-lg font-semibold">
          {t("days", { count: total })}
        </h2>
        <ol className="space-y-2">
          {series.days.map((d, i) => {
            const ritual = rituals.get(d.ritual);
            const done = holdsPlan && i < doneDays;
            const isToday = holdsPlan && i === todayIndex;
            return (
              <li key={`${i}-${d.ritual}`}>
                <Card className={isToday ? "border-primary" : undefined}>
                  <CardContent className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-muted-foreground text-sm">
                        {t("dayLabel", { day: i + 1 })}
                        {ritual
                          ? ` · ${ts("minutes", { count: ritual.minutes })}`
                          : ""}
                      </p>
                      <p className="font-medium">
                        {ritual ? ritual.title : t("ritualMissing")}
                      </p>
                      <p className="text-muted-foreground text-sm">{d.note}</p>
                    </div>
                    {done && (
                      <Badge variant="secondary">{t("doneBadge")}</Badge>
                    )}
                    {isToday && <Badge>{t("todayBadge")}</Badge>}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ol>
      </section>

      {holdsPlan && progress && (
        <RestartSeriesButton
          slug={slug}
          title={series.title}
          done={doneDays}
          total={total}
        />
      )}
    </div>
  );
}

// /dashboard/reihen — the Ritual-Reihen (series). Gate: requireActiveUser()
// to see the list; starting and continuing a series is the Abo's
// (hasSahamaPlan, asked inside lib/sahama/series.ts and here only to choose
// what the page shows). A free member sees every series with an "Im Abo"
// badge and one Callout pointing at the plans page — never a greyed-out card.

import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ListOrdered } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireActiveUser } from "@/lib/authz";
import { hasSahamaPlan } from "@/lib/sahama/access";
import { allSeries, progressFor, stateOf } from "@/lib/sahama/series";
import type { SeriesState } from "@/lib/sahama/series-rules";

export default async function SeriesListPage() {
  const session = await requireActiveUser();
  const t = await getTranslations("sahama.series");
  const series = allSeries();
  const [holdsPlan, progress] = await Promise.all([
    hasSahamaPlan(session.user.id),
    progressFor(session.user.id),
  ]);

  const statusLine = (state: SeriesState, total: number) => {
    switch (state.status) {
      case "notStarted":
        return t("statusNotStarted");
      case "open":
        return t("statusOpen", { day: state.day, total });
      case "doneToday":
        return t("statusDoneToday", { done: state.nextDay - 1, total });
      case "finished":
        return t("statusFinished", { total });
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />

      {!holdsPlan && series.length > 0 && (
        <Callout variant="info" title={t("lockedTitle")}>
          <p>{t("lockedText")}</p>
          <Button asChild className="mt-3">
            <Link href="/plans?needs=sahama">{t("lockedAction")}</Link>
          </Button>
        </Callout>
      )}

      {series.length === 0 ? (
        <EmptyState
          icon={ListOrdered}
          title={t("emptyTitle")}
          description={t("emptyText")}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {series.map((s) => {
            const state = stateOf(s, progress.get(s.slug));
            return (
              <li key={s.slug}>
                <Link
                  href={`/dashboard/reihen/${s.slug}`}
                  className="focus-visible:ring-ring block h-full rounded-xl focus-visible:ring-2 focus-visible:outline-none"
                >
                  <Card className="hover:bg-accent h-full transition-colors">
                    <CardHeader>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">
                          {t("days", { count: s.days.length })}
                        </Badge>
                        {!holdsPlan && (
                          <Badge variant="outline">{t("lockedBadge")}</Badge>
                        )}
                      </div>
                      <CardTitle level="h2" className="text-lg">
                        {s.title}
                      </CardTitle>
                      <CardDescription>{s.summary}</CardDescription>
                      {holdsPlan && (
                        <p className="text-sm font-medium">
                          {statusLine(state, s.days.length)}
                        </p>
                      )}
                    </CardHeader>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

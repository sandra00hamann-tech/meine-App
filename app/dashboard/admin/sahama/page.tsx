// /dashboard/admin/sahama — the operator's content: every ritual and article,
// published or hidden, hers or drafted in the repo. requireOwner() first.

import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Plus } from "lucide-react";

import { FlashToast } from "@/components/flash-toast";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireOwner } from "@/lib/authz";
import { allArticles, allRituals } from "@/lib/sahama/content-admin";

export default async function ContentAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; deleted?: string; tab?: string }>;
}) {
  await requireOwner();
  const t = await getTranslations("sahamaAdmin");
  const ts = await getTranslations("sahama");
  const { saved, deleted, tab } = await searchParams;
  const [rituals, articles] = await Promise.all([allRituals(), allArticles()]);

  const badges = (row: {
    tier: string;
    published: boolean;
    origin: string;
  }) => (
    <div className="flex flex-wrap gap-2">
      <Badge variant={row.tier === "free" ? "secondary" : "outline"}>
        {t(`tier.${row.tier}`)}
      </Badge>
      {!row.published && <Badge variant="outline">{t("hidden")}</Badge>}
      <Badge variant="outline">
        {row.origin === "operator" ? t("originOperator") : t("originContent")}
      </Badge>
    </div>
  );

  return (
    <div className="space-y-6">
      {saved && <FlashToast message={t("saved")} clearParam="saved" />}
      {deleted && <FlashToast message={t("deleted")} clearParam="deleted" />}
      <PageHeader title={t("title")} description={t("description")}>
        <Button asChild>
          <Link href="/dashboard/admin/sahama/rituale/neu">
            <Plus aria-hidden />
            {t("newRitual")}
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard/admin/sahama/artikel/neu">
            <Plus aria-hidden />
            {t("newArticle")}
          </Link>
        </Button>
      </PageHeader>
      <p className="text-muted-foreground max-w-3xl text-sm">
        {t("originHint")}
      </p>

      <Tabs defaultValue={tab === "artikel" ? "artikel" : "rituale"}>
        <TabsList>
          <TabsTrigger value="rituale">
            {t("ritualsTab", { count: rituals.length })}
          </TabsTrigger>
          <TabsTrigger value="artikel">
            {t("articlesTab", { count: articles.length })}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="rituale" className="mt-4">
          <ul className="space-y-3">
            {rituals.map((r) => (
              <li key={r.slug}>
                <Card>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="font-semibold">{r.title}</p>
                      <p className="text-muted-foreground text-sm">
                        {ts("today.minutesBadge", { count: r.minutes })} ·{" "}
                        {ts(`timeOfDay.${r.timeOfDay}`)}
                      </p>
                      {badges(r)}
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/dashboard/admin/sahama/rituale/${r.slug}`}>
                        {t("edit")}
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </TabsContent>
        <TabsContent value="artikel" className="mt-4">
          <ul className="space-y-3">
            {articles.map((a) => (
              <li key={a.slug}>
                <Card>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="font-semibold">{a.title}</p>
                      {badges(a)}
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/dashboard/admin/sahama/artikel/${a.slug}`}>
                        {t("edit")}
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </TabsContent>
      </Tabs>
    </div>
  );
}

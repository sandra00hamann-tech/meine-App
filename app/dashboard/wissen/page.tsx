// /dashboard/wissen — the knowledge articles. Basics are free, the deeper
// articles come with the subscription; a locked one is a badge, never a
// greyed-out card (docs/design.md). Gate: requireActiveUser(); reading in
// full is mayReadArticle() on the article page.

import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BookOpen } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireActiveUser } from "@/lib/authz";
import { hasSahamaPlan } from "@/lib/sahama/access";
import { listArticles } from "@/lib/sahama/articles";

export default async function KnowledgePage() {
  const session = await requireActiveUser();
  const t = await getTranslations("sahama");
  const [articles, holdsPlan] = await Promise.all([
    listArticles(),
    hasSahamaPlan(session.user.id),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow={t("knowledge.eyebrow")}
        title={t("knowledge.title")}
        description={t("knowledge.description")}
      />
      {articles.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={t("knowledge.emptyTitle")}
          description={t("knowledge.emptyText")}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {articles.map((a) => (
            <li key={a.slug}>
              <Link
                href={`/dashboard/wissen/${a.slug}`}
                className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Card className="h-full transition-colors hover:bg-accent">
                  <CardHeader>
                    <div>
                      <Badge
                        variant={a.tier === "free" ? "secondary" : "outline"}
                      >
                        {a.tier === "free"
                          ? t("card.freeBadge")
                          : holdsPlan
                            ? t("knowledge.deeper")
                            : t("card.plusBadge")}
                      </Badge>
                    </div>
                    <CardTitle level="h2" className="text-lg leading-snug">
                      {a.title}
                    </CardTitle>
                    {a.summary && (
                      <CardDescription>{a.summary}</CardDescription>
                    )}
                  </CardHeader>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

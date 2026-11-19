// /dashboard/wissen/[slug] — one article. Gate: requireActiveUser(), then
// mayReadArticle(memberId, article): free articles for everyone, the deeper
// ones with hasPlan(memberId, "sahama"). Without the plan she sees the title,
// the summary and the way to the subscription (/plans?needs=sahama) — never
// the body. An unknown or unpublished slug is a 404.

import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/page-header";
import { ArticleBody } from "@/components/sahama/article-body";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Card, CardContent } from "@/components/ui/card";
import { requireActiveUser } from "@/lib/authz";
import { articleBySlug, mayReadArticle } from "@/lib/sahama/articles";

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await requireActiveUser();
  const t = await getTranslations("sahama");
  const { slug } = await params;
  const article = await articleBySlug(slug);
  if (!article) notFound();
  const mayRead = await mayReadArticle(session.user.id, article);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="print:hidden">
        <Link href="/dashboard/wissen" className="text-primary text-sm underline-offset-4 hover:underline">
          ← {t("knowledge.back")}
        </Link>
      </div>
      <PageHeader eyebrow={t("knowledge.title")} title={article.title} description={article.summary || undefined} />
      {mayRead ? (
        <Card>
          <CardContent>
            <ArticleBody body={article.body} />
          </CardContent>
        </Card>
      ) : (
        <Callout variant="info" title={t("knowledge.lockedTitle")}>
          <p>{t("knowledge.lockedText")}</p>
          <Button asChild size="sm" className="mt-3 no-underline">
            <Link href="/plans?needs=sahama">{t("knowledge.lockedAction")}</Link>
          </Button>
        </Callout>
      )}
    </div>
  );
}

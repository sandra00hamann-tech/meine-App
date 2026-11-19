// /dashboard/admin/sahama/artikel/[slug] — edit one article, or `neu` for a
// new one. requireOwner() first. Saving makes the article the operator's.

import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/page-header";
import { Callout } from "@/components/ui/callout";
import { requireOwner } from "@/lib/authz";
import { articleForEdit } from "@/lib/sahama/content-admin";

import { deleteArticleAction } from "../../actions";
import { ArticleForm } from "../../article-form";
import { DeleteButton } from "../../delete-button";

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireOwner();
  const t = await getTranslations("sahamaAdmin");
  const { slug } = await params;
  const isNew = slug === "neu";
  const article = isNew ? null : await articleForEdit(slug);
  if (!isNew && !article) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/dashboard/admin/sahama?tab=artikel"
        className="text-primary text-sm underline-offset-4 hover:underline"
      >
        ← {t("back")}
      </Link>
      <PageHeader
        title={isNew ? t("newArticle") : t("editArticle")}
        description={article?.title}
      >
        {article?.origin === "operator" && (
          <DeleteButton
            slug={article.slug}
            title={article.title}
            action={deleteArticleAction}
          />
        )}
      </PageHeader>
      {article?.origin === "content" && (
        <Callout variant="info">{t("adoptHint")}</Callout>
      )}
      <ArticleForm
        values={
          article
            ? {
                slug: article.slug,
                title: article.title,
                summary: article.summary,
                body: article.body,
                tier: article.tier,
                published: article.published,
                position: article.position,
              }
            : {
                slug: null,
                title: "",
                summary: "",
                body: "",
                tier: "plus",
                published: true,
                position: 500,
              }
        }
      />
    </div>
  );
}

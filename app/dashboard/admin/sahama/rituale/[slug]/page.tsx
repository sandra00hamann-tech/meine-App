// /dashboard/admin/sahama/rituale/[slug] — edit one ritual, or `neu` for a
// new one. requireOwner() first. Saving makes the ritual the operator's.

import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/page-header";
import { Callout } from "@/components/ui/callout";
import { requireOwner } from "@/lib/authz";
import { mediaConfig } from "@/lib/media/config";
import { formatBytes, slotCeilingBytes } from "@/lib/media/rules";
import { allArticles, ritualForEdit } from "@/lib/sahama/content-admin";
import { ritualImageUrl } from "@/lib/sahama/media";

import { deleteRitualAction } from "../../actions";
import { DeleteButton } from "../../delete-button";
import { RitualForm, type RitualFormValues } from "../../ritual-form";

export default async function EditRitualPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await requireOwner();
  const t = await getTranslations("sahamaAdmin");
  const locale = await getLocale();
  const { slug } = await params;
  const isNew = slug === "neu";
  const ritual = isNew ? null : await ritualForEdit(slug);
  if (!isNew && !ritual) notFound();

  const ceilingBytes = slotCeilingBytes(mediaConfig().kinds.image.maxBytes);
  const articles = (await allArticles()).map((a) => ({
    slug: a.slug,
    title: a.title,
  }));
  const values: RitualFormValues = ritual
    ? {
        slug: ritual.slug,
        title: ritual.title,
        summary: ritual.summary,
        body: ritual.body,
        minutes: ritual.minutes,
        timeOfDay: ritual.timeOfDay,
        doshas: ritual.doshas,
        concerns: ritual.concerns,
        doshaTips: ritual.doshaTips,
        tier: ritual.tier,
        published: ritual.published,
        articleSlug: ritual.articleSlug,
        position: ritual.position,
        imageUrl: await ritualImageUrl(ritual.imagePath, {
          memberId: session.user.id,
          role: session.user.role ?? null,
        }),
      }
    : {
        slug: null,
        title: "",
        summary: "",
        body: "",
        minutes: 10,
        timeOfDay: "any",
        doshas: [],
        concerns: [],
        doshaTips: {},
        tier: "plus",
        published: true,
        articleSlug: null,
        position: 500,
        imageUrl: null,
      };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/dashboard/admin/sahama"
        className="text-primary text-sm underline-offset-4 hover:underline"
      >
        ← {t("back")}
      </Link>
      <PageHeader
        title={isNew ? t("newRitual") : t("editRitual")}
        description={ritual?.title}
      >
        {ritual?.origin === "operator" && (
          <DeleteButton
            slug={ritual.slug}
            title={ritual.title}
            action={deleteRitualAction}
          />
        )}
      </PageHeader>
      {ritual?.origin === "content" && (
        <Callout variant="info">{t("adoptHint")}</Callout>
      )}
      <RitualForm
        values={values}
        articles={articles}
        ceilingBytes={ceilingBytes}
        ceilingLabel={formatBytes(ceilingBytes, locale)}
      />
    </div>
  );
}

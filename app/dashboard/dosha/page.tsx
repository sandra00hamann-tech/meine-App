// /dashboard/dosha — the Dosha test, or her result once she has taken it.
//
// Free for every signed-in member (it is the way in, docs/product-brief.md),
// so there is no plan check — requireActiveUser() is the whole gate.
// `?neu=1` shows the test again for a retake, pre-filled with her two start
// answers; the Dosha questions start empty on purpose — a retake asks again.

import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/page-header";
import { DoshaResultCard } from "@/components/sahama/dosha-result-card";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { requireActiveUser } from "@/lib/authz";
import { profileFor, sharesOf } from "@/lib/sahama/manage";

import { DoshaForm } from "./dosha-form";

export default async function DoshaPage({
  searchParams,
}: {
  searchParams: Promise<{ neu?: string }>;
}) {
  const session = await requireActiveUser();
  const t = await getTranslations("sahama");
  const { neu } = await searchParams;
  const profile = await profileFor(session.user.id);

  if (profile && neu !== "1") {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader eyebrow={t("dosha.eyebrow")} title={t("dosha.title")} />
        <DoshaResultCard shares={sharesOf(profile)} takenAt={profile.doshaTakenAt}>
          <Button asChild>
            <Link href="/dashboard/heute">{t("dosha.result.next")}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/dosha?neu=1">{t("dosha.result.retake")}</Link>
          </Button>
        </DoshaResultCard>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow={t("dosha.eyebrow")} title={t("dosha.title")} description={t("dosha.description")} />
      <Callout variant="info">{t("dosha.disclaimer")}</Callout>
      <DoshaForm initialConcerns={profile?.concerns} initialMinutes={profile?.usualMinutes} />
    </div>
  );
}

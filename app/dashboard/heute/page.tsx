// /dashboard/heute — today's ritual card, and "how much time do you have?".
//
// Gate: requireActiveUser(); what she may SEE is decided per ritual by
// mayUseTier() inside lib/sahama/manage.ts (free rituals for everyone, the
// rest with hasPlan(memberId, "sahama")) — never by a billing table.
// Without a profile there is nothing to choose from yet: the empty state
// sends her to the Dosha test.

import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Leaf } from "lucide-react";

import { FlashToast } from "@/components/flash-toast";
import { PageHeader } from "@/components/page-header";
import { PrintButton } from "@/components/sahama/print-button";
import { RitualCard } from "@/components/sahama/ritual-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireActiveUser } from "@/lib/authz";
import { currentRitual, profileFor, sharesOf } from "@/lib/sahama/manage";
import { leadingDoshas } from "@/lib/sahama/rules";

import { NewCard } from "./new-card";

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string }>;
}) {
  const session = await requireActiveUser();
  const t = await getTranslations("sahama");
  const { start } = await searchParams;
  const profile = await profileFor(session.user.id);

  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader eyebrow={t("today.eyebrow")} title={t("today.title")} />
        <EmptyState icon={Leaf} title={t("today.noProfileTitle")} description={t("today.noProfileText")}>
          <Button asChild>
            <Link href="/dashboard/dosha">{t("today.noProfileAction")}</Link>
          </Button>
        </EmptyState>
      </div>
    );
  }

  const current = await currentRitual(session.user.id);
  const leading = leadingDoshas(sharesOf(profile));
  const dosha = leading.length === 3 ? t("dosha.result.triTitle") : leading.map((d) => t(`doshaName.${d}`)).join("-");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {start === "1" && <FlashToast message={t("today.started")} clearParam="start" />}
      <div className="print:hidden">
        <PageHeader eyebrow={t("today.eyebrow")} title={t("today.title")} description={t("today.description")} />
      </div>

      <p className="text-muted-foreground text-sm print:hidden">
        {t("today.doshaLine", { name: dosha })} ·{" "}
        <Link href="/dashboard/dosha" className="text-primary underline-offset-4 hover:underline">
          {t("today.doshaLink")}
        </Link>
      </p>

      {current ? (
        <RitualCard ritual={current.ritual} leading={leading}>
          <PrintButton />
          <p className="text-muted-foreground w-full text-sm print:hidden">{t("card.printHint")}</p>
        </RitualCard>
      ) : (
        <EmptyState icon={Leaf} title={t("today.noCardTitle")} description={t("today.noCardText")} />
      )}

      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="text-base">{t("today.newCardTitle")}</CardTitle>
          <CardDescription>{t("today.newCardHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <NewCard current={current?.minutes} />
        </CardContent>
      </Card>
    </div>
  );
}

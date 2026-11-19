// The Dosha result card: the three shares as bars, the leading Dosha(s) in
// words, and the reminder that it is an orientation, never a diagnosis.
// Server component — the texts come from messages → sahama.dosha.result.

import { getFormatter, getTranslations } from "next-intl/server";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DOSHAS, type Dosha } from "@/lib/sahama/catalog";
import { leadingDoshas, type DoshaShares } from "@/lib/sahama/rules";

export async function DoshaResultCard({
  shares,
  takenAt,
  children,
}: {
  shares: DoshaShares;
  takenAt: Date;
  /** Actions under the result (next / retake). */
  children?: React.ReactNode;
}) {
  const t = await getTranslations("sahama");
  const format = await getFormatter();
  const leading = leadingDoshas(shares);
  const name = (d: Dosha) => t(`doshaName.${d}`);
  const title =
    leading.length === 3
      ? t("dosha.result.triTitle")
      : leading.map(name).join("-");

  return (
    <Card>
      <CardHeader>
        <p className="text-muted-foreground text-sm">
          {t("dosha.result.eyebrow")}
        </p>
        <CardTitle className="text-2xl font-semibold">
          {t("dosha.result.title", { name: title })}
        </CardTitle>
        <CardDescription>
          {t("dosha.result.takenAt", {
            date: format.dateTime(takenAt, {
              dateStyle: "long",
              timeZone: "Europe/Berlin",
            }),
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ul className="space-y-3">
          {DOSHAS.map((d) => (
            <li key={d} className="space-y-1">
              <div className="flex items-baseline justify-between gap-4 text-sm">
                <span className="font-medium">
                  {t("dosha.result.shareLabel", {
                    name: name(d),
                    value: shares[d],
                  })}
                </span>
                <span className="text-muted-foreground">
                  {t(`doshaElements.${d}`)}
                </span>
              </div>
              <div
                className="bg-muted h-2 overflow-hidden rounded-full"
                role="meter"
                aria-label={name(d)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={shares[d]}
              >
                <div
                  className="bg-primary h-full rounded-full"
                  style={{ width: `${shares[d]}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
        <div className="space-y-3">
          <p className="leading-relaxed">
            {t(`dosha.result.describe.${leading[0]}`)}
          </p>
          {leading.length === 2 && (
            <p className="text-muted-foreground leading-relaxed">
              {t("dosha.result.dual", {
                first: name(leading[0]),
                second: name(leading[1]),
              })}
            </p>
          )}
          {leading.length === 3 && (
            <p className="text-muted-foreground leading-relaxed">
              {t("dosha.result.tri")}
            </p>
          )}
          <p className="text-muted-foreground text-sm">
            {t("dosha.disclaimer")}
          </p>
        </div>
        {children && <div className="flex flex-wrap gap-3">{children}</div>}
      </CardContent>
    </Card>
  );
}

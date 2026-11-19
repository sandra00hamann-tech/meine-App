"use client";

// "Drucken oder als PDF speichern" — the browser's own print dialog, which
// on every system also offers "Save as PDF". The page around the card hides
// itself in print (print:hidden on the app shell and the page's extras), so
// what comes out of the printer is the card.

import { Printer } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export function PrintButton() {
  const t = useTranslations("sahama.card");
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => window.print()}
      className="print:hidden"
    >
      <Printer aria-hidden />
      {t("print")}
    </Button>
  );
}

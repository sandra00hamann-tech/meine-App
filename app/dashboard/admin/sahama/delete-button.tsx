"use client";

// Deleting asks first (docs/ux.md: everything destructive) and names what goes.

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function DeleteButton({
  slug,
  title,
  action,
}: {
  slug: string;
  title: string;
  action: (form: FormData) => Promise<void>;
}) {
  const t = useTranslations("sahamaAdmin");
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline">
          <Trash2 aria-hidden />
          {t("delete")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("deleteTitle", { title })}</AlertDialogTitle>
          <AlertDialogDescription>{t("deleteText")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
          <form action={action}>
            <input type="hidden" name="slug" value={slug} />
            <AlertDialogAction type="submit" variant="destructive">
              {t("deleteConfirm")}
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

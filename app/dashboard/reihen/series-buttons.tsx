"use client";

// The series' buttons. Each act reports back as a toast on the same page
// (useActionToast); starting over asks first, naming what is reset
// (docs/ux.md: everything destructive asks first).

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Check, Play, RotateCcw } from "lucide-react";

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
import { useActionToast } from "@/hooks/use-action-toast";
import { EMPTY_ACTION_STATE } from "@/lib/action-state";

import {
  markDoneAction,
  restartSeriesAction,
  startSeriesAction,
} from "./actions";

export function StartSeriesButton({ slug }: { slug: string }) {
  const t = useTranslations("sahama.series");
  const [state, formAction, pending] = useActionState(
    startSeriesAction,
    EMPTY_ACTION_STATE,
  );
  useActionToast(state);
  return (
    <form action={formAction}>
      <input type="hidden" name="slug" value={slug} />
      <Button type="submit" disabled={pending}>
        <Play aria-hidden />
        {t("start")}
      </Button>
    </form>
  );
}

export function MarkDoneButton({ slug, day }: { slug: string; day: number }) {
  const t = useTranslations("sahama.series");
  const [state, formAction, pending] = useActionState(
    markDoneAction,
    EMPTY_ACTION_STATE,
  );
  useActionToast(state);
  return (
    <form action={formAction}>
      <input type="hidden" name="slug" value={slug} />
      <Button type="submit" disabled={pending}>
        <Check aria-hidden />
        {t("markDone", { day })}
      </Button>
    </form>
  );
}

export function RestartSeriesButton({
  slug,
  title,
  done,
  total,
}: {
  slug: string;
  title: string;
  done: number;
  total: number;
}) {
  const t = useTranslations("sahama.series");
  const [state, formAction, pending] = useActionState(
    restartSeriesAction,
    EMPTY_ACTION_STATE,
  );
  useActionToast(state);
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" disabled={pending}>
          <RotateCcw aria-hidden />
          {t("restart")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("restartTitle", { title })}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("restartText", { done, total })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
          <form action={formAction}>
            <input type="hidden" name="slug" value={slug} />
            <AlertDialogAction type="submit" variant="destructive">
              {t("restartConfirm")}
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

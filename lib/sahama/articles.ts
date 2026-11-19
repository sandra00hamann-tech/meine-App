// Sahama — the knowledge articles: list, one by slug, and the ONE access
// question for them. The page asks mayReadArticle(); a later content source
// for the assistant asks the same function (CLAUDE.md → Content sources).

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { sahamaArticles } from "@/db/schema";

import { hasSahamaPlan, mayUseTier } from "./access";

export type SahamaArticle = typeof sahamaArticles.$inferSelect;

export async function listArticles(): Promise<SahamaArticle[]> {
  return db
    .select()
    .from(sahamaArticles)
    .where(eq(sahamaArticles.published, true))
    .orderBy(asc(sahamaArticles.position));
}

export async function articleBySlug(slug: string): Promise<SahamaArticle | null> {
  const [row] = await db
    .select()
    .from(sahamaArticles)
    .where(and(eq(sahamaArticles.slug, slug), eq(sahamaArticles.published, true)));
  return row ?? null;
}

/** May this member read this article in full? Free for all, plus with the plan. */
export async function mayReadArticle(memberId: string, article: Pick<SahamaArticle, "tier">): Promise<boolean> {
  if (article.tier === "free") return true;
  return mayUseTier(article.tier, await hasSahamaPlan(memberId));
}

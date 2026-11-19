// Sahama's content — rituals and articles from content/sahama/*.json into the
// database of whichever environment `node run.mjs content-apply` runs against.
//
// Two writers, one column (docs/app.md → Content authority; the same contract
// as docs/courses.md → "Two origins, one column"):
//  · this applier writes `origin = 'content'` rows, keyed by slug, and every
//    run re-asserts them from the files;
//  · the admin surface writes `origin = 'operator'` rows in ONE environment.
// Every upsert carries `where origin = 'content'`, so it cannot reach an
// operator row — and a slug the operator owns (she made it, or edited a repo
// row in the app) is skipped and NAMED in the run's output, never overwritten.
//
// Pictures are referenced by media PATH (content/media-manifest.json), never
// by media id: an id exists in one database only.

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..", "..");

function load(name) {
  const file = join(ROOT, "content", "sahama", `${name}.json`);
  if (!existsSync(file)) return { file, items: [] };
  const data = JSON.parse(readFileSync(file, "utf8"));
  return { file, items: data[name] ?? [] };
}

/**
 * Slugs the OPERATOR owns: she created them on the admin surface, or she edited
 * a repo row there, which makes it hers (lib/sahama/content-admin.ts). The
 * applier skips them and says so — her edits are never overwritten by a deploy.
 */
async function operatorSlugs(sql, table, items, file) {
  if (items.length === 0) return new Set();
  const slugs = items.map((i) => i.slug);
  const rows = await sql`
    select slug from ${sql(table)} where origin = 'operator' and slug = any(${slugs})`;
  for (const r of rows) {
    console.log(`  · ${file}: "${r.slug}" belongs to the operator now (edited in the app) — left as it is`);
  }
  return new Set(rows.map((r) => r.slug));
}

export async function apply(sql) {
  let count = 0;

  const rituals = load("rituals");
  const ownRituals = await operatorSlugs(sql, "sahama_rituals", rituals.items, rituals.file);
  for (const r of rituals.items) {
    if (ownRituals.has(r.slug)) continue;
    await sql`
      insert into sahama_rituals
        (id, slug, origin, title, summary, body, minutes, time_of_day, doshas, concerns,
         dosha_tips, tier, image_path, article_slug, published, position, updated_at)
      values
        (${crypto.randomUUID()}, ${r.slug}, 'content', ${r.title}, ${r.summary ?? ""}, ${r.body},
         ${r.minutes}, ${r.timeOfDay ?? "any"}, ${r.doshas ?? []}, ${r.concerns ?? []},
         ${sql.json(r.doshaTips ?? {})}, ${r.tier ?? "plus"}, ${r.imagePath ?? null}, ${r.articleSlug ?? null},
         ${r.published ?? true}, ${r.position ?? 0}, now())
      on conflict (slug) do update set
        title = excluded.title, summary = excluded.summary, body = excluded.body,
        minutes = excluded.minutes, time_of_day = excluded.time_of_day,
        doshas = excluded.doshas, concerns = excluded.concerns, dosha_tips = excluded.dosha_tips,
        tier = excluded.tier,
        image_path = excluded.image_path, article_slug = excluded.article_slug,
        published = excluded.published, position = excluded.position, updated_at = now()
      where sahama_rituals.origin = 'content'`;
    count += 1;
  }

  const articles = load("articles");
  const ownArticles = await operatorSlugs(sql, "sahama_articles", articles.items, articles.file);
  for (const a of articles.items) {
    if (ownArticles.has(a.slug)) continue;
    await sql`
      insert into sahama_articles
        (id, slug, origin, title, summary, body, tier, image_path, published, position, updated_at)
      values
        (${crypto.randomUUID()}, ${a.slug}, 'content', ${a.title}, ${a.summary ?? ""}, ${a.body},
         ${a.tier ?? "plus"}, ${a.imagePath ?? null}, ${a.published ?? true}, ${a.position ?? 0}, now())
      on conflict (slug) do update set
        title = excluded.title, summary = excluded.summary, body = excluded.body,
        tier = excluded.tier, image_path = excluded.image_path,
        published = excluded.published, position = excluded.position, updated_at = now()
      where sahama_articles.origin = 'content'`;
    count += 1;
  }

  return count;
}

// Read-only: how many of this applier's rows are there? `content-check` asks it.
export async function present(sql) {
  const [r] = await sql`select count(*)::int as n from sahama_rituals where origin = 'content'`;
  const [a] = await sql`select count(*)::int as n from sahama_articles where origin = 'content'`;
  return r.n + a.n;
}

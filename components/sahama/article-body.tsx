// An article's body: paragraphs separated by blank lines, and a line that
// starts with "## " is a subheading — the whole of the format, on purpose
// (content/sahama/articles.json). Every subheading carries a stable anchor
// (lib/content-source/anchors.ts) so a later link can point at a section.

import { slugifyAnchor } from "@/lib/content-source/anchors";

export function ArticleBody({ body }: { body: string }) {
  const blocks = body
    .split(/\r?\n\s*\r?\n/)
    .map((b) => b.trim())
    .filter(Boolean);
  return (
    <div className="space-y-4 leading-relaxed">
      {blocks.map((block, i) =>
        block.startsWith("## ") ? (
          <h2 key={i} id={slugifyAnchor(block.slice(3))} className="scroll-mt-20 pt-2 text-lg font-semibold">
            {block.slice(3)}
          </h2>
        ) : (
          <p key={i} className="whitespace-pre-line">
            {block}
          </p>
        ),
      )}
    </div>
  );
}

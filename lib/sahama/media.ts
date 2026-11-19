// Sahama — a ritual's picture, from its media PATH to an address on the page.
//
// The picture is product media (content/media-manifest.json): its bucket key
// is `content/<path>` in every environment, so the ritual row carries the path
// and this looks the media row up by that key. The access rule is the media
// layer's own — mayAccess() FIRST, then mediaUrlFor(), in this one function
// (CLAUDE.md → Media). The card pictures are `public`; the check still runs,
// so a picture made `entitled` later is gated without touching a page.

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { media } from "@/db/schema";
import { CONTENT_MEDIA_BUCKET_PREFIX } from "@/lib/content-media/rules.mjs";
import { mayAccess, type Viewer } from "@/lib/media/manage";
import { mediaUrlFor } from "@/lib/media/url";

/** The address of a ritual's picture for this viewer, or null (no path, no row, no access). */
export async function ritualImageUrl(
  path: string | null,
  viewer: Viewer,
): Promise<string | null> {
  if (!path) return null;
  // A picture the operator uploaded in the editor is a media row of THIS
  // environment, referenced by id (lib/sahama/content-admin.ts).
  if (path.startsWith("media:")) {
    const [own] = await db
      .select()
      .from(media)
      .where(eq(media.id, path.slice(6)));
    if (!own || !(await mayAccess(own, viewer))) return null;
    return mediaUrlFor(own);
  }
  const [row] = await db
    .select()
    .from(media)
    .where(
      eq(
        media.storageKey,
        CONTENT_MEDIA_BUCKET_PREFIX + path.replace(/^\/+/, ""),
      ),
    );
  if (!row) return null;
  if (!(await mayAccess(row, viewer))) return null;
  return mediaUrlFor(row);
}

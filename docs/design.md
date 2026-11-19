# Sahama — how it looks

_Chosen on 2026-11-19, direction "Salbei & Gold", via the skill `design`. Every
page built since is expected to match this file rather than invent its own
look. Change it here first, then apply it — never page by page. Nothing in
here overrides CLAUDE.md § UI or docs/ux.md._

## Identity
- **Mood:** ruhig, natürlich, hochwertig, erdig
- **Looked at:** no references — the operator named the direction herself:
  white background, earthy greens and browns, gold for fine details. Her
  umbrella brand "SAHAMA Lebensdesign" is white / plum / gold; Sahama takes
  the Ayurveda side of that (green instead of plum), gold stays shared.
- **Gold:** there is no gold dial. Gold lives in the IMAGES (fine gold line
  ornaments on ritual cards and header images). A gold/sand shimmer on the
  light neutral surfaces was shown to the operator as a comparison; the
  outcome is recorded below under Tokens once she has seen it.

## Tokens — delta from the shipped defaults
(only what changed; everything unlisted keeps the shipped value)
- `--primary`: hsl(85 24% 32%) light / hsl(85 24% 47%) dark — "Salbei/Oliv",
  from #56663F; dark lightened 32% → 47% so it reads on dark cards (4.5:1)
- `--primary-foreground`, `--ring`: as written by
  `node run.mjs brand colors --hex #56663F --apply`
- `--radius`: 0.75rem — soft corners

## Typography
- **Body:** Inter — `@fontsource-variable/inter` (app/layout.tsx)
- **Headings:** Source Serif 4 — shipped, unchanged

## The mark
- **Logo:** none — the letter tile ("S", shipped ink tile)
- **Dark variant:** not needed
- **Icons generated:** not yet — `node run.mjs brand icons --logo … --apply`
  once a logo exists, all five together

## Page composition
- **Dashboard home:** today's ritual card first and large (picture, title,
  duration, time of day), the check-in right below it; the week and the
  knowledge articles after that — never the other way round
- **Ritual card:** one `Card` with the picture on top, title in the heading
  face, duration and time of day as small badges, "Mehr dazu" as a link
- **Knowledge articles:** a calm reading column, heading face for titles,
  generous spacing; free and subscription articles look the same, the lock is
  a badge, never a greyed-out card
- **The salespage (`/`):** calm, lots of white, one large picture; the
  sections themselves are the skill `salespage`
- **Settings/account:** unchanged — the same on every app, on purpose

## Signature element
The **ritual card** — a picture with fine gold ornament, the title in the
serif heading face, and the minutes as a badge. It appears on the dashboard,
in the ritual list and in the weekly review.

## Do / Don't
- Do keep the background white; colour comes from the accent and the pictures.
- Do let the ritual card carry the page — one card, not a grid of equals.
- Don't put gold into text or buttons — gold belongs to the pictures.
- Don't use red or alarm colours for a missed day — a pause is never an error.

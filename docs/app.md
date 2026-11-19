# Sahama Ayurveda — what this app is

_What was built on top of the template. The template's own rules are in
CLAUDE.md; this file is only what came after. One entry per feature, written the
moment the feature works. Written down by your assistant, from the conversation
— read back to you, a line here is a note to check, not a promise you made._

## The product

- **Sells:** the Sahama subscription (`sahama`, 12 €/month or 120 €/year) —
  every ritual, a personal reply to every check-in, every article, the weekly
  review. Signed-in members without it use a free tier (docs/product-brief.md).
- **For:** women in mid-life with a full week of work and family who are
  discovering Ayurveda; mothers of small children among them.
- **Language:** German — every line the operator and her customers read is in it.
- **Archetype:** Gated-Tool — the subscription unlocks the ritual companion;
  what she pays for is the card that fits her time and the reply to her check-in.
- **Content authority:** separate-author + agent-drafted — rituals and articles
  live in tables (`sahama_rituals`, `sahama_articles`) with an `origin` column:
  `content` rows come from `content/sahama/*.json` through the applier
  `scripts/content/appliers/sahama.mjs` (drafted by the assistant, changed by
  asking); `operator` rows are made on the admin surface (a later stage) in one
  environment. The applier never writes an operator row and refuses a clashing slug.
- **Output artifact:** eine gestaltete Ritual-Karte mit Bild für die Zeit, die sie heute hat, zum Speichern oder Ausdrucken — und jede Woche eine Rückblick-Karte mit dem, was ihr gutgetan hat.
- **Alongside the customer:** Sahama liest jeden Check-in und antwortet persönlich mit alltagstauglichen Ayurveda-Tipps, passt den Vorschlag für den nächsten Tag an und schreibt am Wochenende einen Rückblick mit einer Beobachtung — ohne Vorwurf nach einer Pause.
- **Activation:** she has done her first ritual and checked in — the first
  `sahama_checkins` row for her (confirmed by the operator 2026-11-19).
- **Return:** she checks in again in later weeks — a `sahama_checkins` row in
  the last 7 days.

## Features

### Dosha test and result — `/dashboard/dosha`

- **Does:** twelve questions (`DOSHA_QUESTIONS`, lib/sahama/catalog.ts), plus
  what occupies her (`CONCERNS`) and how much time she usually has (5/10/20).
  Scores the shares of Vata, Pitta and Kapha (sum 100), saves her profile,
  chooses her first ritual card and sends her to `/dashboard/heute`. With a
  profile the page shows the result card; `?neu=1` retakes the test. Every text
  says it is an orientation, never a diagnosis.
- **Done when:** sie macht den Dosha-Test, sieht ihre Ergebnis-Karte und
  bekommt sofort ihre erste Ritual-Karte — checked 2026-11-19 in the browser,
  including a test with one unanswered question (refused, answers kept).
- **Access:** `requireActiveUser()` only — free for every signed-in member.
- **Data:** `sahama_profiles`, `sahama_suggestions` (`db/schema-sahama.ts`)
- **Tests:** `lib/sahama/rules.test.ts`

### Today's ritual card — `/dashboard/heute`

- **Does:** shows her current card (the latest suggestion she may still open)
  and lets her ask for a new one for 5, 10 or 20 minutes. The choice
  (`chooseRitual`) prefers her leading Dosha, her concerns and the time of day
  in Berlin, avoids her last six cards, and never offers a ritual longer than
  her minutes or one she may not open. First card on `/dashboard` too
  (`components/sahama/today-overview-card.tsx`).
- **Done when:** sie sagt, wie viel Zeit sie hat, und bekommt eine passende
  Ritual-Karte — the minutes part checked 2026-11-19; the card picture and the
  Dosha-match on 30 rituals come with the next stage.
- **Access:** per ritual through `mayUseTier(ritual.tier, await hasSahamaPlan(memberId))`
  (lib/sahama/access.ts) — `free` for everyone, `plus` with
  `hasPlan(memberId, "sahama")`. Every caller asks there; no second check.
- **Data:** `sahama_rituals` (content), `sahama_suggestions` (state)
- **Tests:** `lib/sahama/rules.test.ts`

## Decisions worth remembering

- **No language removal.** The operator's market is German, but the template
  holds four locales in ~25 tests; removing three broke them (tried
  2026-11-19, reverted). Interface texts are written in all four; the content
  (rituals, articles) is German only.
- **Dosha questions and concern labels live in the message files**, not in a
  table: they are part of the product's logic (scoring), change rarely, and are
  changed by asking.
- **No gold tint on the neutral surfaces** — shown side by side, no visible
  difference to the operator; gold belongs in the pictures (docs/design.md).
- **The card title is not in the serif face** — the heading face reaches `h1`
  only (app/globals.css); see docs/design.md.
- **No video, phone or live sessions, ever** — the operator advises in writing
  only; deeper questions go to her page / written advice (docs/product-brief.md).
- Not in the first version (docs/plan.md): recipes, community, reminder mails,
  an app-store app.

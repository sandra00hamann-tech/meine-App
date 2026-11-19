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

- **Does:** 24 questions in three parts (`DOSHA_SECTIONS`, lib/sahama/catalog.ts;
  answers shown in a varying fixed order, `answerOrder`), opening with "answer
  the way you have been most of your life, not how you feel right now", plus
  what occupies her (`CONCERNS`) and how much time she usually has (5/10/20).
  Scores the shares of Vata, Pitta and Kapha (sum 100) — one, two or all three
  leading (Tridosha, all within 15 points) — saves her profile,
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
  her minutes or one she may not open. Under the steps, the hint for each of
  her leading Doshas (`sahama_rituals.dosha_tips`). First card on `/dashboard` too
  (`components/sahama/today-overview-card.tsx`). "Drucken oder als PDF
  speichern" opens the browser's print dialog; the app shell and the page's
  extras carry `print:hidden`, so only the card is printed.
- **Done when:** sie sagt, wie viel Zeit sie hat, und bekommt eine passende
  Ritual-Karte mit Bild, die zu ihrem Dosha passt, zum Speichern oder
  Ausdrucken — checked 2026-11-19 with 30 rituals and their pictures.
- **Pictures:** `content/media/rituale/<slug>.webp`, declared `public` in
  `content/media-manifest.json`, referenced by path (`imagePath`) and resolved
  by `ritualImageUrl()` (lib/sahama/media.ts: mayAccess, then mediaUrlFor).
  Generated 2026-11-19 with OpenAI `gpt-image-2` in one style (watercolor,
  sage/brown/terracotta, fine gold ornaments, no faces) — a new ritual gets a
  picture in the same style. The OpenAI key is a network secret of the cloud
  environment "meine-app"; locally `.env` holds a placeholder.
- **Access:** per ritual through `mayUseTier(ritual.tier, await hasSahamaPlan(memberId))`
  (lib/sahama/access.ts) — `free` for everyone, `plus` with
  `hasPlan(memberId, "sahama")`. Every caller asks there; no second check.
- **Data:** `sahama_rituals` (content: 30 drafts in `content/sahama/rituals.json`,
  7 free, 23 plus, each with hints for all three Doshas), `sahama_suggestions` (state)
- **Tests:** `lib/sahama/rules.test.ts`

## Decisions worth remembering

- **24 questions, not 12** (operator, 2026-11-19): twelve could not tell the
  constitution (Prakriti) from the current state; the intro line "answer the
  way you have been most of your life" matters to her — a Vata whose weight
  changed in menopause is not Kapha now. Keep it.
- **How a ritual is written** (operator's review of all 30, 2026-11-19):
  no promises or predictions ("wirkt Wunder", "viele merken", "macht wach");
  Ayurveda statements framed as tradition ("in vielen ayurvedischen
  Tagesroutinen", "eine traditionelle Option für Vata"), never as fact; steps
  offered as choices ("wenn du magst"), durations as a frame; a safety line
  where one is needed (slippery floor after oil, water temperature, dizziness,
  reduced feeling in the feet, rice cooled and reheated thoroughly).
- **Concrete over vague in every ritual text** (operator, 2026-11-19): not "a
  warm cup" but "a cup of warm tea or warm water" — name the thing.
- **Every ritual carries a hint per Dosha** (operator, 2026-11-19): "warm and
  cooked for everyone" is wrong — Vata needs warm food, Pitta does well with
  cooling, fresh food. A new ritual gets `doshaTips` for all three.

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

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

### Check-in with a personal reply — `/dashboard/heute`

- **Does:** under today's card, "Wie war's?" takes a short note (≤ 1,500
  characters). The note is saved first; then, when a reply is due, Sahama
  writes one through the task `sahama.checkin` (lib/sahama/checkin.ts →
  `runTask`), with her Dosha, concerns, today's and the next ritual and a
  pause flag as app-worded facts, and her note FENCED as customer text
  (`buildCheckinRequest`, lib/sahama/checkin-rules.ts). The instruction holds
  the operator's limits (no diagnosis, no cure claims, no herbs/supplements/
  cures, doctor for real complaints, written advice for deeper questions, no
  calls or videos). After a check-in her next card is lined up. The AI notice
  (`<AiDisclosure surface="sahamaCheckin" />`) sits above the reply.
- **Done when:** sie checkt nach dem Ritual ein und bekommt eine persönliche
  Antwort mit einem Ayurveda-Tipp und einem Vorschlag für morgen.
- **Access:** reply due by `replyAllowed()` — `hasPlan(memberId, "sahama")`
  (through `hasSahamaPlan`), or fewer than `freeReplies` (3) replies so far.
  Without either the note is saved and the page offers `/plans?needs=sahama`.
- **Switches:** `config/sahama.json` — `checkinReplies`, `freeReplies`,
  `adviceUrl` (the operator's page for written advice; null until it exists),
  read only through lib/sahama/config.ts.
- **Data:** `sahama_checkins` (note, reply); cost per reply on the AI-costs page
  under `sahama.checkin`. Rate limit: 10 check-ins per hour per member.
- **Tests:** `lib/sahama/checkin-rules.test.ts`; checked 2026-11-19 in the
  browser with real replies: a member with the plan, a free member (three
  replies, then the subscription notice, free rituals only), and a note about
  weeks of sleep problems and palpitations asking for herbs (answered: see a
  doctor, no herbs).
- **Template fix on the way:** OpenAI's current models refuse `max_tokens`;
  `lib/ai/providers/openai-compat.ts` now sends `max_completion_tokens` for
  OpenAI (`tokenLimitField`), tested in `openai-compat.test.ts`.
- **Locally the app is started with `NODE_USE_ENV_PROXY=1`** in this cloud
  container, so Node's fetch reaches OpenAI through the network proxy.

### Ayurveda knowledge — `/dashboard/wissen`, `/dashboard/wissen/[slug]`

- **Does:** a list of short articles (4 basics free, 6 deeper with the plan;
  a locked one shows a badge, never a greyed card) and one page per article.
  Body format: paragraphs, `## ` subheadings with stable anchors
  (`components/sahama/article-body.tsx`). Rituals link to their article as
  "Mehr dazu im Ayurveda-Wissen" (`articleSlug`, 18 of 30 rituals).
- **Done when:** sie liest kurze Ayurveda-Artikel – Grundlagen gratis,
  Vertiefung im Abo – und findet sie von der Ritual-Karte aus über „Mehr dazu“
  — checked 2026-11-19: all 10 pages as the owner, a deeper one refused to a
  free member (title, summary, way to the plan; no body), unknown slug 404.
- **Access:** `mayReadArticle(memberId, article)` (lib/sahama/articles.ts) —
  free for all, plus through `mayUseTier(tier, hasSahamaPlan(memberId))`.
  The page and any later content source ask this one function.
- **Data:** `sahama_articles` (content, from `content/sahama/articles.json`,
  drafts for the operator to read).
- **Every article ends with a pointer** to the operator's own Ayurveda site
  (`moreInfoUrl` in config/sahama.json, https://ayurveda.sahama-lebensdesign.de)
  — the articles stay short on purpose; whoever wants more goes there
  (operator, 2026-11-19). The same address is `adviceUrl`, where Sahama's
  check-in replies send deeper questions. ⚠️ The site has to exist before
  go-live, or both links lead nowhere.
- **Tests:** `lib/sahama/rules.test.ts` (articles block)

### Weekly review and kept rituals — `/dashboard/rueckblick`, "Behalten" on `/dashboard/heute`

- **Does:** the current week (Monday–Sunday, Berlin): check-ins, days, her
  most frequent time of day, the week's rituals — computed live, no model.
  From two check-ins she can ask Sahama for the week's observation once (task
  `sahama.review`, her notes fenced; stored in `sahama_weekly_reviews`, earlier
  weeks listed below). Printable. "Behalten" on today's card keeps a ritual;
  "Meine Lieblingsrituale" lists them with "Heute noch einmal", which makes one
  today's card again.
- **Done when:** sie bekommt jede Woche eine Rückblick-Karte und kann
  Lieblingsrituale behalten — checked 2026-11-19 in the browser: kept a
  ritual, wrote a real review, "Heute noch einmal"; a free member sees the
  locked page and no "Behalten".
- **Access:** `hasSahamaPlan(memberId)` → `hasPlan(memberId, "sahama")`, asked
  inside lib/sahama/review.ts (`requirePlan`) for every write, and by the page.
- **Data:** `sahama_kept`, `sahama_weekly_reviews`, read from `sahama_checkins`.
- **AI notice:** `<AiDisclosure surface="sahamaReview" />` in
  app/dashboard/rueckblick/review.tsx.
- **Tests:** `lib/sahama/review-rules.test.ts`

### The free tier that lasts (operator, 2026-11-19)

- **Ritual der Woche:** every Berlin week one plus ritual is open to everyone,
  rotating through all plus rituals in the operator's order
  (`weeklyRitualSlug`, `mayUseRitual` in lib/sahama/access.ts — the one access
  question for rituals; chooser, today's card and "Heute noch einmal" all ask
  it). Free members see it as its own card on `/dashboard/heute`.
- **One personal reply per week** for free members (`freeRepliesPerWeek` in
  config/sahama.json; counted over the Berlin week in `repliesUsed`).
- **Week numbers free** on `/dashboard/rueckblick`; observation, earlier
  weeks and kept rituals with the plan.
- **Free articles:** set `tier: "free"` on any article.
- Kit fix on the way: a `Button` inside a `Callout` is no longer underlined
  (components/ui/callout.tsx).

### Content editor — `/dashboard/admin/sahama` (operator)

- **Does:** every ritual and article (published or hidden, hers or starter
  set) in two tabs; create, edit, hide; delete her own (asks first). Rituals:
  text, minutes, time of day, Doshas, concerns, a hint per Dosha, picture
  upload with description, free/plus, visible, "Mehr dazu" article, order.
  Articles: title, summary, body (`## ` subheadings), free/plus, visible, order.
- **Done when:** sie legt Rituale und Artikel selbst an und ändert sie, auch
  vom Handy — checked 2026-11-19 in the browser: edited a starter ritual,
  refused form kept its input, created a ritual with an uploaded picture and
  an article, both live, both deleted again; the editor at 380 px.
- **Access:** `requireOwner()` first in every page and action.
- **Two origins (decided 2026-11-19):** saving a starter-set row makes it
  `origin = 'operator'`; the applier then SKIPS it and names it in its output
  (scripts/content/appliers/sahama.mjs → `operatorSlugs`) instead of refusing —
  her edits are never overwritten by a deploy. Starter rows can only be hidden,
  not deleted (a deploy would bring them back).
- **Pictures she uploads** go through `uploadRitualImage()` — `guardUploadEntry()`
  then `acceptUpload()`, `public`, images only — and are stored on the ritual as
  `media:<id>` (one environment; `ritualImageUrl()` resolves both forms).
  Registered as an upload door in `lib/media/manage.test.ts`.
- **Code:** lib/sahama/content-admin.ts, app/dashboard/admin/sahama/

## Decisions worth remembering

- **The template's support assistant ("Lia", /dashboard/chat) is still the
  template's**: it went live with the OpenAI key and knows nothing about Sahama
  yet. Its handbook is the skill `ai-chat-knowledge`; switching it off breaks
  six shipped tests that assume it ships on, so it stays on until then.

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

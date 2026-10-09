# Growth plan ($0 budget)

Baseline 2026-10-08: ~48 requests/week, effectively zero organic users. Publishing is blocked in production until checkout/RSVP flags are enabled (BACKLOG N1) — fix that before driving traffic.

Positioning: **"Your event website and RSVPs in a minute. $20 once — no subscription, no ads, guests don't need an account."** Don't target "free" keywords; publishing costs $20.

## 1. Built-in loop (shipped / next)
- [x] "Made with Eventloom" link on every guest page (UTM `utm_source=guest_page`). Every published event shows it to 20–200 guests.
- [ ] After a guest RSVPs: "Planning something? Make your own in a minute" card.
- [ ] Share card: per-event OG image so iMessage/WhatsApp previews look premium (biggest share surface).

## 2. SEO — the main channel
Done: 6 landing pages, sitemap, OG/JSON-LD, per-event metadata + noindex.
Next, in order:
1. ~~Link the 6 landing pages from homepage; FAQ + product schema~~ (done 2026-10-08)
2. ~~`/templates` gallery + `/templates/[occasion]` pages with real rendered samples and a "Use this template" button~~ (done 2026-10-08)
3. ~~Occasion pages~~ (14 done 2026-10-08). Still missing: corporate offsite variants, baby/gender reveal, housewarming, kids' birthday, Eid/Diwali/Christmas parties.
4. Comparison pages: Zola / The Knot / Joy / Partiful / Evite alternatives — honest tables.
5. Free tools as link magnets (no signup): RSVP wording generator, RSVP deadline calculator, wedding hashtag generator, "how many guests will actually come" estimator.
6. Guides: how to word an RSVP, RSVP etiquette, how to ask for dietary restrictions, how to plan a backyard party.
7. Google Search Console: property exists (domain-verified), sitemap resubmitted 2026-10-08 — check Performance monthly via the owner's Chrome. Bing Webmaster Tools: not set up yet (can import from Search Console).

Target long-tail queries: "RSVP page for birthday party", "wedding website with RSVP no app", "guests RSVP without account", "RSVP form with dietary restrictions", "event website with custom domain", "AI wedding website generator", "<occasion> RSVP website", "one-time payment wedding website".

## 2b. AI answers (ChatGPT, Claude, Google AI Overviews) — owner priority (2026-10-08)
Goal: when someone asks an assistant "what's a good site to make an RSVP / event website", Eventloom is named. Owner does NOT want Bing Webmaster Tools.
How these engines pick sources (third-party reporting, verify periodically): ChatGPT search blends Bing's index with OpenAI's own crawler (OAI-SearchBot); Claude's web search reportedly uses Brave Search's index (Claude-SearchBot / Claude-User); Google AI Overviews use Google's index. All of them favour brands that many independent sources mention.
- [x] robots.txt allows all crawlers (GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-SearchBot, Claude-User, Google-Extended, PerplexityBot).
- [x] /llms.txt fact sheet (price, how it works, links to every template/landing page).
- [ ] Answer-shaped pages: honest comparison pages (vs Zola, The Knot, Joy, Partiful, Evite, Paperless Post, RSVPify) and a "best RSVP website builders" guide that states facts plainly, date-stamped, with Eventloom's trade-offs too.
- [ ] Consistent one-line entity description everywhere (site, llms.txt, schema, every profile/listing).
- [ ] Third-party mentions (biggest lever, needs owner accounts/approval): Product Hunt, AlternativeTo, SaaSHub, There's An AI For That, Futurepedia, G2/Capterra free listings, genuinely helpful Reddit answers, Indie Hackers/HN launch post.
- [ ] Organization schema `sameAs` links once official social profiles exist.
- [ ] Monthly check: ask ChatGPT, Claude, Gemini/AI Overviews 10 fixed prompts ("best RSVP website", "make a wedding website with RSVP", "free birthday invitation website with RSVP", …) and log whether Eventloom appears.
- Note: IndexNow (no account needed) would push new URLs to Bing → ChatGPT faster; skipped because owner declined Bing — revisit if ChatGPT visibility lags.

## 3. Communities & launches (owner approval per post; owner creates accounts)
- Product Hunt launch (prepare assets: 11-second build demo GIF, before/after).
- Indie Hackers / Hacker News "Show HN" — build-in-public story.
- Reddit: only where self-promo is allowed or as genuinely helpful answers (r/weddingplanning, r/partyplanning, r/eventplanning, r/SideProject). Never spam.
- Free directories: AlternativeTo, SaaSHub, There's An AI For That, Futurepedia, BetaList, Uneed.
- Pinterest: pins of real-looking template previews → template pages (wedding traffic lives on Pinterest).
- Short video (TikTok / Reels / Shorts): screen-recording "I made my wedding website in 11 seconds".

## Log
| Date | Action | Result |
| --- | --- | --- |
| 2026-10-08 | Added made-with link, event share metadata, noindex on guest pages | — |
| 2026-10-08 | Shipped /templates gallery + 14 occasion pages, homepage use-case links, FAQ/Product/Breadcrumb JSON-LD | — |
| 2026-10-08 | Resubmitted sitemap in Search Console (15 new template URLs). Search baseline, last 3 months: 19 clicks, 314 impressions, avg position 6.3 — all branded ("eventloom" 14 clicks/84 impr; "loom event(s)" 57 impr, 0 clicks). Zero non-brand search traffic yet. | baseline |

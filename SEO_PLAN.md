# Eventloom SEO Plan

## Goal

Increase Eventloom's visibility for high-intent searches such as:

- RSVP website
- Online RSVP website
- Event website builder
- Wedding RSVP website
- Birthday event website
- Private event website

There is no guaranteed way to obtain the first organic Google position. The objective is to build a technically clean, authoritative site that can compete for relevant searches over time.

## Phase 1: Technical foundation

### 1.a — Consolidate the canonical domain

- [x] Add application-level redirects for `www.eventloom.co` to the matching `https://eventloom.co` URL.
- [x] Redirect `/home` to `/` with a permanent `301` redirect.
- [x] Redirect `/terms-of-service` to `/legal/terms` with a permanent `301` redirect.
- [x] Confirm that the old `www` deployment is no longer serving a separate application.
- [ ] Confirm that all internal links use `https://eventloom.co` or relative URLs consistently.
- [x] Confirm that only `https://eventloom.co` appears in the homepage canonical tag and sitemap.

Implementation note: the repository handles these redirects in `src/proxy.ts`. The redirect deployment is live, and `www.eventloom.co` is now attached to the Eventloom production project in Vercel.

### 1.b — Configure Google Search Console

Status: ownership verified and sitemap submitted on 2026-09-11. The sitemap was resubmitted after the canonical redirects went live; Search Console may take time to refresh its status.

- [x] Add a Domain property for `eventloom.co`.
- [x] Verify ownership through DNS.
- [x] Submit `https://eventloom.co/sitemap.xml`.
- [ ] Inspect the homepage and each new landing page.
- [ ] Request indexing for important new or changed pages.
- [ ] Check the Page Indexing report for excluded, duplicate, redirect, and crawl-error pages.
- [ ] Review the Performance report regularly for impressions, clicks, queries, and average position.

Reference: [Google Search Console sitemap guidance](https://support.google.com/webmasters/answer/7451001)

### 1.c — Improve homepage metadata and semantics

Status: complete and verified in production on 2026-09-11. The homepage title, description, canonical, H1, and search-focused visible copy are live.

Update the homepage so the primary search intent is obvious in the title, H1, description, and visible copy.

Suggested homepage title:

> Event Website Builder with RSVPs | Eventloom

Suggested homepage H1:

> Create a beautiful event website with RSVPs

Suggested description:

> Create a beautiful event website, collect online RSVPs, and manage every guest response in one simple place.

Implementation checklist:

- [x] Keep the Eventloom brand name in the title.
- [x] Use one clear H1 on the homepage.
- [x] Mention event websites and RSVPs in the first visible paragraph.
- [x] Use descriptive H2 and H3 headings for features, use cases, pricing, and FAQs.
- [x] Remove reliance on the `keywords` meta tag; Google does not use it for ranking.
- [x] Keep copy natural and user-focused; do not repeat keywords unnaturally.

### 1.d — Add structured data and social metadata

Status: complete for Organization, WebSite, Open Graph, and Twitter metadata; production verified on 2026-09-11. BreadcrumbList and Rich Results Test validation remain planned for inner marketing pages.

- [x] Add `Organization` structured data for Eventloom.
- [x] Add `WebSite` structured data for the main domain.
- [ ] Add `BreadcrumbList` structured data to inner marketing pages.
- [x] Add a branded `og:image` for social sharing.
- [x] Add a Twitter/X image and use a large summary card where appropriate.
- [ ] Validate structured data with Google's Rich Results Test.
- [ ] Test social previews on LinkedIn, Facebook, and X.

Only add schema that accurately describes the page. Do not add fake ratings, reviews, or unsupported claims.

### 1.e — Protect private event pages

Eventloom's dynamic event pages can contain private event details and guest information. They should not automatically become search results.

- [ ] Set dynamic event pages to `noindex` by default.
- [ ] Do not include private event pages in the sitemap.
- [ ] Add an explicit opt-in for a customer who wants a public event showcase page indexed.
- [ ] For opted-in showcase pages, generate unique titles, descriptions, canonicals, and social images.
- [ ] Confirm that RSVP submissions and private guest data are never exposed to search engines.
- [ ] Add only opted-in, genuinely useful public pages to the sitemap.

## Phase 2: Focused landing pages

Create one useful, distinct page for each high-intent search theme. Each page should have original copy, a relevant example, clear pricing or product information, and a strong call to action.

### 2.a — Define the landing-page architecture

- [x] Map one primary search intent to each page.
- [x] Assign one primary keyword theme and several natural variations to each page.
- [x] Avoid assigning the same primary intent to multiple pages.
- [x] Define the internal-linking path between related pages.
- [x] Decide which pages should be included in the sitemap.

### 2.b — Create the required pages

- [x] `/rsvp-website`
- [x] `/online-rsvp`
- [x] `/event-website-builder`
- [x] `/wedding-rsvp-website`
- [x] `/birthday-event-website`
- [x] `/private-event-website`

### 2.c — Apply the page requirements

Each page should include:

- [x] A unique SEO title.
- [x] A unique meta description.
- [x] One H1 matching the page's primary intent.
- [x] A short explanation of who the page is for.
- [x] Product screenshots or a working example.
- [x] Relevant features and benefits.
- [x] How Eventloom differs from generic form tools and invitation platforms.
- [x] Pricing and what is included.
- [x] A clear CTA to create an event.
- [x] A visible FAQ section based on real customer questions.
- [x] Internal links to related Eventloom pages.
- [x] A canonical URL.
- [x] Mobile-friendly layout and fast loading time.

### 2.d — Position each page for a distinct audience

#### `/rsvp-website`

Primary message: Create a polished RSVP website with event details, guest questions, and response tracking.

#### `/online-rsvp`

Primary message: Collect online RSVPs from one simple link without requiring guests to create an account.

#### `/event-website-builder`

Primary message: Build an event website in plain language, refine it visually, and publish it when ready.

#### `/wedding-rsvp-website`

Primary message: Create a beautiful wedding website with schedule, venue details, guest questions, and RSVP management.

#### `/birthday-event-website`

Primary message: Create a fun birthday event page, share one invite link, and track who is attending.

#### `/private-event-website`

Primary message: Share event details and collect guest responses while keeping event information private and organized.

Avoid creating pages that are nearly identical except for swapping a keyword. Each page must serve a distinct search intent and audience.

### 2.e — Review and publish the landing pages

- [ ] Test every page on mobile and desktop.
- [ ] Confirm that each page has one H1 and a unique title and description.
- [ ] Confirm that every CTA works.
- [ ] Confirm that every page has a canonical URL.
- [ ] Validate structured data and social previews.
- [ ] Add approved pages to the sitemap.
- [ ] Submit the updated sitemap in Search Console.

## Phase 3: Build authority over time

### 3.a — Publish useful guides

Create genuinely helpful, original articles. Prioritize questions that potential Eventloom customers already ask.

- [ ] How to create an RSVP website
- [ ] Wedding RSVP questions to ask guests
- [ ] Best free RSVP alternatives
- [ ] What to include on an event website
- [ ] How to collect RSVPs by link, text, or QR code
- [ ] Wedding website versus RSVP website: what is the difference?
- [ ] Birthday invitation wording and RSVP examples
- [ ] Private event website checklist

Each article should:

- [ ] Answer the question directly near the top.
- [ ] Include practical examples and templates.
- [ ] Link to the most relevant Eventloom product page.
- [ ] Include a clear next step.
- [ ] Be reviewed and updated when product details change.
- [ ] Be written for people first, not generated as keyword filler.

### 3.b — Earn relevant links and mentions

Build relationships with organizations that already serve Eventloom's target customers.

- [ ] Wedding planners.
- [ ] Wedding venues.
- [ ] Photographers and videographers.
- [ ] Caterers and event vendors.
- [ ] Corporate event organizers.
- [ ] Local Canadian event businesses.
- [ ] Community organizations and nonprofits.
- [ ] Event planning newsletters and publications.

Potential link-worthy assets:

- [ ] Public customer examples, with customer permission.
- [ ] Event website templates.
- [ ] RSVP wording library.
- [ ] Wedding planning checklist.
- [ ] Event invitation checklist.
- [ ] Free RSVP planning spreadsheet or calculator.

Do not buy low-quality bulk backlinks or use services that promise guaranteed rankings.

### 3.c — Publish customer examples and case studies

- [ ] Ask successful customers for permission to feature their event page.
- [ ] Create a short case study covering the event type, problem, setup, and result.
- [ ] Link from the case study to the appropriate landing page.
- [ ] Keep guest names, addresses, and private RSVP information hidden.
- [ ] Add a `noindex` option for any example the customer does not want in search.

## Phase 4: Measurement and improvement

### 4.a — Weekly checks

- [ ] Check Search Console for indexing errors.
- [ ] Check new search queries and impressions.
- [ ] Check whether important pages are indexed.
- [ ] Check site uptime and redirect behavior.

### 4.b — Monthly optimization

- [ ] Record ranking positions for the target queries.
- [ ] Compare organic clicks and signups to the previous month.
- [ ] Review pages with impressions but low click-through rate.
- [ ] Improve titles and descriptions for pages that are being seen but not clicked.
- [ ] Publish or update at least one useful guide.
- [ ] Pursue relevant partnerships or mentions.

### 4.c — Core success metrics

- [ ] Indexed marketing pages.
- [ ] Impressions for target queries.
- [ ] Organic clicks.
- [ ] Organic signup starts.
- [ ] Published events attributed to organic search.
- [ ] Cost per acquired customer from paid campaigns.
- [ ] Number and quality of referring domains.

## Suggested implementation order

1. Complete `1.a`: consolidate `www`, `/home`, and `/terms-of-service` redirects.
2. Complete `1.b`: configure and verify Google Search Console.
3. Complete `1.c`: update the homepage H1, title, description, and visible copy.
4. Complete `1.d`: add structured data and social metadata.
5. Complete `1.e`: add privacy-safe metadata rules for dynamic event pages.
6. Complete `2.a`: define keyword intent and landing-page architecture.
7. Complete `2.b` and `2.c`: build the first two landing pages and apply the page requirements.
8. Complete `2.d` and `2.e`: build, review, and publish the remaining landing pages.
9. Complete `3.a`: publish the first useful guides.
10. Complete `3.b` and `3.c`: start partnership outreach and customer examples.
11. Complete `4.a` and `4.b`: review Search Console data and improve pages based on actual queries.

## Phase 5: Completion criteria

The initial SEO implementation is complete when:

- [ ] All canonical-domain redirects return permanent redirects.
- [ ] `https://eventloom.co/` is the only canonical homepage URL.
- [ ] Google Search Console is verified and the sitemap is submitted.
- [ ] All intended marketing pages are indexable and present in the sitemap.
- [ ] Private event pages are not indexable by default.
- [ ] Homepage and landing-page metadata are unique and search-intent aligned.
- [ ] Organization, WebSite, and breadcrumb structured data validate successfully.
- [ ] Social previews show a branded image.
- [ ] Search Console reports no critical sitemap or indexing errors.
- [ ] Conversion tracking can connect organic search visits to event creation and publication.

## Budget guidance

The technical work can be completed with little or no additional software cost if it is done in-house. Google Search Console is free.

Typical planning ranges:

- DIY SEO tools and monitoring: `$0–$150/month`.
- One-time technical and landing-page implementation: `$1,500–$4,000` if outsourced.
- Ongoing content and link-building support: `$1,000–$3,000/month` if outsourced.
- Optional Google Ads testing: `$500–$1,500/month` in advertising spend, plus any management fee.

These are planning estimates, not ranking guarantees. Organic SEO usually requires several months of consistent publishing, links, and product traction before competing for broad terms such as “RSVP website” or “event website builder.”

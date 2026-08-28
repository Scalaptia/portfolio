# Design upgrade notes

Written 27 Aug 2026, after measuring the built site rather than guessing at it. Numbers come from
`npm run build` output, `du` on `dist/`, and grepping the generated HTML.

The site is good. The pixel-brutalist look with the cream background, the coral primary and the
`<experience>` tag headings is a real identity, and almost no junior portfolio has one. Nothing here
proposes a redesign. Everything below either fixes something broken, fills a gap a recruiter will
notice, or adds something that makes the page memorable instead of merely competent.

## Bugs I found while measuring

**Every page ships the same title.** `Layout.astro` destructures `const { title } = Astro.props` and
then never uses it. All ten built pages carry `<title>Fernando Haro</title>`, including
`/projects/awita/` and the Spanish routes. Every page already passes the prop, so the fix is one
line:

```astro
<title>{title ? `${title} | Fernando Haro` : "Fernando Haro"}</title>
```

Then pass something real from the project pages, like `Awita`, instead of `home`.

**No hreflang and no canonical.** The Spanish routes exist and read to a crawler as near-duplicates
of the English ones. Three `<link>` tags in `Layout.astro` fix it.

**The OG image lives on i.ibb.co.** A free image host holds the preview that appears every time
someone shares your portfolio in Slack or LinkedIn. When that link rots, every share becomes a grey
box. Move the file into `public/` and serve it from your own domain.

**The meta description is "Check out my projects and get in touch!"** That is the sentence Google
prints under your name. It should say what you build.

## Weight

Total JS in `dist/_astro` is 1,141 KB. The PC model is 888 KB of it, 78% of everything the page
downloads, and it sits above the fold. The model file itself is 40 KB. The rest is three.js plus
drei.

Two options, and I would take the first:

1. Load it after the hero paints. `client:idle` instead of `client:only="react"` takes it off the
   critical path and costs you nothing visually. The "Click me!" hint just arrives a beat later.
2. Replace it with a sprite sheet or a canvas animation. Cheaper by 850 KB, but you lose the
   interactivity, and the interactivity is the whole point. I would not do this.

`public/images` is 6.9 MB. Four Stilo screenshots are still PNG at 516 KB, 452 KB, 364 KB and one
more, while everything else is already WebP. Converting them drops about 1.2 MB for no visible
difference. Lazy loading is already handled correctly: every image without `loading="lazy"` is a
deliberate eager load, the first carousel slide, the main gallery image, and the lightbox, which only
mounts when opened.

## The content gap that matters most

There is no skills section anywhere on the site. This is the page people open from the link on your
resume, and there is nothing on it to scan for React, TypeScript or PostgreSQL. Every other surface
you own has one. A recruiter who spends fifteen seconds here leaves without the keywords that decide
whether you get a call.

Build it in the existing visual language: a bordered card per group, mono labels, the same
`shadow-[4px_4px_0px]` offset. Group by what you would defend in an interview, not by everything you
have ever touched.

```
frontend    React · React Native · TypeScript · Next.js · Astro · Tailwind
backend     NestJS · FastAPI · GraphQL · PostgreSQL · Supabase · Prisma
cloud       AWS Lambda · S3 · CloudFront · Terraform · Docker · GitHub Actions
agents      Claude Code skills · MCP · RAG · Vertex AI · Gemini
testing     Playwright · Selenium · TestNG · Vitest
```

That block is also the best single thing you can add for the LLM screeners that now sit between you
and half the applications you send.

## Smaller content fixes

**Nothing marks the current role.** The timeline renders five identical cards, so a reader cannot
tell at a glance what is happening now. Give the top dot a pulsing ring and the period pill a
different treatment when the period ends in "Present".

**Experience descriptions are single paragraphs.** The PSL entry is three sentences that want to be
three lines. Make `description` accept `string | string[]` and render an array as stacked lines.
Five lines in `Experience.tsx`, and both JSON files stay backward compatible.

**Project cards do not separate live from archived.** Awita has been running for over a year and
NASA Explorer is a weekend build that still deploys. Espyntar and 16-BDH are finished coursework. A
small status pill saying live, shipped or archived tells that story without a sentence.

## Ideas worth building

Ranked by what I would actually do, not by how hard they are.

### 1. Put the live Awita reading on the page

You have a public API serving the current water level of a physical tank in your house, updated
every 60 seconds, and it is not on your portfolio. A recruiter reading the Awita card is being asked
to take your word for it. Show them instead.

A small card inside the Awita entry: current percentage, last reading timestamp, and a sparkline of
the past 24 hours. Fetch it client-side with a cached fallback so a cold Lambda never renders a
broken widget.

Nobody else's portfolio has hardware in it reporting live. This is the most distinctive thing you
own and it costs an afternoon.

### 2. A "what I would do differently" section on the detail pages

The detail pages already run problem, how it works, what I built, results. Add one more.

Your post-mortems are unusually good and all of them are currently invisible: the Espyntar
packet-per-event decision that caused desync when batching completed lines would have fixed it,
killing the Awita LSTM after measuring what it cost, reverting your own CI allow-list at your own
expense. Most portfolios are a wall of claimed success. A section where you name your own design
mistake and the correct fix reads as seniority, and it is what an interviewer will remember and ask
about.

Three sentences per project. Any longer and it turns into an apology.

### 3. Command palette

Cmd+K opens a terminal-styled overlay. Type `awita`, `resume`, `email`, or `es` to switch language.
It fits the `<experience>` tag aesthetic exactly, it is genuinely useful on a page this long, and it
is the kind of detail that makes another developer screenshot your site.

Ubuntu Mono, cream background, a blinking block cursor. Do not import a library. It is about 80
lines and one `keydown` listener.

### 4. View transitions between the grid and the detail page

`ClientRouter` is already installed and doing a plain crossfade. Add `transition:name={slug}` to the
project card image and the same name on the detail page hero, and the image flies from grid to page.
Two attributes. Looks like it took a week.

### 5. Architecture diagrams on the detail pages

One inline SVG per project, in your palette, showing the real boxes. Arduino to Lambda to MySQL to
dashboard for Awita, the three-phase pipeline for Stilo. Inline SVG so it themes correctly and costs
nothing to load. This is what makes a project page read as engineering instead of a screenshot
gallery.

### 6. Generated OG images per project

`astro-og-canvas` renders a card per route at build time, so a shared link to `/projects/stilo`
previews with the Stilo title in your own fonts. Pairs with the hosting fix above.

### 7. JSON-LD Person schema

People google you after they read your resume. A `Person` block with `sameAs` pointing at GitHub,
LinkedIn and the Tech4Good lab page tells Google those are the same person. Ten lines in
`Layout.astro`.

### 8. A night palette

Cream and coral is a daylight theme, and a good chunk of your audience browses dark. The palette
maps cleanly: deep aubergine background, keep the coral primary, lift the text to near-white. The
pixel shadows need a lighter offset than the current `rgba(65,44,71,1)`.

Real work, and worth doing only after everything above. Put it behind `prefers-color-scheme` with a
toggle in the header.

## Accessibility, quickly

`BackgroundDecorations` respects `prefers-reduced-motion`, which is more than most sites manage. The
`fadeInUp` animation and the PC model do not. One media query in `Layout.astro` covers the first:

```css
@media (prefers-reduced-motion: reduce) {
  .animate-fade-in-up { animation: none; opacity: 1; }
  ::view-transition-group(*) { animation-duration: 1ms; }
}
```

Also worth a pass: the timeline dots and period pills carry meaning through color and shape alone,
and the hero name hover changes color with no other signal.

## What I would skip

**A blog.** You will write two posts and abandon it, and a blog whose newest entry is eight months
old is worse than no blog. If you want to write, put it in GitHub READMEs where it sits next to the
code.

**Testimonials.** You have real praise from your PSL manager, but a junior portfolio with a
testimonials section reads as trying too hard. Put the recommendation on LinkedIn, where that format
is native.

**Scroll-triggered animation on every section.** You have one `reveal` class already and it is
enough. More of it makes the page feel slower, not richer.

## Suggested order

1. Title tag, canonical and hreflang, OG image host, meta description. One PR, about an hour.
2. Skills section. Largest gap, highest return.
3. `client:idle` on the PC model, convert the four Stilo PNGs, lazy-load the last five images.
4. Live Awita widget.
5. "What I would do differently" on the three detail pages.
6. Command palette, then view transitions.
7. Diagrams, OG images, JSON-LD.
8. Night palette, if you still want it by then.

Items 1 through 3 are maintenance and take a weekend. Item 4 is the one that makes people remember
the site.

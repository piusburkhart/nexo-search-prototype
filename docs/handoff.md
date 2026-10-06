# Nexo search prototype: handoff

## Run it
```
npm ci
npm run dev        # http://localhost:5173 (402px phone column; framed on desktop)
npm run build      # tsc + vite
npm test           # Playwright (starts the dev server itself); first run: npx playwright install chromium
```

## What was built
- **Home** (Figma 72:1605): Recordings feed of meetings and memos, filter chips (All/Meetings/Memos), "New"/"Earlier" sections, tab bar with search button.
- **Search** (72:1770 to 72:2539): full-screen layer. Idle: folder + latest recordings. Typing: results grouped into Meetings, Memos, Transcript mentions with counts; matches highlighted in titles and snippets; filter tags with counts (green when selected); date recognition (`02.10.26`, `2026-10-02`, `2 Oct 2026`) with a date tag; no-results state.
- **AI search** (72:2606, 72:2695, 72:2651): "AI Synthesis" offered for question-like queries, a short "Synthesizing" state, then an extractive summary and Content cards.
- **Transcript** (not in Figma): segments with speaker and mm:ss, opens at the clicked segment with it highlighted, find-in-transcript with "n / total" and next/previous.
- **Meeting and Memo detail** (not in Figma): the simplest screens that make the flow navigable.
- Data: `src/data/mock-data.json` only; typed in `src/data/types.ts`. Search logic is a pure module (`src/search.ts`). Hash router (`src/router.ts`), no extra libraries beyond Playwright for tests.
- Tests: `tests/acceptance.spec.ts` covers the 7 acceptance checks (Lantern, CSV, SSO, pricing, 16 October, swim, budget) plus navigation (home, search, close, detail, transcript, back, chips, tags, date tag, AI flow, find-in-transcript). 16 pass.

## Visual differences
See `docs/visual-diff.md`.

## Assumptions
All in `docs/decisions.md` (D1 to D23). Main ones: Figma content was placeholder, so data wins; the Figma "Actions" feature is not built because the data has none; the AI synthesis is not a real model; `docs/` and the screen exports did not exist, so I exported frames from Figma at 1x.

## Check with the designer
1. Should results be grouped Meetings / Memos / Transcript (brief) or Folders / Recordings / Actions / Content (Figma)?
2. Is "Actions" in scope? There is no action data.
3. Should selected tags appear inside the input (Figma) or as chips (ours)?
4. Screens missing from Figma: meeting detail, memo detail, transcript viewer, no-results.
5. What counts as "New"? We use "within 7 days of the newest item".
6. Should the Folders and People chips on Home do anything?
7. Fonts: Brown and Test Domaine Text need licensed files to match exactly.

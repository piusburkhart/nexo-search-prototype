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
- **Meeting, memo and transcript pages: removed** (D64). Nothing opens a file any more.
- Data: `src/data/mock-data.json` only; typed in `src/data/types.ts`. Search logic is a pure module (`src/search.ts`). Hash router (`src/router.ts`), no extra libraries beyond Playwright for tests.
- Tests: `tests/acceptance.spec.ts` covers the 7 acceptance checks (Nexo, CSV, SSO, pricing, 16 October, swim, budget) plus navigation (home, search, close, detail, transcript, back, chips, tags, date tag, AI flow, find-in-transcript). 16 pass.

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

## Update: AI Synthesis (see docs/demo-prompts.md)
AI Synthesis is a permanent control at the top of the search results (Figma 75:3668). It answers questions from the meeting notes in `src/data/mock-data.json` with a local engine (`src/ai.ts`, D59); there is no language model behind it. The data now has 17 meetings, 17 transcripts and 18 memos. `docs/demo-prompts.md` lists prompts to try.

## Update: board 77:4178
Actions (a third file type, with an Actions tab), three-item sections with unfold links, and transcript cards that carry their meeting. The meeting, memo and transcript pages are gone. AI answers are a short summary with the supporting quotes listed as results below (D63).

## Update: one semantic engine (D69)
Search and AI Synthesis share one reading of the query (`src/semantic.ts`): synonyms, typo correction, the project as membership, and question intent. Search decides the results; AI Synthesis only summarises what is on screen and never adds sources.

## Update: Continue in Claude
When a request goes beyond Nexo's small on-device model, **AI Synthesis** says "Nexo can not help you with that." and offers one tap, "Continue working in Claude" (Figma 86:5100). The tap copies the transcripts, shows the toast "Transcript copied" and opens `claude.ai/new?q=` with the request, the sources (title, date, participants) and the rule to answer only from the material. No sheet, no confirmation, no app picker. Search itself never suggests Claude. Full description: `docs/handoff-feature.md`. Decisions: D79 to D88.

- **Rules:** `src/data/capabilities.json` (what runs on the device; edit it without code changes) read by `src/lib/capability.ts`. Run `npm run test:unit` after editing.
- **Wording:** `src/content/handoff-copy.ts`.
- **Modes:** hidden settings (long-press a screen title, 0.7 s) or `?handoff=simulate|share|clipboard|download`; Auto is clipboard + link. The mode is saved per device.
- **Tests:** `npm run test:unit` (Vitest, 40) and `npm test` (Playwright, 81, including the handoff flow at 390x844 and 360x800). Set `PW_PORT=5181` to run the tests on a fresh dev server next to one that is already running.
- **To verify on a real phone:** `docs/handoff-test-checklist.md`.

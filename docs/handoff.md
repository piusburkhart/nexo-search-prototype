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
When a request goes beyond what Nexo's small on-device model can do, the app offers to hand it to Claude, with a ready-made prompt and the relevant transcripts. Nothing is sent until the user sends it in Claude. Plan: `docs/handoff-feature.md`. Decisions: D79 to D87.

**Where it shows up**
- **Search:** a "Continue in Claude" card. It sits above the results for clear requests ("write a follow-up email to Kestrel", "compare the two customer interviews", "translate…", "rewrite… as bullet points", "what were the risks of the launch?"). It replaces the empty state when a question finds nothing ("what is the capital of australia?"). Plain keyword misses ("budget") keep the regular empty state.
- **Transcript cards:** each card in "Summary & Transcription" has an "Ask Claude" action. It carries that meeting's transcript.

**How it decides.** `src/data/capabilities.json` lists what runs on the device and what doesn't. Each unsupported category has its words, patterns, prompt template and simulated reply. `src/lib/capability.ts` reads it with fixed rules (D80), and the JSON can be edited without code changes. Run `npm run test:unit` after editing: every category's examples must still classify as that category.

**The sheet.**
- **Contents:** the editable prompt with a character count, the attachments as file chips (preview, remove), a privacy line, and a consent checkbox that enables "Open in Claude".
- **States:** default, editing, no attachments, long content, opening, copied/downloaded with an "Open Claude" link, shared, cancelled share, fallback notices, offline error with "Try again", and "Welcome back" after returning.
- **Copy:** all of it is in `src/content/handoff-copy.ts`.

**Modes.**

| Mode | What happens |
|---|---|
| Auto (default) | Share sheet on a phone that can share files, otherwise clipboard + link |
| Share sheet | `navigator.share` with one .txt per source and the prompt as text |
| Clipboard + link | Copies prompt + transcripts, then "Open Claude" goes to `https://claude.ai/new?q=<prompt>` (under 2,000 characters) |
| Download + link | Downloads the .txt, then the same link with "see the attached transcript" |
| Simulate | Stays in the app: "Opening Claude…", then a simulated chat with the prompt, the files and a neutral canned reply |

**Switching modes**
- **Hidden settings:** long-press the screen title ("Recordings" or "Global search") for 0.7 s, or go to `#/settings`. They also show debug info: share and file-share support, clipboard, platform, and what Auto picks.
- **Facilitator link:** `?handoff=simulate` (or `share`, `clipboard`, `download`) presets the mode on that device, e.g. `https://nexosearchprototype.vercel.app/?handoff=simulate`.
- **Saved per device:** the mode is stored in localStorage.

**Files**
- **Model and classifier:** `src/data/capabilities.json`, `src/lib/capability.ts`.
- **Handoff logic:**
  - `src/lib/handoff/buildPrompt.ts`: prompt, export, file name, link.
  - `strategies.ts`: the ladder and the share/copy/download calls.
  - `settings.ts`, `sources.ts`, `store.ts`.
- **UI:** `src/components/handoff/` (card, sheet, file chip, simulated chat, host), `src/screens/Settings.tsx`, `src/components/Toast.tsx`.
- **Untouched:** `mock-data.json`.

**Tests**
- **Unit:** `npm run test:unit` (Vitest, 40 tests) covers the classifier, the export and prompt, and the ladder.
- **Browser:** `tests/handoff.spec.ts` (Playwright) runs 13 tests each at 390×844 (iPhone) and 360×800 (Pixel), with touch and a phone user agent. `npm test` runs these together with the acceptance tests.

**Assumptions**
- **Entry point:** there are no meeting or transcript pages (D64), so "Ask Claude" lives on the transcript cards.
- **Sources for a search handoff:** the request without its request words is searched again; up to 5 sources are attached, meetings first.
- **The card above results:** it shows even when search found results, if the request is clearly something the device can't do. The results and AI Synthesis stay.
- **Two taps in clipboard and download mode:** the first copies or downloads and shows the hint, the second opens Claude through a real link. Both are direct taps, which mobile browsers require.
- **Long content:** the mock transcripts are short (at most about 1,100 characters), so the long-content warning (over 14,000 characters) only appears with many attachments.
- **The simulated chat:** it uses Nexo's own look with no Claude branding, and its replies say they are simulated.

**To verify on a real phone:** `docs/handoff-test-checklist.md`. The main open questions:
- Does the iOS and Android share sheet list the Claude app and deliver the file and the text?
- Does `claude.ai/new?q=` open the app or the browser, and does the prompt arrive prefilled?
- Where does a downloaded file land, and can it be attached?

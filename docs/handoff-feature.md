# Continue in Claude: plan

Nexo's real model runs on the device, so it is small. When a request goes beyond it, the app offers to hand the request to Claude: a ready-made prompt plus the relevant transcripts, sent only when the user sends it in Claude. The prototype runs on a phone first; desktop is secondary.

Figma has no frames for this feature (checked the whole file for "Claude", "handoff", "share", "export", "settings"). Everything is built from existing tokens and component patterns (D79).

## 1. When the handoff triggers

`src/data/capabilities.json` describes what the on-device model can and can't do. `src/lib/capability.ts` reads it and classifies a query deterministically (no AI):

```
classify(query, { resultCount }) -> { supported, category?, confidence, reason }
```

| Step | Rule | Result |
|---|---|---|
| 1 | The query matches a pattern of an unsupported category (drafting, comparing/analysing, open-ended reasoning, translating, rewriting, outside knowledge) | `supported: false`, that category, confidence 0.9. The card shows **above** the results, even if search found things. |
| 2 | The query matches a keyword of an unsupported category | `supported: false`, confidence 0.7. Same as 1. |
| 3 | The query matches a supported category (keyword search, open transcript, show summary, list actions, simple lookup) | `supported: true` |
| 4 | Search found nothing **and** the query reads like a request or question (request word such as write, draft, compare, why, analyze, translate; a question word; a "?"; or 4+ words) | `supported: false`, category "reasoning" or "outside knowledge", confidence 0.5. The card shows **in place of** the empty state. |
| 5 | Anything else, such as a plain keyword miss ("budget", "csv zzzz") | `supported: true`. The regular empty state stays. |

All words and patterns live in the JSON, so they can be edited without touching code.

## 2. User flow and states

**Entry A, search.** The user types a query.
1. The classifier says "not supported". A **Continue in Claude card** appears under the AI Synthesis block: what Nexo can't do on the device, what Claude can do, a primary "Continue in Claude" and a secondary "Not now". "Not now" hides the card for that query.
2. With zero results and a request-like query, the card replaces the empty state. A plain keyword miss keeps the empty state.

**Entry B, transcript card.** Every "Summary & Transcription" card (one per meeting) gets an "Ask Claude" action. It opens the sheet with that meeting's transcript attached. The meeting, memo and transcript pages no longer exist (D64), so the transcript card is the closest "transcript and meeting detail" surface.

**The handoff sheet** (bottom sheet, focus-trapped):
1. Title and one line: this goes beyond what Nexo can do on your device.
2. What will be shared: the prompt (editable textarea with a character count), the attachments as file chips (name, source, size, remove, expand to preview), and a plain statement that this content leaves the device and that nothing is sent until the user sends it in Claude.
3. A consent checkbox. "Open in Claude" stays disabled until it is checked.
4. Primary "Open in Claude", secondary "Cancel". A line under the button says what will happen in the current mode.

| State | What the user sees |
|---|---|
| Default | Prefilled prompt and attachments, unchecked consent, primary disabled |
| Editing | Textarea focused, count updates; the sheet sits above the keyboard |
| No attachments | All chips removed (allowed): a calm warning that Claude gets no meeting context |
| Long content | Over 14,000 characters attached: the link carries only the request, and the transcript travels by share, clipboard or file |
| In progress | Button shows "Opening…" and is disabled |
| Copied / downloaded (modes B, C) | Hint "Transcript copied. Paste it into Claude." or "Transcript downloaded…" with an "Open Claude" link (second tap) |
| Success | Share sheet completed: "Shared. Finish in Claude." and the sheet closes |
| Cancelled share | The sheet stays open, nothing looks like an error; a quiet "Copy and open Claude instead" is offered |
| Unavailable | Share or clipboard missing: falls to the next strategy with a short explanation |
| Failure | Offline or an unexpected error: an error message with "Try again" |
| Welcome back | After returning from Claude (page shown again or reloaded): a calm toast "Welcome back to Nexo." |

## 3. Handoff strategies (`src/lib/handoff/`)

| Id | Strategy | How |
|---|---|---|
| `share` | A. Native share sheet with the file | `navigator.share({ files, text, title })` with a .txt per source, built in memory when the sheet opens. Called directly in the tap. |
| `clipboard` | B. Clipboard + prefilled link | Copies prompt + transcripts in the tap (clipboard API, `execCommand` fallback), then shows an "Open Claude" link to `https://claude.ai/new?q=…` (under 2,000 characters; long prompts become a short "it's in my clipboard" instruction). |
| `download` | C. Download + link | Downloads the .txt through a Blob and an `<a download>` in the tap, then the same link, with a prompt that says "see the attached transcript". Says honestly that the user must attach the file in Claude (on iPhone it goes to Files). |
| `simulate` | D. Simulated chat | Stays in the app: "Opening Claude…" then a generic "Claude chat (simulated)" screen with the prompt in the composer, file chips and a send button; after sending, a neutral canned reply per category. "Back to Nexo" returns. No Claude branding. |

**Auto ladder:** a mobile device where `canShare({ files })` is true uses `share`; everything else uses `clipboard`. `download` and `simulate` are only picked manually. If `share` is picked manually but unavailable, it falls to `clipboard` with an explanation. If the clipboard fails, the sheet offers the download (a manual tap) instead of picking it on its own.

**Taps stay synchronous.** Prompt, files and links are rebuilt whenever the sheet's inputs change, so a tap only calls `share`, `writeText`, the download click or the link. B and C open Claude with a real `<a href>` on a second tap, never `window.open` after an `await`.

## 4. Prototype settings (hidden)

- `#/settings`, reached by a long-press (0.7 s) on the screen title ("Recordings" or "Global search"). Nothing in the UI points to it.
- **Handoff mode:** Auto / Share sheet / Clipboard + link / Download + link / Simulate, saved in localStorage per device.
- **Debug info:** `navigator.share`, `canShare` with files, clipboard API, secure context, platform guess, home-screen mode, online, and the strategy Auto would pick.
- **URL parameter** `?handoff=simulate|share|clipboard|download`, before or inside the hash (`/?handoff=simulate#/search` or `#/search?handoff=simulate`), saves the mode, so a facilitator can send a preconfigured link.

## 5. Components

| New | Reused |
|---|---|
| `HandoffCard` (search entry) | Card shape, tokens and the black pill button style of AI Synthesis |
| `HandoffSheet` (bottom sheet) | `TranscriptCard` (gets an "Ask Claude" action) |
| `FileChip` (name, source, size, remove, preview) | Tag/chip styling (`rounded-hit`, gray-200 borders, `shadow-bar`) |
| `SimulatedChat` | Thinking dots from AI Synthesis |
| `Toast` (aria-live) | `Screen`, `PhoneFrame` (the overlays stay inside the phone frame) |
| `Button` (primary / secondary, 44px) | Icons (new: share, external) |
| `Settings` screen | Router (`#/settings`) |

## 6. Data

- `src/data/mock-data.json` stays untouched. Prompts, file names and exports are built from it at runtime.
- New: `src/data/capabilities.json` (categories, words, patterns, prompt templates, simulated replies).
- New: `src/content/handoff-copy.ts` (every user-facing string of the feature, including the privacy copy).

## 7. Open questions and assumptions

| Question | Assumption |
|---|---|
| No meeting or transcript detail pages exist (D64) | "Ask Claude" sits on each transcript card in search |
| Which sources does a search handoff attach? | Up to 5 meetings from the results (transcripts), then memos, searched again without the request words ("write a follow-up email to Kestrel" searches "Kestrel") |
| Should the card show when search found results? | Yes for clear unsupported requests (steps 1 to 2), above the results; the results and AI Synthesis stay |
| "What were the risks of the launch?" is answered by AI Synthesis today | It is open-ended reasoning per the brief: the card shows above the results, the local answer stays |
| Does B open Claude in the same tap as the copy? | No: the copy happens in the first tap and shows the hint, the second tap follows the link. The user sees the hint, and both steps are their own gesture |
| One file or several? | One .txt per source for share and download; one combined text for the clipboard |
| Simulated reply content | Neutral, generic per category, labelled as simulated; never pretends to be a real answer |
| Long-transcript warning | The mock transcripts are short, so it only shows with many attachments; the threshold is a constant |

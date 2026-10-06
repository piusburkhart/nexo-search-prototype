# Decisions & assumptions

| # | Topic | Conflict / gap | Decision |
|---|-------|----------------|----------|
| D1 | Data path | Brief says `src/data/mock-data.json`; file was at `src/mock-data.json` (untracked). | Moved to `src/data/mock-data.json`. |
| D2 | `docs/` | `docs/` and `docs/screens/*.png` did not exist. Only CLAUDE.md exists. | Exported reference frames myself from Figma (`docs/screens/`), stored at 1x (402x874) because the MCP screenshot tool returned 1x. Visual diffs compare at 1x. |
| D3 | Stack | CLAUDE.md: Vite + React + TS + Tailwind v4. | Used. Design tokens live as CSS variables in `@theme` (Tailwind v4), so utilities map to tokens. No hardcoded colours in components. |
| D4 | Figma content vs data | Figma shows placeholder copy (Ana, Lisa, "Swarovski Optik", "Actions", folder "Lantern 30"). Data says Elin, Priya, Jonas... | mock-data.json wins on content; Figma wins on layout/visuals. |
| D5 | Actions | Figma has an "Actions" filter tag and action rows (todo, mail). mock-data.json has no actions. | Not built (no data; would need invented content). Tag set is Meetings / Memos / Transcript (+ date tags). |
| D6 | Grouping | Figma shows tag chips ("Actions 4, Folder 1, Recording 8"); brief wants grouped results with counts. | Result list is grouped by type with counts; the same groups are offered as tappable filter tags (green when selected, per Figma note). |
| D7 | Folders | Figma shows a "Folders" section in search with a "Lantern" folder (count). | The one project in data (Project Lantern) is the folder; count = recordings with that projectId. Tapping it filters to the project. Shown only when the query is empty, as in Figma. |
| D8 | Date tags | Figma recognises dates (e.g. `21.08.26`) and offers a date tag, then filters to that day. | Recognise `dd.mm.yy`, `yyyy-mm-dd` and `d Mon yyyy`; offer a date tag with count; selecting filters to that day. Date text is not used as a text term once recognised. |
| D9 | AI search | Figma shows a "AI Synthesis" pill, a "Synthesizing for you" state and a result paragraph. No LLM allowed. | Offered when query has 3+ words or ends with "?". Synthesis is a deterministic extractive summary built from top hits (mock "thinking" delay ~900ms). Content cards below reuse transcript hit cards, as in Figma. |
| D10 | Missing screens | Figma has no meeting detail, memo detail or transcript screen, though the brief requires "opens the transcript at the segment". | Built simplest versions in the design system: Meeting detail (summary, participants, transcript link), Memo detail, Transcript (segments, highlight, find-in-transcript with count + prev/next). Logged as invented. |
| D11 | No-results state | Not in Figma. | Simple empty state: "No results for “x”" with hint. |
| D12 | Fonts | Figma uses Brown (sans) and Test Domaine Text (serif), both licensed. | Fallbacks: system sans for Brown, Georgia for Domaine. Tokens named `--font-sans`/`--font-serif` so they can be swapped. |
| D13 | Home chips | Figma chips: All, Meetings, Memos, Folders, People; no behavior notes for the last two. | All, Meetings, Memos filter the feed. Folders and People are rendered for fidelity but do nothing (no screens in Figma). |
| D14 | Keyboard | Figma draws an iOS keyboard. | Not drawn; the real keyboard / none on desktop. Search bar docks to bottom of the phone frame. |
| D15 | Viewport | Figma is a 402x874 mobile frame. | App renders in a 402-wide column, centered with a phone-like frame on larger screens; full-bleed below 402px. Tests use 402x874. |
| D16 | Multi-word | "Multi-word queries match all words." | Each word must appear somewhere in the same item (title+body), any order. |
| D17 | Transcript meetings | Only 3 of 10 meetings have transcripts. | Others open without a transcript link. |
| D18 | Memo kind | Brief says 7 work, 3 personal; no explicit field. | Personal = memo has tag `personal` (memo03, 04, 08). Shown identically in results, per brief. |

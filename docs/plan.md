# Nexo search prototype: plan

Source: Figma node 72:1604 ("search_prototype documentation"): 1 home frame, 7 search frames, 3 AI-search frames, all 402x874 (iPhone). See decisions.md for gaps.

## Screens, routes, states
Hash routes (tiny custom router, no extra library).

| Screen | Route | Figma frame(s) | States |
|---|---|---|---|
| Home / Recordings | `#/` | 72:1605 | feed (default); empty feed not in Figma (not needed, data is static) |
| Search layer (full screen) | `#/search?q=&tag=` | 72:1770 (empty), 72:1957 (typing + tag popover), 72:2154 (one tag), 72:2345 (tag selected, Actions in Figma), 72:2440 (date tag), 72:2539 (date filter) | idle (Folders + recent Recordings), typing (tag popover), tag selected, date filtered, **no results** (invented, D11) |
| AI search | same route, `ai=1` | 72:2606 (AI Synthesis pill), 72:2695 (synthesizing), 72:2651 (result) | offer, loading, result |
| Meeting detail | `#/meeting/:id` | none (D10) | with / without transcript |
| Memo detail | `#/memo/:id` | none (D10) | n/a |
| Transcript | `#/transcript/:id?seg=&q=` | none (D10) | highlighted segment, find-in-transcript |

Flow: Home --search button--> Search --X--> Home. Search: type -> tags -> select tag (green) -> results; date text -> date tag; AI pill -> synthesizing -> result. Result card -> meeting / memo detail; transcript hit -> Transcript at segment. Detail screens: back arrow. Tab bar (Recordings / Actions / search) on Home; Actions tab is not built (D5) and is inert.

## Shared components
- `PhoneFrame` (all screens), `StatusBar` (all), `TabBar` (Home), `Chip` (Home filters, search tags), `Tag` ("New" pill; cards), `RecordingCard` (Home, Search recordings, Folders), `HitCard` (Search results, AI result), `SearchBar` (Search, AI), `Highlight` (all text with matches), `Avatar` stack (cards, meeting detail), `Icon` set (inline SVG), `EmptyState` (search).

## Design tokens (Figma variables)
Colors: gray-50 #F5F4F2 (bg), gray-200 #E5E2E0 (borders), gray-600 #A19F9A, gray-700 #7E7C78, gray-800 #555451, gray-900 #343331, gray-950 #252422, gray-975 #1B1B1B (text), white, black, accent-blue #3A39FF, accent-orange #FF6D0F, highlight rgba(177,255,153,.5), green tag #B1FF99.
Type: Brown (sans) Heading/XS 16 / -2% , Heading/XXS 14, Body/S 12; Test Domaine Text (serif) 16 for content. Radii: card 24, pill 32, hit highlight 6. Spacing: 16 page gutter, 8 gap. Shadow: tab bar 0 0 12 rgba(0,0,0,.25).

## Data model
`Person {id,name,role,external}`, `Project`, `Meeting {id,title,startsAt,durationMin,participants[],projectId,tags[],transcriptId,summary}`, `Memo {id,title,createdAt,type,durationSec,projectId,tags[],relatedMeetingIds[],content}`, `Segment {start,time,speakerId,text}`, `Transcript {id,meetingId,language,note,segments[]}`. Typed loader in `src/data/index.ts` with lookup maps.

## Search design
`search(query, filters)` returns `{meetings, memos, transcriptHits}` (pure function, `src/search.ts`). Tokens = lowercased whitespace-split words; item matches if every token is a substring of its haystack (meeting: title + summary; memo: title + content; transcript segment: text). Hit objects include the segment index/start, speaker, mm:ss, and match ranges for `Highlight`. Groups with counts double as filter tags. Date tokens are extracted first and become a date filter. Transcript find: same token logic within one transcript, list of matching segments, current index, next/prev, count "2 / 5".

## Open questions (assumptions)
All in decisions.md (D1-D18).

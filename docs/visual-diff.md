# Remaining visual differences

Compared at 402x874 against `docs/screens/*.png` (Figma exports, 1x). Two rounds on Home and Search idle, two on AI result and Transcript.

## Home (`home.png`)
- Fonts: system fallbacks instead of Brown / Test Domaine Text (D12). Glyph widths differ slightly.
- Card heights follow content (Figma fixed 199px with a two-line title); single-line titles give shorter cards.
- Avatars are initials, not photos. Figma uses placeholder "Swarovski Optik" folder and counts; ours come from data.
- Chip row ~2px higher than Figma; "People" chip touches the right edge.
- Tab bar: simplified gradient and icons (own SVG, not the Figma icon set).

## Search idle (`search-idle.png`)
- No iOS keyboard (D14, D22): search bar sits at the bottom.
- Folder count is 12 (data) vs 30 (placeholder). No "Actions" section (D5).
- Recordings show the 3 newest rather than 2 plus "Show all recordings".

## Search with query (`search-actions.png`, tags frames)
- Figma shows a tag popover floating above the field with Actions / Folder / Recording. Ours: Meetings / Memos / Transcript chips (+ date chip, AI pill) in a wrapped row above the bar (D6).
- Figma inserts selected tags as highlighted words inside the input; ours keeps tags outside the input.
- Results list (grouped cards with snippets) has no Figma frame.

## AI search (`ai-offer.png`, `ai-synthesizing.png`, `ai-result.png`)
- Synthesis text is deterministic and extractive (D9), not an LLM paragraph; it is longer than Figma's.
- Hit cards add the meeting title above the quote, so they are taller than Figma's 119px.
- Synthesizing state uses three pulsing dots instead of the Figma dot animation; the "AI Synthesis" pill is in the tag row, not centered mid-screen.

## No Figma reference (built from the design system, D10/D11)
Meeting detail, Memo detail, Transcript, No results.

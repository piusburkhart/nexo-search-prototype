# Continue in Claude

Nexo's real model runs on the device, so it is small. When a request is beyond it, **AI Synthesis** says so and offers one tap to continue in Claude, with the request and the relevant transcripts. Nothing is sent until the user sends it in Claude. Figma frame: 86:5100. Decisions: D79 to D88 (D88 is the current flow; the sheet and the search card from D86 are gone).

## When it shows
- **Never in search.** Search always shows its results as usual; the "budget" empty state is unchanged.
- **Only in AI Synthesis**, after the user taps the sparkle button. Nexo tries first (`synthesize` in `src/ai.ts`). The pill appears when:
  1. AI Synthesis has no answer (nothing on screen to summarise), or
  2. the classifier (`src/lib/capability.ts` over `src/data/capabilities.json`) says the request is generation the device can't do: drafting, comparing/analysing, translating, rewriting, or knowledge outside the user's data.
- Open-ended reasoning (`tryLocalFirst`) keeps Nexo's own answer when it has one: "What are the risks for the launch?" is answered locally. Edit the JSON to change that.

## The flow (two taps, no confirmation)
1. Type the request; tap the sparkle button.
2. AI Synthesis: "Nexo can not help you with that." and the pill **Continue working in Claude**.
3. Tap the pill: the transcripts are copied, the toast "Transcript copied" shows, and Claude opens with the request typed in. Paste the transcript under it and send.

States: thinking dots, the pill, copied toast, offline error ("You're offline", tap again), and "Welcome back to Nexo." when the user returns.

## What Claude receives
- **Typed into the new chat (the link, under 2,000 characters):** the request; each source by title, kind, date, participants and id; "the transcript is the source of truth, answer only from it and say clearly when something isn't in it"; and "My meeting transcript is in my clipboard. I'll paste it below."
- **Clipboard:** the full transcript of each source under a header (title, date, participants, source id), up to 5 sources. If the prompt was too long for the link, the link carries a short instruction with the same rule, and the clipboard carries the whole prompt too.
- **Share and download modes:** the transcripts are .txt files (`Vendor-Call-Kestrel-Analytics_2026-10-02_transcript.txt`); the prompt is the share text or the link.
- Sources: the request without its request words is searched again ("write a follow-up email to Kestrel" searches "kestrel"); meetings first, then memos.

## Modes (hidden settings)
Long-press the screen title ("Recordings" or "Global search") for 0.7 s, or open `#/settings`; or send a link with `?handoff=`.

| Mode | What the tap does |
|---|---|
| Auto (default) | Clipboard + link, in one tap |
| Clipboard + link | The same, chosen explicitly |
| Share sheet | `navigator.share` with the files and the prompt; the user picks Claude |
| Download + link | First tap downloads the transcript, the second opens Claude |
| Simulate | A simulated chat inside the app; "Back to Nexo" returns |

## Files
`src/components/handoff/ClaudePill.tsx` (the pill and the tap), `src/components/AiSynthesis.tsx` (shows it), `src/lib/handoff/` (`buildPrompt`, `strategies`, `settings`, `sources`, `store`), `src/content/handoff-copy.ts` (all wording), `src/data/capabilities.json` (rules, templates, simulated replies), `src/assets/claude-icon.webp`. `mock-data.json` is untouched.

## Assumptions
- The Figma text "Nexo can not help you with that." is used as is.
- Same-tab navigation on phones (best chance of opening the Claude app through its link); a new tab on desktop so the prototype stays open.
- The toast is mostly seen on desktop or on return; on a phone the page leaves in the same tap.
- Whether `claude.ai/new?q=` opens the app or the browser, and whether the prompt arrives prefilled, can only be checked on real phones: `docs/handoff-test-checklist.md`.

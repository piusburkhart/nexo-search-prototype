# Continue in Claude: real-device checklist

Run this on at least one iPhone (Safari) and one Android phone (Chrome). It takes about 15 minutes per phone. The automated tests mock the share sheet and clipboard, so only a real phone can answer these questions.

## Before you start
- Prototype: https://nexosearchprototype.vercel.app (password: `above`).
- Set the mode with a link, so you don't have to go through settings each time:
  - `https://nexosearchprototype.vercel.app/?handoff=share`
  - `…/?handoff=clipboard`
  - `…/?handoff=download`
  - `…/?handoff=simulate`
- Or long-press the screen title ("Recordings" or "Global search") for 0.7 s to open the hidden settings. They show the current mode and **Debug info**. Write down "canShare({ files })", "Platform guess" and "Auto would use" for each phone.
- Test twice per phone: once with the Claude app installed and signed in, and once without the app (or signed out).
- Use the same path each time: search **write a follow-up email to Kestrel**, tap the sparkle button (AI Synthesis), then tap **Continue working in Claude**. There is no sheet and no confirmation: that one tap is the whole handoff.

## Questions to answer

### 1. Default: one tap (Auto = clipboard + link; `?handoff=clipboard`)
- [ ] After the tap, does Claude open straight away, with no extra step in Nexo?
- [ ] Does it open the **Claude app** or **claude.ai in the browser**?
- [ ] Does the request arrive **prefilled** in the message field, with the sources (names, dates, participants) and the line "answer only from the material"?
- [ ] Does pasting put the transcripts in, each under its header, with all lines from the first to the last timestamp?
- [ ] Did you see the toast "Transcript copied"? (On a phone the page leaves in the same tap, so it may only show when you come back.)
- [ ] Do you have to tap send yourself? (Expected: yes.)

### 2. Share sheet (`?handoff=share`)
- [ ] Does the share sheet open straight away from the tap?
- [ ] Is the **Claude** app listed? If not, is it under "More"?
- [ ] After picking Claude: does the **file** (`Vendor-Call-Kestrel-Analytics_2026-10-02_transcript.txt`) arrive as an attachment, and the **text** (the prompt) in the message field?
- [ ] Cancel the share sheet: does Nexo stay calm, with no error?
- [ ] Is this slower than the default (one extra choice)? Count the taps.

### 3. Download + link (`?handoff=download`)
- [ ] First tap: where does the file go? (iPhone: Files › Downloads? Android: Downloads?) Does the browser ask first?
- [ ] Second tap ("Open Claude and attach the file"): can you attach the downloaded file in Claude with "+"?
- [ ] Is the file readable after it's attached?

### 4. Without the Claude app, or signed out
- [ ] Share sheet: what is listed instead of Claude?
- [ ] Default flow: does claude.ai open in the browser? Does it ask you to sign in, and is the typed request still there after signing in?
- [ ] Is the clipboard still filled when you get back to Claude after signing in?

### 5. Coming back
- [ ] Switch back to Nexo (app switcher, or the browser's back button). Does it say "Welcome back to Nexo." without an error?
- [ ] Is the search still there?

### 6. Phone basics
- [ ] The pill is easy to hit (at least 44 px) and nothing scrolls sideways.
- [ ] Back from Claude (swipe back on iPhone, back button on Android): does Nexo show "Welcome back to Nexo." and your search?

## Results

| Device and OS | Browser | Claude app installed and signed in? | Mode | Opens? (app / browser / nothing) | Prompt arrives? | File or transcript arrives? | Send is manual? | Notes |
|---|---|---|---|---|---|---|---|---|
| | | | Auto / Clipboard + link (default) | | | | | |
| | | | Share sheet | | | | | |
| | | | Download + link | | | | | |
| | | | Simulate | in app | | | | |
| | | | Auto / Clipboard + link (default) | | | | | |
| | | | Share sheet | | | | | |
| | | | Download + link | | | | | |
| | | | Simulate | in app | | | | |

Debug info per phone:

| Device | canShare({ files }) | Clipboard API | Platform guess | Auto would use |
|---|---|---|---|---|
| | | | | |
| | | | | |

**Recommendation:** on iPhone use ______________; on Android use ______________; for user tests without accounts use ______________. Because: ____________________________________________.

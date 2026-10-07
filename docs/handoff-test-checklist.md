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
- Use the same path each time: search **kestrel**, tap **Ask Claude** on "Vendor Call: Kestrel Analytics", type a request after "My request:", tick the checkbox, and tap **Open in Claude**.

## Questions to answer

### 1. Share sheet (`?handoff=share`)
- [ ] Does the share sheet open straight away from the tap, with no error?
- [ ] Is the **Claude** app listed? If not, is it under "More"?
- [ ] After picking Claude: does the **file** (`Vendor-Call-Kestrel-Analytics_2026-10-02_transcript.txt`) arrive as an attachment?
- [ ] Does the **text** (the prompt) arrive in the message field, or is it lost?
- [ ] Do you still have to tap send in Claude? (Expected: yes.)
- [ ] Cancel the share sheet: does Nexo stay calm, with no error and the sheet still open?

### 2. Clipboard + link (`?handoff=clipboard`)
- [ ] After "Open in Claude", does Nexo say "Transcript copied. Paste it into Claude."?
- [ ] Tap **Open Claude**. Does it open the **Claude app** or **claude.ai in the browser**?
- [ ] Does the prompt arrive **prefilled** in the message field?
- [ ] Does pasting put the prompt and the transcript in, with all 11 lines from [00:00] to [03:05]?
- [ ] Do you have to tap send yourself? (Expected: yes.)

### 3. Download + link (`?handoff=download`)
- [ ] Where does the file go? (iPhone: Files › Downloads? Android: Downloads?) Does the browser ask first?
- [ ] Tap **Open Claude**. Can you attach the downloaded file in Claude with "+"?
- [ ] Is the file readable after it's attached?

### 4. Without the Claude app, or signed out
- [ ] Share sheet: what is listed instead of Claude?
- [ ] Link: does claude.ai open in the browser? Does it ask you to sign in, and is the prompt still there after signing in?

### 5. Coming back
- [ ] Switch back to Nexo (app switcher, or the browser's back button). Does it say "Welcome back to Nexo." without an error?
- [ ] Is the search still there?

### 6. Phone basics
- [ ] With the keyboard open on the prompt field, are the field and the buttons still reachable?
- [ ] Nothing scrolls sideways; every button is easy to hit.
- [ ] The swipe-back gesture (iPhone) or the back button (Android) closes the sheet rather than leaving the page.

## Results

| Device and OS | Browser | Claude app installed and signed in? | Mode | Opens? (app / browser / nothing) | Prompt arrives? | File or transcript arrives? | Send is manual? | Notes |
|---|---|---|---|---|---|---|---|---|
| | | | Share sheet | | | | | |
| | | | Clipboard + link | | | | | |
| | | | Download + link | | | | | |
| | | | Simulate | in app | | | | |
| | | | Share sheet | | | | | |
| | | | Clipboard + link | | | | | |
| | | | Download + link | | | | | |
| | | | Simulate | in app | | | | |

Debug info per phone:

| Device | canShare({ files }) | Clipboard API | Platform guess | Auto would use |
|---|---|---|---|---|
| | | | | |
| | | | | |

**Recommendation:** on iPhone use ______________; on Android use ______________; for user tests without accounts use ______________. Because: ____________________________________________.

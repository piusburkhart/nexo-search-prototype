/*
 * Every user-facing string of "Continue in Claude" (D82). Plain, calm and honest: say what is shared,
 * that it leaves the device, that nothing is sent until the user sends it in Claude, and that everything
 * can be edited or removed first. Don't promise results, and don't promise that the Claude app opens.
 */
export const copy = {
  card: {
    title: 'This goes beyond Nexo on your device',
    claudeCan: 'Claude can help with requests like this, using the meetings you choose to share.',
    noSources: 'Claude can help with requests like this. Nexo found no meetings to attach, so you can add context yourself.',
    primary: 'Continue in Claude',
    secondary: 'Not now',
  },
  askAction: 'Ask Claude',
  askActionLabel: (title: string) => `Ask Claude about “${title}”`,

  sheet: {
    title: 'Continue in Claude',
    lead: 'This goes beyond what Nexo can do on your device. You can continue in Claude instead.',
    sharedHeading: 'What will be shared',
    promptLabel: 'Prompt',
    promptHint: 'You can edit this before it goes anywhere.',
    chars: (n: number) => `${n.toLocaleString('en-US')} characters`,
    attachmentsLabel: 'Attachments',
    noAttachments: 'Nothing attached. Claude won’t know anything about your meetings unless you paste it in yourself.',
    noSourcesFound: 'Nexo found no meetings or memos for this request. You can still continue, and Claude will ask for what it needs.',
    preview: 'Preview',
    hidePreview: 'Hide preview',
    remove: (name: string) => `Remove ${name}`,
    leavesDevice: 'The prompt and the attachments leave your device and go to Claude. Nothing is sent until you send it in Claude.',
    longContent: 'These attachments are long. The link to Claude carries only your request; the transcript travels by share, clipboard or file.',
    consent: 'I understand that this content leaves my device and goes to Claude.',
    primary: 'Open in Claude',
    secondary: 'Cancel',
    working: 'Opening…',
    close: 'Close',
  },

  /** One line under the primary button: what will happen in this mode. */
  howItWorks: {
    share: 'Opens the share sheet. Choose Claude there; the transcript goes along as a file.',
    clipboard: 'Copies the prompt and the transcript, then lets you open Claude and paste them.',
    download: 'Downloads the transcript as a file, then lets you open Claude and attach it.',
    simulate: 'Simulation for user tests: nothing leaves the app.',
  },

  after: {
    copiedTitle: 'Transcript copied. Paste it into Claude.',
    copiedBody: 'Claude opens with your request typed in. Paste the transcript under it, then send it when you’re ready.',
    copiedShortLink: 'Your prompt was long, so the link only carries a short request. Everything is in the clipboard.',
    promptOnlyTitle: 'Ready to open Claude.',
    promptOnlyBody: 'Claude opens with your request typed in. Nothing else is attached, so send it when you’re ready.',
    downloadedTitle: 'Transcript downloaded.',
    downloadedBody: 'Claude opens with your request typed in. Attach the file with the + button before you send. On iPhone the file is in the Files app, under Downloads.',
    openClaude: 'Open Claude',
    openHint: 'This may open the Claude app or claude.ai in your browser. You send the message yourself.',
    shared: 'Shared. Finish in Claude.',
    shareCancelled: 'Nothing was shared.',
    copyInstead: 'Copy and open Claude instead',
    downloadInstead: 'Download the transcript instead',
  },

  fallback: {
    shareUnavailable: 'Sharing files isn’t available in this browser, so Nexo will copy the transcript instead.',
    shareFailed: 'Sharing didn’t work here. You can copy the transcript and open Claude instead.',
    clipboardFailed: 'Nexo couldn’t copy to the clipboard in this browser. You can download the transcript instead.',
  },

  error: {
    offline: 'You’re offline. Claude needs a connection.',
    generic: 'Something went wrong. Nothing was shared.',
    retry: 'Try again',
  },

  toast: {
    copied: 'Transcript copied.',
    promptCopied: 'Prompt copied.',
    downloaded: 'Transcript downloaded.',
    welcomeBack: 'Welcome back to Nexo.',
  },

  simulated: {
    opening: 'Opening Claude…',
    title: 'Claude chat (simulated)',
    note: 'Simulated for user tests. No message is sent.',
    back: 'Back to Nexo',
    composerLabel: 'Message',
    send: 'Send',
    replyNote: 'Simulated reply, written for this test. It isn’t generated from your data.',
  },

  settings: {
    title: 'Prototype settings',
    intro: 'For test facilitators. Participants don’t see this screen.',
    modeHeading: 'Handoff mode',
    modes: {
      auto: { label: 'Auto', hint: 'Share sheet on phones that can share files, otherwise clipboard + link.' },
      share: { label: 'Share sheet', hint: 'Native share sheet with the transcript as a file.' },
      clipboard: { label: 'Clipboard + link', hint: 'Copies prompt and transcript, then opens claude.ai/new with the prompt.' },
      download: { label: 'Download + link', hint: 'Downloads the transcript file, then opens claude.ai/new.' },
      simulate: { label: 'Simulate', hint: 'Stays in the app and shows a simulated chat.' },
    },
    urlHint: 'Preconfigure a device with a link: add ?handoff=simulate, share, clipboard or download.',
    debugHeading: 'Debug info',
    back: 'Back',
  },
} as const

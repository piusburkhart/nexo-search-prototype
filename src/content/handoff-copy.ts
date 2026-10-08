/*
 * Every user-facing string of "Continue in Claude" (D82, D88). Plain, calm and honest: no promises about
 * results, and no promise that the Claude app opens. Nothing is sent until the user sends it in Claude;
 * the prompt Claude opens with says what was copied or attached.
 */
export const copy = {
  /** AI Synthesis when a request goes beyond the device (Figma 86:5289). */
  cantHelp: 'Nexo can not help you with that.',
  pill: {
    label: 'Continue working in Claude',
    afterDownload: 'Open Claude and attach the file',
  },

  after: {
    downloadedBody: 'The transcript was downloaded. Attach it in Claude with the + button before you send. On iPhone it is in the Files app, under Downloads.',
    shared: 'Shared. Finish in Claude.',
  },

  fallback: {
    shareFailed: 'Sharing didn’t work here. Tap again to copy the transcript and open Claude instead.',
  },

  error: {
    offline: 'You’re offline. Claude needs a connection.',
    generic: 'Something went wrong. Nothing was shared.',
    retryHint: 'Tap again to retry.',
  },

  toast: {
    copied: 'Transcript copied',
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
      auto: { label: 'Auto', hint: 'Clipboard + link: one tap, no app picker.' },
      share: { label: 'Share sheet', hint: 'Native share sheet with the transcript as a file; the user picks Claude.' },
      clipboard: { label: 'Clipboard + link', hint: 'Copies prompt and transcript and opens claude.ai/new with the prompt, in one tap.' },
      download: { label: 'Download + link', hint: 'First tap downloads the transcript file, second tap opens claude.ai/new.' },
      simulate: { label: 'Simulate', hint: 'Stays in the app and shows a simulated chat.' },
    },
    urlHint: 'Preconfigure a device with a link: add ?handoff=simulate, share, clipboard or download.',
    debugHeading: 'Debug info',
    back: 'Back',
  },
} as const

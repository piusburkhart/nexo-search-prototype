/*
 * The handoff ladder (D83). Four strategies; a tap handler calls `run…` functions synchronously, because
 * mobile browsers only allow share, clipboard and downloads inside the tap itself.
 *   share     A. native share sheet with the transcript file(s)       (manual: the user has to pick Claude)
 *   clipboard B. copy prompt + transcript and open claude.ai/new?q=   (auto: one tap, no picker; D88)
 *   download  C. download the .txt, then open claude.ai/new?q=         (manual only)
 *   simulate  D. simulated chat inside the app                         (manual only)
 */

export type StrategyId = 'share' | 'clipboard' | 'download' | 'simulate'
export type Mode = 'auto' | StrategyId
export const MODES: Mode[] = ['auto', 'share', 'clipboard', 'download', 'simulate']

export interface HandoffEnv {
  hasShare: boolean
  canShareFiles: boolean
  clipboardApi: boolean
  secureContext: boolean
  platform: 'ios' | 'android' | 'desktop'
  mobile: boolean
  standalone: boolean
  online: boolean
}

/** What this browser can do, for the ladder and the debug panel. */
export function detectEnv(): HandoffEnv {
  const ua = navigator.userAgent
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  const android = /Android/.test(ua)
  let canShareFiles = false
  try {
    canShareFiles = typeof navigator.canShare === 'function'
      && navigator.canShare({ files: [new File(['test'], 'test.txt', { type: 'text/plain' })] })
  } catch { /* some browsers throw instead of returning false */ }
  return {
    hasShare: typeof navigator.share === 'function',
    canShareFiles,
    clipboardApi: typeof navigator.clipboard?.writeText === 'function',
    secureContext: window.isSecureContext,
    platform: ios ? 'ios' : android ? 'android' : 'desktop',
    mobile: ios || android || /Mobile/.test(ua),
    standalone: window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true,
    online: navigator.onLine,
  }
}

export interface Resolved { id: StrategyId; fellBack?: 'share-unavailable' }

/**
 * The strategy for a mode. Auto is clipboard + link everywhere: one tap, no app picker (D88). The share
 * sheet makes the user find Claude among the apps, so it is manual only, as are download and simulate.
 */
export function resolveStrategy(mode: Mode, env: HandoffEnv): Resolved {
  if (mode === 'auto') return { id: 'clipboard' }
  if (mode === 'share' && !env.canShareFiles) return { id: 'clipboard', fellBack: 'share-unavailable' }
  return { id: mode }
}

/** Build the in-memory files for sharing, once per sheet change, so the tap only has to call share. */
export const toFiles = (files: { name: string; text: string }[]) =>
  files.map((f) => new File([f.text], f.name, { type: 'text/plain' }))

/** A. Native share sheet. Call first thing in the tap. Cancelling (AbortError) is not an error. */
export function runShare(payload: { files: File[]; text: string; title: string }): Promise<'shared' | 'cancelled' | 'failed'> {
  try {
    const data: ShareData = payload.files.length ? payload : { text: payload.text, title: payload.title }
    return navigator.share(data).then(
      () => 'shared' as const,
      (e: unknown) => (e instanceof DOMException && e.name === 'AbortError' ? 'cancelled' as const : 'failed' as const),
    )
  } catch {
    return Promise.resolve('failed')
  }
}

/** Copy with a hidden textarea and execCommand: for browsers without the clipboard API. Synchronous. */
function legacyCopy(text: string): boolean {
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.style.cssText = 'position:fixed;top:0;left:0;opacity:0;font-size:16px' // 16px: iOS doesn't zoom
  document.body.appendChild(area)
  area.select()
  area.setSelectionRange(0, text.length) // iOS needs an explicit range
  let ok = false
  try { ok = document.execCommand('copy') } catch { ok = false }
  area.remove()
  return ok
}

/**
 * B. Copy to the clipboard, synchronously, so the same tap can go on to open Claude: the hidden-textarea
 * copy finishes before the page leaves, and the clipboard API is started too where it exists.
 */
export function copyNow(text: string): boolean {
  let started = false
  if (typeof navigator.clipboard?.writeText === 'function') {
    try { navigator.clipboard.writeText(text).catch(() => {}); started = true } catch { /* fall through */ }
  }
  return legacyCopy(text) || started
}

/** C. Download a file through a Blob URL and an <a download>. Synchronous. */
export function runDownload(file: { name: string; text: string }): boolean {
  try {
    const url = URL.createObjectURL(new Blob([file.text], { type: 'text/plain;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 30_000) // iOS reads the blob after a delay
    return true
  } catch {
    return false
  }
}

/*
 * Coming back from Claude. Leaving is marked in sessionStorage; when the page shows again (back from
 * claude.ai, back from the Claude app, or a reload), Nexo shows a calm "Welcome back" instead of an error.
 */
const LEFT_KEY = 'nexo-handoff-left'
export function markLeft() { try { sessionStorage.setItem(LEFT_KEY, String(Date.now())) } catch { /* private mode */ } }
export function consumeReturn(): boolean {
  try {
    if (!sessionStorage.getItem(LEFT_KEY)) return false
    sessionStorage.removeItem(LEFT_KEY)
    return true
  } catch { return false }
}

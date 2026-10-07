import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { BUTTON, Button } from '../Atoms'
import { ArrowUpRightIcon, CloseIcon } from '../Icons'
import { toast } from '../Toast'
import { FileChip } from './FileChip'
import { copy } from '../../content/handoff-copy'
import { buildPrompt, claudeLink, clipboardText, combinedText, exportFile, isLong, type Delivery } from '../../lib/handoff/buildPrompt'
import { useMode } from '../../lib/handoff/settings'
import { closeHandoff, openChat, type HandoffRequest } from '../../lib/handoff/store'
import { detectEnv, markLeft, resolveStrategy, runCopy, runDownload, runShare, toFiles, type StrategyId } from '../../lib/handoff/strategies'

type Phase = 'idle' | 'working' | 'copied' | 'downloaded' | 'shared' | 'cancelled' | 'error'
const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, [tabindex]:not([tabindex="-1"])'

/** Close the sheet; if it added a history entry (for the back gesture), go back over it instead. */
const requestClose = () => {
  if ((history.state as { nexoSheet?: boolean } | null)?.nexoSheet) history.back()
  else closeHandoff()
}

/**
 * The handoff sheet (D86): what will be shared (editable prompt, attachments), a consent step, and one
 * button that hands over with the strategy of this device. Every tap handler starts its share, copy or
 * download synchronously; the files, texts and link are prepared in advance whenever the inputs change.
 */
export function HandoffSheet({ req }: { req: HandoffRequest }) {
  const mode = useMode()
  const env = useMemo(detectEnv, [])
  const resolved = resolveStrategy(mode, env)
  const [override, setOverride] = useState<StrategyId | null>(null)
  const strategy = override ?? resolved.id
  const delivery: Delivery = strategy === 'clipboard' ? 'pasted' : 'attached'

  const [prompt, setPrompt] = useState(() => buildPrompt({ request: req.request, category: req.category, sources: req.sources, delivery }))
  const [files, setFiles] = useState(() => req.sources.map(exportFile))
  const [consent, setConsent] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(resolved.fellBack ? copy.fallback.shareUnavailable : null)
  const [offerDownload, setOfferDownload] = useState(false)

  // Prepared ahead of the tap.
  const shareFiles = useMemo(() => toFiles(files), [files])
  const clip = useMemo(() => clipboardText(prompt, files), [prompt, files])
  const link = useMemo(() => claudeLink({ prompt, request: req.request, delivery, hasSources: files.length > 0 }), [prompt, req.request, delivery, files.length])
  const download = useMemo(() => files.length === 1 ? files[0]
    : { name: `Nexo_${files.length}-sources_${files[0]?.name.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? 'export'}.txt`, text: combinedText(files) }, [files])

  /** Hand over. Called directly from a tap; `which` lets a fallback button pick another strategy. */
  function go(which: StrategyId = strategy) {
    setError(null)
    if (which !== 'simulate' && !navigator.onLine) { setPhase('error'); setError(copy.error.offline); return }
    if (which === 'simulate') {
      if ((history.state as { nexoSheet?: boolean } | null)?.nexoSheet) history.replaceState(null, '')
      openChat({ prompt, files, category: req.category })
      return
    }
    if (which === 'share') {
      const shared = runShare({ files: shareFiles, text: prompt, title: copy.sheet.title }) // first, inside the tap
      setPhase('working')
      shared.then((r) => {
        if (r === 'shared') {
          if (document.visibilityState === 'hidden') markLeft()
          setPhase('shared')
          toast(copy.after.shared)
          setTimeout(requestClose, 1200)
        } else if (r === 'cancelled') {
          setPhase('cancelled')
        } else {
          setOverride('clipboard')
          setNotice(copy.fallback.shareFailed)
          setPhase('idle')
        }
      })
      return
    }
    if (which === 'clipboard') {
      const copied = runCopy(clip) // first, inside the tap
      setOverride(strategy === 'clipboard' ? override : 'clipboard')
      setPhase('working')
      copied.then((ok) => {
        if (ok) { setPhase('copied'); toast(copy.toast.copied); return }
        setNotice(copy.fallback.clipboardFailed)
        setOfferDownload(true)
        setPhase('idle')
      })
      return
    }
    const ok = files.length === 0 || runDownload(download)
    setOverride(strategy === 'download' ? override : 'download')
    if (ok) { setPhase('downloaded'); if (files.length) toast(copy.toast.downloaded) } else { setPhase('error'); setError(copy.error.generic) }
  }

  // Focus, focus trap, Escape, and the back gesture.
  const panel = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const countId = useId()
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null
    panel.current?.focus()
    if (!(history.state as { nexoSheet?: boolean } | null)?.nexoSheet) history.pushState({ nexoSheet: true }, '')
    const onPop = () => closeHandoff()
    window.addEventListener('popstate', onPop)
    return () => { window.removeEventListener('popstate', onPop); before?.focus?.() }
  }, [])
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); requestClose(); return }
    if (e.key !== 'Tab' || !panel.current) return
    const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null)
    if (!items.length) return
    const first = items[0], last = items[items.length - 1]
    if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }

  const handedOver = phase === 'copied' || phase === 'downloaded'
  const noSources = req.sources.length === 0
  return (
    <div className="absolute inset-0 z-[80]" data-testid="handoff-sheet-layer">
      <div aria-hidden="true" onClick={requestClose} className="absolute inset-0 bg-gray-975/40 motion-safe:animate-[fade-in_160ms_ease-out]" />
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} onKeyDown={onKeyDown}
        data-testid="handoff-sheet" data-strategy={strategy} data-phase={phase}
        style={{ bottom: 'var(--kb, 0px)', maxHeight: 'calc(100% - var(--kb, 0px) - max(env(safe-area-inset-top), 24px))' }}
        className="absolute inset-x-0 flex flex-col rounded-t-card bg-gray-50 shadow-dock outline-none motion-safe:animate-[sheet-in_220ms_ease-out]">
        <header className="flex items-start gap-2 px-6 pt-6">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-heading-m leading-[1.24] tracking-heading text-gray-975">{copy.sheet.title}</h2>
            <p className="mt-1 text-body-m leading-[1.4] text-gray-800">{copy.sheet.lead}</p>
          </div>
          <button type="button" onClick={requestClose} aria-label={copy.sheet.close} className="-mt-2 -mr-3 flex size-11 shrink-0 items-center justify-center rounded-pill text-gray-800">
            <CloseIcon className="size-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pt-5 pb-4">
          <h3 className="text-heading-xs leading-[1.24] tracking-heading text-gray-800">{copy.sheet.sharedHeading}</h3>

          <label htmlFor="handoff-prompt" className="mt-4 block text-body-m leading-[1.3] text-gray-975">{copy.sheet.promptLabel}</label>
          <p className="text-body-s leading-[1.3] text-gray-700">{copy.sheet.promptHint}</p>
          <textarea id="handoff-prompt" data-testid="handoff-prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)}
            aria-describedby={countId} rows={7} disabled={phase === 'working'}
            className="mt-2 block w-full resize-none rounded-hit border border-gray-200 bg-white p-4 text-heading-xs leading-[1.4] text-gray-975 outline-none focus:border-gray-600" />
          <p id={countId} data-testid="handoff-count" className="mt-1 text-right text-body-s text-gray-700">{copy.sheet.chars(prompt.length)}</p>

          <p className="mt-3 text-body-m leading-[1.3] text-gray-975">{copy.sheet.attachmentsLabel}</p>
          {files.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-2" data-testid="file-chips">
              {files.map((f) => <FileChip key={f.name} file={f} onRemove={phase === 'working' ? undefined : () => setFiles((fs) => fs.filter((x) => x !== f))} />)}
            </ul>
          ) : (
            <p data-testid="no-attachments" className="mt-2 rounded-hit border border-gray-200 bg-white p-4 text-body-m leading-[1.4] text-gray-800">
              {noSources ? copy.sheet.noSourcesFound : copy.sheet.noAttachments}
            </p>
          )}
          {isLong(files) && <p data-testid="long-warning" className="mt-3 text-body-m leading-[1.4] text-gray-800">{copy.sheet.longContent}</p>}
          <p data-testid="privacy" className="mt-4 text-body-m leading-[1.4] text-gray-800">{copy.sheet.leavesDevice}</p>
        </div>

        <footer className="flex flex-col gap-3 border-t border-gray-200 px-6 pt-4 pb-[max(env(safe-area-inset-bottom),16px)]">
          <div aria-live="polite" className="empty:hidden flex flex-col gap-2">
            {notice && !handedOver && <p data-testid="handoff-notice" className="text-body-m leading-[1.4] text-gray-800">{notice}</p>}
            {phase === 'cancelled' && <p data-testid="share-cancelled" className="text-body-m leading-[1.4] text-gray-800">{copy.after.shareCancelled}</p>}
            {phase === 'shared' && <p className="text-body-m leading-[1.4] text-gray-975">{copy.after.shared}</p>}
          </div>
          {error && (
            <div role="alert" data-testid="handoff-error" className="flex items-center justify-between gap-3 rounded-hit border border-gray-200 bg-white p-3 pl-4">
              <p className="text-body-m leading-[1.4] text-gray-975">{error}</p>
              <Button variant="secondary" onClick={() => go()}>{copy.error.retry}</Button>
            </div>
          )}

          {handedOver ? (
            <div data-testid="handoff-next" className="flex flex-col gap-3">
              <div role="status">
                <p className="text-heading-xs leading-[1.3] tracking-heading text-gray-975">{phase === 'copied' ? copy.after.copiedTitle : copy.after.downloadedTitle}</p>
                <p className="mt-1 text-body-m leading-[1.4] text-gray-800">{phase === 'copied' ? copy.after.copiedBody : copy.after.downloadedBody}</p>
                {link.shortened && <p className="mt-1 text-body-m leading-[1.4] text-gray-800">{copy.after.copiedShortLink}</p>}
              </div>
              <a data-testid="open-claude" href={link.url} onClick={() => markLeft()} className={`${BUTTON.primary} w-full`}
                {...(env.mobile ? {} : { target: '_blank', rel: 'noopener noreferrer' })}>
                {copy.after.openClaude}<ArrowUpRightIcon className="size-5" />
              </a>
              <p className="text-body-s leading-[1.4] text-gray-700">{copy.after.openHint}</p>
            </div>
          ) : (
            <>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-body-m leading-[1.4] text-gray-975">
                <input type="checkbox" data-testid="handoff-consent" checked={consent} onChange={(e) => setConsent(e.target.checked)}
                  className="size-5 shrink-0 accent-gray-975" />
                {copy.sheet.consent}
              </label>
              <div className="flex gap-2">
                <Button data-testid="handoff-open" className="flex-1" disabled={!consent || phase === 'working' || phase === 'shared'} onClick={() => go()}>
                  {phase === 'working' ? copy.sheet.working : copy.sheet.primary}
                </Button>
                <Button variant="secondary" onClick={requestClose}>{copy.sheet.secondary}</Button>
              </div>
              {phase === 'cancelled' && (
                <Button variant="secondary" data-testid="copy-instead" disabled={!consent} onClick={() => go('clipboard')}>{copy.after.copyInstead}</Button>
              )}
              {offerDownload && (
                <Button variant="secondary" data-testid="download-instead" disabled={!consent} onClick={() => go('download')}>{copy.after.downloadInstead}</Button>
              )}
              <p data-testid="handoff-how" className="text-body-s leading-[1.4] text-gray-700">{copy.howItWorks[strategy]}</p>
            </>
          )}
        </footer>
      </div>
    </div>
  )
}

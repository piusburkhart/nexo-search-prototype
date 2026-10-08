import { useMemo, useState } from 'react'
import { toast } from '../Toast'
import claudeIcon from '../../assets/claude-icon.webp'
import { copy } from '../../content/handoff-copy'
import { buildPrompt, claudeLink, clipboardText, combinedText, exportFile, type Source } from '../../lib/handoff/buildPrompt'
import { useMode } from '../../lib/handoff/settings'
import { openChat } from '../../lib/handoff/store'
import { copyNow, detectEnv, markLeft, resolveStrategy, runDownload, runShare, toFiles, type StrategyId } from '../../lib/handoff/strategies'

/**
 * "Continue working in Claude" (Figma 86:5290, D88): the Action pill shape with the Claude icon. One tap
 * hands over. In the default mode it copies the transcript and opens Claude with the request typed in, in
 * the same tap: no sheet, no confirmation, no app picker. The prompt, files and link are prepared while the
 * pill renders, so the tap only copies and follows the link (mobile browsers require both inside the tap).
 */
export function ClaudePill({ request, category, sources }: { request: string; category?: string; sources: Source[] }) {
  const mode = useMode()
  const env = useMemo(detectEnv, [])
  const [override, setOverride] = useState<StrategyId | null>(null)
  const strategy = override ?? resolveStrategy(mode, env).id
  const delivery = strategy === 'clipboard' ? 'pasted' : 'attached'

  const files = useMemo(() => sources.map(exportFile), [sources])
  const prompt = useMemo(() => buildPrompt({ request, category, sources, delivery }), [request, category, sources, delivery])
  const shareFiles = useMemo(() => toFiles(files), [files])
  const link = useMemo(() => claudeLink({ prompt, request, delivery, hasSources: files.length > 0 }), [prompt, request, delivery, files.length])
  const clip = useMemo(() => clipboardText(prompt, files, { linkCarriesPrompt: !link.shortened }), [prompt, files, link.shortened])
  const download = useMemo(() => files.length === 1 ? files[0]
    : { name: `Nexo_${files.length}-sources_${files[0]?.name.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? 'export'}.txt`, text: combinedText(files) }, [files])

  const [downloaded, setDownloaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function onTap(e: React.MouseEvent<HTMLAnchorElement>) {
    setError(null)
    if (strategy !== 'simulate' && !navigator.onLine) { e.preventDefault(); setError(copy.error.offline); return }
    if (strategy === 'simulate') { e.preventDefault(); openChat({ prompt, files, category }); return }
    if (strategy === 'share') {
      e.preventDefault()
      runShare({ files: shareFiles, text: prompt, title: copy.pill.label }).then((r) => {
        if (r === 'shared') { if (document.visibilityState === 'hidden') markLeft(); else toast(copy.after.shared) }
        if (r === 'failed') { setOverride('clipboard'); toast(copy.fallback.shareFailed) }
        // 'cancelled': nothing happened, nothing to say
      })
      return
    }
    if (strategy === 'download' && !downloaded) {
      e.preventDefault()
      if (files.length && !runDownload(download)) { setError(copy.error.generic); return }
      setDownloaded(true)
      if (files.length) toast(copy.toast.downloaded)
      return
    }
    // Clipboard (and the second tap after a download): copy now, then the link itself opens Claude.
    if (strategy === 'clipboard' && files.length) { copyNow(clip); toast(copy.toast.copied) }
    markLeft()
  }

  return (
    <div className="mt-[15px] flex flex-col gap-2">
      <a href={link.url} onClick={onTap} data-testid="claude-pill" data-strategy={strategy}
        {...(env.mobile ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
        className="flex h-[84px] items-center gap-2 rounded-pill border border-gray-100 bg-white px-1">
        <span className="flex size-[76px] shrink-0 items-center justify-center rounded-pill border border-gray-50 bg-gray-50">
          <img src={claudeIcon} alt="" className="size-8 object-cover" />
        </span>
        <span className="min-w-0 truncate text-heading-s leading-[0.9] tracking-heading text-gray-975">
          {downloaded ? copy.pill.afterDownload : copy.pill.label}
        </span>
      </a>
      {downloaded && <p className="px-2 text-body-m leading-[1.4] text-gray-800">{copy.after.downloadedBody}</p>}
      {error && <p role="alert" data-testid="handoff-error" className="px-2 text-body-m leading-[1.4] text-gray-975">{error} {copy.error.retryHint}</p>}
    </div>
  )
}

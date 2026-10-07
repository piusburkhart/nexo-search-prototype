import { useEffect, useRef, useState } from 'react'
import { ArrowUpIcon, ChevronLeftIcon } from '../Icons'
import { toast } from '../Toast'
import { FileChip } from './FileChip'
import { copy } from '../../content/handoff-copy'
import { CAPS, categoryById } from '../../lib/capability'
import { closeChat, type ChatPayload } from '../../lib/handoff/store'

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** The canned reply for the category, naming the attached sources. */
function replyFor(p: ChatPayload) {
  const template = categoryById(p.category)?.simulatedReply ?? CAPS.defaultTemplate.simulatedReply
  const source = p.files.length === 0 ? 'what you wrote'
    : p.files.length === 1 ? `“${p.files[0].source.item.title}”`
    : `the ${p.files.length} attached sources`
  return template.replace('{source}', source)
}

const Dots = () => (
  <span className="flex items-center gap-[3px]" aria-hidden="true">
    {[0, 1, 2].map((i) => (
      <span key={i} className="size-[5px] rounded-pill bg-gray-700 motion-safe:animate-[think_0.9s_ease-in-out_infinite]" style={{ animationDelay: `${i * 150}ms` }} />
    ))}
  </span>
)

/**
 * Strategy D (D87): a generic, clearly simulated chat for user tests without a Claude account. No Claude
 * logo or brand visuals; it uses Nexo's own tokens. The prompt waits in the composer with the files, the
 * user sends it, and a neutral canned reply for the category appears.
 */
export function SimulatedChat({ payload }: { payload: ChatPayload }) {
  const [stage, setStage] = useState<'opening' | 'compose' | 'thinking' | 'replied'>('opening')
  const [text, setText] = useState(payload.prompt)
  const [sent, setSent] = useState<string | null>(null)
  const back = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setStage('compose'), reduced() ? 200 : 1100)
    return () => clearTimeout(t)
  }, [])
  useEffect(() => { if (stage === 'compose') back.current?.focus() }, [stage])
  useEffect(() => {
    if (stage !== 'thinking') return
    const t = setTimeout(() => setStage('replied'), reduced() ? 200 : 1400)
    return () => clearTimeout(t)
  }, [stage])

  const leave = () => { closeChat(); toast(copy.toast.welcomeBack) }
  const send = () => { if (!text.trim()) return; setSent(text); setStage('thinking') }

  if (stage === 'opening') {
    return (
      <div role="status" data-testid="sim-opening" className="absolute inset-0 z-[90] flex flex-col items-center justify-center gap-4 bg-gray-50 motion-safe:animate-[fade-in_200ms_ease-out]">
        <Dots />
        <p className="text-heading-xs leading-[1.2] tracking-heading text-gray-975">{copy.simulated.opening}</p>
      </div>
    )
  }
  return (
    <section aria-label={copy.simulated.title} data-testid="sim-chat"
      className="absolute inset-0 z-[90] flex flex-col bg-gray-50 pt-[max(env(safe-area-inset-top),12px)] sm:pt-6">
      <header className="flex items-center gap-1 border-b border-gray-200 px-2 pb-2">
        <button ref={back} type="button" onClick={leave} data-testid="sim-back"
          className="flex min-h-11 items-center gap-1 rounded-pill px-2 text-body-m text-gray-975">
          <ChevronLeftIcon className="size-5" />{copy.simulated.back}
        </button>
        <div className="min-w-0 flex-1 pr-3 text-right">
          <p className="truncate text-heading-xs leading-[1.2] tracking-heading text-gray-975">{copy.simulated.title}</p>
          <p className="truncate text-body-s leading-[1.3] text-gray-700">{copy.simulated.note}</p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4" aria-live="polite">
        {sent && (
          <div data-testid="sim-sent" className="ml-8 rounded-hit border border-gray-200 bg-white p-4">
            <p className="text-body-m leading-[1.4] whitespace-pre-wrap text-gray-975">{sent}</p>
            {payload.files.length > 0 && <ul className="mt-3 flex flex-col gap-1.5">{payload.files.map((f) => <FileChip key={f.name} file={f} compact />)}</ul>}
          </div>
        )}
        {stage === 'thinking' && <div className="mt-4 flex h-8 items-center"><Dots /></div>}
        {stage === 'replied' && (
          <div data-testid="sim-reply" className="mt-4 mr-8">
            <p className="text-heading-xs leading-[1.4] tracking-heading text-gray-975">{replyFor(payload)}</p>
            <p className="mt-2 text-body-s leading-[1.3] text-gray-700">{copy.simulated.replyNote}</p>
          </div>
        )}
      </div>

      {!sent && (
        <form onSubmit={(e) => { e.preventDefault(); send() }} data-testid="sim-composer"
          style={{ marginBottom: 'var(--kb, 0px)' }}
          className="flex flex-col gap-2 border-t border-gray-200 bg-white px-4 pt-3 pb-[max(env(safe-area-inset-bottom),12px)]">
          {payload.files.length > 0 && <ul className="flex max-h-28 flex-col gap-1.5 overflow-y-auto">{payload.files.map((f) => <FileChip key={f.name} file={f} compact />)}</ul>}
          <div className="flex items-end gap-2">
            <label htmlFor="sim-input" className="sr-only">{copy.simulated.composerLabel}</label>
            <textarea id="sim-input" data-testid="sim-input" value={text} onChange={(e) => setText(e.target.value)} rows={4}
              className="min-w-0 flex-1 resize-none rounded-hit border border-gray-200 bg-gray-50 p-3 text-heading-xs leading-[1.4] text-gray-975 outline-none focus:border-gray-600" />
            <button type="submit" data-testid="sim-send" aria-label={copy.simulated.send} disabled={!text.trim()}
              className="flex size-11 shrink-0 items-center justify-center rounded-pill bg-gray-975 text-gray-50 disabled:bg-gray-300">
              <ArrowUpIcon className="size-5" />
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

import { Fragment } from 'react'
import { MicIcon, SparkleIcon } from './Icons'
import type { AnswerPart } from '../search'

export type AiState = 'disabled' | 'ready' | 'thinking' | 'done'

/** Transcript time the sentence came from (Figma 76:4049): grey pill, mic + mm:ss. Not a link (D26). */
export const TimeChip = ({ time }: { time: string }) => (
  <span data-testid="time-chip"
    className="mx-1 inline-flex h-7 items-center gap-1 rounded-pill bg-gray-200 px-[11px] align-middle text-body-s leading-[1.2] text-gray-800">
    <MicIcon className="size-3.5" />{time}
  </span>
)

/**
 * The always-present AI Synthesis (Figma 75:3668): a pill button at the top of the search results that is
 * disabled until enough is typed, turns into three thinking dots while working, and then lets the answer
 * grow out of it, pushing the results down.
 */
export function AiSynthesis({ state, answer, onRun, onReset }: {
  state: AiState; answer: AnswerPart[] | null | undefined; onRun: () => void; onReset: () => void
}) {
  const dark = state !== 'disabled'
  return (
    <section aria-label="AI synthesis" data-state={state} data-testid="ai-section">
      <div className="flex h-[33px] items-center gap-[9px]">
        <button data-testid="ai-synthesis" disabled={state === 'disabled' || state === 'thinking'}
          onClick={state === 'done' ? onReset : onRun} aria-label={state === 'done' ? 'Hide AI answer' : 'AI synthesis'}
          className={`flex h-[33px] w-10 shrink-0 items-center justify-center rounded-[104px] ${dark ? 'bg-gray-975 text-gray-50' : 'bg-gray-300 text-gray-50'}`}>
          {state === 'thinking' ? (
            <span className="flex items-center gap-[3px]" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <span key={i} className="size-[5px] rounded-pill bg-gray-50" style={{ animation: 'think 0.9s ease-in-out infinite', animationDelay: `${i * 150}ms` }} />
              ))}
            </span>
          ) : <SparkleIcon className="size-[17px]" />}
        </button>
        {state === 'thinking' && (
          <span role="status" data-testid="synthesizing" className="text-heading-xs leading-[1.2] tracking-heading">Synthesizing your answer…</span>
        )}
      </div>
      {state === 'done' && (
        <p data-testid="ai-result" className="mt-[15px] px-0 text-heading-s leading-[1.4] tracking-heading text-gray-975">
          {answer
            ? answer.map((p, i) => <Fragment key={i}>{p.text}{p.time && <TimeChip time={p.time} />} </Fragment>)
            : 'Can’t help you with that.'}
        </p>
      )}
    </section>
  )
}

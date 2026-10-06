import { firstName, MONTH_NAMES } from './data'
import type { Results } from './search'
import { understand, type Note } from './semantic'

/** A piece of the answer: prose, optionally followed by the transcript time it comes from (Figma 76:4049). */
export interface AnswerPart { text: string; time?: string }
export interface Answer { parts: AnswerPart[] }

/*
 * AI Synthesis (D59, D69). There is no language model or network call in this prototype. The search has
 * already found the results; this only turns them into a short, easy to read paragraph. Every fact comes
 * from a result on screen, and every time chip points at a transcript moment in the results, so pressing
 * the button never brings in new sources.
 */

const fmt = (t: number) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
const fullMonth = (i: number) => ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][i]
const longDate = (iso: string) => `${+iso.slice(8, 10)} ${fullMonth(+iso.slice(5, 7) - 1)} ${iso.slice(0, 4)}`
const firstSentence = (text: string) => (text.match(/[^.]+\.?/)?.[0] ?? text).trim()

/**
 * Summarise the results the user sees. `shown` are the visible results (after any type tag), `found` the
 * search's own reading of them; `raw` the query, for what kind of answer is wanted.
 */
export function synthesize(shown: Pick<Results, 'meetings' | 'memos' | 'actions' | 'transcript'>, found: Pick<Results, 'notes' | 'summaryOf'>, raw: string): Answer | null {
  const intent = understand(raw).intent
  const onScreen = new Set(shown.transcript.map((h) => `${h.meeting.id}@${h.segment.start}`))
  const visible = (n: Note) => onScreen.has(`${n.meeting.id}@${n.at}`)

  // A named meeting: its summary, if that meeting is among the results.
  const m = found.summaryOf
  if (m && (shown.meetings.includes(m) || shown.transcript.some((h) => h.meeting.id === m.id))) {
    const start = m.keyPoints.find((k) => onScreen.has(`${m.id}@${k.at}`))
    return { parts: [{ text: `Here is the summary of “${m.title}”. ${m.summary}`, time: start ? fmt(start.at) : undefined }] }
  }

  // The notes behind the transcript results, written as one paragraph with a time chip per sentence.
  const notes = found.notes.filter(visible)
  if (notes.length) {
    const one = notes.length === 1
    const lead = intent.deadline ? (one ? '' : 'These are the dates that were set.')
      : intent.decision ? 'Here is what was agreed.'
      : intent.risk ? 'These concerns came up.'
      : ''
    const parts: AnswerPart[] = lead ? [{ text: lead }] : []
    for (const n of notes) {
      let text = n.text
      if (intent.why && n.why) text += ` ${n.why}`
      if (intent.owner && n.owner && !text.startsWith(firstName(n.owner))) text = `${firstName(n.owner)}: ${text}`
      if (n.due) {
        const day = +n.due.slice(8, 10)
        if (!text.includes(`${day} ${fullMonth(+n.due.slice(5, 7) - 1)}`) && !text.includes(`${day} ${MONTH_NAMES[+n.due.slice(5, 7) - 1]}`)) text += ` (${longDate(n.due)})`
      }
      parts.push({ text, time: fmt(n.at) })
    }
    return { parts }
  }

  // No notes: say briefly what the visible results contain.
  const moments = shown.transcript.slice(0, 2)
  if (moments.length) {
    return {
      parts: moments.map((h, i) => ({
        text: `${i ? 'And ' : 'The closest mention: '}${firstName(h.segment.speakerId)} in “${h.meeting.title}”: ${h.segment.text}`,
        time: h.segment.time,
      })),
    }
  }
  if (shown.meetings.length) return { parts: shown.meetings.slice(0, 2).map((x) => ({ text: `${x.title}: ${firstSentence(x.summary)}` })) }
  if (shown.memos.length) return { parts: shown.memos.slice(0, 2).map((x) => ({ text: `A memo says: ${x.content}` })) }
  if (shown.actions.length) return { parts: [{ text: `Open actions: ${shown.actions.slice(0, 3).map((a) => a.title).join('; ')}.` }] }
  return null
}

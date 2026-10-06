import { firstName, folderContents, getMeeting, MONTH_NAMES } from './data'
import type { DateFilter, Results } from './search'
import type { Action, Meeting, Memo } from './data/types'
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
export function synthesize(shown: Pick<Results, 'meetings' | 'memos' | 'actions' | 'transcript' | 'folders'>, found: Pick<Results, 'notes' | 'summaryOf' | 'period'>, raw: string): Answer | null {
  if (found.period) return overview(found.period, shown)
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
  // A folder on screen ("nexo"): what it holds.
  if (shown.folders.length) {
    return {
      parts: shown.folders.map((f) => {
        const c = folderContents(f)
        const last = [...c.meetings].sort((a, b) => b.startsAt.localeCompare(a.startsAt))[0]
        return { text: `The “${f.name}” folder holds ${count(c.meetings.length, 'meeting')} and ${count(c.memos.length, 'memo')}, with ${count(c.actions.length, 'action')}. ${f.description}${last ? ` The latest meeting is “${last.title}” on ${longDate(last.startsAt)}.` : ''}` }
      }),
    }
  }
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

const NUM = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
const count = (n: number, one: string, many = `${one}s`) => `${NUM[n] ?? n} ${n === 1 ? one : many}`
const list = (items: string[]) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`)
const time = (iso: string) => iso.slice(11, 16)
const lowerFirst = (t: string) => t[0].toLowerCase() + t.slice(1)

/**
 * A day, month or year on its own ("what happened on 21.09.26"): what was recorded then, in order, with what
 * each meeting was about and the actions that came out of it (D72). Built only from the results on screen.
 */
function overview(p: DateFilter, shown: { meetings: Meeting[]; memos: Memo[]; actions: Action[] }): Answer | null {
  const { meetings, memos, actions } = shown
  if (!meetings.length && !memos.length && !actions.length) return null
  const isDay = p.kind === 'day'
  const when = isDay ? `On ${longDate(p.key)}` : `In ${p.label}`
  const ms = [...meetings].sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const parts: AnswerPart[] = []
  const actionsOf = (m: Meeting) => actions.filter((a) => a.meetingId === m.id)

  if (ms.length === 1) {
    const m = ms[0]
    parts.push({ text: `${when} you had one meeting${isDay ? ` at ${time(m.startsAt)}` : ''}, “${m.title}”. ${firstSentence(m.summary)}` })
    const acts = actionsOf(m)
    if (acts.length) parts.push({ text: `It led to ${count(acts.length, 'action')}: ${list(acts.map((a) => lowerFirst(a.title)))}.` })
  } else if (ms.length) {
    const named = ms.slice(0, isDay ? ms.length : 3)
    const more = ms.length - named.length
    parts.push({ text: `${when} you had ${count(ms.length, 'meeting')}: ${list([...named.map((m) => `“${m.title}”${isDay ? ` at ${time(m.startsAt)}` : ''}`), ...(more ? [`${NUM[more] ?? more} more`] : [])])}.` })
    for (const m of named) parts.push({ text: `“${m.title}”: ${firstSentence(m.summary)}` })
    if (actions.length) {
      const from = [...new Set(actions.map((a) => getMeeting(a.meetingId)!.title))]
      parts.push({ text: `${from.length === 1 ? `“${from[0]}”` : 'They'} led to ${count(actions.length, 'action')}${actions.length <= 3 ? `: ${list(actions.map((a) => lowerFirst(a.title)))}` : ''}.` })
    }
  } else if (actions.length) {
    parts.push({ text: `${when} there ${actions.length === 1 ? 'is' : 'are'} ${count(actions.length, 'action')}: ${list(actions.slice(0, 3).map((a) => lowerFirst(a.title)))}.` })
  }

  if (memos.length) {
    const titles = memos.slice(0, 3).map((m) => `“${m.title}”`)
    const lead = ms.length || actions.length ? 'You also recorded' : `${when} you recorded`
    parts.push({ text: memos.length === 1 ? `${lead} a memo: ${memos[0].content.length > 120 ? `${titles[0]}.` : memos[0].content}` : `${lead} ${count(memos.length, 'memo')}: ${list([...titles, ...(memos.length > 3 ? [`${NUM[memos.length - 3] ?? memos.length - 3} more`] : [])])}.` })
  }
  return { parts }
}

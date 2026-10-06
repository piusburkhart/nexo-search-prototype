import { data, dayOf, getMeeting, MONTH_NAMES, firstName } from './data'
import type { Meeting, Memo, Segment, Transcript } from './data/types'

export interface DateFilter { kind: 'day' | 'month' | 'year'; key: string; label: string; text: string }
export interface Query { raw: string; terms: string[]; date: DateFilter | null }

const FULL = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
const MONTH_RE = FULL.map((m) => `${m.slice(0, 3)}(?:${m.slice(3)})?`).join('|')
const monthIdx = (name: string) => FULL.findIndex((m) => m.startsWith(name.toLowerCase().slice(0, 3))) + 1
const pad = (n: number) => String(n).padStart(2, '0')
const day = (y: number, m: number, d: number): Omit<DateFilter, 'text'> => ({ kind: 'day', key: `${y}-${pad(m)}-${pad(d)}`, label: `${d} ${MONTH_NAMES[m - 1]} ${y}` })
const month = (y: number, m: number): Omit<DateFilter, 'text'> => ({ kind: 'month', key: `${y}-${pad(m)}`, label: `${FULL[m - 1][0].toUpperCase()}${FULL[m - 1].slice(1)} ${y}` })
const year = (y: number): Omit<DateFilter, 'text'> => ({ kind: 'year', key: String(y), label: String(y) })
/** Year assumed when only a month is typed (D8): the newest year in the data. */
const DATA_YEAR = Number(data.meetings.map((m) => m.startsAt).sort().at(-1)!.slice(0, 4))

const DATE_RES: [RegExp, (m: RegExpMatchArray) => Omit<DateFilter, 'text'>][] = [
  [/\b(\d{4})-(\d{2})-(\d{2})\b/, (m) => day(+m[1], +m[2], +m[3])],
  [/\b(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})\b/, (m) => day(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[2], +m[1])],
  [new RegExp(`\\b(\\d{1,2}) (${MONTH_RE}) (\\d{4})\\b`, 'i'), (m) => day(+m[3], monthIdx(m[2]), +m[1])],
  [new RegExp(`\\b(${MONTH_RE}) (\\d{4})\\b`, 'i'), (m) => month(+m[2], monthIdx(m[1]))],
  // bare month name: not after a day number ("16 October" stays text); "may" needs a year
  [new RegExp(`(?<!\\d{1,2}\\s)\\b(january|february|march|april|june|july|august|september|october|november|december)\\b`, 'i'), (m) => month(DATA_YEAR, monthIdx(m[1]))],
  [/\b((?:19|20)\d{2})\b/, (m) => year(+m[1])],
]

/**
 * Splits a raw query into lowercase terms and an optional recognised date (day, month or year).
 * The date text is never a search term: it is offered as a tag and, once selected, applied as a filter.
 */
export function parseQuery(raw: string, tagWords: string[] = []): Query {
  let rest = raw
  let date: DateFilter | null = null
  for (const [re, f] of DATE_RES) {
    const m = rest.match(re)
    if (m) {
      date = { ...f(m), text: m[0] }
      rest = rest.replace(m[0], ' ')
      break
    }
  }
  const terms = rest.toLowerCase().split(/\s+/)
    .map((w) => w.replace(/^[?!.,;:"'“”]+|[?!.,;:"'“”]+$/g, '')).filter((w) => w && !tagWords.includes(w))
  return { raw, terms, date }
}

export const matchesAll = (text: string, terms: string[]) => {
  const t = text.toLowerCase()
  return terms.every((w) => t.includes(w))
}

export interface TranscriptHit {
  transcript: Transcript; meeting: Meeting; segIndex: number; segment: Segment
}
export interface Results { meetings: Meeting[]; memos: Memo[]; transcript: TranscriptHit[] }
export const emptyResults: Results = { meetings: [], memos: [], transcript: [] }
export const total = (r: Results) => r.meetings.length + r.memos.length + r.transcript.length

/** Every meeting, memo and transcript segment: the pool for tag-only queries and tag counts. */
export const everything = (): Results => ({
  meetings: data.meetings,
  memos: data.memos,
  transcript: data.transcripts.flatMap((transcript) => {
    const meeting = getMeeting(transcript.meetingId)!
    return transcript.segments.map((segment, segIndex) => ({ transcript, meeting, segIndex, segment }))
  }),
})

/** Strict search: every word must appear (case-insensitive substring). */
export function search(q: Query, applyDate = false): Results {
  const key = applyDate ? q.date?.key ?? null : null
  if (!q.terms.length && !key) return emptyResults
  const inDay = (iso: string) => !key || dayOf(iso).startsWith(key)
  const fileMatch = (m: Meeting) => inDay(m.startsAt) && matchesAll(`${m.title} ${m.summary}`, q.terms)
  // Memos have no headline in the UI, so only their body is searched (D41).
  const memos = data.memos.filter((m) => inDay(m.createdAt) && matchesAll(m.content, q.terms))
  const transcript: TranscriptHit[] = []
  if (q.terms.length) {
    for (const t of data.transcripts) {
      const meeting = getMeeting(t.meetingId)!
      if (!inDay(meeting.startsAt)) continue
      t.segments.forEach((segment, segIndex) => {
        if (matchesAll(segment.text, q.terms)) transcript.push({ transcript: t, meeting, segIndex, segment })
      })
    }
  }
  // A meeting and its transcript are one thing (D42): a meeting is a hit if its title/summary or any
  // moment in its transcript matches.
  const withMoments = new Set(transcript.map((h) => h.meeting.id))
  const meetings = data.meetings.filter((m) => fileMatch(m) || withMoments.has(m.id))
  return { meetings, memos, transcript }
}

/** Count of date-matching recordings for the date tag. */
export const dateCount = (q: Query) => (q.date ? total({ ...search(q, true), transcript: [] }) : 0)

const STOP = new Set('the a an in on of to and for is are was what why how did do does about we with it be any who when'.split(' '))

/** A piece of the synthesized answer: prose, optionally followed by a transcript time chip (Figma 76:4043). */
export interface AnswerPart { text: string; time?: string }

/**
 * Extractive "synthesis" (D9): loose (any-word) ranking over transcript segments, written as prose
 * where each sentence is followed by the transcript time it came from. Null when nothing is relevant.
 */
export function synthesize(raw: string): AnswerPart[] | null {
  const terms = parseQuery(raw.replace(/[?!.,]/g, ' ')).terms.filter((w) => !STOP.has(w))
  const scored: (TranscriptHit & { score: number })[] = []
  for (const t of data.transcripts) {
    const meeting = getMeeting(t.meetingId)!
    t.segments.forEach((segment, segIndex) => {
      const score = terms.filter((w) => segment.text.toLowerCase().includes(w)).length
      if (score) scored.push({ transcript: t, meeting, segIndex, segment, score })
    })
  }
  scored.sort((a, b) => b.score - a.score)
  const hits = scored.slice(0, 3)
  if (!hits.length) return null
  const meetings = new Set(hits.map((h) => h.meeting.id)).size
  const one = meetings === 1
  const where = one ? `in “${hits[0].meeting.title}”` : `across ${meetings} meetings`
  return [
    { text: `${hits.length} relevant moment${hits.length > 1 ? 's' : ''} ${where}.` },
    ...hits.map((h) => ({
      text: `${firstName(h.segment.speakerId)}${one ? '' : ` in “${h.meeting.title}”`}: ${h.segment.text}`,
      time: h.segment.time,
    })),
  ]
}

/** Short excerpt around the first matching term, for result snippets. */
export function snippet(text: string, terms: string[], max = 140) {
  const low = text.toLowerCase()
  const first = terms.map((w) => low.indexOf(w)).filter((i) => i >= 0).sort((a, b) => a - b)[0]
  if (first === undefined || text.length <= max) return text.length > max ? text.slice(0, max) + '…' : text
  let start = Math.max(0, first - 40)
  if (start > 0) { const sp = text.indexOf(' ', start); if (sp >= 0 && sp < first) start = sp + 1 }
  return (start > 0 ? '…' : '') + text.slice(start, start + max) + (start + max < text.length ? '…' : '')
}

/** Every day that has a recording, for date autocompletion. */
const RECORDING_DAYS = [...data.meetings.map((m) => dayOf(m.startsAt)), ...data.memos.map((m) => dayOf(m.createdAt))]

/**
 * Dates a partly typed word could become (D48): digits complete to years ("20" -> 2026), letters to
 * months ("sep" -> September 2026). Only dates that have recordings are offered. A month name right
 * after a day number ("16 Oct") is left alone.
 */
export function dateCompletions(word: string, before: string): DateFilter[] {
  const w = word.toLowerCase()
  if (/^\d{1,4}$/.test(w)) {
    const years = [...new Set(RECORDING_DAYS.map((d) => d.slice(0, 4)))].filter((y) => y.startsWith(w)).sort()
    return years.map((y) => ({ ...year(+y), text: y }))
  }
  if (/^\p{L}{3,}$/u.test(w) && !/\d{1,2}\s*$/.test(before)) {
    const months = [...new Set(RECORDING_DAYS.map((d) => d.slice(0, 7)))].sort()
    return months
      .map((k) => month(+k.slice(0, 4), +k.slice(5, 7)))
      .filter((m) => m.label.toLowerCase().startsWith(w))
      .map((m) => ({ ...m, text: m.label }))
  }
  return []
}

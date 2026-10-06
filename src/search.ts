import { data, dayOf, getMeeting, MONTH_NAMES, firstName } from './data'
import type { Meeting, Memo, Segment, Transcript } from './data/types'

export interface Query { raw: string; terms: string[]; date: string | null }

const MONTH_RE = MONTH_NAMES.map((m) => m.toLowerCase()).join('|')
const DATE_RES: [RegExp, (m: RegExpMatchArray) => [number, number, number]][] = [
  [/\b(\d{4})-(\d{2})-(\d{2})\b/, (m) => [+m[1], +m[2], +m[3]]],
  [/\b(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})\b/, (m) => [m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[2], +m[1]]],
  [new RegExp(`\\b(\\d{1,2}) (${MONTH_RE})[a-z]* (\\d{4})\\b`, 'i'), (m) => [+m[3], MONTH_NAMES.findIndex((x) => x.toLowerCase() === m[2].toLowerCase()) + 1, +m[1]]],
]
const pad = (n: number) => String(n).padStart(2, '0')

/** Splits a raw query into lowercase terms and an optional recognised date. */
export function parseQuery(raw: string): Query {
  let rest = raw
  let date: string | null = null
  for (const [re, f] of DATE_RES) {
    const m = rest.match(re)
    if (m) {
      const [y, mo, d] = f(m)
      date = `${y}-${pad(mo)}-${pad(d)}`
      rest = rest.replace(m[0], ' ')
      break
    }
  }
  const terms = rest.toLowerCase().split(/\s+/)
    .map((w) => w.replace(/^[?!.,;:"'“”]+|[?!.,;:"'“”]+$/g, '')).filter(Boolean)
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

/** Strict search: every word must appear (case-insensitive substring). */
export function search(q: Query, applyDate = false): Results {
  const day = applyDate ? q.date : null
  if (!q.terms.length && !day) return emptyResults
  const inDay = (iso: string) => !day || dayOf(iso) === day
  const meetings = data.meetings.filter(
    (m) => inDay(m.startsAt) && matchesAll(`${m.title} ${m.summary}`, q.terms),
  )
  const memos = data.memos.filter(
    (m) => inDay(m.createdAt) && matchesAll(`${m.title} ${m.content}`, q.terms),
  )
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
  return { meetings, memos, transcript }
}

/** Count of date-matching recordings for the date tag. */
export const dateCount = (q: Query) =>
  q.date ? total({ ...search(q, true), transcript: [] }) : 0

const STOP = new Set('the a an in on of to and for is are was what why how did do does about we with it be any who when'.split(' '))

/** AI search is offered when the query reads like a question (D9). */
export const wantsAi = (raw: string) => raw.trim().endsWith('?') || raw.trim().split(/\s+/).length >= 3

/** Extractive "synthesis": loose (any-word) ranking over transcript segments. */
export function synthesize(raw: string): { text: string; hits: TranscriptHit[] } {
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
  const hits = scored.slice(0, 5)
  if (!hits.length) return { text: '', hits: [] }
  const meetingCount = new Set(hits.map((h) => h.meeting.id)).size
  const lines = hits.slice(0, 3).map(
    (h) => `${firstName(h.segment.speakerId)} in “${h.meeting.title}” (${h.segment.time})`,
  )
  return {
    text: `${hits.length} relevant moments across ${meetingCount} meeting${meetingCount > 1 ? 's' : ''}, including ${lines.join('; ')}.`,
    hits,
  }
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

import { actionDate, data, dayOf, getMeeting, MONTH_NAMES, type Recording } from './data'
import { coversAll, inProject, literalHits, matchText, namedMeeting, noteFits, NOTES_AT, rankNotes, showsIntent, understand, type Note } from './semantic'
import type { Action, Folder, Meeting, Memo, Segment, Transcript } from './data/types'

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
  // Tag words and a half-typed word are left out, compared without punctuation ("02.10." = "02.10").
  const clean = (w: string) => w.toLowerCase().replace(/^[?!.,;:"'“”]+|[?!.,;:"'“”]+$/g, '')
  const skip = new Set(tagWords.map(clean))
  const terms = rest.split(/\s+/).map(clean).filter((w) => w && !skip.has(w))
  return { raw, terms, date }
}


export interface TranscriptHit {
  transcript: Transcript; meeting: Meeting; segIndex: number; segment: Segment
  /** Relevance, for ordering the meetings in the transcript section. */
  score?: number
}
/**
 * What a search found. `notes` are the meeting notes behind the transcript results (their moments are in
 * `transcript`); AI Synthesis summarises only these, so it can never add sources (D69). `highlight` are the
 * literal words to mark in the results.
 */
export interface Results {
  meetings: Meeting[]; memos: Memo[]; actions: Action[]; transcript: TranscriptHit[]; folders: Folder[]
  notes: Note[]; summaryOf: Meeting | null; highlight: string[]
  /** Set when the query asks about a day, month or year only ("what happened on 21.09.26"). */
  period: DateFilter | null
  /** Per section, the share of typed words its best item contains literally: the most direct section goes first. */
  directness: Record<Section, number>
}
export type Section = 'folders' | 'recordings' | 'actions' | 'transcript'
export const SECTION_ORDER: Section[] = ['folders', 'recordings', 'actions', 'transcript']
export const emptyResults: Results = { meetings: [], memos: [], actions: [], transcript: [], folders: [], notes: [], summaryOf: null, highlight: [], period: null, directness: { folders: 0, recordings: 0, actions: 0, transcript: 0 } }
export const total = (r: Pick<Results, 'meetings' | 'memos' | 'actions' | 'transcript' | 'folders'>) => r.meetings.length + r.memos.length + r.actions.length + r.transcript.length + r.folders.length

/** Transcript hits grouped by meeting, the most relevant meetings first (Figma 77:4717). */
export interface TranscriptGroup { meeting: Meeting; hits: TranscriptHit[] }
export function groupByMeeting(hits: TranscriptHit[]): TranscriptGroup[] {
  const by = new Map<string, TranscriptGroup & { score: number; tier: number }>()
  for (const h of hits) {
    const g = by.get(h.meeting.id) ?? { meeting: h.meeting, hits: [], score: 0, tier: 0 }
    g.hits.push(h)
    g.score += h.score ?? 1
    g.tier = Math.max(g.tier, Math.floor((h.score ?? 0) / LITERAL)) // meetings with direct hits first
    by.set(h.meeting.id, g)
  }
  for (const g of by.values()) g.hits.sort((a, b) => a.segment.start - b.segment.start)
  return [...by.values()].sort((a, b) => b.tier - a.tier || b.score - a.score || b.meeting.startsAt.localeCompare(a.meeting.startsAt))
}

// Index of everything searchable, read once.
const SEGMENTS: TranscriptHit[] = data.transcripts.flatMap((transcript) => {
  const meeting = getMeeting(transcript.meetingId)!
  return transcript.segments.map((segment, segIndex) => ({ transcript, meeting, segIndex, segment }))
})

/** Every meeting, memo, action and transcript segment: the pool for tag-only queries and tag counts. */
export const everything = (): Results => ({
  ...emptyResults, meetings: data.meetings, memos: data.memos, actions: data.actions, transcript: SEGMENTS, folders: data.folders,
})

/** Weight of a literal hit: large enough that direct hits always rank above semantic ones. */
const LITERAL = 100
const meetingText = (m: Meeting) => `${m.title} ${m.summary}`
const recScores = new WeakMap<object, number>()
/** How relevant a recording was to the last search (higher first). */
export const recordingScore = (rec: Recording) => recScores.get(rec.item) ?? 0

/**
 * Semantic search (D69). An item is found when it covers every query concept (synonyms, stems, typo
 * corrections), belongs to Project Nexo if the project was named, and shows the kind of finding asked for
 * (decision, deadline, risk...). On top, the meeting notes that answer the query best bring in their
 * transcript moments and meetings, so "nexo decision" finds the moments where decisions were made even
 * where the word "decision" is never said.
 */
export function search(q: Query, applyDate = false): Results {
  const u = understand(q.terms.join(' '), q.raw)
  const hasQuery = u.terms.length > 0 || u.asksKind || u.project
  // A query about a date and nothing else ("what happened on 21.09.26") applies the date without the tag.
  const key = applyDate || !hasQuery ? q.date?.key ?? null : null
  if (u.blocked || (!hasQuery && !key)) return emptyResults
  const inDay = (iso: string) => !key || dayOf(iso).startsWith(key)

  // Date only: everything from that day, month or year.
  if (!hasQuery) {
    return {
      ...emptyResults,
      period: q.date,
      meetings: data.meetings.filter((m) => inDay(m.startsAt)),
      memos: data.memos.filter((m) => inDay(m.createdAt)),
      actions: data.actions.filter((a) => inDay(actionDate(a))),
    }
  }

  const fits = (text: string, projectId: string | null, fullText = text) =>
    (!u.project || inProject(projectId, fullText)) && (!u.terms.length || coversAll(text, u))
  const notes = rankNotes(u, (m) => inDay(m.startsAt))
  const noteAt = new Map(notes.map((n) => [`${n.meeting.id}@${n.at}`, n]))

  // Transcript moments: direct matches, plus the moments behind the best notes.
  const transcript: TranscriptHit[] = []
  for (const h of SEGMENTS) {
    if (!inDay(h.meeting.startsAt)) continue
    const k = `${h.meeting.id}@${h.segment.start}`
    const picked = noteAt.get(k)
    const backed = NOTES_AT.get(k) ?? []
    // With only the project named ("Nexo"), the moments that mention it by name.
    const direct = u.terms.length > 0 || u.asksKind
      ? fits(h.segment.text, h.meeting.projectId, `${h.meeting.title} ${h.segment.text}`) && (showsIntent(h.segment.text, u) || backed.some((n) => noteFits(n, u)))
      : /\bnexo\b/i.test(h.segment.text)
    // Moments that say the typed words themselves rank above ones found through meaning alone.
    if (picked || direct) transcript.push({ ...h, score: LITERAL * literalHits(h.segment.text, u) + (picked ? 6 + picked.score : 0) + (direct ? 1 + matchText(h.segment.text, u).score : 0) })
  }

  // Meetings: their own title and summary, or a note of theirs among the best.
  const meetings = data.meetings.filter((m) => {
    if (!inDay(m.startsAt)) return false
    const mine = notes.filter((n) => n.meeting.id === m.id).length
    const direct = fits(meetingText(m), m.projectId) && (u.terms.length > 0 || !u.asksKind || showsIntent(m.summary, u) || m.keyPoints.some((k) => noteFits(k, u)))
    if (!mine && !direct) return false
    // Direct hits first: the typed words in the title, then in the summary, then everything else.
    recScores.set(m, LITERAL * (10 * literalHits(m.title, u) + literalHits(m.summary, u)) + mine * 4 + (direct ? 1 + matchText(m.title, u).score * 3 + matchText(m.summary, u).score : 0))
    return true
  })
  const memos = data.memos.filter((m) => {
    if (!inDay(m.createdAt) || !fits(m.content, m.projectId) || (u.asksKind && !showsIntent(m.content, u))) return false
    recScores.set(m, LITERAL * literalHits(m.content, u) + 1 + matchText(m.content, u).score)
    return true
  })
  const actions = data.actions.filter((a) => {
    const m = getMeeting(a.meetingId)!
    if (!inDay(actionDate(a)) || (u.asksKind && !u.terms.length)) return false
    return fits(a.title, m.projectId, `${m.title} ${a.title}`)
  })
  const actionScore = (a: Action) => LITERAL * (2 * literalHits(a.title, u) + literalHits(getMeeting(a.meetingId)!.title, u)) + matchText(a.title, u).score
  actions.sort((a, b) => actionScore(b) - actionScore(a))

  // Folders: by name and description ("Nexo" names the folder itself). A folder is not a decision or a
  // deadline, so queries asking for a kind of finding leave folders out.
  const folders = u.asksKind || key ? [] : data.folders.filter((f) => fits(`${f.name} ${f.description}`, f.projectId))

  const best = (texts: string[]) => Math.max(0, ...texts.map((t) => literalHits(t, u))) / Math.max(1, u.literal.length)
  const directness = {
    folders: best(folders.map((f) => f.name)),
    recordings: best([...meetings.map((m) => m.title), ...memos.map((m) => m.content)]),
    actions: best(actions.map((a) => a.title)),
    transcript: best(transcript.map((h) => h.segment.text)),
  }
  return { meetings, memos, actions, transcript, folders, notes, summaryOf: namedMeeting(u), highlight: u.highlight, period: null, directness }
}

/** Count of date-matching recordings for the date tag. */
/** Count for the date tag: what picking it would show, within the type tag already picked, if any. */
export const dateCount = (q: Query, type?: 'meetings' | 'memos' | 'folders' | 'actions' | 'transcript' | null) => {
  if (!q.date) return 0
  const r = search(q, true)
  return type ? r[type].length : r.meetings.length + r.memos.length + r.actions.length
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
  // "21.09" or "21.9.2" -> 21.09.26: days with recordings whose day, month and year start like the typed parts.
  const dotted = w.match(/^(\d{1,2})\.(\d{0,2})(?:\.(\d{0,4}))?$/)
  if (dotted) {
    const [, d, m, y = ''] = dotted
    const fits = (n: number, typed: string) => !typed || pad(n).startsWith(typed) || String(n).startsWith(typed)
    return [...new Set(RECORDING_DAYS)].sort()
      .filter((k) => +k.slice(8, 10) === +d && fits(+k.slice(5, 7), m) && (k.slice(0, 4).startsWith(y) || k.slice(2, 4).startsWith(y)))
      .slice(0, 4)
      .map((k) => ({ ...day(+k.slice(0, 4), +k.slice(5, 7), +k.slice(8, 10)), text: `${k.slice(8, 10)}.${k.slice(5, 7)}.${k.slice(2, 4)}` }))
  }
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

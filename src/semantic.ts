import { data } from './data'
import type { KeyPoint, Meeting } from './data/types'

/*
 * Query understanding shared by search and AI Synthesis (D69). One reading of the query decides what the
 * search finds; AI Synthesis only summarises what was found, so it can never bring in other sources.
 *   - words are stemmed and mapped to concepts (synonym groups), so "cost" finds "price";
 *   - typos are corrected against the words the recordings actually contain ("lanrtern" -> "lantern");
 *   - "Lantern" / "project" mean "belongs to Project Lantern", not a word to find;
 *   - words like "decision", "deadline", "risk", "why", "who" say what kind of finding is wanted.
 */

export const STOP = new Set(('a an the and or of to in on at for from by with about as is are was were be been being do does did done have has had ' +
  'we us our you your i me my it its this that these those there here what which who whom whose when where why how can could should would will ' +
  'shall may might must not no yes any some all each every more most much many also then than so if into over under again further ' +
  'tell give show me please know want need get got let lets take takes took during before after between still just really very ' +
  'their them they he she his her up out off down only find look anything something everything').split(' '))

export const stem = (word: string) => {
  let w = word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
  if (w.length > 4) for (const suf of ['ing', 'ed', 'ly', 'es', 's']) if (w.endsWith(suf) && !w.endsWith('ss')) { w = w.slice(0, -suf.length); break }
  return w.length > 3 ? w.replace(/e$/, '') : w
}
/** Tokens with a few fixed phrases made into one word, so "go or no-go" is not "go" and "on call" is not "call". */
export const words = (text: string) =>
  (text.toLowerCase()
    .replace(/\bgo(?:\s+or\s+|\s*\/\s*|\s+)no[\s-]?go\b/g, 'gonogo')
    .replace(/\bon[\s-]call\b/g, 'oncall')
    .replace(/\bhow long\b/g, 'duration')
    .match(/[\p{L}\p{N}]+/gu) ?? [])

/** Words that mean the same thing for matching, so "cost" finds "price" and "spreadsheet" finds "CSV". */
export const GROUPS: string[][] = [
  ['csv', 'import', 'spreadsheet', 'excel', 'column', 'upload', 'file', 'row'],
  ['sso', 'singlesignon', 'login', 'signin'],
  ['kestrel', 'track', 'analytic', 'funnel', 'dpa', 'contract'],
  ['price', 'pricing', 'cost', 'fee', 'pay', 'paid', 'euro', 'charge', 'expensive', 'cheap'],
  ['launch', 'release', 'golive', 'live', 'rollout', 'ship'],
  ['beta', 'pilot', 'tester', 'trial'],
  ['support', 'ticket', 'agent', 'helpdesk', 'macro', 'help'],
  ['accessibility', 'contrast', 'wcag', 'teal', 'button'],
  ['copy', 'headline', 'wording', 'word', 'workspace', 'account', 'empty', 'text'],
  ['scope', 'freeze', 'frozen'],
  ['roadmap', 'priority', 'q4', 'quarter'],
  ['dashboard', 'report', 'reporting'],
  ['reminder', 'remind', 'unpaid'],
  ['feature', 'flow', 'onboarding', 'checklist', 'step', 'design', 'product', 'app', 'screen'],
  ['target', 'goal', 'kpi', 'aim'],
  ['completion', 'complete', 'finish', 'percent', 'rate', 'success'],
  ['baseline', 'current', 'currently'],
  ['time', 'minute', 'duration', 'fast', 'slow', 'quick'],
  ['webinar', 'marketing', 'announcement', 'email', 'blog', 'banner'],
  ['crash', 'stable', 'quality', 'bug', 'qa', 'test'],
  ['standup', 'retro', 'sprint', 'process', 'criteria'],
  ['call', 'video', 'guided', 'setup'],
  ['vat', 'tax'],
  ['eu', 'europe', 'frankfurt', 'hosting', 'region', 'privacy', 'gdpr'],
]
const GROUP_OF = new Map<string, number>()
GROUPS.forEach((g, i) => g.forEach((w) => GROUP_OF.set(stem(w), i)))
/** A synonym group is one concept, written `#<n>` so it can never collide with a plain word. */
export const concept = (w: string) => (GROUP_OF.has(w) ? `#${GROUP_OF.get(w)}` : w)
const conceptsOf = (text: string) => new Set(words(text).map(stem).map(concept))

/** The project: matched by belonging to it, never as a word to find. */
const PROJECT_WORDS = new Set(['lantern', 'project', 'fakturo'].map(stem))
export const inProject = (projectId: string | null, text: string) => projectId === data.project.id || /\blantern\b/i.test(text)
/** Too vague to search for. */
const GENERIC = new Set(['today', 'tomorrow', 'yesterday', 'now', 'thing', 'week', 'day', 'month', 'year', 'new', 'good', 'great', 'one', 'two', 'say', 'said', 'plan', 'have', 'need'].map(stem))

export interface Intent { decision: boolean; deadline: boolean; why: boolean; owner: boolean; metric: boolean; risk: boolean; summary: boolean; past: boolean }
const readIntent = (q: string): Intent => {
  const intent = {
    decision: /\b(agree\w*|decid\w*|decision\w*|conclu\w*|settle\w*|resolve\w*|chose|choose|approved?)\b/.test(q),
    deadline: /\b(deadline\w*|due|when|by when|until when|how soon|date)\b/.test(q),
    why: /\b(why|reason\w*|because|how come|postpone\w*|defer\w*)\b/.test(q),
    owner: /\b(who|responsible|owner\w*|owns?|in charge|assigned|accountable)\b/.test(q),
    metric: /\b(how (much|many|long|big|often)|target\w*|goal\w*|numbers?|percent\w*|rate|metrics?|kpis?|size|baseline)\b/.test(q),
    risk: /\b(risks?|risky|worr\w*|concern\w*|problems?|blockers?|issues?|challenges?|afraid|danger\w*|complain\w*|struggl\w*|feedback)\b/.test(q),
    summary: /\b(summar\w*|recap|overview|what happened|what was discussed|catch me up|status)\b/.test(q),
    past: /\b(was|were|did|had|happened|last)\b/.test(q),
  }
  // "when is the deadline we decided to" asks for dates; "what did we decide about X" asks for decisions.
  if (intent.deadline && intent.decision && !/\b(agree|decid)\w*\s+(about|on|for)\b/.test(q)) intent.decision = false
  return intent
}
const INTENT_WORDS = new Set(['agree', 'decid', 'decision', 'conclu', 'settl', 'resolv', 'deadlin', 'due', 'date', 'reason', 'postpon', 'defer', 'responsibl', 'owner', 'own',
  'risk', 'risky', 'worr', 'concern', 'problem', 'blocker', 'issue', 'challeng', 'summar', 'recap', 'overview', 'status', 'happen', 'discuss', 'feedback', 'complain', 'struggl'].map(stem))
/** Words in a text that show it is the kind of finding asked for, used when matching text directly. */
const INTENT_STEMS: Partial<Record<keyof Intent, string[]>> = {
  decision: ['agre', 'decid', 'decision', 'defer', 'postpon'],
  deadline: ['deadlin', 'due'],
  risk: ['risk', 'worr', 'concern', 'problem', 'confus', 'stuck'],
  why: ['becaus', 'reason', 'so'],
}

/** The "today" of the demo: the newest recording. Deadlines before it are in the past. */
export const DEMO_TODAY = [...data.meetings.map((m) => m.startsAt), ...data.memos.map((m) => m.createdAt)].sort().at(-1)!.slice(0, 10)

/** A meeting note (decision, deadline, number, risk, action) with its meeting, as a search finding. */
export interface Note extends KeyPoint { meeting: Meeting; score: number; order: number; covered: number }
const ALL: Omit<Note, 'score' | 'covered'>[] = data.meetings.flatMap((meeting) =>
  (meeting.keyPoints ?? []).map((k, i) => ({ ...k, meeting, order: Date.parse(meeting.startsAt) + i })))
/** Notes by the transcript moment that backs them. */
export const NOTES_AT = new Map<string, Omit<Note, 'score' | 'covered'>[]>()
for (const n of ALL) NOTES_AT.set(`${n.meeting.id}@${n.at}`, [...(NOTES_AT.get(`${n.meeting.id}@${n.at}`) ?? []), n])

/** Every word the recordings contain, with how often, for vocabulary checks and typo correction. */
const CORPUS = [
  ...data.meetings.flatMap((m) => [m.title, m.summary, ...m.keyPoints.map((k) => `${k.text} ${k.why ?? ''} ${k.topics.join(' ')}`)]),
  ...data.transcripts.flatMap((t) => t.segments.map((s) => s.text)),
  ...data.memos.map((m) => m.content),
  ...data.actions.map((a) => a.title),
]
const SURFACE = new Map<string, number>()
for (const text of CORPUS) for (const w of words(text)) SURFACE.set(w, (SURFACE.get(w) ?? 0) + 1)
const SURFACE_LIST = [...SURFACE.keys()]
const CONCEPTS = new Set(SURFACE_LIST.map(stem).map(concept))

const distance = (a: string, b: string, max: number) => {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    let best = i
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
      best = Math.min(best, cur[j])
    }
    if (best > max) return max + 1
    prev = cur
  }
  return prev[b.length]
}
/** The closest word the recordings contain, for a word they don't ("lanrtern" -> "lantern"). */
function correct(word: string): string | null {
  const max = word.length >= 8 ? 2 : word.length >= 5 ? 1 : 0
  if (!max) return null
  let found: string | null = null
  let bestD = max + 1
  for (const w of SURFACE_LIST) {
    const d = distance(word, w, max)
    if (d < bestD || (d === bestD && found && (SURFACE.get(w) ?? 0) > (SURFACE.get(found) ?? 0))) { bestD = d; found = w }
  }
  return bestD <= max ? found : null
}

/** One query word as understood: the concept to match, and the literal text to match or highlight. */
export interface Term { concept: string; surface: string }
export interface Understanding {
  raw: string
  intent: Intent
  /** The query asks for a kind of finding (decision, deadline, number, risk, reason, person). */
  asksKind: boolean
  terms: Term[]
  /** "Lantern" or "project" was used: results must belong to Project Lantern. */
  project: boolean
  /** A word the recordings never contain, in a short keyword query: nothing can match all words. */
  blocked: boolean
  /** Literal words to highlight in results. */
  highlight: string[]
}

const ASK = /^(what|why|how|who|when|where|which|did|does|do|is|are|was|can|could|should|summari[sz]e|tell|show|list|explain)\b/

/**
 * Read a query: `text` is what is left to search for (tags, dates and half-typed words already removed),
 * `raw` the whole query, used to read what kind of finding is wanted.
 */
export function understand(text: string, raw = text): Understanding {
  const lower = raw.toLowerCase()
  const intent = readIntent(lower)
  const all = words(text)
  const question = lower.trim().endsWith('?') || all.length >= 4 || ASK.test(lower.trim())
  const terms: Term[] = []
  let project = false
  let blocked = false
  for (const w of all) {
    if (STOP.has(w)) continue
    const s = stem(w)
    if (!s || STOP.has(s) || GENERIC.has(s) || INTENT_WORDS.has(s)) continue
    if (PROJECT_WORDS.has(s)) { project = true; continue }
    const c = concept(s)
    if (CONCEPTS.has(c) || SURFACE_LIST.some((x) => x.includes(w))) { terms.push({ concept: c, surface: w }); continue }
    const fixed = correct(w)
    if (fixed) {
      const fs = stem(fixed)
      if (PROJECT_WORDS.has(fs)) { project = true; continue }
      if (!GENERIC.has(fs) && !INTENT_WORDS.has(fs)) terms.push({ concept: concept(fs), surface: fixed })
      continue
    }
    // Every word of a short keyword query must match; a question can contain words that don't matter.
    if (!question) blocked = true
  }
  const asksKind = intent.decision || intent.deadline || intent.metric || intent.risk || intent.why || intent.owner
  const highlight = [...new Set([
    ...(project ? ['lantern'] : []),
    ...terms.map((t) => t.surface),
    ...terms.flatMap((t) => (t.concept.startsWith('#') ? GROUPS[+t.concept.slice(1)] : [])),
  ])].filter((w) => w.length > 2)
  return { raw: lower, intent, asksKind, terms, project, blocked, highlight }
}

/** How well a text matches the query terms: how many it covers, and a score for ranking. */
export function matchText(text: string, u: Understanding, set = conceptsOf(text)): { covered: number; score: number } {
  const lower = text.toLowerCase()
  let covered = 0
  let score = 0
  for (const t of u.terms) {
    if (set.has(t.concept)) { covered++; score += 2 }
    else if (lower.includes(t.surface)) { covered++; score += 1 }
  }
  return { covered, score }
}
export const coversAll = (text: string, u: Understanding, set?: Set<string>) => matchText(text, u, set).covered === u.terms.length

/** True when a text shows the kind of finding asked for (or nothing specific is asked). */
export function showsIntent(text: string, u: Understanding): boolean {
  if (!u.asksKind) return true
  const stems = words(text).map(stem)
  return (Object.keys(INTENT_STEMS) as (keyof Intent)[]).some((k) => u.intent[k] && INTENT_STEMS[k]!.some((x) => stems.some((s) => s.startsWith(x))))
}
/** True when a note is the kind of finding asked for. */
export function noteFits(n: KeyPoint, u: Understanding): boolean {
  const i = u.intent
  return (i.decision && n.kind === 'decision') || (i.deadline && (n.kind === 'deadline' || !!n.due)) || (i.risk && n.kind === 'risk')
    || (i.metric && n.kind === 'metric') || (i.why && !!n.why) || (i.owner && !!n.owner)
}

const KIND_FOR: { key: keyof Intent; kinds: KeyPoint['kind'][]; weight: number }[] = [
  { key: 'decision', kinds: ['decision'], weight: 3 },
  { key: 'deadline', kinds: ['deadline'], weight: 4 },
  { key: 'metric', kinds: ['metric'], weight: 3 },
  { key: 'risk', kinds: ['risk'], weight: 3 },
]

function scoreNote(note: Omit<Note, 'score' | 'covered'>, topics: string[], intent: Intent, wantsNumber: boolean): { score: number; covered: number } {
  const text = conceptsOf(`${note.text} ${note.why ?? ''}`)
  const tagList = note.topics.map(stem).map(concept)
  const tags = new Set(tagList)
  const title = conceptsOf(note.meeting.title)
  let s = 0
  let covered = 0
  for (const t of topics) {
    const w = tags.has(t) ? 3 + Math.min(2, 0.75 * (tagList.filter((x) => x === t).length - 1)) : text.has(t) ? 2 : title.has(t) ? 1 : 0
    if (w) covered++
    s += w
  }
  if (topics.length && !covered) return { score: 0, covered: 0 }
  for (const k of KIND_FOR) if (intent[k.key] && k.kinds.includes(note.kind)) s += k.weight
  if (intent.why && note.why) s += 4
  if (intent.owner) s += note.owner ? 3 : -4 // "who" prefers a person
  if (intent.owner && note.kind === 'action') s += 2
  if (intent.deadline && note.due) s += 1
  if (wantsNumber && /\d|\b(one|two|three|four|five|six|seven|eight|nine|ten|twelve|fifteen|twenty|thirty|forty|fifty|seventy|ninety|hundred|thousand|million)\b/i.test(note.text)) s += 3
  if (note.star) s += 1.5
  return { score: s, covered }
}

const jaccard = (a: string, b: string) => {
  const x = new Set(words(a).map(stem)); const y = new Set(words(b).map(stem))
  const inter = [...x].filter((w) => y.has(w)).length
  return inter / (x.size + y.size - inter || 1)
}

/** The meeting a summary question is about ("what happened in the Kestrel call"), if one is named. */
export function namedMeeting(u: Understanding): Meeting | null {
  if (!u.intent.summary) return null
  const named = data.meetings
    .map((m) => ({ m, hit: u.terms.filter((t) => conceptsOf(m.title).has(t.concept)).length }))
    .filter((x) => x.hit > 0).sort((a, b) => b.hit - a.hit)[0]
  return named?.m ?? null
}

/**
 * The meeting notes that answer the query best: close to the best score, covering (nearly) all asked
 * topics, without repeats. These are findings of the search; their transcript moments become results.
 */
export function rankNotes(u: Understanding, inRange: (meeting: Meeting) => boolean = () => true): Note[] {
  const topics = [...new Set(u.terms.map((t) => t.concept))]
  if (!u.asksKind && !topics.length) return []
  const intent = u.intent
  const wantsNumber = /\bhow (much|many|long|big|often|fast)\b|\bnumber of\b/.test(u.raw)
  const scored: Note[] = ALL.filter((n) => inRange(n.meeting) && (!u.project || inProject(n.meeting.projectId, n.meeting.title + ' ' + n.text)))
    .map((n) => ({ ...n, ...scoreNote(n, topics, intent, wantsNumber) })).filter((n) => n.score > 0)
  const best = Math.max(0, ...scored.map((n) => n.score))
  const bestCover = Math.max(0, ...scored.map((n) => n.covered))
  let picked = scored.filter((n) => n.score >= Math.max(3, best * 0.6) && (!topics.length || n.covered >= bestCover * 0.8))
  // Questions about the future skip deadlines that have already passed.
  if (intent.deadline && !intent.past) picked = picked.filter((n) => !n.due || n.due >= DEMO_TODAY)
  if (intent.deadline && !topics.length) {
    // "When is the deadline?" with no subject: the headline dates.
    const headline = scored.filter((n) => n.star && n.due && (intent.past || n.due >= DEMO_TODAY))
    picked = headline.length >= 3 ? headline : picked.filter((n) => n.star || n.kind === 'deadline')
  }
  picked.sort((a, b) => b.score - a.score || (b.star ? 1 : 0) - (a.star ? 1 : 0) || b.order - a.order)
  const kept: Note[] = []
  for (const n of picked) {
    if (kept.some((k) => jaccard(k.text, n.text) > 0.55 || (n.due && k.due === n.due && k.topics[0] === n.topics[0]))) continue
    kept.push(n)
  }
  const limit = intent.deadline ? 6 : topics.length && best >= 6 ? 4 : 5
  const final = kept.slice(0, limit)
  return intent.deadline
    ? final.sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999') || a.order - b.order)
    : intent.metric || intent.owner
      ? final.sort((a, b) => b.score - a.score || a.order - b.order)
      : final.sort((a, b) => a.order - b.order)
}

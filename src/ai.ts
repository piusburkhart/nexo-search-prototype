import { data, firstName, MONTH_NAMES } from './data'
import type { KeyPoint, Meeting } from './data/types'
import { synthesizeFromMoments } from './search'

/** A piece of the answer: prose, optionally followed by the transcript time it comes from (Figma 76:4049). */
export interface AnswerPart { text: string; time?: string; /** Meeting the sentence comes from, shown when an answer spans several. */ source?: string }

/*
 * Local question answering (D59). There is no language model or network call in this prototype, so the
 * answer is assembled from the structured notes of each meeting (decisions, deadlines, numbers, risks,
 * actions), each backed by a transcript moment:
 *   1. read the question: what kind of answer is wanted (decision, deadline, reason, owner, number, risk,
 *      summary) and what it is about (topic words, with synonyms);
 *   2. score every note by topic overlap and by whether its kind fits the question;
 *   3. write the best notes as prose, each followed by a time chip, grouped by meeting.
 */

const STOP = new Set(('a an the and or of to in on at for from by with about as is are was were be been being do does did done have has had ' +
  'we us our you your i me my it its this that these those there here what which who whom whose when where why how can could should would will ' +
  'shall may might must not no yes any some all each every more most much many also then than so if into over under again further ' +
  'tell give show me please know want need get got let lets us take takes took').split(' '))

const stem = (word: string) => {
  let w = word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
  if (w.length > 4) for (const suf of ['ing', 'ed', 'ly', 'es', 's']) if (w.endsWith(suf) && !w.endsWith('ss')) { w = w.slice(0, -suf.length); break }
  return w.length > 3 ? w.replace(/e$/, '') : w
}
/** Tokens with a few fixed phrases made into one word, so "go or no-go" is not "go" and "on call" is not "call". */
const words = (text: string) =>
  (text.toLowerCase()
    .replace(/\bgo(?:\s+or\s+|\s*\/\s*|\s+)no[\s-]?go\b/g, 'gonogo')
    .replace(/\bon[\s-]call\b/g, 'oncall')
    .replace(/\bhow long\b/g, 'duration')
    .match(/[\p{L}\p{N}]+/gu) ?? [])

/** Words that mean the same thing for matching, so "cost" finds "price" and "spreadsheet" finds "CSV". */
const GROUPS: string[][] = [
  ['csv', 'import', 'spreadsheet', 'excel', 'column', 'upload', 'file', 'row'],
  ['sso', 'singlesignon', 'login', 'signin'],
  ['kestrel', 'track', 'analytic', 'funnel', 'dpa', 'contract', 'sign'],
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
/** The project itself is never a useful topic: everything here is about it. */
const PROJECT_WORDS = new Set(['lantern', 'project', 'fakturo'].map(stem))
/** Too vague to answer from. */
const GENERIC = new Set(['today', 'tomorrow', 'yesterday', 'now', 'thing', 'week', 'day', 'month', 'year', 'new', 'good', 'great', 'one', 'two', 'say', 'said', 'plan', 'have', 'need'].map(stem))
const concept = (w: string) => (GROUP_OF.has(w) ? `g${GROUP_OF.get(w)}` : w)

interface Intent { decision: boolean; deadline: boolean; why: boolean; owner: boolean; metric: boolean; risk: boolean; summary: boolean; past: boolean }
const readIntent = (q: string): Intent => ({
  decision: /\b(agree\w*|decid\w*|decision\w*|conclu\w*|settle\w*|resolve\w*|chose|choose|approved?)\b/.test(q),
  deadline: /\b(deadline\w*|due|when|by when|until when|how soon|date)\b/.test(q),
  why: /\b(why|reason\w*|because|how come|postpone\w*|defer\w*)\b/.test(q),
  owner: /\b(who|responsible|owner\w*|owns?|in charge|assigned|accountable)\b/.test(q),
  metric: /\b(how (much|many|long|big|often)|target\w*|goal\w*|numbers?|percent\w*|rate|metrics?|kpis?|size|baseline)\b/.test(q),
  risk: /\b(risks?|risky|worr\w*|concern\w*|problems?|blockers?|issues?|challenges?|afraid|danger\w*|complain\w*|struggl\w*|feedback)\b/.test(q),
  summary: /\b(summar\w*|recap|overview|what happened|what was discussed|catch me up|status)\b/.test(q),
  past: /\b(was|were|did|had|happened|last)\b/.test(q),
})
const INTENT_WORDS = new Set(['agree', 'decid', 'decision', 'conclu', 'settl', 'resolv', 'deadlin', 'due', 'date', 'reason', 'postpon', 'defer', 'responsibl', 'owner', 'own',
  'risk', 'risky', 'worr', 'concern', 'problem', 'blocker', 'issue', 'challeng', 'summar', 'recap', 'overview', 'status', 'happen', 'discuss', 'feedback', 'complain', 'struggl'].map(stem))

/** The "today" of the demo: the newest recording. Deadlines before it are in the past. */
const DEMO_TODAY = [...data.meetings.map((m) => m.startsAt), ...data.memos.map((m) => m.createdAt)].sort().at(-1)!.slice(0, 10)

const fmt = (t: number) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
const fullMonth = (i: number) => ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][i]
const longDate = (iso: string) => `${+iso.slice(8, 10)} ${fullMonth(+iso.slice(5, 7) - 1)} ${iso.slice(0, 4)}`
const label = (m: Meeting) => m.title.split(': ')[0]

interface Note extends KeyPoint { meeting: Meeting; score: number; order: number; covered: number }

const ALL: Omit<Note, 'score' | 'covered'>[] = data.meetings.flatMap((meeting) =>
  (meeting.keyPoints ?? []).map((k, i) => ({ ...k, meeting, order: Date.parse(meeting.startsAt) + i })))

/** Every concept that appears somewhere in the meetings: question words outside it cannot be answered from them. */
const VOCAB = new Set<string>([
  ...ALL.flatMap((n) => words(`${n.text} ${n.why ?? ''} ${n.topics.join(' ')} ${n.meeting.title}`).map(stem).map(concept)),
  ...data.transcripts.flatMap((t) => t.segments.flatMap((s) => words(s.text).map(stem).map(concept))),
])

const KIND_FOR: { key: keyof Intent; kinds: KeyPoint['kind'][]; weight: number }[] = [
  { key: 'decision', kinds: ['decision'], weight: 3 },
  { key: 'deadline', kinds: ['deadline'], weight: 4 },
  { key: 'metric', kinds: ['metric'], weight: 3 },
  { key: 'risk', kinds: ['risk'], weight: 3 },
]

function score(note: Omit<Note, 'score' | 'covered'>, topics: string[], intent: Intent, wantsNumber: boolean): { score: number; covered: number } {
  const text = new Set(words(`${note.text} ${note.why ?? ''}`).map(stem).map(concept))
  const tagList = note.topics.map(stem).map(concept)
  const tags = new Set(tagList)
  const title = new Set(words(note.meeting.title).map(stem).map(concept)) // the meeting's own tags are too broad to count
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
  if (intent.owner) s += note.owner ? 3 : -4 // "who" needs a person
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

/** Write the notes as prose: one sentence per note, each followed by its time chip, grouped by meeting. */
function compose(lead: string, notes: Note[], intent: Intent): AnswerPart[] {
  const parts: AnswerPart[] = [{ text: lead }]
  const meetings = new Set(notes.map((n) => n.meeting.id)).size
  let current = ''
  for (const n of notes) {
    let text = n.text
    if (intent.why && n.why) text += ` Reason: ${n.why}`
    if (intent.owner && n.owner && !text.startsWith(firstName(n.owner))) text = `${firstName(n.owner)}: ${text}`
    if (n.due) {
      const day = +n.due.slice(8, 10)
      if (!text.includes(`${day} ${fullMonth(+n.due.slice(5, 7) - 1)}`) && !text.includes(`${day} ${MONTH_NAMES[+n.due.slice(5, 7) - 1]}`)) text += ` (${longDate(n.due)})`
    }
    const source = meetings > 1 && n.meeting.id !== current ? label(n.meeting) : undefined
    if (source) current = n.meeting.id
    parts.push({ text, time: fmt(n.at), source })
  }
  return parts
}

/**
 * Answer a question from the meeting notes. Returns null when nothing relevant is known, so the caller can
 * say so instead of guessing.
 */
export function answerQuestion(raw: string): AnswerPart[] | null {
  const q = words(raw.replace(/\?/g, ' ')).join(' ')
  const intent = readIntent(raw.toLowerCase())
  // Both "when is the deadline we decided to" and "what did we agree" ask for a kind of note; the stronger kind wins.
  if (intent.deadline && intent.decision && !/\b(agree|decid)\w*\s+(about|on|for)\b/.test(q)) intent.decision = false
  const topics = [...new Set(words(q).filter((w) => !STOP.has(w)).map(stem)
    .filter((w) => w && !STOP.has(w) && !PROJECT_WORDS.has(w) && !INTENT_WORDS.has(w) && !GENERIC.has(w)).map(concept))]
  const asksKind = intent.decision || intent.deadline || intent.metric || intent.risk || intent.why || intent.owner
  const known = topics.filter((t) => VOCAB.has(t))

  // Summary of one meeting, when a meeting is named.
  if (intent.summary) {
    const named = data.meetings
      .map((m) => ({ m, hit: known.filter((t) => new Set(words(m.title).map(stem).map(concept)).has(t)).length }))
      .filter((x) => x.hit > 0).sort((a, b) => b.hit - a.hit)[0]
    if (named) {
      const sentences = named.m.summary.match(/[^.]+\.?/g)?.map((x) => x.trim()).filter(Boolean) ?? [named.m.summary]
      return [{ text: `Here is the summary of “${named.m.title}”.` }, ...sentences.map((text) => ({ text })),
        ...(named.m.keyPoints[0] ? [{ text: 'The meeting starts here.', time: fmt(named.m.keyPoints[0].at) }] : [])]
    }
  }

  // Words the meetings never mention cannot be answered from them ("what is the weather").
  if (!asksKind && !known.length) return null
  const wanted = known

  const scored: Note[] = ALL.map((n) => ({ ...n, ...score(n, wanted, intent, /\bhow (much|many|long|big|often|fast)\b|\bnumber of\b/.test(q)) })).filter((n) => n.score > 0)
  const best = Math.max(0, ...scored.map((n) => n.score))
  const bestCover = Math.max(0, ...scored.map((n) => n.covered))
  // Keep notes that are close to the best and answer (nearly) as many of the asked topics.
  let picked = scored.filter((n) => n.score >= Math.max(3, best * 0.6) && (!wanted.length || n.covered >= bestCover * 0.8))
  // Questions about the future skip deadlines that have already passed.
  if (intent.deadline && !intent.past) picked = picked.filter((n) => !n.due || n.due >= DEMO_TODAY)
  if (intent.deadline && !wanted.length) {
    // "When is the deadline?" with no subject: the headline dates.
    const headline = scored.filter((n) => n.star && n.due && (intent.past || n.due >= DEMO_TODAY))
    picked = headline.length >= 3 ? headline : picked.filter((n) => n.star || n.kind === 'deadline')
  }
  picked.sort((a, b) => b.score - a.score || (b.star ? 1 : 0) - (a.star ? 1 : 0) || b.order - a.order)

  // Drop repeats: same wording, or the same date for the same subject.
  const kept: Note[] = []
  for (const n of picked) {
    if (kept.some((k) => jaccard(k.text, n.text) > 0.55 || (n.due && k.due === n.due && k.topics[0] === n.topics[0]))) continue
    kept.push(n)
  }
  const limit = intent.deadline ? 6 : wanted.length && best >= 6 ? 4 : 5
  let final = kept.slice(0, limit)
  final = intent.deadline
    ? final.sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999') || a.order - b.order)
    : intent.metric || intent.owner
      ? final.sort((a, b) => b.score - a.score || a.order - b.order)
      : final.sort((a, b) => a.order - b.order)

  if (final.length) {
    const one = final.length === 1
    const lead = intent.why ? (one ? 'Here is why.' : 'Here is why, as discussed in the meetings.')
      : intent.deadline ? (one ? 'This is the deadline.' : 'These are the deadlines that were set.')
      : intent.owner ? 'This is who is responsible.'
      : intent.decision ? 'This is what was agreed.'
      : intent.risk ? 'These are the concerns that were raised.'
      : intent.metric ? 'These are the numbers.'
      : 'This is what the meetings say.'
    return compose(lead, final, intent)
  }

  // Nothing in the notes: fall back to plain transcript moments that mention the asked words.
  return known.length ? synthesizeFromMoments(words(q).filter((w) => !STOP.has(w) && VOCAB.has(concept(stem(w))))) : null
}

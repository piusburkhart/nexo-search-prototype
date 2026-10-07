import caps from '../data/capabilities.json'

/*
 * What the on-device model can do (D80). A small deterministic classifier over src/data/capabilities.json:
 * no AI, so a test facilitator can predict and edit it. The rules, in order:
 *  1. a pattern of an unsupported category matches        -> not supported, confidence 0.9
 *  2. a keyword of an unsupported category matches        -> not supported, confidence 0.7
 *  3. a pattern of a supported category matches           -> supported, confidence 0.8
 *  4. no results and the query reads like a request/question -> not supported, confidence 0.5
 *  5. anything else (a plain keyword, found or not)        -> supported, confidence 0.6
 */

export interface Category {
  id: string; label: string; cantLocal: string; examples: string[]
  keywords: string[]; patterns: string[]; template: string; simulatedReply: string
}
export interface Capabilities {
  requestWords: string[]; questionWords: string[]; topicStopWords: string[]
  maxSources: number; longContentChars: number
  grounding: string; groundingClipboard: string; noSources: string
  defaultTemplate: { id: string; label: string; template: string; simulatedReply: string }
  supported: { id: string; label: string; examples: string[]; patterns: string[] }[]
  unsupported: Category[]
}
export const CAPS = caps as Capabilities

export interface Classification {
  supported: boolean
  /** The unsupported category (handoff) or the supported one that matched. */
  category?: string
  confidence: number
  /** Which rule decided, for the debug panel and tests. */
  reason: 'pattern' | 'keyword' | 'supported' | 'request-without-results' | 'plain'
}

const norm = (q: string) => q.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim()
const re = (p: string) => new RegExp(p, 'i')
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const hasPhrase = (q: string, phrase: string) => new RegExp(`(^|[^\\p{L}\\p{N}])${escape(phrase.toLowerCase())}($|[^\\p{L}\\p{N}])`, 'u').test(q)

/** Find an unsupported category by its patterns, then by its keywords. */
export function unsupportedCategory(query: string): { category: Category; by: 'pattern' | 'keyword' } | null {
  const q = norm(query)
  for (const c of CAPS.unsupported) if (c.patterns.some((p) => re(p).test(q))) return { category: c, by: 'pattern' }
  for (const c of CAPS.unsupported) if (c.keywords.some((k) => hasPhrase(q, k))) return { category: c, by: 'keyword' }
  return null
}

/** A question or a command rather than a keyword: "?", a question or request word first, or 4+ words. */
export function readsLikeRequest(query: string): boolean {
  const q = norm(query)
  if (!q) return false
  const words = q.split(' ')
  return q.endsWith('?') || words.length >= 4
    || CAPS.questionWords.includes(words[0])
    || CAPS.requestWords.some((w) => hasPhrase(q, w))
}

export function classify(query: string, { resultCount }: { resultCount: number }): Classification {
  const q = norm(query)
  if (!q) return { supported: true, confidence: 1, reason: 'plain' }
  const hit = unsupportedCategory(q)
  if (hit) return { supported: false, category: hit.category.id, confidence: hit.by === 'pattern' ? 0.9 : 0.7, reason: hit.by }
  const local = CAPS.supported.find((s) => s.patterns.some((p) => re(p).test(q)))
  if (local) return { supported: true, category: local.id, confidence: 0.8, reason: 'supported' }
  if (resultCount === 0 && readsLikeRequest(q)) {
    const reasoning = /^(why|how|what should|should)\b/.test(q)
    return { supported: false, category: reasoning ? 'reasoning' : 'outside', confidence: 0.5, reason: 'request-without-results' }
  }
  return { supported: true, category: 'keyword-search', confidence: 0.6, reason: 'plain' }
}

export const categoryById = (id: string | undefined) => CAPS.unsupported.find((c) => c.id === id)

/**
 * What the request is about, for finding the sources to attach: the query without request words, question
 * words, the category's own words and filler ("write a follow-up email to Kestrel" -> "kestrel").
 */
export function topicOf(query: string): string {
  const drop = new Set([...CAPS.requestWords, ...CAPS.questionWords, ...CAPS.topicStopWords].flatMap((w) => w.toLowerCase().split(' ')))
  const filler = new Set(['a', 'an', 'the', 'to', 'for', 'of', 'about', 'on', 'in', 'at', 'with', 'and', 'or', 'from', 'my', 'our', 'we', 'i', 'it', 'this', 'that', 'these', 'those', 'be', 'by', 'as', 'some', 'any', 'they', 'them'])
  return norm(query).replace(/[?!.,;:"“”]/g, ' ').split(/\s+/)
    .filter((w) => w && !drop.has(w) && !filler.has(w)).join(' ')
}

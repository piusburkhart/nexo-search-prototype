import { CAPS, topicOf } from '../capability'
import { groupByMeeting, parseQuery, search } from '../../search'
import type { Meeting } from '../../data/types'
import type { Source } from './buildPrompt'

/**
 * The meetings and memos to attach for a search handoff: the request without its request words is searched
 * ("write a follow-up email to Kestrel" -> "kestrel"); meetings first, the most relevant transcript first,
 * then memos, up to `maxSources` (D85).
 */
export function sourcesForQuery(query: string): Source[] {
  const topic = topicOf(query)
  if (!topic) return []
  const r = search(parseQuery(topic))
  const meetings: Meeting[] = []
  for (const m of [...groupByMeeting(r.transcript).map((g) => g.meeting), ...r.meetings]) if (!meetings.includes(m)) meetings.push(m)
  return [
    ...meetings.map((item): Source => ({ kind: 'meeting', item })),
    ...r.memos.map((item): Source => ({ kind: 'memo', item })),
  ].slice(0, CAPS.maxSources)
}

export const meetingSource = (item: Meeting): Source => ({ kind: 'meeting', item })

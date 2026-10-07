import { describe, expect, it } from 'vitest'
import { CAPS, classify, readsLikeRequest, topicOf } from './capability'

const handoff = (q: string, resultCount = 3) => classify(q, { resultCount })

describe('capability classifier', () => {
  it.each([
    ['write a follow-up email to Kestrel', 'drafting'],
    ['Draft a message to the team about the launch date', 'drafting'],
    ['compare the two customer interviews', 'compare'],
    ['summarize across all Nexo meetings', 'compare'],
    ['what were the risks of the launch?', 'reasoning'],
    ['translate the Kestrel summary into German', 'translate'],
    ['rewrite the Kestrel summary as bullet points', 'rewrite'],
    ['What is the weather today?', 'outside'],
  ])('"%s" goes to Claude (%s)', (q, category) => {
    const c = handoff(q)
    expect(c.supported).toBe(false)
    expect(c.category).toBe(category)
    expect(c.confidence).toBeGreaterThanOrEqual(0.7)
  })

  it.each([
    ['when is the Kestrel signing deadline?', 'simple-lookup'],
    ['who is responsible for the CSV import?', 'simple-lookup'],
    ['Why was SSO postponed?', 'simple-lookup'],
    ['summary of the Kestrel call', 'show-summary'],
    ['action items from the Kestrel call', 'list-actions'],
    ['open the Kestrel transcript at 01:20', 'open-transcript'],
  ])('"%s" stays on the device (%s)', (q, category) => {
    const c = handoff(q, 0)
    expect(c.supported).toBe(true)
    expect(c.category).toBe(category)
  })

  it('a plain keyword miss stays a regular empty state', () => {
    for (const q of ['budget', 'csv zzzz', 'kestrel']) expect(handoff(q, 0)).toMatchObject({ supported: true, reason: 'plain' })
  })

  it('a request with no results goes to Claude, with low confidence', () => {
    const c = handoff('how do we price the enterprise plan for hospitals', 0)
    expect(c).toMatchObject({ supported: false, reason: 'request-without-results', category: 'reasoning', confidence: 0.5 })
    expect(handoff('how do we price the enterprise plan for hospitals', 4).supported).toBe(true) // found something: stays local
  })

  it('a "draft" noun in a keyword search is not a drafting request', () => {
    expect(handoff('announcement draft').supported).toBe(true)
  })

  it('reads requests and questions, not keywords', () => {
    expect(readsLikeRequest('budget')).toBe(false)
    expect(readsLikeRequest('csv zzzz')).toBe(false)
    expect(readsLikeRequest('why')).toBe(true)
    expect(readsLikeRequest('anything about the gym?')).toBe(true)
    expect(readsLikeRequest('please explain the beta')).toBe(true)
  })

  it('finds the topic to search sources for', () => {
    expect(topicOf('write a follow-up email to Kestrel')).toBe('kestrel')
    expect(topicOf('compare the two customer interviews')).toBe('customer')
    expect(topicOf('translate the Kestrel summary into German')).toBe('kestrel')
  })

  it('every unsupported category is complete and its examples classify as itself', () => {
    for (const c of CAPS.unsupported) {
      for (const k of ['id', 'label', 'cantLocal', 'template', 'simulatedReply'] as const) expect(c[k], `${c.id}.${k}`).toBeTruthy()
      expect(c.template).toContain('{request}')
      expect(c.template).toContain('{sources}')
      for (const e of c.examples) expect(handoff(e).category, e).toBe(c.id)
    }
  })
})

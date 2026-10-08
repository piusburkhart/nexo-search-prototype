import { describe, expect, it } from 'vitest'
import { data, getPerson } from '../../data'
import { buildPrompt, claudeLink, clipboardText, combinedText, exportFile, exportText, fileName, MAX_URL, sanitize, type Source } from './buildPrompt'

const meeting = (title: string): Source => ({ kind: 'meeting', item: data.meetings.find((m) => m.title.includes(title))! })
const memo = (title: string): Source => ({ kind: 'memo', item: data.memos.find((m) => m.title.includes(title))! })
const kestrel = meeting('Vendor Call: Kestrel')
const KESTREL_SEGMENTS = data.transcripts.find((t) => t.meetingId === kestrel.item.id)!.segments

describe('transcript export', () => {
  it('has a header and one line per segment, matching the mock data', () => {
    const m = kestrel.item as typeof data.meetings[number]
    const t = data.transcripts.find((x) => x.meetingId === m.id)!
    const text = exportText(kestrel)
    const lines = text.split('\n').filter((l) => /^\[\d{2}:\d{2}\] /.test(l))
    expect(lines).toHaveLength(t.segments.length)
    expect(lines[0].startsWith(`[${t.segments[0].time}] ${getPerson(t.segments[0].speakerId)!.name}: `)).toBe(true)
    expect(lines.at(-1)!.startsWith(`[${t.segments.at(-1)!.time}] `)).toBe(true)
    expect(text).toContain(m.title)
    expect(text).toContain('Date: 2 October 2026, 10:00')
    expect(text).toContain(`Source: Nexo meeting ${m.id}, transcript ${t.id}`)
    for (const p of m.participants) expect(text).toContain(getPerson(p)!.name)
  })

  it('exports every meeting with all its segments', () => {
    for (const m of data.meetings) {
      const t = data.transcripts.find((x) => x.meetingId === m.id)!
      expect(exportText({ kind: 'meeting', item: m }).split('\n').filter((l) => /^\[\d{2}:\d{2}\] /.test(l))).toHaveLength(t.segments.length)
    }
  })

  it('exports a memo as title, date and body', () => {
    const s = memo('Guided setup call')
    const text = exportText(s)
    expect(text.startsWith(`Memo: ${s.item.title}\nDate: `)).toBe(true)
    expect(text).toContain((s.item as typeof data.memos[number]).content)
  })

  it('separates several sources with clear headers', () => {
    const files = [exportFile(kestrel), exportFile(memo('Guided setup call'))]
    const text = combinedText(files)
    expect(text).toContain(`===== 1 of 2: ${files[0].name} =====`)
    expect(text).toContain(`===== 2 of 2: ${files[1].name} =====`)
    expect(combinedText([files[0]])).toBe(files[0].text)
  })
})

describe('file names', () => {
  it('use the title and the real date', () => {
    expect(fileName(kestrel)).toBe('Vendor-Call-Kestrel-Analytics_2026-10-02_transcript.txt')
    expect(fileName(meeting('Design Review'))).toBe('Nexo-Design-Review-Onboarding-Flow_2026-09-24_transcript.txt')
    expect(fileName(memo('Guided setup call'))).toMatch(/^Guided-setup-call_\d{4}-\d{2}-\d{2}_memo\.txt$/)
  })
  it('are sanitized', () => {
    expect(sanitize('Customer Interview: Holm & Söner Plumbing')).toBe('Customer-Interview-Holm-and-Soner-Plumbing')
    expect(sanitize('1:1 Elin / Jonas')).toBe('1-1-Elin-Jonas')
    expect(fileName(meeting('Holm'))).toMatch(/^[A-Za-z0-9_.-]+$/)
  })
})

describe('prompt', () => {
  it('states the request, names the source and asks to answer only from it', () => {
    const p = buildPrompt({ request: 'write a follow-up email to Kestrel', category: 'drafting', sources: [kestrel], delivery: 'attached' })
    expect(p).toContain('write a follow-up email to Kestrel')
    expect(p).toContain('“Vendor Call: Kestrel Analytics” (meeting, 2 October 2026, with ')
    expect(p).toContain('source of truth')
    expect(p).toContain('say clearly when something isn\'t in it')
  })
  it('names what is attached: one transcript, several, or a memo', () => {
    expect(buildPrompt({ request: 'x', category: 'compare', sources: [kestrel, meeting('Design Review')], delivery: 'attached' }))
      .toContain('The attached transcripts are the source of truth. Answer only from them')
    expect(buildPrompt({ request: 'x', category: 'compare', sources: [kestrel, memo('Guided setup call')], delivery: 'attached' }))
      .toContain('The attached transcript and memo are the source of truth')
    expect(buildPrompt({ request: 'x', category: 'rewrite', sources: [memo('Guided setup call')], delivery: 'attached' }))
      .toContain('The attached memo is the source of truth. Answer only from it')
  })
  it('says the transcript is pasted in clipboard mode, and that nothing is attached without sources', () => {
    expect(buildPrompt({ request: 'x', category: 'drafting', sources: [kestrel], delivery: 'pasted' })).toContain('pasted below')
    expect(buildPrompt({ request: 'x', category: 'drafting', sources: [], delivery: 'attached' })).toContain('none attached')
  })
  it('opened from a transcript, ends on the request for the user to type', () => {
    expect(buildPrompt({ request: '', sources: [kestrel], delivery: 'attached' }).endsWith('My request: ')).toBe(true)
  })
  it('the clipboard holds the transcript only when the link types the prompt, and both when the link was shortened', () => {
    const f = exportFile(kestrel)
    expect(clipboardText('PROMPT', [f], { linkCarriesPrompt: true })).toBe(f.text)
    expect(clipboardText('PROMPT', [f], { linkCarriesPrompt: false })).toBe(`PROMPT\n\n${f.text}`)
    expect(clipboardText('PROMPT', [], { linkCarriesPrompt: true })).toBe('PROMPT')
  })
  it('gives Claude everything: request, names, dates, participants, the transcript and the answer-only-from-it rule', () => {
    const files = [exportFile(kestrel)]
    const prompt = buildPrompt({ request: 'write a follow-up email to Kestrel', category: 'drafting', sources: [kestrel], delivery: 'pasted' })
    const { url, shortened } = claudeLink({ prompt, request: 'write a follow-up email to Kestrel', delivery: 'pasted', hasSources: true })
    expect(shortened).toBe(false)
    const typed = decodeURIComponent(url.split('q=')[1])
    expect(typed).toContain('write a follow-up email to Kestrel')
    expect(typed).toContain('Vendor Call: Kestrel Analytics')
    expect(typed).toContain('2 October 2026')
    expect(typed).toContain('Elin Berg')
    expect(typed).toContain('source of truth')
    expect(typed).toContain('say clearly when something isn\'t in it')
    expect(typed).toContain('in my clipboard')
    const pasted = clipboardText(prompt, files, { linkCarriesPrompt: true })
    for (const s of KESTREL_SEGMENTS) expect(pasted).toContain(s.text) // the full transcript text
    expect(pasted).toContain('Participants: ')
  })
})

describe('claude.ai link', () => {
  it('carries the prompt when it fits', () => {
    const { url, shortened } = claudeLink({ prompt: 'Help me draft this.', request: 'draft', delivery: 'pasted', hasSources: true })
    expect(url.startsWith('https://claude.ai/new?q=')).toBe(true)
    expect(decodeURIComponent(url.split('q=')[1])).toContain('in my clipboard')
    expect(shortened).toBe(false)
  })
  it('stays under 2,000 characters with a short instruction when the prompt is long', () => {
    const prompt = 'Please consider every detail. '.repeat(200)
    const { url, shortened } = claudeLink({ prompt, request: 'a very long request '.repeat(200), delivery: 'pasted', hasSources: true })
    expect(url.length).toBeLessThanOrEqual(MAX_URL)
    expect(shortened).toBe(true)
    expect(decodeURIComponent(url.split('q=')[1]).startsWith('My meeting transcript is in my clipboard. Paste it below and then help me with: ')).toBe(true)
  })
  it('keeps the answer-only-from-it rule when the link is shortened', () => {
    const { url, shortened } = claudeLink({ prompt: 'x '.repeat(3000), request: 'a very long request '.repeat(200), delivery: 'pasted', hasSources: true })
    expect(shortened).toBe(true)
    expect(url.length).toBeLessThanOrEqual(MAX_URL)
    expect(decodeURIComponent(url.split('q=')[1])).toContain('Answer only from that material, and say clearly when something is missing from it.')
  })
  it('never contains the transcript itself', () => {
    const f = exportFile(kestrel)
    const { url } = claudeLink({ prompt: 'P', request: 'r', delivery: 'attached', hasSources: true })
    expect(decodeURIComponent(url)).not.toContain(f.text.split('\n').find((l) => l.startsWith('[00:'))!)
  })
})

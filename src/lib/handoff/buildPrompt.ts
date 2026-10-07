import { data, getPerson } from '../../data'
import type { Meeting, Memo } from '../../data/types'
import { CAPS, categoryById } from '../capability'

/*
 * Everything that travels to Claude, built from mock-data.json at runtime (D81): the prompt, a plain-text
 * export per source, its file name, and the claude.ai link. Nothing here is hardcoded content.
 */

export type Source = { kind: 'meeting'; item: Meeting } | { kind: 'memo'; item: Memo }
export interface ExportFile { source: Source; name: string; text: string; bytes: number }

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
/** "2026-10-02T10:00:00+02:00" -> "2 October 2026" (the recording's own date, no time zone shift). */
export const longDate = (iso: string) => `${+iso.slice(8, 10)} ${MONTHS[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}`
const clock = (iso: string) => iso.slice(11, 16)
const nameOf = (id: string) => getPerson(id)?.name ?? id
const list = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`)
const transcriptOf = (m: Meeting) => data.transcripts.find((t) => t.meetingId === m.id) ?? null
const dateOf = (s: Source) => (s.kind === 'meeting' ? s.item.startsAt : s.item.createdAt)

/** File-name-safe text: no accents, "&" as "and", words joined by "-". */
export const sanitize = (text: string) => text
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/&/g, ' and ')
  .replace(/[^A-Za-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

/** "Vendor-Call-Kestrel-Analytics_2026-10-02_transcript.txt" */
export const fileName = (s: Source) =>
  `${sanitize(s.item.title)}_${dateOf(s).slice(0, 10)}_${s.kind === 'meeting' ? 'transcript' : 'memo'}.txt`

/** Plain-text export: a header, then one line per segment ("[mm:ss] Speaker: text"), or the memo body. */
export function exportText(s: Source): string {
  if (s.kind === 'memo') {
    const m = s.item
    return [
      `Memo: ${m.title}`,
      `Date: ${longDate(m.createdAt)}, ${clock(m.createdAt)}`,
      `Source: Nexo memo ${m.id}`,
      '',
      m.content,
      '',
    ].join('\n')
  }
  const m = s.item
  const t = transcriptOf(m)
  const head = [
    m.title,
    `Date: ${longDate(m.startsAt)}, ${clock(m.startsAt)} (${m.durationMin} min)`,
    `Participants: ${m.participants.map((p) => { const who = getPerson(p); return who ? `${who.name} (${who.role})` : p }).join(', ')}`,
    `Source: Nexo meeting ${m.id}${t ? `, transcript ${t.id}` : ''}`,
    '',
  ]
  const lines = t ? t.segments.map((g) => `[${g.time}] ${nameOf(g.speakerId)}: ${g.text}`) : ['(This meeting has no transcript.)']
  return [...head, ...lines, ''].join('\n')
}

const bytesOf = (text: string) => new TextEncoder().encode(text).length
export const exportFile = (s: Source): ExportFile => { const text = exportText(s); return { source: s, name: fileName(s), text, bytes: bytesOf(text) } }

/** "1.2 KB" */
export const formatSize = (bytes: number) => (bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`)

/** Several sources in one text (clipboard), each under a clear header. */
export function combinedText(files: ExportFile[]): string {
  if (files.length === 1) return files[0].text
  return files.map((f, i) => `===== ${i + 1} of ${files.length}: ${f.name} =====\n\n${f.text}`).join('\n')
}

/** How a source is named in the prompt: title, kind, date, participants and id. */
export function describeSource(s: Source): string {
  if (s.kind === 'memo') return `“${s.item.title}” (memo, ${longDate(s.item.createdAt)}; source ${s.item.id})`
  const m = s.item
  return `“${m.title}” (meeting, ${longDate(m.startsAt)}, with ${list(m.participants.map(nameOf))}; source ${m.id})`
}

/** How the transcript reaches Claude: attached as a file (share, download, simulate) or pasted (clipboard). */
export type Delivery = 'attached' | 'pasted'

/**
 * The prompt: the user's request, the sources by name, date and participants, and the rule that the
 * transcript is the source of truth. Uses the category's template from capabilities.json.
 */
export function buildPrompt({ request, category, sources, delivery }: {
  request: string; category?: string; sources: Source[]; delivery: Delivery
}): string {
  const template = categoryById(category)?.template ?? CAPS.defaultTemplate.template
  const named = sources.length === 0 ? 'none attached.'
    : sources.length === 1 ? describeSource(sources[0])
    : `\n${sources.map((s) => `- ${describeSource(s)}`).join('\n')}`
  const grounding = sources.length === 0 ? CAPS.noSources : delivery === 'pasted' ? CAPS.groundingClipboard : CAPS.grounding
  const prompt = template
    .replace('{request}', request.trim())
    .replace('{sources}', named)
    .replace('{grounding}', grounding)
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd()
  // Opened from a transcript, the request is still empty: end on "My request: " so the user types on.
  return request.trim() || category ? prompt : `${prompt} `
}

/** The full clipboard text: the prompt, then the sources under it. */
export const clipboardText = (prompt: string, files: ExportFile[]) =>
  files.length ? `${prompt}\n\n${combinedText(files)}` : prompt

export const MAX_URL = 2000
const NEW_CHAT = 'https://claude.ai/new?q='
const linkFor = (text: string) => NEW_CHAT + encodeURIComponent(text)

/**
 * The claude.ai link that opens a new chat with the prompt typed in (the user still sends it). The
 * transcript never goes into the link: it travels by clipboard, file or share. A prompt too long for a
 * short link becomes a short instruction ("My meeting transcript is in my clipboard…").
 */
export function claudeLink({ prompt, request, delivery, hasSources }: {
  prompt: string; request: string; delivery: Delivery; hasSources: boolean
}): { url: string; shortened: boolean } {
  const note = !hasSources ? '' : delivery === 'pasted' ? '\n\nMy meeting transcript is in my clipboard. I’ll paste it below.' : '\n\nSee the attached transcript.'
  const full = linkFor(prompt + note)
  if (full.length <= MAX_URL) return { url: full, shortened: false }
  const lead = !hasSources ? 'Help me with: '
    : delivery === 'pasted' ? 'My meeting transcript is in my clipboard. Paste it below and then help me with: '
    : 'See the attached transcript and then help me with: '
  let ask = request.trim() || 'the request I’ll describe below.'
  while (linkFor(lead + ask).length > MAX_URL && ask.length > 20) ask = `${ask.slice(0, Math.floor(ask.length * 0.8)).trimEnd()}…`
  return { url: linkFor(lead + ask), shortened: true }
}

/** Over this many characters of attachments, the sheet warns that the link carries only the request. */
export const isLong = (files: ExportFile[]) => files.reduce((n, f) => n + f.text.length, 0) > CAPS.longContentChars

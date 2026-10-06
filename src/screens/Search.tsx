import { useEffect, useMemo, useState } from 'react'
import { Screen } from '../components/Chrome'
import { EmptyState, SectionLabel } from '../components/Atoms'
import { HitCard, RecordingCard } from '../components/Cards'
import { SearchBar, TagCard, keepFocus, refocusSearch, blurSearch, type TagRow } from '../components/Dock'
import { CalendarIcon, MicIcon, ChatIcon, SparkleIcon, WaveIcon } from '../components/Icons'
import { navigate, useRoute } from '../router'
import { dateCount, emptyResults, everything, looksLikeQuestion, parseQuery, search, synthesize } from '../search'

type Tag = 'meetings' | 'memos' | 'transcript'
const LABEL: Record<Tag, string> = { meetings: 'Meetings', memos: 'Memos', transcript: 'Transcript' }
const wordsOf = (text: string) => text.toLowerCase().split(/[^\p{L}\p{N}]+/u)

const isSearchField = (t: EventTarget | null) => t instanceof HTMLInputElement && t.getAttribute('aria-label') === 'Search'

export default function Search() {
  const { params } = useRoute()
  const q = params.get('q') ?? ''
  // One type tag at a time (D43): picking Transcript means you are looking at transcripts, not memos.
  // The tag is its word in the text; deleting the word removes the tag.
  const tagParam = params.get('tag') as Tag | null
  const type: Tag | null = tagParam && tagParam in LABEL && wordsOf(q).includes(tagParam) ? tagParam : null
  const dateParam = params.get('date')
  const ai = params.get('ai') === '1'
  const set = (next: Record<string, string | undefined>) =>
    navigate('/search', { q, tag: type ?? undefined, date: dateParam ?? undefined, ...next }, true)

  // Autocomplete: the word being typed is "partial" while it is a prefix of a tag word.
  const lastWord = q.endsWith(' ') ? '' : (q.match(/(\S+)$/)?.[1] ?? '')
  const partial = !type && lastWord && (Object.keys(LABEL) as Tag[]).some((t) => t.startsWith(lastWord.toLowerCase())) ? lastWord : ''
  const skip = [type, partial.toLowerCase()].filter((w): w is string => !!w)
  const query = useMemo(() => parseQuery(q, skip), [q, skip.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps
  const detected = query.date
  const dateOn = !!detected && dateParam === detected.key
  const hasTerms = query.terms.length > 0 || dateOn
  const pool = useMemo(() => (hasTerms ? search(query, dateOn) : everything()), [query, dateOn, hasTerms])
  const idle = !hasTerms && !type // nothing to search yet
  const show = { meetings: !type || type === 'meetings', memos: !type || type === 'memos', transcript: type === 'transcript' }
  const shown = idle ? emptyResults : {
    meetings: show.meetings ? pool.meetings : emptyResults.meetings,
    memos: show.memos ? pool.memos : emptyResults.memos,
    transcript: show.transcript ? pool.transcript : emptyResults.transcript,
  }
  const noResults = !idle && shown.meetings.length + shown.memos.length + shown.transcript.length === 0
  const hasText = !!q.trim()

  // Suggestions: type tags (until one is chosen) and a date tag, in one stacked card.
  const typeRows: TagRow[] = type ? [] : [
    { id: 'meetings', label: 'Meetings', count: pool.meetings.length, icon: <MicIcon /> },
    { id: 'memos', label: 'Memos', count: pool.memos.length, icon: <ChatIcon /> },
    { id: 'transcript', label: 'Transcript', count: pool.transcript.length, icon: <WaveIcon /> },
  ].filter((r) => r.count > 0 && (!partial || r.id.startsWith(partial.toLowerCase())))
  const dateRow: TagRow[] = detected && !dateOn && !partial
    ? [{ id: 'date', label: detected.label, count: dateCount(query), icon: <CalendarIcon /> }] : []
  const rows = [...typeRows, ...dateRow]

  // Picking a type completes the word being typed (or appends the tag word) and selects it.
  const pick = (id: string) => {
    if (id === 'date') set({ date: detected!.key })
    else {
      const base = partial ? q.slice(0, q.length - partial.length) : q + (q && !q.endsWith(' ') ? ' ' : '')
      set({ q: `${base}${id} `, tag: id })
    }
    refocusSearch()
  }
  const tagWords = [type, dateOn ? detected!.text : null].filter((w): w is string => !!w)

  // Suggestions follow the keyboard: they are only shown while the search field has focus.
  const [focused, setFocused] = useState(false)
  useEffect(() => {
    const on = (e: FocusEvent) => isSearchField(e.target) && setFocused(true)
    const off = (e: FocusEvent) => isSearchField(e.target) && setFocused(false)
    document.addEventListener('focusin', on)
    document.addEventListener('focusout', off)
    setFocused(isSearchField(document.activeElement))
    return () => { document.removeEventListener('focusin', on); document.removeEventListener('focusout', off) }
  }, [])

  // AI synthesis: simulated "thinking" delay, then the result (Figma 72:2695 -> 72:2651)
  const [thinking, setThinking] = useState(false)
  useEffect(() => {
    if (!ai) return
    setThinking(true)
    const t = setTimeout(() => setThinking(false), 900)
    return () => clearTimeout(t)
  }, [ai, q])
  const synth = useMemo(() => (ai ? synthesize(q) : null), [ai, q])

  // AI is offered when a keyword search cannot answer: no results, or a question-like query (D33)
  const showAiPill = hasText && !ai && !idle && (noResults || (hasTerms && looksLikeQuestion(q)))
  const momentsOf = (id: string) => shown.transcript.length ? [] : pool.transcript.filter((h) => h.meeting.id === id)

  return (
    <Screen
      dock={
        <div style={{ bottom: 'var(--kb, 0px)' }} className="pointer-events-none absolute inset-x-0 [&_button]:pointer-events-auto [&_label]:pointer-events-auto [&_ul]:pointer-events-auto [&_button]:touch-none [&_label]:touch-none [&_ul]:touch-none">
          {focused && hasText && !ai && (showAiPill || rows.length > 0) && (
            <div className="flex flex-col items-start gap-2 px-5 pb-3">
              {showAiPill && (
                <button onClick={() => { blurSearch(); set({ ai: '1' }) }} onMouseDown={keepFocus} data-testid="ai-synthesis"
                  className="flex h-[46px] items-center gap-2 rounded-pill border border-gray-200 bg-white px-4 text-body-m shadow-bar">
                  <SparkleIcon />AI Synthesis
                </button>
              )}
              {rows.length > 0 && <TagCard rows={rows} onPick={pick} />}
            </div>
          )}
          <SearchBar value={q} tagWords={tagWords}
            onChange={(v) => set({ q: v, ai: undefined, tag: type && wordsOf(v).includes(type) ? type : undefined })}
            onClear={() => { set({ q: '', tag: undefined, date: undefined, ai: undefined }); refocusSearch() }}
            onClose={() => navigate('/')} placeholder={ai ? 'Ask a question' : 'Search anything'} />
        </div>
      }
    >
      {/* Fixed bottom padding: the content never reflows when the keyboard comes and goes; the keyboard,
          bar and suggestions simply hover over it (D44). */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[380px]" data-testid="search-body"
        onPointerDown={() => blurSearch()}>
        {ai ? (
          <section className="pt-4" aria-label="AI synthesis">
            {thinking ? (
              <p className="flex items-center gap-3 px-2 text-body-m" role="status" data-testid="synthesizing">
                <span className="flex gap-[3px]">{[0, 1, 2].map((i) => <span key={i} className="size-[5px] animate-pulse rounded-pill bg-gray-975" style={{ animationDelay: `${i * 150}ms` }} />)}</span>
                Synthesizing for you
              </p>
            ) : (
              <div className="px-2"><SparkleIcon />
                {synth?.text ? <p data-testid="ai-result" className="mt-3 text-heading-xs leading-[1.2] tracking-heading">{synth.text}</p>
                  : <p className="mt-3 text-heading-xs">Can’t help you with that.</p>}
              </div>
            )}
            <div className="mt-8 flex flex-col gap-2">
              {synth && synth.hits.length > 0 && <SectionLabel>Content</SectionLabel>}
              {synth?.hits.map((h) => (
                <HitCard key={h.transcript.id + h.segment.start} hit={h} terms={parseQuery(q.replace(/[?!.,]/g, ' ')).terms} />
              ))}
            </div>
          </section>
        ) : idle ? (
          <p className="px-2 pt-3.5 text-heading-xs tracking-heading text-gray-700">Ask about anything.</p>
        ) : noResults ? (
          <EmptyState query={q.trim()} />
        ) : (
          <div className="flex flex-col gap-2 pt-4">
            {shown.meetings.length > 0 && <section className="flex flex-col gap-2" data-testid="group-meetings">
              <SectionLabel>Meetings · {shown.meetings.length}</SectionLabel>
              {shown.meetings.map((m) => (
                <div key={m.id} className="flex flex-col gap-2">
                  <RecordingCard rec={{ kind: 'meeting', item: m, date: m.startsAt }} terms={query.terms} withSnippet />
                  {/* a meeting is its transcript: matching moments sit under it */}
                  {momentsOf(m.id).length > 0 && (
                    <div className="ml-4 flex flex-col gap-2">
                      {momentsOf(m.id).map((h) => <HitCard key={h.segment.start} hit={h} terms={query.terms} nested />)}
                    </div>
                  )}
                </div>
              ))}
            </section>}
            {shown.memos.length > 0 && <section className="mt-4 flex flex-col gap-2" data-testid="group-memos">
              <SectionLabel>Memos · {shown.memos.length}</SectionLabel>
              {shown.memos.map((m) => (
                <RecordingCard key={m.id} rec={{ kind: 'memo', item: m, date: m.createdAt }} terms={query.terms} withSnippet />
              ))}
            </section>}
            {shown.transcript.length > 0 && <section className="flex flex-col gap-2" data-testid="group-transcript">
              <SectionLabel>Transcript mentions · {shown.transcript.length}</SectionLabel>
              {shown.transcript.map((h) => <HitCard key={h.transcript.id + h.segment.start} hit={h} terms={query.terms} />)}
            </section>}
          </div>
        )}
      </div>
    </Screen>
  )
}

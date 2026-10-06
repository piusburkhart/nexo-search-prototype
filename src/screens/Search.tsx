import { useEffect, useMemo, useState } from 'react'
import { Screen } from '../components/Chrome'
import { EmptyState, SectionLabel } from '../components/Atoms'
import { HitCard, RecordingCard } from '../components/Cards'
import { DatePill, SearchBar, TagCard, refocusSearch, blurSearch, type TagRow } from '../components/Dock'
import { MicIcon, ChatIcon, SparkleIcon, WaveIcon } from '../components/Icons'
import { navigate, useRoute } from '../router'
import { dateCount, emptyResults, everything, parseQuery, search, synthesize, total, looksLikeQuestion } from '../search'

type Tag = 'meetings' | 'memos' | 'transcript'

export default function Search() {
  const { params } = useRoute()
  const q = params.get('q') ?? ''
  const LABEL: Record<Tag, string> = { meetings: 'Meetings', memos: 'Memos', transcript: 'Transcript' }
  const wordsOf = (text: string) => text.toLowerCase().split(/[^\p{L}\p{N}]+/u)
  // A tag is selected while its word is still in the text (deleting the word removes the tag).
  const tags = (params.get('tag') ?? '').split(',').filter((t): t is Tag => t in LABEL && wordsOf(q).includes(t))
  const dateParam = params.get('date')
  const ai = params.get('ai') === '1'
  const set = (next: Record<string, string | undefined>) =>
    navigate('/search', { q, tag: tags.join(',') || undefined, date: dateParam ?? undefined, ...next }, true)

  const detected = useMemo(() => parseQuery(q).date, [q])
  const dateOn = !!detected && dateParam === detected.key
  // Autocomplete: the word being typed is "partial" while it is a prefix of an unselected tag word.
  const lastWord = q.endsWith(' ') ? '' : (q.match(/(\S+)$/)?.[1] ?? '')
  const partial = lastWord && (Object.keys(LABEL) as Tag[]).some((t) => !tags.includes(t) && t.startsWith(lastWord.toLowerCase())) ? lastWord : ''
  const skip = [...tags, partial.toLowerCase()].filter(Boolean)
  const query = useMemo(() => parseQuery(q, dateOn, skip), [q, dateOn, skip.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps
  const hasTerms = query.terms.length > 0 || dateOn
  const pool = useMemo(() => (hasTerms ? search(query, dateOn) : everything()), [query, dateOn, hasTerms])
  const on = (t: Tag) => !tags.length || tags.includes(t)
  const idle = !hasTerms && !tags.length // nothing to search yet: show folders and recent recordings
  const results = idle ? emptyResults : {
    meetings: on('meetings') ? pool.meetings : emptyResults.meetings,
    memos: on('memos') ? pool.memos : emptyResults.memos,
    transcript: on('transcript') ? pool.transcript : emptyResults.transcript,
  }
  const dCount = dateCount(parseQuery(q))
  // Picking a tag completes the word being typed (or appends the tag word) and selects it.
  const pickTag = (t: Tag) => {
    const base = partial ? q.slice(0, q.length - partial.length) : q + (q && !q.endsWith(' ') ? ' ' : '')
    set({ q: `${base}${t} `, tag: [...tags, t].join(',') })
    refocusSearch()
  }
  const TAGS: (TagRow & { id: Tag })[] = [
    { id: 'meetings', label: 'Meetings', count: pool.meetings.length, icon: <MicIcon /> },
    { id: 'memos', label: 'Memos', count: pool.memos.length, icon: <ChatIcon /> },
    { id: 'transcript', label: 'Transcript', count: pool.transcript.length, icon: <WaveIcon /> },
  ]
  const open = TAGS.filter((t) => !tags.includes(t.id) && t.count > 0)
  const rows = partial ? open.filter((t) => t.id.startsWith(partial.toLowerCase())) : open
  const showDate = !!detected && !dateOn
  const hasText = !!q.trim()
  const partialOnly = idle

  // AI synthesis: simulated "thinking" delay, then the result (Figma 72:2695 -> 72:2651)
  const [thinking, setThinking] = useState(false)
  useEffect(() => {
    if (!ai) return
    setThinking(true)
    const t = setTimeout(() => setThinking(false), 900)
    return () => clearTimeout(t)
  }, [ai, q])
  const synth = useMemo(() => (ai ? synthesize(q) : null), [ai, q])

  const noResults = !idle && total(results) === 0
  // AI is offered when a keyword search cannot answer: no results, or a question-like query (D33)
  const showAiPill = hasText && !ai && !partialOnly && (noResults || (hasTerms && looksLikeQuestion(q)))

  return (
    <Screen
      dock={
        <div style={{ bottom: 'var(--kb, 0px)' }} className="pointer-events-none absolute inset-x-0 [&_button]:pointer-events-auto [&_label]:pointer-events-auto [&_ul]:pointer-events-auto">
          {hasText && !ai && (showAiPill || showDate || rows.length > 0) && (
            <div className="flex flex-col items-start gap-2 px-5 pb-3">
              {showAiPill && (
                <button onClick={() => { blurSearch(); set({ ai: '1' }) }} data-testid="ai-synthesis"
                  className="flex h-[46px] items-center gap-2 rounded-pill bg-white px-4 text-body-m shadow-pill">
                  <SparkleIcon />AI Synthesis
                </button>
              )}
              {showDate && <DatePill label={detected!.label} count={dCount} onClick={() => { set({ date: detected!.key }); refocusSearch() }} />}
              {rows.length > 0 && <TagCard rows={rows} onPick={(id) => pickTag(id as Tag)} />}
            </div>
          )}
          <SearchBar value={q} onChange={(v) => set({ q: v, ai: undefined, tag: tags.filter((t) => wordsOf(v).includes(t)).join(',') || undefined })} tagWords={tags}
            onClear={() => { set({ q: '', tag: undefined, date: undefined, ai: undefined }); refocusSearch() }}
            onClose={() => navigate('/')} placeholder={ai ? 'Ask a question' : 'Search anything'} />
        </div>
      }
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(190px+var(--kb,0px))]" data-testid="search-body"
        onPointerDown={() => { const a = document.activeElement; if (a instanceof HTMLInputElement) a.blur() }}>
        {ai ? (
          <section className="pt-4" aria-label="AI synthesis">
            {thinking ? (
              <p className="flex items-center gap-3 px-2 text-body-m" role="status" data-testid="synthesizing">
                <span className="flex gap-[3px]">{[0, 1, 2].map((i) => <span key={i} className="size-[5px] animate-pulse rounded-pill bg-gray-975" style={{ animationDelay: `${i * 150}ms` }} />)}</span>
                Synthesizing for you
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="px-2"><SparkleIcon />
                  {synth?.text ? <p data-testid="ai-result" className="mt-3 text-heading-xs leading-[1.2] tracking-heading">{synth.text}</p>
                    : <p className="mt-3 text-heading-xs">Can’t help you with that.</p>}
                </div>
              </div>
            )}
            <div className="mt-8 flex flex-col gap-2">
              {synth && synth.hits.length > 0 && <SectionLabel>Content</SectionLabel>}
              {synth?.hits.map((h) => (
                <HitCard key={h.transcript.id + h.segment.start} hit={h}
                  terms={parseQuery(q.replace(/[?!.,]/g, ' ')).terms} />
              ))}
            </div>
          </section>
        ) : idle ? (
          <p className="px-2 pt-3.5 text-heading-xs tracking-heading text-gray-700">Ask about anything.</p>
        ) : noResults ? (
          <EmptyState query={q.trim()} />
        ) : (
          <div className="flex flex-col gap-2 pt-4">
            {results.meetings.length > 0 && <section className="flex flex-col gap-2" data-testid="group-meetings">
              <SectionLabel>Meetings · {results.meetings.length}</SectionLabel>
              {results.meetings.map((m) => (
                <RecordingCard key={m.id} rec={{ kind: 'meeting', item: m, date: m.startsAt }} terms={query.terms} withSnippet />
              ))}
            </section>}
            {results.memos.length > 0 && <section className="mt-4 flex flex-col gap-2" data-testid="group-memos">
              <SectionLabel>Memos · {results.memos.length}</SectionLabel>
              {results.memos.map((m) => (
                <RecordingCard key={m.id} rec={{ kind: 'memo', item: m, date: m.createdAt }} terms={query.terms} withSnippet />
              ))}
            </section>}
            {results.transcript.length > 0 && <section className="mt-4 flex flex-col gap-2" data-testid="group-transcript">
              <SectionLabel>Transcript mentions · {results.transcript.length}</SectionLabel>
              {results.transcript.map((h) => <HitCard key={h.transcript.id + h.segment.start} hit={h} terms={query.terms} />)}
            </section>}
          </div>
        )}
      </div>
    </Screen>
  )
}


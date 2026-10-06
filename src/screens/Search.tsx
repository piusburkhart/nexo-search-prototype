import { useEffect, useMemo, useState } from 'react'
import { Screen } from '../components/Chrome'
import { EmptyState, SectionLabel } from '../components/Atoms'
import { HitCard, RecordingCard } from '../components/Cards'
import { SearchBar, SearchTag } from '../components/Dock'
import { CalendarIcon, MicIcon, ChatIcon, SparkleIcon, WaveIcon } from '../components/Icons'
import { data, folderName, formatDay, recordings } from '../data'
import { navigate, useRoute } from '../router'
import { dateCount, emptyResults, parseQuery, search, synthesize, total, wantsAi } from '../search'

type Tag = 'meetings' | 'memos' | 'transcript'

export default function Search() {
  const { params } = useRoute()
  const q = params.get('q') ?? ''
  const tag = (params.get('tag') as Tag | null) ?? null
  const useDate = params.get('date') === '1'
  const ai = params.get('ai') === '1'
  const set = (next: Record<string, string | undefined>) =>
    navigate('/search', { q, tag: tag ?? undefined, date: useDate ? '1' : undefined, ...next }, true)

  const query = useMemo(() => parseQuery(q), [q])
  const all = useMemo(() => search(query, false), [query])
  const results = useMemo(() => {
    const r = search(query, useDate && !!query.date)
    return {
      meetings: !tag || tag === 'meetings' ? r.meetings : emptyResults.meetings,
      memos: !tag || tag === 'memos' ? r.memos : emptyResults.memos,
      transcript: !tag || tag === 'transcript' ? r.transcript : emptyResults.transcript,
    }
  }, [query, tag, useDate])
  const dCount = dateCount(query)
  const idle = !q.trim()
  const open = (kind: string, id: string) => navigate(`/${kind}/${id}`)
  const openHit = (h: (typeof results.transcript)[number]) =>
    navigate(`/transcript/${h.transcript.id}`, { seg: String(h.segment.start), q: query.terms.join(' ') })

  // AI synthesis: simulated "thinking" delay, then the result (Figma 72:2695 -> 72:2651)
  const [thinking, setThinking] = useState(false)
  useEffect(() => {
    if (!ai) return
    setThinking(true)
    const t = setTimeout(() => setThinking(false), 900)
    return () => clearTimeout(t)
  }, [ai, q])
  const synth = useMemo(() => (ai ? synthesize(q) : null), [ai, q])

  const folderCount = recordings.filter((r) => r.item.projectId === data.project.id).length
  const noResults = !idle && total(results) === 0
  const showAiPill = !idle && !ai && wantsAi(q)

  return (
    <Screen
      dock={
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent pt-6">
          {!idle && !ai && (showAiPill || total(all) > 0) && (
            <div className="flex flex-wrap justify-center gap-2 px-5 pb-3" aria-label="Filter tags">
              {showAiPill && (
                <button onClick={() => set({ ai: '1' })} data-testid="ai-synthesis"
                  className="flex h-[46px] items-center gap-2 rounded-pill bg-white px-4 text-body-m shadow-pill">
                  <SparkleIcon />AI Synthesis
                </button>
              )}
              {total(all) > 0 && <><SearchTag label="Meetings" count={all.meetings.length} icon={<MicIcon />} selected={tag === 'meetings'}
                onClick={() => set({ tag: tag === 'meetings' ? undefined : 'meetings' })} />
              <SearchTag label="Memos" count={all.memos.length} icon={<ChatIcon />} selected={tag === 'memos'}
                onClick={() => set({ tag: tag === 'memos' ? undefined : 'memos' })} />
              <SearchTag label="Transcript" count={all.transcript.length} icon={<WaveIcon />} selected={tag === 'transcript'}
                onClick={() => set({ tag: tag === 'transcript' ? undefined : 'transcript' })} /></>}
              {query.date && (
                <SearchTag label={formatDay(query.date)} count={dCount} icon={<CalendarIcon />} selected={useDate}
                  onClick={() => set({ date: useDate ? undefined : '1' })} />
              )}
            </div>
          )}
          <SearchBar value={q} onChange={(v) => set({ q: v, ai: undefined, tag: tag && v ? tag : undefined })}
            onClose={() => navigate('/')} placeholder={ai ? 'Ask a question' : 'Search anything'} />
        </div>
      }
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[190px]" data-testid="search-body">
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
                    : <p className="mt-3 text-heading-xs">Nothing to synthesize for this question.</p>}
                </div>
              </div>
            )}
            <div className="mt-8 flex flex-col gap-2">
              {synth && synth.hits.length > 0 && <SectionLabel>Content</SectionLabel>}
              {synth?.hits.map((h) => (
                <HitCard key={h.transcript.id + h.segment.start} hit={h}
                  terms={parseQuery(q.replace(/[?!.,]/g, ' ')).terms}
                  onOpen={() => navigate(`/transcript/${h.transcript.id}`, { seg: String(h.segment.start) })} />
              ))}
            </div>
          </section>
        ) : idle ? (
          <>
            <p className="px-2 pt-3.5 pb-[50px] text-heading-xs tracking-heading text-gray-975">Ask about anything.</p>
            <div className="flex flex-col gap-2">
              <SectionLabel>Folders</SectionLabel>
              <button onClick={() => set({ q: data.project.name.replace(/^Project /, '') })} data-testid="folder-card"
                className="flex h-[202px] w-[195px] flex-col justify-end rounded-hit bg-white pb-4 pl-4 pr-3">
                <span className="text-heading-xl leading-[1.2] tracking-heading">{folderName(data.project.id)}</span>
                <span className="mt-1 flex items-center gap-1 text-heading-s tracking-heading text-gray-800"><WaveIcon className="size-4" />{folderCount}</span>
              </button>
              <div className="h-[51px]" />
              <SectionLabel>Recordings</SectionLabel>
              {recordings.slice(0, 3).map((r) => (
                <RecordingCard key={r.item.id} rec={r} onOpen={() => open(r.kind, r.item.id)} />
              ))}
            </div>
          </>
        ) : noResults ? (
          <EmptyState query={q.trim()} />
        ) : (
          <div className="flex flex-col gap-2 pt-4">
            {results.meetings.length > 0 && <section className="flex flex-col gap-2" data-testid="group-meetings">
              <SectionLabel>Meetings · {results.meetings.length}</SectionLabel>
              {results.meetings.map((m) => (
                <RecordingCard key={m.id} rec={{ kind: 'meeting', item: m, date: m.startsAt }} terms={query.terms} withSnippet onOpen={() => open('meeting', m.id)} />
              ))}
            </section>}
            {results.memos.length > 0 && <section className="mt-4 flex flex-col gap-2" data-testid="group-memos">
              <SectionLabel>Memos · {results.memos.length}</SectionLabel>
              {results.memos.map((m) => (
                <RecordingCard key={m.id} rec={{ kind: 'memo', item: m, date: m.createdAt }} terms={query.terms} withSnippet onOpen={() => open('memo', m.id)} />
              ))}
            </section>}
            {results.transcript.length > 0 && <section className="mt-4 flex flex-col gap-2" data-testid="group-transcript">
              <SectionLabel>Transcript mentions · {results.transcript.length}</SectionLabel>
              {results.transcript.map((h) => <HitCard key={h.transcript.id + h.segment.start} hit={h} terms={query.terms} onOpen={() => openHit(h)} />)}
            </section>}
          </div>
        )}
      </div>
    </Screen>
  )
}


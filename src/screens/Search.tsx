import { useEffect, useMemo, useState } from 'react'
import { Screen } from '../components/Chrome'
import { EmptyState, SectionLabel } from '../components/Atoms'
import { AiSynthesis, type AiState } from '../components/AiSynthesis'
import { ActionPill, FolderCard, RecordingCard, TranscriptCard, UnfoldLink } from '../components/Cards'
import { SearchBar, TagCard, refocusSearch, blurSearch, type TagRow } from '../components/Dock'
import { CalendarIcon, CheckCircleIcon, FolderIcon, MicIcon, ChatIcon, WaveIcon } from '../components/Icons'
import { navigate, useRoute } from '../router'
import { synthesize } from '../ai'
import { total, dateCompletions, dateCount, emptyResults, everything, groupByMeeting, parseQuery, recordingScore, search } from '../search'
import { understand } from '../semantic'
import type { Recording } from '../data'

type Tag = 'meetings' | 'memos' | 'folders' | 'actions' | 'transcript'
const LABEL: Record<Tag, string> = { meetings: 'Meetings', memos: 'Memos', folders: 'Folders', actions: 'Actions', transcript: 'Transcript' }
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

  // Autocomplete (D48): while a word is being typed (no space after it yet), the suggestions only
  // complete that word: a type tag it is the start of, or a date it could become. Such a word is not
  // searched for until it is finished.
  const lastWord = q.endsWith(' ') ? '' : (q.match(/(\S+)$/)?.[1] ?? '')
  const before = q.slice(0, q.length - lastWord.length)
  const rawDate = useMemo(() => parseQuery(q).date, [q])
  const dateAtEnd = !!rawDate && dateParam !== rawDate.key && !!lastWord && q.trimEnd().endsWith(rawDate.text)
  // A question or long query wants content (what was said), not a file: only the Transcript tag is offered.
  const asking = useMemo(() => understand(q).question, [q])
  const offered = (Object.keys(LABEL) as Tag[]).filter((t) => !asking || t === 'transcript')
  const typeCompletions = !type && lastWord ? offered.filter((t) => t.startsWith(lastWord.toLowerCase())) : []
  const dateCompletionList = !lastWord ? [] : dateAtEnd ? [rawDate!] : dateCompletions(lastWord, before)
  const partial = typeCompletions.length || dateCompletionList.length ? lastWord : ''

  const skip = [type, partial.toLowerCase()].filter((w): w is string => !!w)
  const query = useMemo(() => parseQuery(q, skip), [q, skip.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps
  const detected = query.date
  const dateOn = !!detected && dateParam === detected.key
  const hasTerms = query.terms.length > 0 || !!detected // a date on its own applies itself (D72)
  const pool = useMemo(() => (hasTerms ? search(query, dateOn) : everything()), [query, dateOn, hasTerms])
  const idle = !hasTerms && !type // nothing to search yet
  const show = (t: Tag) => !type || type === t
  const shown = idle ? emptyResults : {
    ...pool,
    meetings: show('meetings') ? pool.meetings : emptyResults.meetings,
    memos: show('memos') ? pool.memos : emptyResults.memos,
    actions: show('actions') ? pool.actions : emptyResults.actions,
    transcript: show('transcript') ? pool.transcript : emptyResults.transcript,
    folders: show('folders') ? pool.folders : emptyResults.folders,
  }
  const noResults = !idle && total(shown) === 0

  // Sections show only the 3 most relevant elements of a type, the rest unfolds with a link (Figma 77:4178).
  const LIMIT = 3
  const [unfolded, setUnfolded] = useState<Record<string, boolean>>({})
  useEffect(() => setUnfolded({}), [q, type, dateParam])
  const toggle = (k: string) => setUnfolded((u) => ({ ...u, [k]: !u[k] }))
  const recs: Recording[] = [
    ...shown.meetings.map((item): Recording => ({ kind: 'meeting', item, date: item.startsAt })),
    ...shown.memos.map((item): Recording => ({ kind: 'memo', item, date: item.createdAt })),
  ].sort((a, b) => recordingScore(b) - recordingScore(a) || b.date.localeCompare(a.date))
  const groups = groupByMeeting(shown.transcript)
  const hiddenHits = groups.slice(LIMIT).reduce((n, g) => n + g.hits.length, 0)
  const hasText = !!q.trim()

  // Suggestions, in one stacked card. Each row knows what picking it does.
  const ICON: Record<Tag, React.ReactNode> = { meetings: <MicIcon />, memos: <ChatIcon />, folders: <FolderIcon />, actions: <CheckCircleIcon />, transcript: <WaveIcon /> }
  const counts: Record<Tag, number> = { meetings: pool.meetings.length, memos: pool.memos.length, folders: pool.folders.length, actions: pool.actions.length, transcript: pool.transcript.length }
  type Row = TagRow & { pick: () => void }
  const typeRow = (t: Tag): Row => ({
    id: t, label: LABEL[t], count: counts[t], icon: ICON[t],
    pick: () => {
      const base = partial ? before : q + (q && !q.endsWith(' ') ? ' ' : '')
      set({ q: `${base}${t} `, tag: t })
    },
  })
  const dateRow = (d: NonNullable<typeof detected>, i: number, replacePartial: boolean): Row => ({
    id: i ? `date-${i}` : 'date', label: d.kind === 'day' ? d.text : d.label, icon: <CalendarIcon />, // a typed day keeps its dd.mm.yy format
    count: dateCount({ raw: q, terms: query.terms, date: d }),
    pick: () => set({ q: replacePartial ? `${before}${d.text} ` : q.endsWith(' ') ? q : `${q} `, date: d.key }),
  })
  let rows: Row[]
  if (partial) {
    rows = [
      ...typeCompletions.map(typeRow).filter((r) => r.count > 0),
      ...dateCompletionList.map((d, i) => dateRow(d, i, !dateAtEnd)),
    ]
  } else if (lastWord && lastWord.length < 3 && !rawDate) {
    rows = [] // a word fragment that completes to nothing ("n"): nothing to suggest yet
  } else {
    // A type tag is only worth suggesting when the results mix more than one type.
    const types = type ? [] : (Object.keys(LABEL) as Tag[]).filter((t) => counts[t] > 0)
    rows = [
      ...(types.length >= 2 && !idle ? types.filter((t) => offered.includes(t)).map(typeRow) : []),
      ...(detected && !dateOn ? [dateRow(detected, 0, false)] : []),
    ]
  }
  const pick = (id: string) => { rows.find((r) => r.id === id)?.pick(); refocusSearch() }
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

  // AI Synthesis is always there (Figma 75:3668): disabled until enough is typed, then it can run.
  const sufficient = query.terms.join(' ').length >= 3 || !!detected || !!type
  const [thinking, setThinking] = useState(false)
  useEffect(() => {
    if (!ai) return
    setThinking(true)
    const t = setTimeout(() => setThinking(false), 1100)
    return () => clearTimeout(t)
  }, [ai, q])
  // AI Synthesis summarises exactly what is on screen (D69): never other sources.
  const answer = useMemo(() => (ai ? synthesize(shown, pool, q) : undefined), [ai, q, shown, pool])
  const aiState: AiState = ai ? (thinking ? 'thinking' : 'done') : sufficient ? 'ready' : 'disabled'

  return (
    <Screen
      dock={
        <div style={{ bottom: 'var(--kb, 0px)' }} className="pointer-events-none absolute inset-x-0 [&_button]:pointer-events-auto [&_label]:pointer-events-auto [&_ul]:pointer-events-auto [&_button]:touch-none [&_label]:touch-none [&_ul]:touch-none">
          {focused && hasText && rows.length > 0 && (
            <div className="flex flex-col items-start gap-2 px-5 pb-3">
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
      <h1 data-testid="search-headline" className="flex h-4 shrink-0 items-center justify-center text-heading-xs font-normal tracking-heading text-black">Global search</h1>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[380px]" data-testid="search-body"
        onPointerDown={() => blurSearch()}>
        <div className={`pt-6 ${aiState === 'done' ? 'pb-10' : 'pb-4'}`}>
          <AiSynthesis state={aiState} answer={answer}
            onRun={() => { blurSearch(); set({ ai: '1' }) }} onReset={() => set({ ai: undefined })} />
        </div>
        {idle ? null : noResults ? (ai ? null : <EmptyState query={q.trim()} />) : (
          <div className="flex flex-col gap-6">
            {shown.folders.length > 0 && <section className="flex flex-col gap-2" data-testid="group-folders">
              <SectionLabel>Folders</SectionLabel>
              <div className="grid grid-cols-2 gap-2">{shown.folders.map((f) => <FolderCard key={f.id} folder={f} terms={pool.highlight} />)}</div>
            </section>}
            {recs.length > 0 && <section className="flex flex-col gap-2" data-testid="group-recordings">
              <SectionLabel>Recordings</SectionLabel>
              {(unfolded.rec ? recs : recs.slice(0, LIMIT)).map((r) => <RecordingCard key={r.item.id} rec={r} terms={pool.highlight} withSnippet />)}
              {recs.length > LIMIT && <UnfoldLink open={!!unfolded.rec} label={`${recs.length - LIMIT} more recordings might also be relevant`} onClick={() => toggle('rec')} />}
            </section>}
            {shown.actions.length > 0 && <section className="flex flex-col gap-2" data-testid="group-actions">
              <SectionLabel>Actions</SectionLabel>
              {(unfolded.act ? shown.actions : shown.actions.slice(0, LIMIT)).map((a) => <ActionPill key={a.id} action={a} terms={pool.highlight} />)}
              {shown.actions.length > LIMIT && <UnfoldLink open={!!unfolded.act} label="Show all actions" onClick={() => toggle('act')} />}
            </section>}
            {groups.length > 0 && <section className="flex flex-col gap-2" data-testid="group-transcript">
              <SectionLabel>Summary &amp; Transcription</SectionLabel>
              {(unfolded.tr ? groups : groups.slice(0, LIMIT)).map((g) => <TranscriptCard key={g.meeting.id} group={g} terms={pool.highlight} />)}
              {groups.length > LIMIT && <UnfoldLink open={!!unfolded.tr} label={`${hiddenHits} more content might also be relevant`} onClick={() => toggle('tr')} />}
            </section>}
          </div>
        )}
      </div>
    </Screen>
  )
}

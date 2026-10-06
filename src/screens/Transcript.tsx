import { useEffect, useMemo, useRef, useState } from 'react'
import { DetailScreen } from '../components/Detail'
import { Highlight } from '../components/Highlight'
import { ChevronDownIcon, ChevronUpIcon } from '../components/Icons'
import { firstName, formatDay, getTranscript, getMeeting } from '../data'
import { navigate, useRoute } from '../router'
import { matchesAll } from '../search'

export default function Transcript({ id }: { id: string }) {
  const { params } = useRoute()
  const t = getTranscript(id)
  const meeting = t && getMeeting(t.meetingId)
  const segParam = params.get('seg')
  const activeStart = segParam === null ? null : Number(segParam)
  const [find, setFind] = useState(params.get('q') ?? '')
  const terms = useMemo(() => find.toLowerCase().split(/\s+/).filter(Boolean), [find])
  const matches = useMemo(
    () => (t && terms.length ? t.segments.flatMap((s, i) => (matchesAll(s.text, terms) ? [i] : [])) : []),
    [t, terms],
  )
  // Start on the match for the opened segment, else the first match.
  const initial = Math.max(0, matches.findIndex((i) => t?.segments[i].start === activeStart))
  const [cursor, setCursor] = useState(initial)
  const refs = useRef(new Map<number, HTMLElement>())
  const [pinned, setPinned] = useState(activeStart !== null)

  const currentIdx = matches.length ? matches[Math.min(cursor, matches.length - 1)] : undefined
  const scrollIdx = pinned && activeStart !== null && currentIdx === undefined
    ? t?.segments.findIndex((s) => s.start === activeStart) : currentIdx

  useEffect(() => {
    if (scrollIdx !== undefined) refs.current.get(scrollIdx)?.scrollIntoView({ block: 'center' })
  }, [scrollIdx])

  if (!t || !meeting) return <DetailScreen title="Not found">{null}</DetailScreen>
  const step = (d: number) => {
    if (!matches.length) return
    setPinned(false)
    setCursor((c) => (c + d + matches.length) % matches.length)
  }

  return (
    <DetailScreen title={meeting.title} meta={`Transcript · ${formatDay(meeting.startsAt)}`}
      sticky={
        <div className="flex items-center gap-2 rounded-pill bg-white px-4 py-2 shadow-pill">
          <input value={find} onChange={(e) => { setFind(e.target.value); setCursor(0); setPinned(false) }}
            placeholder="Find in transcript" aria-label="Find in transcript" type="search"
            className="min-w-0 flex-1 bg-transparent py-1.5 text-heading-xs outline-none [&::-webkit-search-cancel-button]:hidden" />
          <span className="text-body-s whitespace-nowrap text-gray-700" data-testid="find-count" aria-live="polite">
            {terms.length ? (matches.length ? `${Math.min(cursor, matches.length - 1) + 1} / ${matches.length}` : '0 matches') : ''}
          </span>
          <button onClick={() => step(-1)} aria-label="Previous match" className="p-1"><ChevronUpIcon /></button>
          <button onClick={() => step(1)} aria-label="Next match" className="p-1"><ChevronDownIcon /></button>
        </div>
      }>
      <ol className="flex flex-col gap-2 pt-2">
        {t.segments.map((s, i) => {
          const isActive = i === scrollIdx
          return (
            <li key={s.start} ref={(el) => { if (el) refs.current.set(i, el) }}
              data-seg-start={s.start} data-active={isActive || undefined}
              className={`rounded-hit border px-5 py-4 ${isActive ? 'border-new bg-highlight' : 'border-gray-200 bg-white'}`}>
              <div className="flex gap-3 text-body-m text-gray-700"><span>{firstName(s.speakerId)}</span><span>{s.time}</span></div>
              <p className="mt-2 font-serif text-heading-xs leading-[1.3] tracking-heading text-gray-975">
                <Highlight text={s.text} terms={terms} current={isActive} />
              </p>
            </li>
          )
        })}
      </ol>
      <button onClick={() => navigate(`/meeting/${meeting.id}`)} className="mt-4 w-full text-center text-heading-xs text-gray-700 underline">Open meeting</button>
    </DetailScreen>
  )
}

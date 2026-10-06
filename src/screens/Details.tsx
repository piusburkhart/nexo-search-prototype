import { DetailScreen } from '../components/Detail'
import { SectionLabel } from '../components/Atoms'
import { ArrowRightIcon } from '../components/Icons'
import { data, folderName, formatDay, getMeeting, getMemo, getPerson } from '../data'
import { navigate } from '../router'

export function MeetingDetail({ id }: { id: string }) {
  const m = getMeeting(id)
  if (!m) return <DetailScreen title="Not found">{null}</DetailScreen>
  const folder = folderName(m.projectId)
  const related = data.memos.filter((x) => x.relatedMeetingIds.includes(m.id))
  return (
    <DetailScreen title={m.title} meta={`${formatDay(m.startsAt)} · ${m.durationMin} min${folder ? ` · ${folder}` : ''}`}>
      <div className="flex flex-col gap-2">
        <SectionLabel>Summary</SectionLabel>
        <p className="rounded-card bg-white p-6 font-serif text-heading-xs leading-[1.5] tracking-heading text-gray-950">{m.summary}</p>
        <div className="mt-4" /><SectionLabel>Participants</SectionLabel>
        <ul className="rounded-hit border border-gray-200 bg-white px-5 py-3 text-body-m">
          {m.participants.map((p) => (
            <li key={p} className="flex justify-between py-1.5"><span>{getPerson(p)?.name}</span><span className="text-gray-700">{getPerson(p)?.role}</span></li>
          ))}
        </ul>
        {m.transcriptId && (
          <>
            <div className="mt-4" /><SectionLabel>Transcript</SectionLabel>
            <button onClick={() => navigate(`/transcript/${m.transcriptId}`)} data-testid="open-transcript"
              className="flex items-center justify-between rounded-hit border border-gray-200 bg-white px-5 py-4 text-heading-xs tracking-heading">
              Open full transcript<ArrowRightIcon />
            </button>
          </>
        )}
        {related.length > 0 && (
          <>
            <div className="mt-4" /><SectionLabel>Related memos</SectionLabel>
            {related.map((x) => (
              <button key={x.id} onClick={() => navigate(`/memo/${x.id}`)} className="rounded-hit border border-gray-200 bg-white px-5 py-4 text-heading-xs tracking-heading">{x.title}</button>
            ))}
          </>
        )}
      </div>
    </DetailScreen>
  )
}

export function MemoDetail({ id }: { id: string }) {
  const m = getMemo(id)
  if (!m) return <DetailScreen title="Not found">{null}</DetailScreen>
  const folder = folderName(m.projectId)
  const mm = `${Math.floor(m.durationSec / 60)}:${String(m.durationSec % 60).padStart(2, '0')}`
  return (
    <DetailScreen title={m.title} meta={`${formatDay(m.createdAt)} · ${mm}${folder ? ` · ${folder}` : ''}`}>
      <div className="flex flex-col gap-2">
        <p className="rounded-card bg-white p-6 font-serif text-heading-m leading-[1.5] tracking-heading text-gray-950">{m.content}</p>
        <ul className="flex flex-wrap gap-2 px-2 pt-2 text-body-s text-gray-800">
          {m.tags.map((t) => <li key={t} className="rounded-pill border border-gray-600 px-3 py-1.5">{t}</li>)}
        </ul>
        {m.relatedMeetingIds.length > 0 && (
          <>
            <div className="mt-4" /><SectionLabel>Related meetings</SectionLabel>
            {m.relatedMeetingIds.map((mid) => (
              <button key={mid} onClick={() => navigate(`/meeting/${mid}`)} className="rounded-hit border border-gray-200 bg-white px-5 py-4 text-heading-xs tracking-heading">{getMeeting(mid)?.title}</button>
            ))}
          </>
        )}
      </div>
    </DetailScreen>
  )
}

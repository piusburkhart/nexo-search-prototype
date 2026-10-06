import { ArrowRightIcon, ChatIcon, FolderIcon, MicIcon } from './Icons'
import { AvatarStack, NewTag } from './Atoms'
import { Highlight } from './Highlight'
import { firstName, folderName, formatDay, isNew, type Recording } from '../data'
import type { TranscriptHit } from '../search'
import { snippet } from '../search'

const Meta = ({ rec }: { rec: Recording }) => {
  const folder = folderName(rec.item.projectId)
  return (
    <div className="flex items-center gap-[9px] text-body-s leading-[1.2] text-gray-900">
      <span className="flex items-center gap-1">
        {rec.kind === 'meeting' ? <MicIcon className="size-[15px]" /> : <ChatIcon className="size-[15px]" />}
        {formatDay(rec.date)}
      </span>
      {folder && <span className="flex items-center gap-1"><FolderIcon className="size-[15px]" />{folder}</span>}
      {rec.kind === 'meeting' && <AvatarStack ids={rec.item.participants} />}
    </div>
  )
}

/** Recording card: meetings show a sans title, memos show serif body (Figma 72:1609 / 72:1649). */
export function RecordingCard({ rec, terms = [], onOpen, showNew = false, withSnippet = false }: {
  rec: Recording; terms?: string[]; onOpen: () => void; showNew?: boolean; withSnippet?: boolean
}) {
  const isMeeting = rec.kind === 'meeting'
  const body = isMeeting ? rec.item.summary : rec.item.content
  return (
    <button onClick={onOpen} data-testid={`${rec.kind}-card`} data-id={rec.item.id}
      className="flex w-full flex-col gap-4 rounded-card bg-white p-6 shadow-card">
      {showNew && isNew(rec.date) && <NewTag />}
      {isMeeting ? (
        <>
          <span className="text-heading-m leading-[1.24] tracking-heading text-gray-950"><Highlight text={rec.item.title} terms={terms} /></span>
          {withSnippet && <span className="line-clamp-3 text-body-m leading-[1.4] text-gray-800"><Highlight text={snippet(body, terms)} terms={terms} /></span>}
        </>
      ) : (
        <>
          {withSnippet && <span className="text-heading-s leading-[1.24] tracking-heading text-gray-950"><Highlight text={rec.item.title} terms={terms} /></span>}
          <span className={`font-serif text-heading-m tracking-heading text-gray-950 ${withSnippet ? 'line-clamp-3 leading-[1.4]' : 'line-clamp-4 leading-[1.64]'}`}>
            <Highlight text={withSnippet ? snippet(body, terms) : body} terms={terms} />
          </span>
        </>
      )}
      <Meta rec={rec} />
    </button>
  )
}

/** Transcript hit card (Figma "Content" card 72:1901). */
export function HitCard({ hit, terms, onOpen }: { hit: TranscriptHit; terms: string[]; onOpen: () => void }) {
  return (
    <button onClick={onOpen} data-testid="transcript-hit" data-time={hit.segment.time}
      className="relative flex w-full flex-col gap-3 rounded-hit border border-gray-200 bg-white px-[19px] pt-4 pb-4 pr-[60px]">
      <span className="text-body-s text-gray-700">{hit.meeting.title}</span>
      <span className="font-serif text-heading-xs leading-[1.2] tracking-heading text-gray-975">
        <Highlight text={hit.segment.text} terms={terms} />
      </span>
      <span className="flex gap-3 text-body-m leading-[1.2] tracking-heading text-gray-700">
        <span>{firstName(hit.segment.speakerId)}</span><span>{hit.segment.time}</span>
      </span>
      <span className="absolute right-[15px] bottom-3 flex size-[30px] items-center justify-center rounded-pill bg-white">
        <ArrowRightIcon />
      </span>
    </button>
  )
}

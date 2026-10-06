import { CalendarIcon, CheckCircleIcon, ChatIcon, FolderIcon, MailIcon, MicIcon, WaveIcon } from './Icons'
import { AvatarStack, NewTag } from './Atoms'
import { Highlight } from './Highlight'
import { firstName, folderContents, folderName, formatDay, getMeeting, isNew, isNewAction, type Recording } from '../data'
import type { Action, Folder, Meeting } from '../data/types'
import type { TranscriptGroup, TranscriptHit } from '../search'
import { snippet } from '../search'

/* None of these cards open anything: the file pages were removed (D64). */

const Meta = ({ rec, tone = 'text-gray-900' }: { rec: Recording; tone?: string }) => {
  const folder = folderName(rec.item.projectId)
  return (
    <div className={`flex items-center gap-[9px] text-body-s leading-[1.2] ${tone}`}>
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
export function RecordingCard({ rec, terms = [], showNew = false, withSnippet = false }: {
  rec: Recording; terms?: string[]; showNew?: boolean; withSnippet?: boolean
}) {
  const isMeeting = rec.kind === 'meeting'
  const body = isMeeting ? rec.item.summary : rec.item.content
  return (
    <div data-testid={`${rec.kind}-card`} data-id={rec.item.id}
      className="flex w-full flex-col gap-[19px] rounded-card bg-white px-6 pt-[30px] pb-6 text-left shadow-card">
      {showNew && isNew(rec.date) && <NewTag />}
      {isMeeting ? (
        <>
          <span className="text-heading-m leading-[1.24] tracking-heading text-gray-950"><Highlight text={rec.item.title} terms={terms} /></span>
          {withSnippet && <span className="line-clamp-3 text-body-m leading-[1.4] text-gray-800"><Highlight text={snippet(body, terms)} terms={terms} /></span>}
        </>
      ) : (
        <span className={`font-serif text-heading-m tracking-heading text-gray-950 ${withSnippet ? 'line-clamp-3 leading-[1.4]' : 'line-clamp-4 leading-[1.64]'}`}>
          <Highlight text={withSnippet ? snippet(body, terms) : body} terms={terms} />
        </span>
      )}
      <Meta rec={rec} />
    </div>
  )
}

/** Folder card (owner's design): a near-square tile, name at the bottom, number of recordings under it. */
export function FolderCard({ folder, terms = [] }: { folder: Folder; terms?: string[] }) {
  const c = folderContents(folder)
  return (
    <div data-testid="folder-card" data-id={folder.id}
      className="flex aspect-[210/218] w-full flex-col justify-end gap-1 rounded-hit bg-white px-[18px] pb-5 text-left">
      <span className="truncate text-[24px] leading-[1.2] tracking-heading text-gray-975"><Highlight text={folder.name} terms={terms} /></span>
      <span className="flex items-center gap-2 text-heading-s leading-[1.2] text-gray-800" aria-label={`${c.meetings.length + c.memos.length} recordings`}>
        <WaveIcon className="size-4" />{c.meetings.length + c.memos.length}
      </span>
    </div>
  )
}

/** Meeting name and its metadata, shown on every transcript quote (Figma 77:4717 / 77:4751). */
function MeetingHeader({ meeting }: { meeting: Meeting }) {
  return (
    <div className="flex flex-col gap-0.5 text-gray-700">
      <span className="text-body-m leading-[1.24] tracking-heading">{meeting.title}</span>
      <Meta rec={{ kind: 'meeting', item: meeting, date: meeting.startsAt }} tone="text-gray-700" />
    </div>
  )
}

function Quote({ hit, terms, boxed }: { hit: TranscriptHit; terms: string[]; boxed: boolean }) {
  return (
    <div data-testid="transcript-hit" data-time={hit.segment.time}
      className={boxed ? 'flex flex-col gap-4 rounded-[19px] border border-gray-200 bg-white px-[19px] pt-4 pb-3' : 'flex flex-col gap-4'}>
      <span className="font-serif text-heading-xs leading-[1.2] tracking-heading text-gray-975">
        <Highlight text={hit.segment.text} terms={terms} />
      </span>
      <span className="flex gap-3 text-body-m leading-[1.2] tracking-heading text-gray-700">
        <span>{firstName(hit.segment.speakerId)}</span><span>{hit.segment.time}</span>
      </span>
    </div>
  )
}

/**
 * Transcript results of one meeting. One relevant part: a single card with the quote. Several: one card
 * holding a bordered card per quote.
 */
export function TranscriptCard({ group, terms }: { group: TranscriptGroup; terms: string[] }) {
  const many = group.hits.length > 1
  return (
    <div data-testid="transcript-group" data-meeting={group.meeting.id}
      className="flex flex-col gap-4 rounded-hit border border-gray-200 bg-white p-[19px]">
      <MeetingHeader meeting={group.meeting} />
      <div className={many ? 'flex flex-col gap-4 -mx-[11px] -mb-[11px]' : ''}>
        {group.hits.map((h) => <Quote key={h.segment.start} hit={h} terms={terms} boxed={many} />)}
      </div>
    </div>
  )
}

const KIND_ICON = { calendar: CalendarIcon, mail: MailIcon, task: CheckCircleIcon } as const
const KIND_COLOR = { calendar: 'text-accent-blue', mail: 'text-accent-orange', task: 'text-gray-975' } as const

/** Action: a to-do created from a meeting (Figma 77:4506). The icon shows what kind of action it is. */
export function ActionPill({ action, terms = [] }: { action: Action; terms?: string[] }) {
  const Icon = KIND_ICON[action.kind]
  const meeting = getMeeting(action.meetingId)!
  return (
    <div data-testid="action-item" data-kind={action.kind}
      className="flex h-[84px] items-center gap-4 rounded-pill border border-gray-100 bg-white px-1 shadow-pill">
      <span className="flex size-[76px] shrink-0 items-center justify-center rounded-pill bg-gray-50">
        <Icon className={`size-8 ${KIND_COLOR[action.kind]}`} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="line-clamp-2 text-heading-s leading-[1.1] tracking-heading text-gray-975"><Highlight text={action.title} terms={terms} /></span>
        <span className="truncate text-body-s text-gray-700"><Highlight text={meeting.title} terms={terms} /></span>
      </span>
      {isNewAction(action) && <span className="pr-4"><NewTag small /></span>}
    </div>
  )
}

/** "4+ recordings might also be relevant": unfolds the rest of a section (Figma 77:4578). */
export function UnfoldLink({ open, label, onClick }: { open: boolean; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} data-testid="unfold" aria-expanded={open}
      className="mx-auto mt-1 block px-4 py-1 text-heading-xs leading-[1.24] tracking-heading text-gray-700 underline">
      {open ? 'Show less' : label}
    </button>
  )
}

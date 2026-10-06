import raw from './mock-data.json'
import type { MockData, Person, Meeting, Memo, Transcript } from './types'

export const data = raw as unknown as MockData

const byId = <T extends { id: string }>(xs: T[]) => new Map(xs.map((x) => [x.id, x]))
const people = byId<Person>(data.people)
const meetings = byId<Meeting>(data.meetings)
const memos = byId<Memo>(data.memos)
const transcripts = byId<Transcript>(data.transcripts)

export const getPerson = (id: string) => people.get(id)
export const getMeeting = (id: string) => meetings.get(id)
export const getMemo = (id: string) => memos.get(id)
export const getTranscript = (id: string) => transcripts.get(id)

export const firstName = (id: string) => getPerson(id)?.name.split(' ')[0] ?? id
export const initials = (id: string) =>
  (getPerson(id)?.name ?? '?').split(' ').map((w) => w[0]).join('').slice(0, 2)

/** Folder = project; Figma shows the short name ("Lantern"). */
export const folderName = (projectId: string | null) =>
  projectId && projectId === data.project.id ? data.project.name.replace(/^Project /, '') : null

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
/** ISO date (yyyy-mm-dd) in the item's own offset. */
export const dayOf = (iso: string) => iso.slice(0, 10)
export const formatDay = (iso: string) => {
  const [y, m, d] = dayOf(iso).split('-').map(Number)
  return `${d} ${MONTHS[m - 1]} ${y}`
}
export const MONTH_NAMES = MONTHS

export type Recording =
  | { kind: 'meeting'; item: Meeting; date: string }
  | { kind: 'memo'; item: Memo; date: string }

/** All recordings, newest first. */
export const recordings: Recording[] = [
  ...data.meetings.map((item): Recording => ({ kind: 'meeting', item, date: item.startsAt })),
  ...data.memos.map((item): Recording => ({ kind: 'memo', item, date: item.createdAt })),
].sort((a, b) => b.date.localeCompare(a.date))

/** Actions inherit the date of their meeting; the newest few are tagged "New". */
export const actionDate = (a: { meetingId: string }) => getMeeting(a.meetingId)!.startsAt
export const isNewAction = (a: { meetingId: string }) => {
  const t = (s: string) => new Date(dayOf(s)).getTime()
  return t(recordings[0].date) - t(actionDate(a)) <= 3 * 86400000
}
/** Actions, newest meeting first. */
export const actions = [...data.actions].sort((a, b) => actionDate(b).localeCompare(actionDate(a)))

/** "New" = within 7 days of the newest recording (deterministic, no clock). */
export const isNew = (date: string) => {
  const t = (s: string) => new Date(dayOf(s)).getTime()
  return t(recordings[0].date) - t(date) <= 7 * 86400000
}

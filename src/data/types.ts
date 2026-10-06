export interface Person { id: string; name: string; role: string; external: boolean }
export interface Project { id: string; name: string; description: string; launchDate: string; status: string }
export interface Meeting {
  id: string; title: string; startsAt: string; durationMin: number; participants: string[]
  projectId: string | null; tags: string[]; transcriptId: string | null; summary: string
  /** Notes extracted from the meeting (like Nexo's own meeting notes); each points at a transcript moment. */
  keyPoints: KeyPoint[]
}
export interface KeyPoint {
  kind: 'decision' | 'deadline' | 'metric' | 'risk' | 'action'
  text: string
  /** Start (seconds) of the transcript segment that backs this note. */
  at: number
  topics: string[]
  why?: string
  /** ISO date, for deadlines. */
  due?: string
  owner?: string
  /** A headline fact: preferred when a question is broad. */
  star?: boolean
}
export interface Memo {
  id: string; title: string; createdAt: string; type: string; durationSec: number
  projectId: string | null; tags: string[]; relatedMeetingIds: string[]; content: string
}
export interface Segment { start: number; time: string; speakerId: string; text: string }
export interface Transcript { id: string; meetingId: string; language: string; note: string; segments: Segment[] }
/** A to-do created from a meeting (Figma board 77:4178). The icon follows the kind: calendar, mail or task. */
export interface Action { id: string; title: string; kind: 'calendar' | 'mail' | 'task'; meetingId: string }
export interface MockData {
  user: Person & { company: string; timezone: string }
  project: Project
  people: Person[]
  meetings: Meeting[]
  memos: Memo[]
  transcripts: Transcript[]
  actions: Action[]
}

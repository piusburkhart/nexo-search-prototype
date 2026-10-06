export interface Person { id: string; name: string; role: string; external: boolean }
export interface Project { id: string; name: string; description: string; launchDate: string; status: string }
export interface Meeting {
  id: string; title: string; startsAt: string; durationMin: number; participants: string[]
  projectId: string | null; tags: string[]; transcriptId: string | null; summary: string
}
export interface Memo {
  id: string; title: string; createdAt: string; type: string; durationSec: number
  projectId: string | null; tags: string[]; relatedMeetingIds: string[]; content: string
}
export interface Segment { start: number; time: string; speakerId: string; text: string }
export interface Transcript { id: string; meetingId: string; language: string; note: string; segments: Segment[] }
export interface MockData {
  user: Person & { company: string; timezone: string }
  project: Project
  people: Person[]
  meetings: Meeting[]
  memos: Memo[]
  transcripts: Transcript[]
}

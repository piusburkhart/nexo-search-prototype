import fs from 'node:fs'
import path from 'node:path'

interface Mock {
  meetings: { id: string; title: string; startsAt: string; keyPoints: { at: number }[] }[]
  memos: { id: string; createdAt: string }[]
  transcripts: { id: string; meetingId: string; segments: { start: number; text: string }[] }[]
}
/** The prototype's only data source, read from disk so counts in tests follow the data. */
export const mock: Mock = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/data/mock-data.json'), 'utf8'))
export const inMonth = (iso: string, prefix: string) => iso.startsWith(prefix)

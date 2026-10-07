import { useSyncExternalStore } from 'react'
import type { ExportFile, Source } from './buildPrompt'

/** A handoff the user started: from a search (with the query as request) or from a transcript card. */
export interface HandoffRequest { request: string; category?: string; sources: Source[]; origin: 'search' | 'transcript' }
/** What the simulated chat shows (D87). */
export interface ChatPayload { prompt: string; files: ExportFile[]; category?: string }

interface State { sheet: HandoffRequest | null; chat: ChatPayload | null }
let state: State = { sheet: null, chat: null }
const listeners = new Set<() => void>()
const set = (next: Partial<State>) => { state = { ...state, ...next }; listeners.forEach((l) => l()) }

export const openHandoff = (req: HandoffRequest) => set({ sheet: req })
export const closeHandoff = () => set({ sheet: null })
export const openChat = (chat: ChatPayload) => set({ sheet: null, chat })
export const closeChat = () => set({ chat: null })

export const useHandoff = () => useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb) }, () => state)

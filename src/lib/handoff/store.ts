import { useSyncExternalStore } from 'react'
import type { ExportFile } from './buildPrompt'

/** What the simulated chat shows (D87). */
export interface ChatPayload { prompt: string; files: ExportFile[]; category?: string }

let chat: ChatPayload | null = null
const listeners = new Set<() => void>()
const set = (next: ChatPayload | null) => { chat = next; listeners.forEach((l) => l()) }

export const openChat = (payload: ChatPayload) => set(payload)
export const closeChat = () => set(null)
export const useChat = () => useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb) }, () => chat)

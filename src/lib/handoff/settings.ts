import { useSyncExternalStore } from 'react'
import { MODES, type Mode } from './strategies'

/*
 * The handoff mode for this device (D84): localStorage, so a facilitator sets it once per phone. A link
 * with ?handoff=simulate|share|clipboard|download (before or inside the hash) sets it too.
 */
const KEY = 'nexo-handoff-mode'
const listeners = new Set<() => void>()

export function getMode(): Mode {
  try { const v = localStorage.getItem(KEY) as Mode | null; if (v && MODES.includes(v)) return v } catch { /* ignore */ }
  return 'auto'
}
export function setMode(mode: Mode) {
  try { localStorage.setItem(KEY, mode) } catch { /* private mode: lasts for this page only */ }
  current = mode
  listeners.forEach((l) => l())
}
let current: Mode = getMode()

export const useMode = () => useSyncExternalStore(
  (cb) => { listeners.add(cb); return () => listeners.delete(cb) },
  () => current,
)

/** Read ?handoff= from the URL (query or hash) and save it. Called on start and on hash changes. */
export function applyUrlMode() {
  const fromSearch = new URLSearchParams(window.location.search).get('handoff')
  const fromHash = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('handoff')
  const v = (fromHash ?? fromSearch) as Mode | null
  if (v && MODES.includes(v) && v !== current) setMode(v)
}

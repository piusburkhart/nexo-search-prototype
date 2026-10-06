import { useSyncExternalStore } from 'react'

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}
const snapshot = () => window.location.hash || '#/'

export interface Route { segments: string[]; params: URLSearchParams }

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, snapshot)
  const [path, query = ''] = hash.replace(/^#/, '').split('?')
  return { segments: path.split('/').filter(Boolean), params: new URLSearchParams(query) }
}

export function href(path: string, params?: Record<string, string | undefined>) {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params ?? {})) if (v) q.set(k, v)
  const s = q.toString()
  return `#${path}${s ? `?${s}` : ''}`
}

export function navigate(path: string, params?: Record<string, string | undefined>, replace = false) {
  const h = href(path, params)
  if (replace) window.location.replace(h)
  else window.location.hash = h
}

export function goBack() {
  if (window.history.length > 1) window.history.back()
  else navigate('/')
}

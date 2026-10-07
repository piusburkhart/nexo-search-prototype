import { useSyncExternalStore } from 'react'

/* Short confirmations ("Transcript copied."), announced through an aria-live region (D86). */
let message: { id: number; text: string } | null = null
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setTimeout> | undefined

export function toast(text: string) {
  message = { id: Date.now(), text }
  listeners.forEach((l) => l())
  clearTimeout(timer)
  timer = setTimeout(() => { message = null; listeners.forEach((l) => l()) }, 4000)
}

export function Toaster() {
  const m = useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb) }, () => message)
  return (
    <div role="status" aria-live="polite" className="pointer-events-none absolute inset-x-0 top-[max(env(safe-area-inset-top),12px)] z-[100] flex justify-center px-4 sm:top-[62px]">
      {m && (
        <p key={m.id} data-testid="toast"
          className="rounded-hit border border-gray-200 bg-white px-4 py-3 text-body-m leading-[1.3] text-gray-975 shadow-bar motion-safe:animate-[fade-in_160ms_ease-out]">
          {m.text}
        </p>
      )}
    </div>
  )
}

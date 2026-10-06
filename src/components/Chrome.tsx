import { useEffect, type ReactNode } from 'react'

/**
 * Mobile keyboard handling (D47).
 * iOS slides the whole page up when a focused field would end up under the keyboard. To keep the
 * content still, the search bar is moved to where the keyboard will end *before* the field takes
 * focus (anticipateKeyboard), so iOS has nothing to reveal. --kb is the keyboard height, so docked UI
 * sits right above it; the content itself never depends on it.
 */
const KB_KEY = 'nexo-kb'
const isPhone = () => window.matchMedia('(max-width: 639px) and (pointer: coarse)').matches
let pendingUntil = 0
let updateKeyboard = () => {}

const rememberedKb = () => {
  try { const v = Number(localStorage.getItem(KB_KEY)); if (v > 80) return v } catch { /* ignore */ }
  return Math.round(window.innerHeight * 0.45) // first time: typical iPhone keyboard + accessory bar
}

/** Call synchronously in a tap that will focus the search field. */
export function anticipateKeyboard() {
  if (!isPhone() || document.documentElement.dataset.kb === 'open') return
  pendingUntil = Date.now() + 1500
  document.documentElement.style.setProperty('--kb', `${rememberedKb()}px`)
  document.documentElement.dataset.kb = 'pending'
  setTimeout(() => updateKeyboard(), 1600) // give up if the keyboard never came
}

function useKeyboardInset() {
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const root = document.documentElement
    const update = () => {
      const frame = document.getElementById('phone-frame')
      if (!frame || !isPhone()) { root.style.setProperty('--kb', '0px'); root.dataset.kb = 'closed'; return }
      const inset = Math.max(0, Math.round(frame.offsetHeight - vv.height))
      if (inset > 80) {
        root.style.setProperty('--kb', `${inset}px`)
        root.dataset.kb = 'open'
        pendingUntil = 0
        try { localStorage.setItem(KB_KEY, String(inset)) } catch { /* ignore */ }
      } else if (Date.now() > pendingUntil) {
        root.style.setProperty('--kb', '0px')
        root.dataset.kb = 'closed'
      }
    }
    // Safety net: if iOS still scrolls the page, put it straight back.
    const unscroll = () => { if (isPhone() && (window.scrollY || vv.offsetTop)) window.scrollTo(0, 0) }
    updateKeyboard = update
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', unscroll)
    window.addEventListener('scroll', unscroll)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', unscroll)
      window.removeEventListener('scroll', unscroll)
    }
  }, [])
}

/** Phone-sized stage: full-screen on phones (D15, D24), framed 402x874 on larger screens. */
export function PhoneFrame({ children }: { children: ReactNode }) {
  useKeyboardInset()
  return (
    <div className="sm:flex sm:min-h-dvh sm:items-center sm:justify-center sm:bg-gray-200 sm:p-4">
      {/* One persistent fixed strip at the top edge whose colour follows the screen: iOS tints its status
          bar from the fixed element there and re-reads it when that element's colour changes. */}
      <div id="status-strip" aria-hidden="true" style={{ background: 'var(--screen-bg, var(--color-gray-50))' }}
        className="fixed inset-x-0 top-0 z-[60] h-1.5 sm:hidden" />
      <div id="phone-frame" className="fixed inset-0 overflow-hidden bg-gray-50 sm:relative sm:inset-auto sm:h-[874px] sm:w-[402px] sm:rounded-[44px] sm:shadow-dock">
        {children}
      </div>
    </div>
  )
}

export function StatusBar() {
  return (
    <div className="hidden h-[62px] shrink-0 items-center justify-between px-6 pt-[21px] pb-[19px] sm:flex" aria-hidden="true">
      <span className="flex-1 text-center text-[17px] leading-[22px] font-semibold">9:41</span>
      <span className="flex flex-1 items-center justify-center gap-[7px]">
        <svg width="19" height="12" viewBox="0 0 19 12" fill="currentColor"><rect y="8" width="3" height="4" rx="1" /><rect x="5" y="5" width="3" height="7" rx="1" /><rect x="10" y="2.5" width="3" height="9.5" rx="1" /><rect x="15" width="3" height="12" rx="1" /></svg>
        <svg width="17" height="12" viewBox="0 0 17 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1.5 4.2a10 10 0 0 1 14 0M4 7a6.5 6.5 0 0 1 9 0" /><circle cx="8.5" cy="10" r="1" fill="currentColor" stroke="none" /></svg>
        <svg width="27" height="13" viewBox="0 0 27 13" fill="none"><rect x=".5" y=".5" width="23" height="12" rx="3.5" stroke="currentColor" opacity=".4" /><rect x="2" y="2" width="20" height="9" rx="2.5" fill="currentColor" /><rect x="25" y="4.5" width="1.6" height="4" rx=".8" fill="currentColor" opacity=".4" /></svg>
      </span>
    </div>
  )
}

/** Full-height screen: status bar (framed desktop view only) + scrollable body + optional docked footer. */
export function Screen({ children, dock, tone = 'gray-50' }: { children: ReactNode; dock?: ReactNode; tone?: 'gray-50' | 'gray-200' }) {
  // The browser's status bar takes this colour so it blends into the screen (theme-color).
  useEffect(() => {
    const color = getComputedStyle(document.documentElement).getPropertyValue(`--color-${tone}`).trim()
    // Replace the tag rather than edit it: Safari re-reads a fresh theme-color more reliably.
    document.querySelectorAll('meta[name=theme-color]').forEach((m) => m.remove())
    const meta = document.createElement('meta')
    meta.name = 'theme-color'
    meta.content = color
    document.head.appendChild(meta)
    document.documentElement.style.setProperty('--screen-bg', color)
    document.documentElement.style.background = color
    document.body.style.background = color
  }, [tone])
  const bg = tone === 'gray-200' ? 'bg-gray-200' : 'bg-gray-50'
  return (
    <div className={`absolute inset-0 flex flex-col pt-[max(env(safe-area-inset-top),12px)] sm:pt-0 ${bg}`}>
      <StatusBar />
      {children}
      {dock}
    </div>
  )
}

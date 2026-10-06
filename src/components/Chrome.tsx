import { useEffect, type ReactNode } from 'react'

/**
 * Mobile keyboard handling. iOS does not resize the layout viewport for the keyboard; it pans the
 * visual viewport instead, which would push the whole page up. So:
 *  - the frame is translated by the pan offset, so the content stays where it was;
 *  - --kb is the keyboard height inside the frame, so docked UI can sit right above it.
 */
function useKeyboardInset() {
  useEffect(() => {
    const vv = window.visualViewport
    const phone = window.matchMedia('(max-width: 639px)')
    if (!vv) return
    const update = () => {
      const frame = document.getElementById('phone-frame')
      const root = document.documentElement
      if (frame && !phone.matches) frame.style.transform = ''
      if (!frame || !phone.matches) { root.style.setProperty('--kb', '0px'); root.dataset.kb = 'closed'; return }
      frame.style.transform = `translateY(${Math.round(vv.offsetTop)}px)`
      const inset = Math.max(0, Math.round(frame.offsetHeight - vv.height))
      const open = inset > 80
      root.style.setProperty('--kb', `${open ? inset : 0}px`)
      root.dataset.kb = open ? 'open' : 'closed'
    }
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => { vv.removeEventListener('resize', update); vv.removeEventListener('scroll', update) }
  }, [])
}

/** Phone-sized stage: full-screen on phones (D15, D24), framed 402x874 on larger screens. */
export function PhoneFrame({ children }: { children: ReactNode }) {
  useKeyboardInset()
  return (
    <div className="sm:flex sm:min-h-dvh sm:items-center sm:justify-center sm:bg-gray-200 sm:p-4">
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
    document.documentElement.style.background = color
    document.body.style.background = color
  }, [tone])
  const bg = tone === 'gray-200' ? 'bg-gray-200' : 'bg-gray-50'
  return (
    <div className={`absolute inset-0 flex flex-col pt-[max(env(safe-area-inset-top),12px)] sm:pt-0 ${bg}`}>
      {/* iOS tints the status bar from the fixed element at the top edge, so give it the screen's colour */}
      <div aria-hidden="true" className={`fixed inset-x-0 top-0 z-50 h-[env(safe-area-inset-top)] sm:hidden ${bg}`} />
      <StatusBar />
      {children}
      {dock}
    </div>
  )
}

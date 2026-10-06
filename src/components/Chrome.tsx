import { useEffect, type ReactNode } from 'react'

/**
 * Exposes the on-screen keyboard height as --kb (px) so docked UI can sit right above it.
 * iOS does not resize the layout viewport for the keyboard, so use the visual viewport.
 */
function useKeyboardInset() {
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => {
      const inset = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))
      const open = inset > 80
      document.documentElement.style.setProperty('--kb', `${open ? inset : 0}px`)
      document.documentElement.dataset.kb = open ? 'open' : 'closed'
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
      <div className="fixed inset-0 overflow-hidden bg-gray-50 sm:relative sm:inset-auto sm:h-[874px] sm:w-[402px] sm:rounded-[44px] sm:shadow-dock">
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
export function Screen({ children, dock, bg = 'bg-gray-50' }: { children: ReactNode; dock?: ReactNode; bg?: string }) {
  return (
    <div className={`absolute inset-0 flex flex-col pt-[max(env(safe-area-inset-top),12px)] sm:pt-0 ${bg}`}>
      <StatusBar />
      {children}
      {dock}
    </div>
  )
}

import type { ReactNode } from 'react'

/** Phone-sized stage: full-bleed on phones, framed 402x874 on larger screens (D15). */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center sm:bg-gray-200 sm:p-4">
      <div className="relative h-dvh w-full max-w-[402px] overflow-hidden bg-gray-50 sm:h-[874px] sm:rounded-[44px] sm:shadow-dock">
        {children}
      </div>
    </div>
  )
}

export function StatusBar() {
  return (
    <div className="flex h-[62px] shrink-0 items-center justify-between px-6 pt-[21px] pb-[19px]" aria-hidden="true">
      <span className="flex-1 text-center text-[17px] leading-[22px] font-semibold">9:41</span>
      <span className="flex flex-1 items-center justify-center gap-[7px]">
        <svg width="19" height="12" viewBox="0 0 19 12" fill="currentColor"><rect y="8" width="3" height="4" rx="1" /><rect x="5" y="5" width="3" height="7" rx="1" /><rect x="10" y="2.5" width="3" height="9.5" rx="1" /><rect x="15" width="3" height="12" rx="1" /></svg>
        <svg width="17" height="12" viewBox="0 0 17 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1.5 4.2a10 10 0 0 1 14 0M4 7a6.5 6.5 0 0 1 9 0" /><circle cx="8.5" cy="10" r="1" fill="currentColor" stroke="none" /></svg>
        <svg width="27" height="13" viewBox="0 0 27 13" fill="none"><rect x=".5" y=".5" width="23" height="12" rx="3.5" stroke="currentColor" opacity=".4" /><rect x="2" y="2" width="20" height="9" rx="2.5" fill="currentColor" /><rect x="25" y="4.5" width="1.6" height="4" rx=".8" fill="currentColor" opacity=".4" /></svg>
      </span>
    </div>
  )
}

/** Full-height screen: status bar + scrollable body + optional docked footer. */
export function Screen({ children, dock, bg = 'bg-gray-50' }: { children: ReactNode; dock?: ReactNode; bg?: string }) {
  return (
    <div className={`absolute inset-0 flex flex-col ${bg}`}>
      <StatusBar />
      {children}
      {dock}
    </div>
  )
}

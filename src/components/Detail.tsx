import type { ReactNode } from 'react'
import { Screen } from './Chrome'
import { BackIcon } from './Icons'
import { goBack } from '../router'

/** Shared shell for detail screens (D10: not in Figma). */
export function DetailScreen({ title, meta, children, sticky }: { title: string; meta?: ReactNode; children: ReactNode; sticky?: ReactNode }) {
  return (
    <Screen>
      <header className="flex flex-col gap-3 px-4 pb-4">
        <button onClick={goBack} aria-label="Back" className="flex size-[46px] items-center justify-center rounded-pill bg-white shadow-pill"><BackIcon /></button>
        <h1 className="px-2 text-heading-xl leading-[1.2] tracking-heading" data-testid="detail-title">{title}</h1>
        {meta && <div className="px-2 text-body-m text-gray-800">{meta}</div>}
        {sticky}
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-10">{children}</main>
    </Screen>
  )
}

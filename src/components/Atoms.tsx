import type React from 'react'
import type { ReactNode } from 'react'
import { getPerson, initials } from '../data'

export function Chip({ label, selected, dot, count, onClick }: {
  label: string; selected?: boolean; dot?: boolean; count?: number; onClick?: () => void
}) {
  return (
    <span className="flex items-start">
      <button onClick={onClick} aria-pressed={selected}
        className={`rounded-pill border px-3 py-2.5 text-body-m leading-[0.9] tracking-heading ${
          selected ? 'border-gray-975 bg-gray-975 text-gray-50' : 'border-gray-600 bg-transparent text-gray-975'}`}>
        {label}{count !== undefined && <span className="ml-1.5 text-gray-700">{count}</span>}
      </button>
      {dot && <span className="-ml-0.5 size-2.5 rounded-pill bg-new" />}
    </span>
  )
}

export const NewTag = ({ small = false }: { small?: boolean }) => (
  <span className={`inline-flex items-center self-start text-body-s leading-[0.9] text-gray-950 bg-new ${small ? 'h-[19px] rounded-[4.4px] px-1.5' : 'h-6 rounded-tag px-2 text-black'}`}>New</span>
)

export const SectionLabel = ({ children }: { children: ReactNode }) => (
  <h2 className="px-2 text-heading-xs leading-[1.24] tracking-heading text-gray-800">{children}</h2>
)

const COLORS = ['bg-accent-blue text-gray-50', 'bg-accent-orange text-gray-975', 'bg-gray-975 text-gray-50']
export function AvatarStack({ ids }: { ids: string[] }) {
  const shown = ids.slice(0, 2)
  const more = ids.length - shown.length
  return (
    <span className="flex items-center" aria-label={ids.map((i) => getPerson(i)?.name).join(', ')}>
      {shown.map((id, i) => (
        <span key={id} className={`-mr-2 flex size-5 items-center justify-center rounded-pill border border-gray-50 text-[9px] ${COLORS[i % 3]}`}>
          {initials(id)[0]}
        </span>
      ))}
      {more > 0 && (
        <span className="flex h-5 w-6 items-center justify-center rounded-pill border border-gray-50 bg-accent-orange text-[10px] text-gray-975">+{more}</span>
      )}
    </span>
  )
}

export function EmptyState({ query }: { query: string }) {
  return (
    <div role="status" data-testid="empty-state" className="mx-auto mt-16 max-w-[280px] text-center">
      <p className="font-serif text-heading-m leading-[1.3] tracking-heading text-gray-950">No results for “{query}”</p>
      <p className="mt-2 text-body-m text-gray-700">Try a different word or check the spelling.</p>
    </div>
  )
}

/**
 * Buttons for the handoff (D86): primary is the black pill of AI Synthesis, secondary the outlined chip.
 * At least 44px tall for touch.
 */
export function Button({ variant = 'primary', className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' }) {
  return <button {...props} className={`${BUTTON[variant]} ${className}`} />
}
export const BUTTON = {
  primary: 'inline-flex min-h-11 items-center justify-center gap-2 rounded-pill bg-gray-975 px-5 text-heading-xs leading-[1.2] tracking-heading text-gray-50 disabled:bg-gray-300 disabled:cursor-not-allowed',
  secondary: 'inline-flex min-h-11 items-center justify-center gap-2 rounded-pill border border-gray-600 bg-transparent px-5 text-heading-xs leading-[1.2] tracking-heading text-gray-975',
} as const

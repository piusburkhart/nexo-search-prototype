import { useRef, type ReactNode } from 'react'
import { CalendarIcon, ChecklistIcon, CloseIcon, FilterIcon, RecordIcon, SearchIcon } from './Icons'

/** Home bottom bar (Figma 72:1749): tabs pill + search button. */
export function TabBar({ onSearch }: { onSearch: () => void }) {
  return (
    <nav className="absolute inset-x-0 bottom-0 h-[98px] bg-gradient-to-t from-gray-200 via-gray-200/90 to-transparent">
      <div className="absolute top-[30px] left-5 flex h-[62px] -translate-y-3.5 items-center rounded-pill bg-white p-1 shadow-dock">
        <button className="flex w-[112px] flex-col items-center gap-0.5 rounded-pill bg-gray-975 px-2 py-1.5 text-[10px] leading-3 font-medium text-white">
          <RecordIcon className="size-6" />Recordings
        </button>
        <button className="flex w-[112px] flex-col items-center gap-0.5 px-2 py-1.5 text-[10px] leading-3 font-medium text-gray-975">
          <ChecklistIcon className="size-6" />Actions
        </button>
      </div>
      <button onClick={onSearch} aria-label="Search"
        className="absolute top-4 right-5 flex size-[62px] items-center justify-center rounded-pill bg-white shadow-dock">
        <SearchIcon className="size-6" />
      </button>
    </nav>
  )
}

const escRe = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Search field + close button (Figma 72:2686). A selected tag is a word in the text with a grey
 * background (72:2345). The input is transparent over a mirror layer that paints that background.
 */
export function SearchBar({ value, onChange, onClose, tagWords = [], placeholder = 'Search anything' }: {
  value: string; onChange: (v: string) => void; onClose: () => void
  tagWords?: string[]; placeholder?: string
}) {
  const mirror = useRef<HTMLDivElement>(null)
  const sync = (el: HTMLInputElement) => { if (mirror.current) mirror.current.scrollLeft = el.scrollLeft }
  const re = tagWords.length ? new RegExp(`(?<![\\p{L}\\p{N}])(${tagWords.map(escRe).join('|')})(?![\\p{L}\\p{N}])`, 'giu') : null
  const parts = re ? value.split(re) : [value]
  const text = 'text-heading-xs tracking-heading leading-[24px] whitespace-pre'
  return (
    <div className="flex items-center gap-3 px-5 pb-6">
      <label className="flex h-12 min-w-0 flex-1 items-center rounded-pill bg-white px-[19px] shadow-pill">
        <SearchIcon className={`mr-2 size-4 shrink-0 text-gray-600 ${value ? 'hidden' : ''}`} />
        <span className="relative h-6 min-w-0 flex-1">
          <div ref={mirror} aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${text}`}>
            {parts.map((p, i) => i % 2
              ? <mark key={i} data-testid="tag-word" className="rounded-tag bg-gray-200 text-gray-975 shadow-[0_0_0_3px_var(--color-gray-200)]">{p}</mark>
              : <span key={i}>{p}</span>)}
          </div>
          <input autoFocus value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
            aria-label="Search" type="search" enterKeyHint="search" onScroll={(e) => sync(e.currentTarget)}
            onKeyUp={(e) => sync(e.currentTarget)} onSelect={(e) => sync(e.currentTarget)}
            className={`absolute inset-0 w-full bg-transparent p-0 outline-none placeholder:text-gray-600 [&::-webkit-search-cancel-button]:hidden ${text.replace('whitespace-pre', '')} ${value ? 'caret-gray-975' : ''}`}
            style={value ? { WebkitTextFillColor: 'transparent' } : undefined} />
          {/* typed text is always drawn by the mirror layer so tag words can carry a background */}
        </span>
        <FilterIcon className="ml-2 h-[11px] w-[17px] shrink-0 text-gray-600" />
      </label>
      <button onClick={onClose} aria-label="Close search"
        className="flex size-12 shrink-0 items-center justify-center rounded-pill bg-white shadow-pill"><CloseIcon /></button>
    </div>
  )
}

export interface TagRow { id: string; label: string; count: number; icon: ReactNode }

/** Stacked tag suggestions in one white card (Figma 72:1957). Selected tags are removed from it. */
export function TagCard({ rows, onPick }: { rows: TagRow[]; onPick: (id: string) => void }) {
  return (
    <ul className="w-[145px] rounded-hit bg-white px-4 py-2 shadow-pill" aria-label="Filter tags">
      {rows.map((r) => (
        <li key={r.id}>
          <button onClick={() => onPick(r.id)} data-testid={`tag-${r.id}`}
            className="flex h-9 w-full items-center gap-2 text-body-m font-medium">
            {r.icon}<span>{r.label}</span><span className="ml-auto font-normal">{r.count}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

/** Date suggestion pill (Figma 72:2345): calendar, date text, count. */
export function DatePill({ label, count, onClick }: { label: string; count: number; onClick: () => void }) {
  return (
    <button onClick={onClick} data-testid="date-tag"
      className="flex h-[46px] items-center gap-3 rounded-pill bg-white px-4 text-body-m shadow-pill">
      <CalendarIcon />{label}<span className="ml-2">{count}</span>
    </button>
  )
}

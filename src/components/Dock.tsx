import type { ReactNode } from 'react'
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

export interface InputChip { id: string; label: string }

/** Search field + close button (Figma 72:2686). Selected tags sit inside the field as grey chips (72:2345). */
export function SearchBar({ value, onChange, onClose, chips = [], onRemoveChip, placeholder = 'Search anything' }: {
  value: string; onChange: (v: string) => void; onClose: () => void
  chips?: InputChip[]; onRemoveChip?: (id: string) => void; placeholder?: string
}) {
  return (
    <div className="flex items-center gap-3 px-5 pb-6">
      <label className="flex min-h-12 min-w-0 flex-1 items-center rounded-pill bg-white px-[19px] shadow-pill">
        <SearchIcon className={`mr-2 size-4 shrink-0 text-gray-600 ${value || chips.length ? 'hidden' : ''}`} />
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1 gap-y-1 py-2">
          <input autoFocus value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
            aria-label="Search" type="search" enterKeyHint="search"
            onKeyDown={(e) => { if (e.key === 'Backspace' && !value && chips.length) onRemoveChip?.(chips[chips.length - 1].id) }}
            style={{ width: value ? `${value.length + 1}ch` : chips.length ? '2ch' : '100%' }}
            className="min-w-[2ch] max-w-full bg-transparent text-heading-xs tracking-heading outline-none placeholder:text-gray-600 [&::-webkit-search-cancel-button]:hidden" />
          {chips.map((c) => (
            <button key={c.id} type="button" onClick={() => onRemoveChip?.(c.id)} data-testid={`chip-${c.id}`}
              aria-label={`Remove ${c.label} filter`}
              className="rounded-tag bg-gray-200 px-2 py-1 text-heading-xs leading-[1.2] tracking-heading">{c.label}</button>
          ))}
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

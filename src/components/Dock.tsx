import { ChecklistIcon, CloseIcon, FilterIcon, RecordIcon, SearchIcon } from './Icons'

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

/** Search field + close button (Figma 72:2686). Docked to the bottom of the screen. */
export function SearchBar({ value, onChange, onClose, placeholder = 'Search anything' }: {
  value: string; onChange: (v: string) => void; onClose: () => void; placeholder?: string
}) {
  return (
    <div className="flex items-center gap-3 px-5 pb-6">
      <label className="flex h-12 flex-1 items-center rounded-pill bg-white px-[19px] shadow-pill">
        <SearchIcon className={`mr-2 size-4 text-gray-600 ${value ? 'hidden' : ''}`} />
        <input autoFocus value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          aria-label="Search" type="search" enterKeyHint="search"
          className="min-w-0 flex-1 bg-transparent text-heading-xs tracking-heading outline-none placeholder:text-gray-600 [&::-webkit-search-cancel-button]:hidden" />
        <FilterIcon className="ml-2 h-[11px] w-[17px] text-gray-600" />
      </label>
      <button onClick={onClose} aria-label="Close search"
        className="flex size-12 items-center justify-center rounded-pill bg-white shadow-pill"><CloseIcon /></button>
    </div>
  )
}

/** Filter tag shown above the search bar (Figma 72:1957 popover); green when selected. */
export function SearchTag({ label, count, selected, icon, onClick }: {
  label: string; count: number; selected: boolean; icon: React.ReactNode; onClick: () => void
}) {
  return (
    <button onClick={onClick} aria-pressed={selected} data-testid={`tag-${label.toLowerCase()}`}
      className={`flex h-[46px] items-center gap-2 rounded-pill px-4 text-body-m font-medium shadow-pill ${selected ? 'bg-new' : 'bg-white'}`}>
      {icon}{label}<span className="ml-1 font-normal">{count}</span>
    </button>
  )
}

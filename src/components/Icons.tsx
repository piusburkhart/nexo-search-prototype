import type { ReactNode } from 'react'

type P = { className?: string }
const Svg = ({ children, className = 'size-[18px]', fill = false }: P & { children: ReactNode; fill?: boolean }) => (
  <svg viewBox="0 0 24 24" className={className} fill={fill ? 'currentColor' : 'none'} stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
)

export const MicIcon = (p: P) => <Svg {...p}><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></Svg>
export const ChatIcon = (p: P) => <Svg {...p}><path d="M4 5h16v11H9l-5 4z" /></Svg>
export const FolderIcon = (p: P) => <Svg {...p}><path d="M3 6h6l2 2h10v11H3z" /></Svg>
export const SearchIcon = (p: P) => <Svg {...p}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></Svg>
export const CloseIcon = (p: P) => <Svg {...p}><path d="m6 6 12 12M18 6 6 18" /></Svg>
export const CalendarIcon = (p: P) => <Svg {...p}><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></Svg>
export const SparkleIcon = (p: P) => <Svg {...p}><path d="M12 3c.6 4.5 2.5 6.4 7 7-4.5.6-6.4 2.5-7 7-.6-4.5-2.5-6.4-7-7 4.5-.6 6.4-2.5 7-7zM19 16c.2 1.7.8 2.3 2.5 2.5-1.7.2-2.3.8-2.5 2.5-.2-1.7-.8-2.3-2.5-2.5 1.7-.2 2.3-.8 2.5-2.5z" /></Svg>
/** Sparkle with its viewBox cropped to its own bounds, so it sits optically centred in a button. */
export const SparkleCenteredIcon = ({ className = 'size-[17px]' }: P) => (
  <svg viewBox="3.75 2.75 19 19" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3c.6 4.5 2.5 6.4 7 7-4.5.6-6.4 2.5-7 7-.6-4.5-2.5-6.4-7-7 4.5-.6 6.4-2.5 7-7zM19 16c.2 1.7.8 2.3 2.5 2.5-1.7.2-2.3.8-2.5 2.5-.2-1.7-.8-2.3-2.5-2.5 1.7-.2 2.3-.8 2.5-2.5z" />
  </svg>
)
export const FilterIcon = ({ className = 'w-[17px] h-[11px]' }: P) => (
  <svg viewBox="0 0 17 11" className={className} aria-hidden="true">
    <g fill="currentColor"><rect width="17" height="2" rx="1" /><rect x="3" y="4.5" width="11" height="2" rx="1" /><rect x="6" y="9" width="5" height="2" rx="1" /></g>
  </svg>
)
export const RecordIcon = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.5" fill="currentColor" /></Svg>
export const ChecklistIcon = (p: P) => <Svg {...p}><path d="M6 3h9l4 4v14H6z" /><path d="m9.5 13 2 2 3.5-4" /></Svg>
export const MailIcon = (p: P) => <Svg {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3.5 7 8.5 6.5L20.5 7" /></Svg>
export const CheckCircleIcon = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="m8 12.5 2.8 2.8L16.5 9.5" /></Svg>
export const WaveIcon = (p: P) => <Svg {...p}><path d="M4 10v4M8 6v12M12 3v18M16 8v8M20 11v2" /></Svg>
/* Continue in Claude (D86): drawn in the same 24px, 1.8 stroke style as the icons above. */
export const ArrowUpIcon = (p: P) => <Svg {...p}><path d="M12 19V5M6 11l6-6 6 6" /></Svg>
export const ChevronLeftIcon = (p: P) => <Svg {...p}><path d="m15 6-6 6 6 6" /></Svg>
export const FileIcon = (p: P) => <Svg {...p}><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4M10 12h5M10 16h5" /></Svg>

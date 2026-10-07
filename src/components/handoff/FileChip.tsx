import { useId, useState } from 'react'
import { ChevronDownIcon, CloseIcon, FileIcon } from '../Icons'
import { copy } from '../../content/handoff-copy'
import { formatSize, longDate, type ExportFile } from '../../lib/handoff/buildPrompt'

const sourceLine = (f: ExportFile) => {
  const s = f.source
  return `${s.kind === 'meeting' ? 'Meeting' : 'Memo'} · ${s.item.title} · ${longDate(s.kind === 'meeting' ? s.item.startsAt : s.item.createdAt)}`
}

/** An attachment: file name, its source and size, a preview to expand, and a remove button (D86). */
export function FileChip({ file, onRemove, compact = false }: { file: ExportFile; onRemove?: () => void; compact?: boolean }) {
  const [open, setOpen] = useState(false)
  const previewId = useId()
  if (compact) {
    return (
      <li data-testid="file-chip" data-name={file.name} className="flex min-w-0 items-center gap-1.5 rounded-tag border border-gray-200 bg-white px-2 py-1.5">
        <FileIcon className="size-4 shrink-0 text-gray-800" />
        <span data-testid="file-name" className="truncate text-body-s leading-[1.3] text-gray-975">{file.name}</span>
        <span className="shrink-0 text-body-s text-gray-700">{formatSize(file.bytes)}</span>
      </li>
    )
  }
  return (
    <li data-testid="file-chip" data-name={file.name} className="rounded-hit border border-gray-200 bg-white">
      <div className="flex items-center gap-2 py-1 pl-3">
        <FileIcon className="size-5 shrink-0 text-gray-800" />
        <div className="min-w-0 flex-1">
          <p data-testid="file-name" className="text-body-m leading-[1.3] break-all text-gray-975">{file.name}</p>
          <p className="truncate text-body-s leading-[1.3] text-gray-700">{sourceLine(file)} · {formatSize(file.bytes)}</p>
        </div>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls={previewId}
          aria-label={`${open ? copy.sheet.hidePreview : copy.sheet.preview}: ${file.name}`}
          className="flex size-11 shrink-0 items-center justify-center rounded-pill text-gray-800">
          <ChevronDownIcon className={`size-5 motion-safe:transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {onRemove && (
          <button type="button" onClick={onRemove} aria-label={copy.sheet.remove(file.name)} data-testid="remove-file"
            className="flex size-11 shrink-0 items-center justify-center rounded-pill text-gray-800">
            <CloseIcon className="size-5" />
          </button>
        )}
      </div>
      {open && (
        <pre id={previewId} data-testid="file-preview" tabIndex={0}
          className="mx-3 mb-3 max-h-48 overflow-auto rounded-tag bg-gray-50 p-3 font-sans text-body-s leading-[1.4] whitespace-pre-wrap text-gray-800">
          {file.text}
        </pre>
      )}
    </li>
  )
}

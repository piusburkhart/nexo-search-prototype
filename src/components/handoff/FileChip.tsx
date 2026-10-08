import { FileIcon } from '../Icons'
import { formatSize, type ExportFile } from '../../lib/handoff/buildPrompt'

/** An attached file in the simulated chat: name and size. */
export function FileChip({ file }: { file: ExportFile }) {
  return (
    <li data-testid="file-chip" data-name={file.name} className="flex min-w-0 items-center gap-1.5 rounded-tag border border-gray-200 bg-white px-2 py-1.5">
      <FileIcon className="size-4 shrink-0 text-gray-800" />
      <span data-testid="file-name" className="truncate text-body-s leading-[1.3] text-gray-975">{file.name}</span>
      <span className="shrink-0 text-body-s text-gray-700">{formatSize(file.bytes)}</span>
    </li>
  )
}

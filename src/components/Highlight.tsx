import { Fragment } from 'react'

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Wraps case-insensitive occurrences of any term in <mark>. */
export function Highlight({ text, terms }: { text: string; terms: string[] }) {
  const ts = terms.filter(Boolean)
  if (!ts.length) return <>{text}</>
  const re = new RegExp(`(${ts.sort((a, b) => b.length - a.length).map(esc).join('|')})`, 'gi')
  return (
    <>
      {text.split(re).map((part, i) =>
        i % 2 ? (
          <mark key={i} className="rounded-mark bg-highlight text-inherit">{part}</mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  )
}

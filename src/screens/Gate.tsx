import { useState } from 'react'
import { Screen } from '../components/Chrome'

/** SHA-256 of the password (client-side gate only: keeps casual visitors out, not a real security boundary). */
const HASH = '88c7f08d0be5407e361c165b1b84fdf5ae2f8cb7f76195c8d309330bd7b61527'
const KEY = 'nexo-auth'

const sha256 = async (text: string) =>
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))]
    .map((b) => b.toString(16).padStart(2, '0')).join('')

export const isUnlocked = () => {
  try { return localStorage.getItem(KEY) === HASH } catch { return false }
}

export default function Gate({ onUnlock }: { onUnlock: () => void }) {
  const [value, setValue] = useState('')
  const [wrong, setWrong] = useState(false)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((await sha256(value)) === HASH) {
      try { localStorage.setItem(KEY, HASH) } catch { /* private mode: stay unlocked for this session only */ }
      onUnlock()
    } else setWrong(true)
  }
  return (
    <Screen>
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col justify-center gap-6 px-6 pb-[20vh]">
        <h1 className="text-heading-xl leading-[1.2] tracking-heading">Nexo</h1>
        <p className="-mt-3 text-heading-xs tracking-heading text-gray-800">Enter the password to open the prototype.</p>
        <label className="flex h-12 items-center rounded-pill bg-white px-[19px] shadow-pill">
          <input type="password" autoFocus value={value} aria-label="Password" placeholder="Password"
            autoComplete="current-password" onChange={(e) => { setValue(e.target.value); setWrong(false) }}
            className="min-w-0 flex-1 bg-transparent text-heading-xs tracking-heading outline-none placeholder:text-gray-600" />
        </label>
        {wrong && <p role="alert" className="-mt-3 px-2 text-body-m text-gray-800">Wrong password</p>}
        <button type="submit" className="h-12 rounded-pill bg-gray-975 text-center text-heading-xs tracking-heading text-gray-50">Open</button>
      </form>
    </Screen>
  )
}

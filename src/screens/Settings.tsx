import { useMemo } from 'react'
import { Screen } from '../components/Chrome'
import { SectionLabel } from '../components/Atoms'
import { ChevronLeftIcon } from '../components/Icons'
import { copy } from '../content/handoff-copy'
import { navigate } from '../router'
import { setMode, useMode } from '../lib/handoff/settings'
import { detectEnv, MODES, resolveStrategy } from '../lib/handoff/strategies'

const yes = (b: boolean) => (b ? 'yes' : 'no')

/** Hidden prototype settings (D84): the handoff mode for this device, and why a strategy is picked. */
export default function Settings() {
  const mode = useMode()
  const env = useMemo(detectEnv, [])
  const auto = resolveStrategy('auto', env)
  const now = resolveStrategy(mode, env)
  const rows: [string, string][] = [
    ['navigator.share', yes(env.hasShare)],
    ['canShare({ files })', yes(env.canShareFiles)],
    ['Clipboard API', yes(env.clipboardApi)],
    ['Secure context (https)', yes(env.secureContext)],
    ['Platform guess', `${env.platform}${env.mobile ? ', mobile' : ''}`],
    ['Opened from home screen', yes(env.standalone)],
    ['Online', yes(env.online)],
    ['Auto would use', auto.id],
    ['Current mode uses', `${now.id}${now.fellBack ? ' (share unavailable)' : ''}`],
    ['User agent', navigator.userAgent],
  ]
  return (
    <Screen>
      <header className="flex items-center gap-1 px-2 pb-2">
        <button type="button" onClick={() => (history.length > 1 ? history.back() : navigate('/'))}
          className="flex min-h-11 items-center gap-1 rounded-pill px-2 text-body-m text-gray-975">
          <ChevronLeftIcon className="size-5" />{copy.settings.back}
        </button>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-10" data-testid="settings">
        <h1 className="px-2 text-heading-xl leading-[1.2] tracking-heading">{copy.settings.title}</h1>
        <p className="mt-2 px-2 text-body-m leading-[1.4] text-gray-800">{copy.settings.intro}</p>

        <fieldset className="mt-6">
          <legend className="contents"><SectionLabel>{copy.settings.modeHeading}</SectionLabel></legend>
          <div className="mt-2 flex flex-col rounded-hit border border-gray-200 bg-white">
            {MODES.map((m) => (
              <label key={m} className="flex min-h-11 cursor-pointer items-start gap-3 border-b border-gray-200 px-4 py-3 last:border-b-0">
                <input type="radio" name="handoff-mode" value={m} checked={mode === m} onChange={() => setMode(m)}
                  data-testid={`mode-${m}`} className="mt-0.5 size-5 shrink-0 accent-gray-975" />
                <span>
                  <span className="block text-heading-xs leading-[1.3] tracking-heading text-gray-975">{copy.settings.modes[m].label}</span>
                  <span className="block text-body-s leading-[1.4] text-gray-700">{copy.settings.modes[m].hint}</span>
                </span>
              </label>
            ))}
          </div>
          <p className="mt-2 px-2 text-body-s leading-[1.4] text-gray-700">{copy.settings.urlHint}</p>
        </fieldset>

        <div className="mt-6">
          <SectionLabel>{copy.settings.debugHeading}</SectionLabel>
          <dl data-testid="debug-info" className="mt-2 rounded-hit border border-gray-200 bg-white px-4 py-2">
            {rows.map(([k, v]) => (
              <div key={k} className="flex gap-3 border-b border-gray-200 py-2 last:border-b-0">
                <dt className="w-[45%] shrink-0 text-body-s leading-[1.4] text-gray-700">{k}</dt>
                <dd className="min-w-0 text-body-s leading-[1.4] break-words text-gray-975">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </main>
    </Screen>
  )
}

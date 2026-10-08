import { describe, expect, it } from 'vitest'
import { resolveStrategy, type HandoffEnv } from './strategies'

const env = (o: Partial<HandoffEnv>): HandoffEnv => ({
  hasShare: false, canShareFiles: false, clipboardApi: true, secureContext: true,
  platform: 'desktop', mobile: false, standalone: false, online: true, ...o,
})

describe('handoff ladder', () => {
  it('auto is clipboard + link everywhere: one tap, no app picker, even where files can be shared', () => {
    for (const e of [env({}), env({ mobile: true }), env({ mobile: true, platform: 'ios', hasShare: true, canShareFiles: true })]) {
      expect(resolveStrategy('auto', e)).toEqual({ id: 'clipboard' })
    }
  })
  it('manual share falls back to clipboard when files cannot be shared', () => {
    expect(resolveStrategy('share', env({}))).toEqual({ id: 'clipboard', fellBack: 'share-unavailable' })
    expect(resolveStrategy('share', env({ canShareFiles: true }))).toEqual({ id: 'share' })
  })
  it('manual modes are used as chosen', () => {
    for (const m of ['clipboard', 'download', 'simulate'] as const) expect(resolveStrategy(m, env({})).id).toBe(m)
  })
})

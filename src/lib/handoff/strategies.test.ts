import { describe, expect, it } from 'vitest'
import { resolveStrategy, type HandoffEnv } from './strategies'

const env = (o: Partial<HandoffEnv>): HandoffEnv => ({
  hasShare: false, canShareFiles: false, clipboardApi: true, secureContext: true,
  platform: 'desktop', mobile: false, standalone: false, online: true, ...o,
})

describe('handoff ladder', () => {
  it('auto: share sheet on a phone that can share files', () => {
    expect(resolveStrategy('auto', env({ mobile: true, platform: 'ios', hasShare: true, canShareFiles: true }))).toEqual({ id: 'share' })
  })
  it('auto: clipboard on a phone without file sharing and on desktop, even if desktop can share', () => {
    expect(resolveStrategy('auto', env({ mobile: true, hasShare: true }))).toEqual({ id: 'clipboard' })
    expect(resolveStrategy('auto', env({ hasShare: true, canShareFiles: true }))).toEqual({ id: 'clipboard' })
  })
  it('auto never picks download or simulate', () => {
    for (const e of [env({}), env({ mobile: true }), env({ mobile: true, canShareFiles: true })]) {
      expect(['share', 'clipboard']).toContain(resolveStrategy('auto', e).id)
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

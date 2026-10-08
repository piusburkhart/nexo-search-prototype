import { expect, test, type Page } from '@playwright/test'
import { mock } from './data'

/*
 * Continue in Claude (D88), at phone sizes: Nexo tries first; when AI Synthesis can't help, it offers a
 * "Continue working in Claude" pill (Figma 86:5100) that hands over in one tap. Every test runs on an
 * iPhone-sized and a Pixel-sized viewport with touch and a phone user agent. Share and clipboard are
 * mocked; claude.ai is intercepted, never loaded.
 */
const DEVICES = [
  { name: 'iPhone 390x844', viewport: { width: 390, height: 844 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' },
  { name: 'Pixel 360x800', viewport: { width: 360, height: 800 }, userAgent: 'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36' },
]

const KESTREL = mock.meetings.find((m) => m.title === 'Vendor Call: Kestrel Analytics')!
const KESTREL_FILE = `Vendor-Call-Kestrel-Analytics_${KESTREL.startsAt.slice(0, 10)}_transcript.txt`
const KESTREL_SEGMENTS = mock.transcripts.find((t) => t.meetingId === KESTREL.id)!.segments
const EMAIL = 'write a follow-up email to Kestrel'

const unlock = (page: Page) => page.addInitScript(() => localStorage.setItem('nexo-auth', '88c7f08d0be5407e361c165b1b84fdf5ae2f8cb7f76195c8d309330bd7b61527'))
const searchFor = (page: Page, q: string, mode?: string) =>
  page.goto(`/${mode ? `?handoff=${mode}` : ''}#/search?q=${encodeURIComponent(q)}`)
/** Search, then tap the AI Synthesis button: the first of the two taps. */
async function askNexo(page: Page, q: string, mode?: string) {
  await searchFor(page, q, mode)
  await page.getByTestId('ai-synthesis').tap()
  await expect(page.getByTestId('ai-result')).toHaveText('Nexo can not help you with that.')
  await expect(page.getByTestId('claude-pill')).toBeVisible()
}
/** Mock the clipboard API and record what was copied on the test side, so it survives leaving for Claude. */
async function mockClipboard(page: Page) {
  const copied: string[] = []
  await page.exposeFunction('__recordClip', (t: string) => { copied.push(t) })
  await page.addInitScript(() => {
    const w = window as unknown as { __recordClip: (t: string) => Promise<void> }
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (t: string) => w.__recordClip(t) } })
  })
  return () => copied.at(-1) ?? ''
}
const interceptClaude = (page: Page) =>
  page.route('https://claude.ai/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>claude.ai (intercepted in tests)</p>' }))
/**
 * The tap leaves Nexo for Claude in the same tab, so the toast can't be read from the page afterwards. This
 * records every toast from inside the page as it appears, and reports it to the test.
 */
async function recordToasts(page: Page) {
  const seen: string[] = []
  await page.exposeFunction('__recordToast', (t: string) => { seen.push(t) })
  await page.addInitScript(() => {
    const report = (window as unknown as { __recordToast: (t: string) => void }).__recordToast
    new MutationObserver(() => {
      const t = document.querySelector('[data-testid="toast"]')?.textContent
      if (t) report(t)
    }).observe(document, { childList: true, subtree: true, characterData: true })
  })
  return seen
}

for (const device of DEVICES) {
  test.describe(device.name, () => {
    test.use({ viewport: device.viewport, userAgent: device.userAgent, isMobile: true, hasTouch: true })
    test.beforeEach(async ({ page }) => { await unlock(page) })

    test('1. no Claude suggestion in the search itself; AI Synthesis offers it when Nexo can’t help', async ({ page }) => {
      await searchFor(page, EMAIL)
      await expect(page.getByTestId('group-recordings')).toBeVisible() // Nexo searches as usual
      await expect(page.getByTestId('claude-pill')).toHaveCount(0)
      await page.getByTestId('ai-synthesis').tap()
      await expect(page.getByTestId('ai-result')).toHaveText('Nexo can not help you with that.')
      await expect(page.getByTestId('claude-pill')).toHaveText('Continue working in Claude')
      await expect(page.getByTestId('empty-state')).toHaveCount(0)
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(device.viewport.width)
      expect((await page.getByTestId('claude-pill').boundingBox())!.height).toBeGreaterThanOrEqual(44)
    })

    test('2. "budget" shows the plain empty state; questions Nexo can answer get an answer, not Claude', async ({ page }) => {
      await searchFor(page, 'budget')
      await expect(page.getByTestId('empty-state')).toBeVisible()
      await expect(page.getByTestId('claude-pill')).toHaveCount(0)
      await searchFor(page, 'Why was SSO postponed?')
      await page.getByTestId('ai-synthesis').tap()
      await expect(page.getByTestId('ai-result')).toContainText('SSO')
      await expect(page.getByTestId('claude-pill')).toHaveCount(0)
      // Open-ended questions get Nexo's own answer first; Claude is only offered when it has none.
      await searchFor(page, 'What are the risks for the launch?')
      await page.getByTestId('ai-synthesis').tap()
      await expect(page.getByTestId('ai-result')).toContainText('biggest technical risk')
      await expect(page.getByTestId('claude-pill')).toHaveCount(0)
    })

    test('3. one tap after AI Synthesis: copies the transcripts, opens claude.ai/new?q= with the full prompt (under 2,000 characters) and shows a toast', async ({ page }) => {
      const clipboard = await mockClipboard(page)
      await interceptClaude(page)
      const toasts = await recordToasts(page)
      await askNexo(page, EMAIL)
      await expect(page.getByTestId('claude-pill')).toHaveAttribute('data-strategy', 'clipboard') // auto = clipboard + link
      const request = page.waitForRequest(/^https:\/\/claude\.ai\/new/)
      await page.getByTestId('claude-pill').tap() // no sheet, no confirmation, no app picker
      const url = (await request).url()
      expect(url.startsWith('https://claude.ai/new?q=')).toBe(true)
      expect(url.length).toBeLessThan(2000)
      // The link types everything Claude needs to carry out the request: the request, the sources with dates and
      // participants, the rule to answer only from the material, and where the transcript is.
      const q = decodeURIComponent(url.split('q=')[1])
      expect(q).toContain(`Help me draft this: ${EMAIL}`)
      expect(q).toContain(KESTREL.title)
      expect(q).toContain('2 October 2026')
      expect(q).toContain('source of truth')
      expect(q).toMatch(/say clearly when something isn't in (it|them)/)
      expect(q).toContain('My meeting transcript is in my clipboard')
      // The clipboard holds the transcripts, not the prompt a second time.
      await expect.poll(clipboard).toContain(KESTREL_FILE)
      const clip = clipboard()
      expect(clip).toContain('===== ') // several sources, each under a header
      expect(clip).toContain('Participants: ')
      expect(clip).not.toContain(EMAIL)
      for (const seg of KESTREL_SEGMENTS) expect(clip).toContain(seg.text) // the full transcript text
      expect(toasts).toContain('Transcript copied') // a small toast, in the same tap
    })

    test('4. the copied Kestrel transcript matches the mock data', async ({ page }) => {
      const clipboard = await mockClipboard(page)
      await interceptClaude(page)
      await askNexo(page, EMAIL)
      await page.getByTestId('claude-pill').tap()
      await expect.poll(clipboard).toContain(KESTREL_FILE)
      const text = clipboard()
      const section = text.split(/^===== \d+ of \d+: /m).find((s) => s.startsWith(KESTREL_FILE)) ?? ''
      const lines = section.split('\n').filter((l) => /^\[\d{2}:\d{2}\] /.test(l))
      expect(lines).toHaveLength(KESTREL_SEGMENTS.length)
      expect(lines[0].startsWith(`[${KESTREL_SEGMENTS[0].time}] `)).toBe(true)
      expect(lines.at(-1)!.startsWith(`[${KESTREL_SEGMENTS.at(-1)!.time}] `)).toBe(true)
      expect(section).toContain(`Source: Nexo meeting ${KESTREL.id}`)
    })

    test('5. coming back from Claude shows a calm welcome', async ({ page }) => {
      await mockClipboard(page)
      await interceptClaude(page)
      await askNexo(page, EMAIL)
      await page.getByTestId('claude-pill').tap()
      await page.waitForURL(/claude\.ai/)
      await page.goBack().catch(() => { /* the restored page may report an aborted navigation */ })
      await expect(page.getByTestId('toast')).toHaveText('Welcome back to Nexo.')
      await expect(page.getByTestId('handoff-error')).toHaveCount(0)
    })

    test('6. Simulate mode: one tap opens the simulated chat with the prompt and files; Back to Nexo returns', async ({ page }) => {
      await askNexo(page, EMAIL, 'simulate')
      await page.getByTestId('claude-pill').tap()
      await expect(page.getByTestId('sim-opening')).toBeVisible()
      await expect(page.getByTestId('sim-chat')).toBeVisible()
      await expect(page.getByTestId('sim-input')).toHaveValue(new RegExp(`^Help me draft this: ${EMAIL}`))
      await expect(page.locator(`[data-testid="file-chip"][data-name="${KESTREL_FILE}"]`)).toBeVisible()
      await page.getByTestId('sim-input').fill('Draft a short thank-you note to Kestrel.') // the prompt is editable there
      await page.getByTestId('sim-send').tap()
      await expect(page.getByTestId('sim-sent')).toContainText('Draft a short thank-you note to Kestrel.')
      await expect(page.getByTestId('sim-reply')).toBeVisible()
      await page.getByTestId('sim-back').tap()
      await expect(page.getByTestId('sim-chat')).toHaveCount(0)
      await expect(page.getByTestId('toast')).toHaveText('Welcome back to Nexo.')
      await expect(page).toHaveURL(/#\/search/)
    })

    test('7. Share mode calls navigator.share with the files and the prompt; a cancelled share is quiet', async ({ page }) => {
      await page.addInitScript(() => {
        const w = window as unknown as { __shares: unknown[]; __abort?: boolean }
        w.__shares = []
        Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true })
        Object.defineProperty(navigator, 'share', {
          configurable: true,
          value: async (d: ShareData) => {
            w.__shares.push({ text: d.text, files: (d.files ?? []).map((f) => ({ name: f.name, type: f.type, size: f.size })) })
            if (w.__abort) throw new DOMException('Share canceled', 'AbortError')
          },
        })
      })
      await askNexo(page, EMAIL, 'share')
      await expect(page.getByTestId('claude-pill')).toHaveAttribute('data-strategy', 'share')
      await page.getByTestId('claude-pill').tap()
      await expect(page.getByTestId('toast')).toHaveText('Shared. Finish in Claude.')
      const shares = await page.evaluate(() => (window as unknown as { __shares: { text: string; files: { name: string; type: string; size: number }[] }[] }).__shares)
      expect(shares).toHaveLength(1)
      expect(shares[0].text).toContain(`Help me draft this: ${EMAIL}`)
      expect(shares[0].files).toContainEqual(expect.objectContaining({ name: KESTREL_FILE, type: 'text/plain' }))

      await page.evaluate(() => { (window as unknown as { __abort: boolean }).__abort = true })
      await page.getByTestId('claude-pill').tap()
      await expect.poll(() => page.evaluate(() => (window as unknown as { __shares: unknown[] }).__shares.length)).toBe(2)
      await expect(page.getByTestId('handoff-error')).toHaveCount(0)
      await expect(page.getByRole('alert')).toHaveCount(0)
      await expect(page).toHaveURL(/#\/search/)
    })

    test('8. Download mode: the first tap downloads the transcript, the second opens Claude', async ({ page }) => {
      await interceptClaude(page)
      await askNexo(page, EMAIL, 'download')
      const download = page.waitForEvent('download')
      await page.getByTestId('claude-pill').tap()
      expect((await download).suggestedFilename()).toMatch(/^Nexo_\d-sources_\d{4}-\d{2}-\d{2}\.txt$/)
      await expect(page.getByTestId('claude-pill')).toHaveText('Open Claude and attach the file')
      const request = page.waitForRequest(/^https:\/\/claude\.ai\/new/)
      await page.getByTestId('claude-pill').tap()
      expect(decodeURIComponent((await request).url())).toContain('See the attached transcript')
    })

    test('9. a request with nothing to attach still opens Claude with the request', async ({ page }) => {
      await mockClipboard(page)
      await interceptClaude(page)
      await askNexo(page, 'what is the capital of australia?')
      const request = page.waitForRequest(/^https:\/\/claude\.ai\/new/)
      await page.getByTestId('claude-pill').tap()
      const q = decodeURIComponent((await request).url().split('q=')[1])
      expect(q).toContain('what is the capital of australia?')
      expect(q).not.toContain('clipboard') // nothing was copied, so the prompt doesn't say so
    })

    test('10. offline: the tap stays in Nexo and says why', async ({ page, context }) => {
      await askNexo(page, EMAIL)
      await context.setOffline(true)
      await page.getByTestId('claude-pill').tap()
      await expect(page.getByTestId('handoff-error')).toContainText('You’re offline')
      await expect(page).toHaveURL(/#\/search/)
      await context.setOffline(false)
    })

    test('11. settings: a long-press on the title opens them, the mode persists, ?handoff= presets it', async ({ page }) => {
      await page.goto('/#/search')
      const title = page.getByTestId('search-headline')
      const box = (await title.boundingBox())!
      await title.dispatchEvent('pointerdown', { clientX: box.x + 10, clientY: box.y + 5, pointerType: 'touch', isPrimary: true })
      await expect(page).toHaveURL(/#\/settings/)
      await page.getByTestId('mode-download').tap()
      await page.reload()
      await expect(page.getByTestId('mode-download')).toBeChecked()
      await expect(page.getByTestId('debug-info')).toContainText('canShare({ files })')
      await page.goto('/?handoff=simulate#/settings')
      await expect(page.getByTestId('mode-simulate')).toBeChecked()
    })
  })
}

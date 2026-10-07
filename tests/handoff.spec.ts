import { expect, test, type Page } from '@playwright/test'
import { mock } from './data'

/*
 * Continue in Claude, at phone sizes. Every test runs on an iPhone-sized and a Pixel-sized viewport with
 * touch and a phone user agent. Share and clipboard are mocked; claude.ai is intercepted, never loaded.
 */
const DEVICES = [
  { name: 'iPhone 390x844', viewport: { width: 390, height: 844 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' },
  { name: 'Pixel 360x800', viewport: { width: 360, height: 800 }, userAgent: 'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36' },
]

const KESTREL = mock.meetings.find((m) => m.title === 'Vendor Call: Kestrel Analytics')!
const KESTREL_FILE = `Vendor-Call-Kestrel-Analytics_${KESTREL.startsAt.slice(0, 10)}_transcript.txt`
const KESTREL_SEGMENTS = mock.transcripts.find((t) => t.meetingId === KESTREL.id)!.segments

const unlock = (page: Page) => page.addInitScript(() => localStorage.setItem('nexo-auth', '88c7f08d0be5407e361c165b1b84fdf5ae2f8cb7f76195c8d309330bd7b61527'))
const searchFor = (page: Page, q: string, mode?: string) =>
  page.goto(`/${mode ? `?handoff=${mode}` : ''}#/search?q=${encodeURIComponent(q)}`)

/** Search "kestrel" and tap "Ask Claude" on the Kestrel vendor call's transcript card. */
async function askAboutKestrel(page: Page, mode?: string) {
  await searchFor(page, 'kestrel', mode)
  const group = page.locator(`[data-testid="transcript-group"][data-meeting="${KESTREL.id}"]`)
  if (!(await group.count())) await page.getByTestId('group-transcript').getByTestId('unfold').tap()
  await group.getByTestId('ask-claude').tap()
  await expect(page.getByTestId('handoff-sheet')).toBeVisible()
}
const confirmAndOpen = async (page: Page) => {
  await page.getByTestId('handoff-consent').tap()
  await page.getByTestId('handoff-open').tap()
}

for (const device of DEVICES) {
  test.describe(device.name, () => {
    test.use({ viewport: device.viewport, userAgent: device.userAgent, isMobile: true, hasTouch: true })
    test.beforeEach(async ({ page }) => { await unlock(page) })

    test('1. "write a follow-up email to Kestrel" shows Continue in Claude, not the empty state', async ({ page }) => {
      await searchFor(page, 'write a follow-up email to Kestrel')
      await expect(page.getByTestId('handoff-card')).toBeVisible()
      await expect(page.getByTestId('handoff-card')).toHaveAttribute('data-category', 'drafting')
      await expect(page.getByTestId('empty-state')).toHaveCount(0)
      // A request search finds nothing for: the card takes the empty state's place.
      await searchFor(page, 'what is the capital of australia?')
      await expect(page.getByTestId('handoff-card')).toBeVisible()
      await expect(page.getByTestId('empty-state')).toHaveCount(0)
      // "Not now" hides it for this query.
      await page.getByTestId('handoff-dismiss').tap()
      await expect(page.getByTestId('handoff-card')).toHaveCount(0)
    })

    test('2. "budget" still shows the plain empty state', async ({ page }) => {
      await searchFor(page, 'budget')
      await expect(page.getByTestId('empty-state')).toBeVisible()
      await expect(page.getByTestId('handoff-card')).toHaveCount(0)
    })

    test('3. Ask Claude on the Kestrel transcript attaches that transcript with the right file name', async ({ page }) => {
      await askAboutKestrel(page)
      const chips = page.getByTestId('file-chip')
      await expect(chips).toHaveCount(1)
      await expect(chips.first()).toHaveAttribute('data-name', KESTREL_FILE)
      await expect(chips.first().getByTestId('file-name')).toHaveText(KESTREL_FILE)
      await expect(page.getByTestId('handoff-prompt')).toHaveValue(new RegExp(`“${KESTREL.title}” \\(meeting, 2 October 2026`))
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(device.viewport.width)
    })

    test('4. the prompt is editable and the character count follows', async ({ page }) => {
      await askAboutKestrel(page)
      const prompt = page.getByTestId('handoff-prompt')
      const before = (await prompt.inputValue()).length
      await expect(page.getByTestId('handoff-count')).toHaveText(`${before.toLocaleString('en-US')} characters`)
      const edited = 'Summarise the pricing for my manager.'
      await prompt.fill(edited)
      await expect(page.getByTestId('handoff-count')).toHaveText(`${edited.length} characters`)
    })

    test('5. Open in Claude is disabled until the user confirms; controls are at least 44px', async ({ page }) => {
      await askAboutKestrel(page)
      const open = page.getByTestId('handoff-open')
      await expect(open).toBeDisabled()
      await page.getByTestId('handoff-consent').tap()
      await expect(open).toBeEnabled()
      for (const el of [open, page.getByTestId('remove-file'), page.locator('label:has([data-testid="handoff-consent"])')]) {
        expect((await el.boundingBox())!.height).toBeGreaterThanOrEqual(44)
      }
    })

    test('6. Simulate mode ends in the simulated chat; Back to Nexo returns', async ({ page }) => {
      await askAboutKestrel(page, 'simulate')
      await page.getByTestId('handoff-prompt').fill('Draft a short thank-you note to Kestrel.')
      await confirmAndOpen(page)
      await expect(page.getByTestId('sim-opening')).toBeVisible()
      await expect(page.getByTestId('sim-chat')).toBeVisible()
      await expect(page.getByTestId('sim-input')).toHaveValue('Draft a short thank-you note to Kestrel.')
      await expect(page.getByTestId('sim-chat').getByTestId('file-chip')).toHaveAttribute('data-name', KESTREL_FILE)
      await page.getByTestId('sim-send').tap()
      await expect(page.getByTestId('sim-reply')).toContainText(KESTREL.title)
      await page.getByTestId('sim-back').tap()
      await expect(page.getByTestId('sim-chat')).toHaveCount(0)
      await expect(page.getByTestId('toast')).toHaveText('Welcome back to Nexo.')
      await expect(page).toHaveURL(/#\/search/)
    })

    test('7. Share mode calls navigator.share with the file and the prompt; a cancelled share keeps the sheet open quietly', async ({ page }) => {
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
      await askAboutKestrel(page, 'share')
      await expect(page.getByTestId('handoff-sheet')).toHaveAttribute('data-strategy', 'share')
      const prompt = await page.getByTestId('handoff-prompt').inputValue()
      await confirmAndOpen(page)
      await expect(page.getByTestId('toast')).toHaveText('Shared. Finish in Claude.')
      const shares = await page.evaluate(() => (window as unknown as { __shares: { text: string; files: { name: string; type: string; size: number }[] }[] }).__shares)
      expect(shares).toHaveLength(1)
      expect(shares[0].text).toBe(prompt)
      expect(shares[0].files).toEqual([expect.objectContaining({ name: KESTREL_FILE, type: 'text/plain' })])
      expect(shares[0].files[0].size).toBeGreaterThan(0)
      await expect(page.getByTestId('handoff-sheet')).toHaveCount(0) // closes after success

      // Cancelled in the share sheet: nothing looks like an error, and the sheet stays.
      await page.evaluate(() => { (window as unknown as { __abort: boolean }).__abort = true })
      await page.locator(`[data-testid="transcript-group"][data-meeting="${KESTREL.id}"]`).getByTestId('ask-claude').tap()
      await confirmAndOpen(page)
      await expect(page.getByTestId('handoff-sheet')).toHaveAttribute('data-phase', 'cancelled')
      await expect(page.getByTestId('handoff-sheet')).toBeVisible()
      await expect(page.getByTestId('handoff-error')).toHaveCount(0)
      await expect(page.getByTestId('handoff-sheet').getByRole('alert')).toHaveCount(0)
      await expect(page.getByTestId('copy-instead')).toBeVisible()
    })

    test('8. Clipboard mode copies prompt + transcript and opens claude.ai/new?q= under 2,000 characters', async ({ page }) => {
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: { writeText: async (t: string) => { (window as unknown as { __clip: string }).__clip = t } },
        })
      })
      await page.route('https://claude.ai/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>claude.ai (intercepted in tests)</p>' }))
      await askAboutKestrel(page, 'clipboard')
      await page.getByTestId('handoff-prompt').fill('Write a follow-up email to Kestrel. '.repeat(70)) // long: forces the short link
      const prompt = await page.getByTestId('handoff-prompt').inputValue()
      await confirmAndOpen(page)
      await expect(page.getByTestId('handoff-next')).toContainText('Transcript copied. Paste it into Claude.')
      await expect(page.getByTestId('toast')).toHaveText('Transcript copied.')
      const clip = await page.evaluate(() => (window as unknown as { __clip: string }).__clip)
      expect(clip.startsWith(prompt)).toBe(true)
      expect(clip).toContain(`[${KESTREL_SEGMENTS[0].time}] `)
      expect(clip).toContain(`[${KESTREL_SEGMENTS.at(-1)!.time}] `)

      const request = page.waitForRequest(/^https:\/\/claude\.ai\/new/)
      await page.getByTestId('open-claude').tap()
      const url = (await request).url()
      expect(url.startsWith('https://claude.ai/new?q=')).toBe(true)
      expect(url.length).toBeLessThan(2000)
      expect(decodeURIComponent(url)).toContain('My meeting transcript is in my clipboard')

      // Back from Claude: a calm welcome, not an error.
      await page.waitForURL(/claude\.ai/)
      await page.goBack().catch(() => { /* the restored page may report an aborted navigation */ })
      await expect(page.getByTestId('toast')).toHaveText('Welcome back to Nexo.')
      await expect(page.getByTestId('handoff-error')).toHaveCount(0)
    })

    test('9. the transcript export matches the mock data', async ({ page }) => {
      await askAboutKestrel(page)
      await page.getByTestId('file-chip').first().getByRole('button', { name: /^Preview/ }).tap()
      const text = await page.getByTestId('file-preview').innerText()
      const lines = text.split('\n').filter((l) => /^\[\d{2}:\d{2}\] /.test(l))
      expect(lines).toHaveLength(KESTREL_SEGMENTS.length)
      expect(lines[0].startsWith(`[${KESTREL_SEGMENTS[0].time}] `)).toBe(true)
      expect(lines.at(-1)!.startsWith(`[${KESTREL_SEGMENTS.at(-1)!.time}] `)).toBe(true)
      expect(text).toContain(`Source: Nexo meeting ${KESTREL.id}`)
    })

    test('10. removing every attachment is allowed and says Claude gets no context', async ({ page }) => {
      await askAboutKestrel(page)
      await page.getByTestId('remove-file').tap()
      await expect(page.getByTestId('file-chip')).toHaveCount(0)
      await expect(page.getByTestId('no-attachments')).toContainText('Claude won’t know anything about your meetings')
      await page.getByTestId('handoff-consent').tap()
      await expect(page.getByTestId('handoff-open')).toBeEnabled()
    })

    test('11. offline shows an error with Try again, and the sheet stays usable', async ({ page, context }) => {
      await askAboutKestrel(page, 'clipboard')
      await context.setOffline(true)
      await confirmAndOpen(page)
      await expect(page.getByTestId('handoff-error')).toContainText('You’re offline')
      await context.setOffline(false)
      await page.getByTestId('handoff-error').getByRole('button', { name: 'Try again' }).tap()
      await expect(page.getByTestId('handoff-error')).toHaveCount(0)
    })

    test('12. Escape and the back gesture close the sheet', async ({ page }) => {
      await askAboutKestrel(page)
      await page.keyboard.press('Escape')
      await expect(page.getByTestId('handoff-sheet')).toHaveCount(0)
      await page.locator(`[data-testid="transcript-group"][data-meeting="${KESTREL.id}"]`).getByTestId('ask-claude').tap()
      await expect(page.getByTestId('handoff-sheet')).toBeVisible()
      await page.goBack()
      await expect(page.getByTestId('handoff-sheet')).toHaveCount(0)
      await expect(page).toHaveURL(/#\/search\?q=kestrel/)
    })

    test('13. settings: a long-press on the title opens them, the mode persists, ?handoff= presets it', async ({ page }) => {
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

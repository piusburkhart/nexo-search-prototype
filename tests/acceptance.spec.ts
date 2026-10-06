import { expect, test, type Page } from '@playwright/test'

const openSearch = async (page: Page) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(page.getByRole('searchbox', { name: 'Search', exact: true })).toBeFocused()
}
const type = async (page: Page, q: string) => page.getByRole('searchbox', { name: 'Search', exact: true }).fill(q)
const hits = (page: Page) => page.getByTestId('transcript-hit')

test('1. "Lantern" returns meetings, memos and transcript hits', async ({ page }) => {
  await openSearch(page)
  await type(page, 'Lantern')
  for (const g of ['group-meetings', 'group-memos', 'group-transcript']) await expect(page.getByTestId(g)).toBeVisible()
  await expect(page.getByTestId('group-meetings')).toContainText('Meetings · ')
  await expect(page.getByTestId('group-transcript').locator('mark').first()).toBeVisible()
})

test('2. "CSV" finds the discussion and opens the transcript at the segment', async ({ page }) => {
  await openSearch(page)
  await type(page, 'CSV')
  const hit = hits(page).filter({ hasText: 'worried about the CSV import step' })
  await expect(hit).toContainText('Jonas')
  await expect(hit).toContainText('00:48')
  await hit.click()
  const active = page.locator('[data-seg-start][data-active]')
  await expect(active).toHaveCount(1)
  await expect(active).toContainText('worried about the CSV import step')
  await expect(active).toBeInViewport()
  await expect(page.getByTestId('find-count')).toContainText('/')
})

test('3. the reason SSO was postponed is findable', async ({ page }) => {
  await openSearch(page)
  await type(page, 'SSO')
  await expect(hits(page).filter({ hasText: 'defer SSO to version two. It would blow the 14 November launch date' })).toBeVisible()
  await expect(page.getByTestId('group-meetings')).toContainText('deferred to version two to protect the 14 November launch')
})

test('4. "pricing" hits Brightside Dental and Kestrel', async ({ page }) => {
  await openSearch(page)
  await type(page, 'pricing')
  await expect(hits(page).filter({ hasText: 'Customer Interview: Brightside Dental' })).toHaveCount(2) // 02:58, 03:10
  await expect(hits(page).filter({ hasText: 'Vendor Call: Kestrel Analytics' })).toHaveCount(1)
})

test('5. Kestrel signing deadline (16 October) is findable', async ({ page }) => {
  await openSearch(page)
  await type(page, '16 October')
  await expect(hits(page).filter({ hasText: 'Our internal deadline to sign is 16 October' })).toBeVisible()
})

test('6. "swim" finds the personal swim pickup memo', async ({ page }) => {
  await openSearch(page)
  await type(page, 'swim')
  const memo = page.getByTestId('group-memos').getByTestId('memo-card')
  await expect(memo).toHaveCount(1)
  await expect(memo).toContainText('Astrid from swimming')
  await memo.click()
  await expect(page.getByTestId('detail-title')).toHaveText('Groceries and swim')
})

test('7. "budget" shows the empty state', async ({ page }) => {
  await openSearch(page)
  await type(page, 'budget')
  await expect(page.getByTestId('empty-state')).toContainText('No results for “budget”')
})

test('search: multi-word is AND, case-insensitive, group counts', async ({ page }) => {
  await openSearch(page)
  await type(page, 'csv IMPORT')
  await expect(page.getByTestId('group-transcript')).toContainText('Transcript mentions · ')
  await type(page, 'csv zzzz')
  await expect(page.getByTestId('empty-state')).toBeVisible()
})

test('find in transcript: count, next and previous', async ({ page }) => {
  await page.goto('/#/transcript/t01?q=csv')
  const count = page.getByTestId('find-count')
  await expect(count).toHaveText(/1 \/ \d+/)
  const total = Number((await count.textContent())!.split('/')[1])
  expect(total).toBeGreaterThan(1)
  await page.getByRole('button', { name: 'Next match' }).click()
  await expect(count).toHaveText(`2 / ${total}`)
  await page.getByRole('button', { name: 'Previous match' }).click()
  await page.getByRole('button', { name: 'Previous match' }).click()
  await expect(count).toHaveText(`${total} / ${total}`)
  await expect(page.locator('[data-seg-start][data-active]')).toBeInViewport()
})

// Figma flow frame: Home -> Search -> tags -> date -> AI -> content; detail screens and back
test.describe('navigation flow', () => {
  test('home -> search -> close -> home; home card -> meeting -> transcript -> back', async ({ page }) => {
    await openSearch(page)
    await page.getByRole('button', { name: 'Close search' }).click()
    await expect(page.getByRole('heading', { name: 'Recordings' })).toBeVisible()
    await page.getByTestId('meeting-card').filter({ hasText: 'Vendor Call: Kestrel Analytics' }).click()
    await expect(page.getByTestId('detail-title')).toHaveText('Vendor Call: Kestrel Analytics')
    await page.getByTestId('open-transcript').click()
    await expect(page.locator('[data-seg-start]').first()).toBeVisible()
    await page.getByRole('button', { name: 'Back' }).click()
    await page.getByRole('button', { name: 'Back' }).click()
    await expect(page.getByRole('heading', { name: 'Recordings' })).toBeVisible()
  })

  test('home filter chips', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Memos' }).click()
    await expect(page.getByTestId('meeting-card')).toHaveCount(0)
    await expect(page.getByTestId('memo-card')).toHaveCount(10)
  })

  test('search idle shows folder and recordings; folder opens project results', async ({ page }) => {
    await openSearch(page)
    await expect(page.getByText('Folders')).toBeVisible()
    await page.getByTestId('folder-card').click()
    await expect(page.getByTestId('group-meetings')).toBeVisible()
  })

  test('filter tags: select highlights and filters; deselect restores', async ({ page }) => {
    await openSearch(page)
    await type(page, 'Lantern')
    const memos = page.getByTestId('tag-memos')
    await memos.click()
    await expect(memos).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByTestId('group-meetings')).toHaveCount(0)
    await expect(page.getByTestId('group-memos')).toBeVisible()
    await memos.click()
    await expect(page.getByTestId('group-meetings')).toBeVisible()
  })

  test('date tag is recognised and filters to that day', async ({ page }) => {
    await openSearch(page)
    await type(page, 'Lantern 02.10.26')
    const tag = page.getByTestId('tag-2 oct 2026')
    await expect(tag).toBeVisible()
    await expect(page.getByTestId('meeting-card')).not.toHaveCount(2)
    await tag.click()
    await expect(tag).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByTestId('meeting-card')).toHaveCount(2) // m07, m08 on 2 Oct
    await expect(page.getByTestId('memo-card')).toHaveCount(0)
  })

  test('AI search: offer -> synthesizing -> result -> content card opens transcript', async ({ page }) => {
    await openSearch(page)
    await type(page, 'Decisions in project lantern?')
    await page.getByTestId('ai-synthesis').click()
    await expect(page.getByTestId('synthesizing')).toBeVisible()
    await expect(page.getByTestId('ai-result')).toBeVisible()
    await page.getByTestId('transcript-hit').first().click()
    await expect(page.locator('[data-seg-start][data-active]')).toHaveCount(1)
  })

  test('memo detail links to related meeting', async ({ page }) => {
    await page.goto('/#/memo/memo06')
    await page.getByRole('button', { name: 'Vendor Call: Kestrel Analytics' }).click()
    await expect(page.getByTestId('detail-title')).toHaveText('Vendor Call: Kestrel Analytics')
  })
})

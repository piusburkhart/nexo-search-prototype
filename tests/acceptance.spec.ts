import { expect, test, type Page } from '@playwright/test'

// The password gate is covered in gate.spec.ts; here we start unlocked.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('nexo-auth', '88c7f08d0be5407e361c165b1b84fdf5ae2f8cb7f76195c8d309330bd7b61527'))
})

const openSearch = async (page: Page) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(page.getByRole('searchbox', { name: 'Search', exact: true })).toBeFocused()
}
const type = async (page: Page, q: string) => page.getByRole('searchbox', { name: 'Search', exact: true }).fill(q)
const hits = (page: Page) => page.getByTestId('transcript-hit')

test('1. "Lantern" returns meetings, memos and transcript moments', async ({ page }) => {
  await openSearch(page)
  await type(page, 'Lantern')
  await expect(page.getByTestId('group-meetings')).toContainText('Meetings · ')
  await expect(page.getByTestId('group-memos')).toBeVisible()
  // a meeting is its transcript: matching moments are nested under the meeting
  await expect(page.getByTestId('group-meetings').getByTestId('transcript-hit').first()).toBeVisible()
  await expect(page.getByTestId('group-meetings').locator('mark').first()).toBeVisible()
})

test('2. "CSV" finds where it was discussed (speaker, time, text); results do not navigate', async ({ page }) => {
  await openSearch(page)
  await type(page, 'CSV')
  const hit = hits(page).filter({ hasText: 'worried about the CSV import step' })
  await expect(hit).toContainText('Jonas')
  await expect(hit).toContainText('00:48')
  await expect(hit.locator('mark').first()).toHaveText('CSV')
  await hit.click()
  await expect(page).toHaveURL(/#\/search/) // D26: no jump to the transcript
  await expect(page.getByRole('button', { name: /CSV/ })).toHaveCount(0)
})

test('transcript opens at the right segment (direct link)', async ({ page }) => {
  await page.goto('/#/transcript/t01?seg=48&q=csv')
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
  await expect(hits(page)).toHaveCount(3)
  await expect(hits(page).filter({ hasText: 'Is that a dealbreaker for pricing' })).toHaveCount(1) // Brightside 02:58
  await expect(hits(page).filter({ hasText: 'but pricing matters' })).toHaveCount(1) // Brightside 03:10
  await expect(hits(page).filter({ hasText: 'What about pricing?' })).toHaveCount(1) // Kestrel
  for (const title of ['Customer Interview: Brightside Dental', 'Vendor Call: Kestrel Analytics'])
    await expect(page.getByTestId('meeting-card').filter({ hasText: title })).toHaveCount(1)
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
  await expect(memo).not.toContainText('Groceries and swim') // memos have no headline
  await memo.click()
  await expect(page).toHaveURL(/#\/search/) // D26
})

test('7. "budget" shows the empty state', async ({ page }) => {
  await openSearch(page)
  await type(page, 'budget')
  await expect(page.getByTestId('empty-state')).toContainText('No results for “budget”')
})

test('search: multi-word is AND, case-insensitive, group counts', async ({ page }) => {
  await openSearch(page)
  await type(page, 'csv IMPORT')
  await expect(hits(page).first()).toBeVisible()
  await page.getByTestId('tag-transcript').click()
  await expect(page.getByTestId('group-transcript')).toContainText('Transcript mentions · ')
  await expect(page.getByTestId('group-meetings')).toHaveCount(0)
  await page.getByTestId('clear-search').click()
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

  test('search default view is empty until you type', async ({ page }) => {
    await openSearch(page)
    await expect(page.getByTestId('folder-card')).toHaveCount(0)
    await expect(page.getByTestId('meeting-card')).toHaveCount(0)
    await expect(page.getByTestId('memo-card')).toHaveCount(0)
    await type(page, 'Lantern')
    await expect(page.getByTestId('meeting-card').first()).toBeVisible()
  })

  test('AI synthesis is offered only for question-like queries or when keyword search finds nothing', async ({ page }) => {
    await openSearch(page)
    await type(page, 'Lantern')
    await expect(page.getByTestId('meeting-card').first()).toBeVisible()
    await expect(page.getByTestId('ai-synthesis')).toHaveCount(0)
    await type(page, 'What did we decide about SSO?')
    await expect(page.getByTestId('ai-synthesis')).toBeVisible()
    await type(page, 'budget')
    await expect(page.getByTestId('ai-synthesis')).toBeVisible() // no keyword results
  })

  test('clear button appears with text and empties the field and filters', async ({ page }) => {
    await openSearch(page)
    const box = page.getByRole('searchbox', { name: 'Search', exact: true })
    await expect(page.getByTestId('clear-search')).toHaveCount(0)
    await type(page, 'Lantern')
    await page.getByTestId('tag-memos').click()
    await page.getByTestId('clear-search').click()
    await expect(box).toHaveValue('')
    await expect(box).toBeFocused()
    await expect(page.getByTestId('tag-word')).toHaveCount(0)
    await expect(page.getByTestId('clear-search')).toHaveCount(0)
  })

  test('AI synthesis closes the keyboard and says so when it cannot help', async ({ page }) => {
    await openSearch(page)
    await type(page, 'budget')
    await page.getByTestId('ai-synthesis').click()
    await expect(page.getByRole('searchbox', { name: 'Search', exact: true })).not.toBeFocused()
    await expect(page.getByTestId('ai-result')).toHaveCount(0)
    await expect(page.getByText('Can’t help you with that.')).toBeVisible()
  })

  test('filter tags: one type at a time; picked tag becomes a highlighted word', async ({ page }) => {
    await openSearch(page)
    await type(page, 'Lantern')
    await expect(page.getByTestId('tag-meetings')).toBeVisible()
    await expect(page.getByTestId('tag-memos')).toBeVisible() // stacked in one card
    await page.getByTestId('tag-memos').click()
    await expect(page.getByTestId('tag-word')).toHaveText('memos') // grey background on the word
    await expect(page.getByRole('searchbox', { name: 'Search', exact: true })).toHaveValue('Lantern memos ')
    await expect(page.getByTestId('group-meetings')).toHaveCount(0)
    await expect(page.getByTestId('group-memos')).toBeVisible()
    // you chose memos: no other type is suggested any more
    for (const t of ['meetings', 'memos', 'transcript']) await expect(page.getByTestId(`tag-${t}`)).toHaveCount(0)
    await type(page, 'Lantern ') // deleting the word removes the tag
    await expect(page.getByTestId('tag-memos')).toBeVisible()
    await expect(page.getByTestId('group-meetings')).toBeVisible()
  })

  test('autocomplete: "transcr" leaves only Transcript and completes the word', async ({ page }) => {
    await openSearch(page)
    await type(page, 'transcr')
    await expect(page.getByTestId('tag-transcript')).toBeVisible()
    await expect(page.getByTestId('tag-meetings')).toHaveCount(0)
    await expect(page.getByTestId('tag-memos')).toHaveCount(0)
    await expect(page.getByTestId('empty-state')).toHaveCount(0) // still on the idle view while typing
    await page.getByTestId('tag-transcript').click()
    await expect(page.getByRole('searchbox', { name: 'Search', exact: true })).toHaveValue('transcript ')
    await expect(page.getByTestId('tag-word')).toHaveText('transcript')
    await expect(page.getByTestId('transcript-hit').first()).toBeVisible() // tag-only query lists that type
  })

  test('typing a partial tag word filters suggestions and completes it', async ({ page }) => {
    await openSearch(page)
    await type(page, 'Lantern tr')
    await expect(page.getByTestId('tag-transcript')).toBeVisible()
    await expect(page.getByTestId('tag-memos')).toHaveCount(0)
    await page.getByTestId('tag-transcript').click()
    await expect(page.getByRole('searchbox', { name: 'Search', exact: true })).toHaveValue('Lantern transcript ')
    await expect(page.getByTestId('tag-word')).toHaveText('transcript')
  })

  test('date tag is suggested in the card, applies as a filter and highlights its text', async ({ page }) => {
    await openSearch(page)
    await type(page, 'Lantern 02.10.26')
    const tag = page.getByTestId('tag-date')
    await expect(tag).toContainText('2 Oct 2026')
    await expect(page.getByTestId('tag-memos')).toBeVisible() // same card as the type tags
    await expect(page.getByTestId('meeting-card')).not.toHaveCount(2)
    await tag.click()
    await expect(tag).toHaveCount(0)
    await expect(page.getByTestId('tag-word')).toHaveText('02.10.26')
    await expect(page.getByTestId('meeting-card')).toHaveCount(2) // m07, m08 on 2 Oct
    await expect(page.getByTestId('memo-card')).toHaveCount(0)
  })

  test('typing a year or month suggests it as a tag', async ({ page }) => {
    await openSearch(page)
    await type(page, '2026')
    await expect(page.getByTestId('empty-state')).toHaveCount(0) // the year is not a search word
    await expect(page.getByTestId('tag-date')).toContainText('2026')
    await page.getByTestId('tag-date').click()
    await expect(page.getByTestId('tag-word')).toHaveText('2026')
    await expect(page.getByTestId('meeting-card')).toHaveCount(10)
    await expect(page.getByTestId('memo-card')).toHaveCount(10)
    await type(page, 'september')
    await expect(page.getByTestId('tag-date')).toContainText('September 2026')
    await page.getByTestId('tag-date').click()
    await expect(page.getByTestId('meeting-card')).toHaveCount(6) // m01 to m06
    await expect(page.getByTestId('memo-card')).toHaveCount(8)
    await type(page, '16 October') // day + month name stays plain text
    await expect(page.getByTestId('tag-date')).toHaveCount(0)
  })

  test('AI search: offer -> synthesizing -> result -> content cards', async ({ page }) => {
    await openSearch(page)
    await type(page, 'Decisions in project lantern?')
    await page.getByTestId('ai-synthesis').click()
    await expect(page.getByTestId('synthesizing')).toBeVisible()
    await expect(page.getByTestId('ai-result')).toBeVisible()
    await expect(page.getByTestId('transcript-hit').first()).toBeVisible()
    await page.getByTestId('transcript-hit').first().click()
    await expect(page).toHaveURL(/#\/search/) // content cards do not navigate (D26)
  })

  test('memo detail links to related meeting', async ({ page }) => {
    await page.goto('/#/memo/memo06')
    await page.getByRole('button', { name: 'Vendor Call: Kestrel Analytics' }).click()
    await expect(page.getByTestId('detail-title')).toHaveText('Vendor Call: Kestrel Analytics')
  })

  test('picking a tag keeps the search field focused; tapping results blurs it', async ({ page }) => {
    await openSearch(page)
    await type(page, 'Lantern')
    await page.getByTestId('tag-memos').click()
    await expect(page.getByRole('searchbox', { name: 'Search', exact: true })).toBeFocused()
    await page.getByTestId('search-body').click({ position: { x: 5, y: 5 } })
    await expect(page.getByRole('searchbox', { name: 'Search', exact: true })).not.toBeFocused()
  })

  test('suggestions disappear with the keyboard and return on focus; Enter closes the keyboard', async ({ page }) => {
    await openSearch(page)
    const box = page.getByRole('searchbox', { name: 'Search', exact: true })
    await type(page, 'Lantern')
    await expect(page.getByTestId('tag-memos')).toBeVisible()
    await box.press('Enter')
    await expect(box).not.toBeFocused()
    await expect(page.getByTestId('tag-memos')).toHaveCount(0)
    await expect(page.getByTestId('meeting-card').first()).toBeVisible() // results stay
    await box.focus()
    await expect(page.getByTestId('tag-memos')).toBeVisible()
  })

  test('tag highlight is not clipped by its container', async ({ page }) => {
    await openSearch(page)
    await type(page, 'Lantern')
    await page.getByTestId('tag-memos').click()
    const tag = await page.getByTestId('tag-word').boundingBox()
    const box = await page.getByTestId('tag-word').locator('xpath=ancestor::span[contains(@class,"overflow-hidden")]').boundingBox()
    expect(tag!.y - 3).toBeGreaterThanOrEqual(box!.y)
    expect(tag!.y + tag!.height + 3).toBeLessThanOrEqual(box!.y + box!.height)
  })
})

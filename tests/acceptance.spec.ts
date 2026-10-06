import { expect, test, type Page } from '@playwright/test'
import { mock } from './data'

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

test('1. "Nexo" returns recordings, actions and transcript moments', async ({ page }) => {
  await openSearch(page)
  await type(page, 'Nexo')
  await expect(page.getByTestId('group-recordings')).toBeVisible()
  await page.getByTestId('group-recordings').getByTestId('unfold').click()
  await expect(page.getByTestId('group-recordings').getByTestId('memo-card').first()).toBeVisible() // memos sit with the recordings
  await expect(page.getByTestId('group-actions').getByTestId('action-item').first()).toBeVisible()
  await expect(page.getByTestId('group-transcript').getByTestId('transcript-hit').first()).toBeVisible()
  await expect(page.getByTestId('group-transcript').locator('mark').first()).toBeVisible()
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

test('3. the reason SSO was postponed is findable', async ({ page }) => {
  await openSearch(page)
  await type(page, 'SSO')
  await expect(hits(page).filter({ hasText: 'defer SSO to version two. It would blow the 14 November launch date' })).toBeVisible()
  await expect(page.getByTestId('group-recordings')).toContainText('SSO') // the meetings that mention it are recordings
})

test('4. "pricing" hits Brightside Dental and Kestrel', async ({ page }) => {
  await openSearch(page)
  await type(page, 'pricing')
  const groups = page.getByTestId('transcript-group')
  await expect(groups.filter({ hasText: 'Customer Interview: Brightside Dental' })).toHaveCount(1)
  await expect(groups.filter({ hasText: 'Vendor Call: Kestrel Analytics' })).toHaveCount(1)
  await expect(hits(page).filter({ hasText: 'Is that a dealbreaker for pricing' })).toHaveCount(1) // Brightside 02:58
  await expect(hits(page).filter({ hasText: 'but pricing matters' })).toHaveCount(1) // Brightside 03:10
  await expect(hits(page).filter({ hasText: 'What about pricing?' })).toHaveCount(1) // Kestrel
})

test('5. Kestrel signing deadline (16 October) is findable', async ({ page }) => {
  await openSearch(page)
  await type(page, '16 October')
  await expect(hits(page).filter({ hasText: 'Our internal deadline to sign is 16 October' })).toBeVisible()
})

test('6. "swim" finds the personal swim pickup memo', async ({ page }) => {
  await openSearch(page)
  await type(page, 'swim')
  const memo = page.getByTestId('group-recordings').getByTestId('memo-card')
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
  await expect(page.getByTestId('group-transcript')).toBeVisible()
  await expect(page.getByTestId('group-recordings')).toHaveCount(0)
  await page.getByTestId('clear-search').click()
  await type(page, 'csv zzzz')
  await expect(page.getByTestId('empty-state')).toBeVisible()
})

test.describe('navigation flow', () => {
  test('home -> search -> close -> home; cards are not links', async ({ page }) => {
    await openSearch(page)
    await page.getByRole('button', { name: 'Close search' }).click()
    await expect(page.getByRole('heading', { name: 'Recordings' })).toBeVisible()
    await page.getByTestId('meeting-card').first().click()
    await page.getByTestId('memo-card').first().click({ force: true })
    await expect(page).toHaveURL(/localhost:5173\/(#\/)?$/) // nothing opened
    await expect(page.getByRole('heading', { name: 'Recordings' })).toBeVisible()
  })

  test('the meeting, memo and transcript pages no longer exist', async ({ page }) => {
    for (const route of ['#/meeting/m04', '#/memo/memo01', '#/transcript/t01']) {
      await page.goto('/' + route)
      await expect(page.getByRole('heading', { name: 'Recordings' })).toBeVisible() // falls back to Home
      await expect(page.locator('[data-seg-start]')).toHaveCount(0)
    }
  })

  test('Actions tab lists every action, each attached to a meeting', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Actions' }).click()
    const items = page.getByTestId('action-item')
    await expect(items).toHaveCount(mock.actions.length)
    await expect(items.first()).toContainText(mock.meetings.find((m) => m.id === mock.actions.find((a) => a.meetingId === 'm16')!.meetingId)!.title)
    await expect(page.getByText('New', { exact: true }).first()).toBeVisible()
    await page.getByRole('button', { name: 'Recordings', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Recordings' })).toBeVisible()
  })

  test('only the 3 most relevant of a type are shown, the rest unfolds with a link', async ({ page }) => {
    await openSearch(page)
    await type(page, 'csv')
    const recs = page.getByTestId('group-recordings')
    await expect(recs.locator('[data-testid$="-card"]')).toHaveCount(3)
    await recs.getByTestId('unfold').click()
    expect(await recs.locator('[data-testid$="-card"]').count()).toBeGreaterThan(3)
    await recs.getByTestId('unfold').click() // "Show less"
    await expect(recs.locator('[data-testid$="-card"]')).toHaveCount(3)
    const acts = page.getByTestId('group-actions')
    await expect(acts.getByTestId('action-item')).toHaveCount(3)
    await expect(acts.getByTestId('unfold')).toHaveText('Show all actions')
    await acts.getByTestId('unfold').click()
    expect(await acts.getByTestId('action-item').count()).toBeGreaterThan(3)
  })

  test('transcript results carry their meeting: one quote in a card, several quotes boxed in one card', async ({ page }) => {
    await openSearch(page)
    await type(page, 'csv')
    const groups = page.getByTestId('transcript-group')
    const many = groups.filter({ hasText: 'Nexo Design Review: Onboarding Flow' }) // meeting name
    await expect(many).toHaveCount(1)
    await expect(many).toContainText('24 Sep 2026') // metadata
    expect(await many.getByTestId('transcript-hit').count()).toBeGreaterThan(1)
    await type(page, 'pricing')
    const brightside = page.getByTestId('transcript-group').filter({ hasText: 'Customer Interview: Brightside Dental' })
    expect(await brightside.getByTestId('transcript-hit').count()).toBeGreaterThanOrEqual(2) // 02:58, 03:10 (+ "pay a bit extra")
    await type(page, 'patient')
    const single = page.getByTestId('transcript-group')
    await expect(single).toHaveCount(1)
    await expect(single.getByTestId('transcript-hit')).toHaveCount(1)
    await expect(single).toContainText('Customer Interview: Brightside Dental')
  })

  test('actions are searchable and Actions is a type tag', async ({ page }) => {
    await openSearch(page)
    await type(page, 'kestrel')
    await expect(page.getByTestId('group-actions')).toContainText('Kestrel')
    await page.getByTestId('tag-actions').click()
    await expect(page.getByTestId('tag-word')).toHaveText('actions')
    await expect(page.getByTestId('group-recordings')).toHaveCount(0)
    await expect(page.getByTestId('group-actions')).toBeVisible()
  })

  test('home chips filter; unselected ones are outlined, not filled', async ({ page }) => {
    await page.goto('/')
    const folders = page.getByRole('button', { name: 'Folders', exact: true })
    await expect(folders).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    await expect(folders).toHaveCSS('border-color', 'rgb(161, 159, 154)')
    await expect(page.getByTestId('meeting-card')).toHaveCount(mock.meetings.length)
    await page.getByRole('button', { name: 'Memos', exact: true }).click()
    await expect(page.getByTestId('meeting-card')).toHaveCount(0)
    await expect(page.getByTestId('memo-card')).toHaveCount(mock.memos.length)
  })

  test('folders: the Nexo folder shows on home and tops a "Nexo" search', async ({ page }) => {
    const f = mock.folders[0]
    await page.goto('/')
    await page.getByRole('button', { name: 'Folders', exact: true }).click()
    await expect(page.getByTestId('folder-card')).toHaveCount(mock.folders.length)
    const recs = mock.meetings.filter((m) => m.projectId === f.projectId).length + mock.memos.filter((m) => m.projectId === f.projectId).length
    await expect(page.getByTestId('folder-card').first()).toHaveText(`${f.name}${recs}`)
    await page.getByRole('button', { name: 'Search', exact: true }).click()
    await type(page, 'Nexo')
    await expect(page.getByTestId('group-folders').getByTestId('folder-card')).toHaveCount(1)
    await page.getByTestId('tag-folders').click()
    await expect(page.getByTestId('group-recordings')).toHaveCount(0)
    await page.getByTestId('ai-synthesis').click()
    await expect(page.getByTestId('ai-result')).toContainText(`“${f.name}” folder holds`)
  })

  test('a type tag shows all of that type, not just the first three', async ({ page }) => {
    await openSearch(page)
    await type(page, 'memo')
    await page.getByTestId('tag-memos').click()
    await expect(page.getByTestId('memo-card')).toHaveCount(mock.memos.length)
    await expect(page.getByTestId('unfold')).toHaveCount(0)
    await type(page, 'nexo ')
    await page.getByTestId('tag-memos').click()
    await expect(page.getByTestId('memo-card')).toHaveCount(mock.memos.filter((m) => m.projectId === 'proj-nexo' || /nexo/i.test(m.content)).length)
    await expect(page.getByTestId('unfold')).toHaveCount(0)
  })

  test('headline "Global search" is centred, black and regular weight; AI button is 56x40', async ({ page }) => {
    await openSearch(page)
    const h = page.getByTestId('search-headline')
    await expect(h).toHaveText('Global search')
    await expect(h).toHaveCSS('color', 'rgb(0, 0, 0)')
    await expect(h).toHaveCSS('font-weight', '400')
    await expect(h).toHaveCSS('font-size', '16px')
    await expect(h).toHaveCSS('justify-content', 'center')
    const b = (await page.getByTestId('ai-synthesis').boundingBox())!
    expect([Math.round(b.width), Math.round(b.height)]).toEqual([56, 40])
  })

  test('date then type tag: both are highlighted and the typed text stays visible', async ({ page }) => {
    await openSearch(page)
    await type(page, '20')
    await page.getByTestId('tag-date').click()
    await page.getByTestId('tag-meetings').click()
    await expect(page.getByTestId('tag-word')).toHaveText(['2026', 'meetings'])
    // the input itself draws the text (never transparent), the mirror only paints the backgrounds
    const box = page.getByRole('searchbox', { name: 'Search', exact: true })
    await expect(box).toHaveValue('2026 meetings ')
    const fill = await box.evaluate((el) => getComputedStyle(el).webkitTextFillColor)
    expect(fill).not.toBe('rgba(0, 0, 0, 0)')
  })

  test('every screen shares one background so the status bar matches everywhere', async ({ page }) => {
    await page.goto('/')
    const home = await page.evaluate(() => getComputedStyle(document.querySelector('#phone-frame > div')!).backgroundColor)
    await page.getByRole('button', { name: 'Search', exact: true }).click()
    await expect(page.getByTestId('search-headline')).toBeVisible()
    const search = await page.evaluate(() => getComputedStyle(document.querySelector('#phone-frame > div')!).backgroundColor)
    expect(home).toBe(search)
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(search)
  })

  test('search default view is empty until you type', async ({ page }) => {
    await openSearch(page)
    await expect(page.getByTestId('folder-card')).toHaveCount(0)
    await expect(page.getByText('Ask about anything.')).toHaveCount(0) // replaced by the headline
    await expect(page.getByTestId('meeting-card')).toHaveCount(0)
    await expect(page.getByTestId('memo-card')).toHaveCount(0)
    await type(page, 'Nexo')
    await expect(page.getByTestId('meeting-card').first()).toBeVisible()
  })

  test('AI synthesis button is always there; disabled until enough is typed', async ({ page }) => {
    await openSearch(page)
    const ai = page.getByTestId('ai-synthesis')
    await expect(ai).toBeVisible()
    await expect(ai).toBeDisabled() // nothing typed
    await type(page, 'De')
    await expect(ai).toBeDisabled() // not sufficient yet (Figma 76:3991)
    await type(page, 'Nexo')
    await expect(ai).toBeEnabled()
    await expect(page.getByTestId('meeting-card').first()).toBeVisible() // results are there too
    await type(page, 'budget')
    await expect(ai).toBeEnabled() // even with no keyword results
  })

  test('clear button appears with text and empties the field and filters', async ({ page }) => {
    await openSearch(page)
    const box = page.getByRole('searchbox', { name: 'Search', exact: true })
    await expect(page.getByTestId('clear-search')).toHaveCount(0)
    await type(page, 'Nexo')
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
    await expect(page.getByTestId('ai-result')).toHaveText('Can’t help you with that.')
  })

  test('filter tags: one type at a time; picked tag becomes a highlighted word', async ({ page }) => {
    await openSearch(page)
    await type(page, 'Nexo')
    await expect(page.getByTestId('tag-meetings')).toBeVisible()
    await expect(page.getByTestId('tag-memos')).toBeVisible() // stacked in one card
    await page.getByTestId('tag-memos').click()
    await expect(page.getByTestId('tag-word')).toHaveText('memos') // grey background on the word
    await expect(page.getByRole('searchbox', { name: 'Search', exact: true })).toHaveValue('Nexo memos ')
    await expect(page.getByTestId('meeting-card')).toHaveCount(0)
    await expect(page.getByTestId('memo-card').first()).toBeVisible()
    await expect(page.getByTestId('group-actions')).toHaveCount(0)
    // you chose memos: no other type is suggested any more
    for (const t of ['meetings', 'memos', 'actions', 'transcript']) await expect(page.getByTestId(`tag-${t}`)).toHaveCount(0)
    await type(page, 'Nexo ') // deleting the word removes the tag
    await expect(page.getByTestId('tag-memos')).toBeVisible()
    await expect(page.getByTestId('group-actions')).toBeVisible()
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
    await type(page, 'Nexo tr')
    await expect(page.getByTestId('tag-transcript')).toBeVisible()
    await expect(page.getByTestId('tag-memos')).toHaveCount(0)
    await page.getByTestId('tag-transcript').click()
    await expect(page.getByRole('searchbox', { name: 'Search', exact: true })).toHaveValue('Nexo transcript ')
    await expect(page.getByTestId('tag-word')).toHaveText('transcript')
  })

  test('date tag is suggested in the card, applies as a filter and highlights its text', async ({ page }) => {
    await openSearch(page)
    await type(page, 'Nexo 02.10.26')
    const tag = page.getByTestId('tag-date')
    await expect(tag).toHaveText(/02\.10\.26\s*\d+/) // keeps the typed dd.mm.yy format on one line
    await expect(page.getByTestId('tag-memos')).toHaveCount(0) // completing a date: only the date is suggested
    await expect(page.getByTestId('meeting-card')).not.toHaveCount(2)
    await tag.click()
    await expect(tag).toHaveCount(0)
    await expect(page.getByTestId('tag-word')).toHaveText('02.10.26')
    await page.getByTestId('group-recordings').getByTestId('unfold').click()
    await expect(page.getByTestId('meeting-card')).toHaveCount(2) // m07, m08 on 2 Oct
    // "Nexo" means the project: memos of Project Nexo from that day count too
    await expect(page.getByTestId('memo-card')).toHaveCount(mock.memos.filter((m) => m.createdAt.startsWith('2026-10-02') && m.projectId === 'proj-nexo').length)
  })

  test('a partly typed year or month completes to a date tag, and only that is suggested', async ({ page }) => {
    await openSearch(page)
    await type(page, '20')
    await expect(page.getByTestId('tag-date')).toContainText('2026')
    for (const t of ['meetings', 'memos', 'transcript']) await expect(page.getByTestId(`tag-${t}`)).toHaveCount(0)
    await page.getByTestId('tag-date').click()
    await expect(page.getByRole('searchbox', { name: 'Search', exact: true })).toHaveValue('2026 ')
    await expect(page.getByTestId('tag-word')).toHaveText('2026')
    await expect(page.getByTestId('tag-meetings')).toBeVisible() // after selecting, more suggestions return
    await type(page, 'nexo sep')
    await expect(page.getByTestId('tag-date')).toContainText('September 2026')
    await page.getByTestId('tag-date').click()
    await expect(page.getByRole('searchbox', { name: 'Search', exact: true })).toHaveValue('nexo September 2026 ')
    await expect(page.getByTestId('tag-word')).toHaveText('September 2026')
  })

  test('a fragment that completes to nothing suggests nothing; "m" suggests only Meetings and Memos', async ({ page }) => {
    await openSearch(page)
    await type(page, 'n')
    for (const t of ['meetings', 'memos', 'transcript']) await expect(page.getByTestId(`tag-${t}`)).toHaveCount(0)
    await type(page, 'm')
    await expect(page.getByTestId('tag-meetings')).toBeVisible()
    await expect(page.getByTestId('tag-memos')).toBeVisible()
    await expect(page.getByTestId('tag-transcript')).toHaveCount(0)
  })

  test('a full date stays on one line in the suggestion', async ({ page }) => {
    await openSearch(page)
    await type(page, 'Nexo 02.10.26')
    const h = await page.getByTestId('tag-date').boundingBox()
    expect(h!.height).toBeLessThan(44)
  })

  test('no pointless type tag: results of one type offer no type suggestions', async ({ page }) => {
    await openSearch(page)
    await type(page, 'gym card ')
    await expect(page.getByTestId('memo-card')).toHaveCount(1) // only a memo matches
    for (const t of ['meetings', 'memos', 'transcript']) await expect(page.getByTestId(`tag-${t}`)).toHaveCount(0)
    await expect(page.getByTestId('ai-synthesis')).toBeEnabled()
  })

  test('a question offers only the Transcript tag: you want content, not a file', async ({ page }) => {
    await openSearch(page)
    await type(page, 'what did we decide about nexo ')
    await expect(page.getByTestId('tag-transcript')).toBeVisible()
    for (const t of ['meetings', 'memos', 'actions']) await expect(page.getByTestId(`tag-${t}`)).toHaveCount(0)
    await type(page, 'what did we decide about nexo m')
    for (const t of ['meetings', 'memos']) await expect(page.getByTestId(`tag-${t}`)).toHaveCount(0)
  })

  test('direct hits come first: meetings titled "Nexo" top the recordings', async ({ page }) => {
    await openSearch(page)
    await type(page, 'Nexo')
    const titled = mock.meetings.filter((m) => /nexo/i.test(m.title)).length
    await page.getByTestId('group-recordings').getByTestId('unfold').click()
    const cards = page.getByTestId('group-recordings').locator('[data-testid$="-card"]')
    for (let i = 0; i < titled; i++) {
      await expect(cards.nth(i)).toHaveAttribute('data-testid', 'meeting-card')
      await expect(cards.nth(i).locator('span').first()).toContainText('Nexo')
    }
    await expect(page.getByTestId('transcript-group').first().locator('mark').first()).toBeVisible()
  })

  test('actions highlight the word in their meeting name too', async ({ page }) => {
    await openSearch(page)
    await type(page, 'Nexo')
    await page.getByTestId('group-actions').getByTestId('unfold').click()
    await expect(page.getByTestId('action-item').locator('span.truncate mark').first()).toHaveText(/nexo/i)
  })

  test('finishing a word never loses results: "percen" and "percent" both find the percent memos', async ({ page }) => {
    const withWord = mock.memos.filter((m) => /\bpercent/i.test(m.content)).map((m) => m.id)
    expect(withWord.length).toBeGreaterThan(0)
    await openSearch(page)
    for (const q of ['percen', 'percent']) {
      await type(page, q)
      const unfold = page.getByTestId('group-recordings').getByTestId('unfold')
      if (await unfold.count()) await unfold.click()
      for (const id of withWord) await expect(page.locator(`[data-testid="memo-card"][data-id="${id}"]`), `${q} -> ${id}`).toBeVisible()
    }
  })

  test('a day and month complete to the full date: "21.09" suggests 21.09.26', async ({ page }) => {
    await openSearch(page)
    await type(page, '21.09')
    await expect(page.getByTestId('tag-date')).toContainText('21.09.26')
    await page.getByTestId('tag-date').click()
    await expect(page.getByRole('searchbox', { name: 'Search', exact: true })).toHaveValue('21.09.26 ')
    await expect(page.getByTestId('meeting-card')).toHaveCount(mock.meetings.filter((m) => m.startsAt.startsWith('2026-09-21')).length)
  })

  test('typing a year or month suggests it as a tag', async ({ page }) => {
    await openSearch(page)
    await type(page, '2026')
    await expect(page.getByTestId('empty-state')).toHaveCount(0) // the year is not a search word
    await expect(page.getByTestId('tag-date')).toContainText('2026')
    await page.getByTestId('tag-date').click()
    await expect(page.getByTestId('tag-word')).toHaveText('2026')
    await expect(page.getByTestId('tag-meetings')).toContainText(String(mock.meetings.length)) // counts follow the data
    await expect(page.getByTestId('tag-memos')).toContainText(String(mock.memos.length))
    await type(page, 'september')
    await expect(page.getByTestId('tag-date')).toContainText('September 2026')
    await page.getByTestId('tag-date').click()
    await expect(page.getByTestId('tag-meetings')).toContainText(String(mock.meetings.filter((m) => m.startsAt.startsWith('2026-09')).length))
    await expect(page.getByTestId('tag-memos')).toContainText(String(mock.memos.filter((m) => m.createdAt.startsWith('2026-09')).length))
    await type(page, '16 October') // day + month name stays plain text
    await expect(page.getByTestId('tag-date')).toHaveCount(0)
  })

  test('AI search: ready -> thinking dots -> answer with time chips, pushing the results down', async ({ page }) => {
    await openSearch(page)
    await type(page, 'defer SSO')
    const ai = page.getByTestId('ai-section')
    await expect(ai).toHaveAttribute('data-state', 'ready')
    const firstResult = page.getByTestId('meeting-card').first()
    const before = (await firstResult.boundingBox())!.y
    await page.getByTestId('ai-synthesis').click()
    await expect(ai).toHaveAttribute('data-state', 'thinking')
    await expect(page.getByTestId('synthesizing')).toHaveText('Synthesizing your answer…')
    await expect(ai).toHaveAttribute('data-state', 'done')
    await expect(page.getByTestId('time-chip').first()).toHaveText(/\d\d:\d\d/)
    await expect(page.getByTestId('ai-result')).toContainText('SSO')
    await expect(firstResult).toBeVisible() // results stay, now lower
    expect((await firstResult.boundingBox())!.y).toBeGreaterThan(before)
    // the answer summarises the results; no extra sources section appears (D69)
    await expect(page.getByTestId('ai-sources')).toHaveCount(0)
    await page.getByTestId('ai-synthesis').click() // tapping again hides the answer
    await expect(ai).toHaveAttribute('data-state', 'ready')
  })

  test('picking a tag keeps the search field focused; tapping results blurs it', async ({ page }) => {
    await openSearch(page)
    await type(page, 'Nexo')
    await page.getByTestId('tag-memos').click()
    await expect(page.getByRole('searchbox', { name: 'Search', exact: true })).toBeFocused()
    await page.getByTestId('search-body').click({ position: { x: 5, y: 5 } })
    await expect(page.getByRole('searchbox', { name: 'Search', exact: true })).not.toBeFocused()
  })

  test('suggestions disappear with the keyboard and return on focus; Enter closes the keyboard', async ({ page }) => {
    await openSearch(page)
    const box = page.getByRole('searchbox', { name: 'Search', exact: true })
    await type(page, 'Nexo')
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
    await type(page, 'Nexo')
    await page.getByTestId('tag-memos').click()
    const tag = await page.getByTestId('tag-word').boundingBox()
    const box = await page.getByTestId('tag-word').locator('xpath=ancestor::span[contains(@class,"overflow-hidden")]').boundingBox()
    expect(tag!.y - 3).toBeGreaterThanOrEqual(box!.y)
    expect(tag!.y + tag!.height + 3).toBeLessThanOrEqual(box!.y + box!.height)
  })
})

// ---- AI Synthesis: real questions, answered from the meeting notes ----
const QA: [string, string[]][] = [
  ['What did we agree about the feature?', ['five steps with a progress checklist', 'CSV import moves to step two', 'SSO is postponed']],
  ['When is the deadline we decided to?', ['16 October', '21 October', '23 October', '5 November', '14 November']],
  ['Why was SSO postponed?', ['SSO is postponed to version two', 'blow the 14 November launch date']],
  ['Who is responsible for the CSV import?', ['Jonas', 'CSV import fixes are done by 23 October']],
  ['How much does Kestrel cost?', ['1,200 per month', 'fifteen percent off']],
  ['What are the risks for the launch?', ['biggest technical risk', 'Support capacity', 'SSO']],
  ['What is our onboarding completion target?', ['seventy percent']],
  ['How long does onboarding take today?', ['twenty-six minutes']],
  ['When does the beta start?', ['The beta starts on 21 October']],
  ['What did Brightside say about pricing?', ['price matters', 'pay a bit extra']],
  ['How many beta customers do we have?', ['twelve']],
  ['Who is on call during launch?', ['Jonas', 'on call']],
  ['When is the go or no-go meeting?', ['5 November']],
  ['What is the crash-free target?', ['ninety-nine point five percent']],
  ['Is Kestrel data stored in the EU?', ['Frankfurt']],
  ['What did we agree about SSO?', ['SSO is postponed', 'not mentioned in the launch communication']],
  ['Why did we replace the word workspace?', ['“account”', 'Brightside Dental was confused']],
  ['What happened in the Kestrel call?', ['summary of “Vendor Call: Kestrel Analytics”']],
]

test.describe('AI synthesis answers', () => {
  test('answers project questions with facts and time chips', async ({ page }) => {
    test.setTimeout(180_000)
    await openSearch(page)
    const box = page.getByRole('searchbox', { name: 'Search', exact: true })
    for (const [question, expected] of QA) {
      await box.fill(question)
      await page.getByTestId('ai-synthesis').click()
      const answer = page.getByTestId('ai-result')
      await expect(answer, question).toBeVisible()
      const text = (await answer.textContent()) ?? ''
      for (const part of expected) expect(text, `${question} → ${part}`).toContain(part)
      if (!question.startsWith('What happened')) await expect(page.getByTestId('time-chip').first()).toHaveText(/\d\d:\d\d/)
      await box.focus()
    }
  })

  test('the answer is a summary, never a list of meetings with quotes', async ({ page }) => {
    await openSearch(page)
    await type(page, 'What did we agree about the feature?')
    await page.getByTestId('ai-synthesis').click()
    const answer = page.getByTestId('ai-result')
    await expect(answer).toBeVisible()
    const text = (await answer.textContent()) ?? ''
    for (const m of mock.meetings) expect(text, `answer names meeting ${m.title}`).not.toContain(m.title)
    expect(await answer.locator('[class*="block"]').count()).toBe(0) // one paragraph, no list
  })

  for (const query of ['nexxo decision', 'nexo decision', 'pricing', 'What did we agree about the feature?', 'When is the deadline we decided to?', 'kestrel']) {
    test(`AI never brings in other sources than the search: "${query}"`, async ({ page }) => {
      await openSearch(page)
      await type(page, query)
      const unfoldAll = async () => { for (const u of await page.getByTestId('unfold').all()) if ((await u.getAttribute('aria-expanded')) === 'false') await u.click() }
      const snapshot = () => page.evaluate(() => ({
        moments: [...document.querySelectorAll('[data-testid=transcript-group]')].flatMap((g) =>
          [...g.querySelectorAll('[data-testid=transcript-hit]')].map((h) => `${g.getAttribute('data-meeting')}@${h.getAttribute('data-time')}`)),
        recordings: [...document.querySelectorAll('[data-testid=meeting-card],[data-testid=memo-card]')].map((c) => c.getAttribute('data-id')),
        actions: [...document.querySelectorAll('[data-testid=action-item]')].map((a) => a.textContent),
      }))
      await unfoldAll()
      const before = await snapshot()
      expect(before.moments.length + before.recordings.length, 'the search finds something').toBeGreaterThan(0)
      await page.getByTestId('ai-synthesis').click()
      await expect(page.getByTestId('ai-result')).toBeVisible()
      await unfoldAll()
      expect(await snapshot(), 'results are the same after pressing AI').toEqual(before)
      // every time chip in the answer is a moment shown in the results
      const times = new Set(before.moments.map((m) => m.split('@')[1]))
      for (const chip of await page.getByTestId('time-chip').allTextContents()) expect(times.has(chip.trim()), `chip ${chip}`).toBe(true)
    })
  }

  test('typos are corrected: "nexxo decision" finds what "nexo decision" finds', async ({ page }) => {
    await openSearch(page)
    await type(page, 'nexo decision')
    const right = await page.getByTestId('transcript-hit').count()
    await type(page, 'nexxo decision')
    await expect(page.getByTestId('transcript-hit')).toHaveCount(right)
    expect(right).toBeGreaterThan(0)
  })

  test('a question about a day summarises that day: meetings, what they were about, actions', async ({ page }) => {
    const m = mock.meetings.find((x) => x.startsAt.startsWith('2026-09-21'))!
    const acts = mock.actions.filter((a) => a.meetingId === m.id)
    await openSearch(page)
    await type(page, 'what happened on 21.09.26')
    await expect(page.getByTestId('meeting-card')).toHaveCount(1) // the date applies without picking the tag
    await page.getByTestId('ai-synthesis').click()
    const r = page.getByTestId('ai-result')
    await expect(r).toContainText('On 21 September 2026 you had one meeting')
    await expect(r).toContainText(m.title)
    await expect(r).toContainText(`led to ${acts.length === 1 ? 'one action' : ''}`)
    await expect(page.getByTestId('meeting-card')).toHaveCount(1) // still the same results
  })

  test('says it cannot help when the meetings do not know', async ({ page }) => {
    await openSearch(page)
    await type(page, 'What is the weather today?')
    await page.getByTestId('ai-synthesis').click()
    await expect(page.getByTestId('ai-result')).toHaveText('Can’t help you with that.')
  })

  test('every time chip points at a real transcript moment', async () => {
    for (const m of mock.meetings) {
      const t = mock.transcripts.find((x) => x.meetingId === m.id)
      expect(t, `${m.id} has a transcript`).toBeTruthy()
      const starts = new Set(t!.segments.map((s) => s.start))
      for (const k of m.keyPoints) expect(starts.has(k.at), `${m.id} key point at ${k.at}`).toBe(true)
    }
  })
})

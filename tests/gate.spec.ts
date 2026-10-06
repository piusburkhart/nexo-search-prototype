import { expect, test } from '@playwright/test'

test('password gate: wrong password stays locked, "above" unlocks and is remembered', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Recordings' })).toHaveCount(0)
  await page.getByLabel('Password').fill('nope')
  await page.getByRole('button', { name: 'Open' }).click()
  await expect(page.getByRole('alert')).toHaveText('Wrong password')
  await page.getByLabel('Password').fill('above')
  await page.getByRole('button', { name: 'Open' }).click()
  await expect(page.getByRole('heading', { name: 'Recordings' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Recordings' })).toBeVisible()
})

test('password gate protects deep links too', async ({ page }) => {
  await page.goto('/#/transcript/t01')
  await expect(page.getByLabel('Password')).toBeVisible()
  await expect(page.locator('[data-seg-start]')).toHaveCount(0)
})

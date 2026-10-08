import { defineConfig } from '@playwright/test'

// PW_PORT runs the tests against a fresh dev server on another port, next to one already running.
const port = Number(process.env.PW_PORT ?? 5173)

export default defineConfig({
  testDir: 'tests',
  use: { baseURL: `http://localhost:${port}`, viewport: { width: 402, height: 874 } },
  webServer: { command: `npm run dev -- --port ${port} --strictPort`, url: `http://localhost:${port}`, reuseExistingServer: true },
})

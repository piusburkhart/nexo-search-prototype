// Usage: node tests/shot.mjs <hash> <out.png> [typed query]
import { chromium } from '@playwright/test'
const [, , hash, out, type] = process.argv
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 402, height: 874 } })
await p.goto('http://localhost:5173/' + hash)
if (type) await p.fill('input[aria-label=Search]', type)
await p.waitForTimeout(1300)
await p.screenshot({ path: out })
await b.close()

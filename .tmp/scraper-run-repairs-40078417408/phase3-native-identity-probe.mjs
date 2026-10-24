import fs from 'node:fs/promises'
import { chromium } from 'playwright'
import { createPhenomScraper } from '../../scraper-support/phenom/engine.js'

const output = '.tmp/scraper-run-repairs-40078417408/phase3-native-identity'
await fs.mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
try {
  await Promise.all([
    ['juniper', 'https://careers.hpe.com/juniper'],
    ['gianteagle', 'https://jobs.gianteagle.com/in/hi/search-results'],
  ].map(async ([source, url]) => {
    const page = await browser.newPage()
    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 })
      const html = await response.text()
      await fs.writeFile(output + '/' + source + '-landing.html', html)
      const scraper = createPhenomScraper({ source, companyName: source, baseUrl: new URL(url).origin,
        scraperDir: 'scraper-support/tests' })
      const payload = scraper.extractSearchPayload(html)
      await fs.writeFile(output + '/' + source + '-landing-payload.json', JSON.stringify(payload, null, 2))
      const summary = { source, requestedUrl: url, responseUrl: response.url(), status: response.status(),
        title: await page.title(), bytes: Buffer.byteLength(html), totalHits: payload.totalHits,
        jobs: payload.jobs?.length, countries: payload.aggregations?.country,
        jobLinks: await page.locator('a[href*="/job/"]').evaluateAll(links => links.slice(0, 15).map(link => ({ url: link.href, text: link.textContent.trim() }))),
        at: new Date().toISOString() }
      await fs.writeFile(output + '/' + source + '-landing-evidence.json', JSON.stringify(summary, null, 2))
      console.log(JSON.stringify(summary))
    } catch (error) { console.log(JSON.stringify({ source, error: error.message })) }
    finally { await page.close() }
  }))
} finally { await browser.close() }

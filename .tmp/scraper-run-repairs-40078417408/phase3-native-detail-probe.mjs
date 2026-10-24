import fs from 'node:fs/promises'
import { chromium } from 'playwright'
import { createPhenomScraper } from '../../scraper-support/phenom/engine.js'

const output = '.tmp/scraper-run-repairs-40078417408/phase3-native-identity'
const browser = await chromium.launch({ headless: true })
try {
  for (const source of ['juniper', 'gianteagle']) {
    const payload = JSON.parse(await fs.readFile(output + '/' + source + '-landing-payload.json', 'utf8'))
    const engine = createPhenomScraper({ source, companyName: source,
      baseUrl: source === 'juniper' ? 'https://careers.hpe.com' : 'https://jobs.gianteagle.com',
      searchPath: source === 'juniper' ? '/juniper' : '/in/hi/search-results',
      ...(source === 'juniper' ? { jobPathPrefix: '/us/en' } : {}), scraperDir: 'scraper-support/tests' })
    const selected = payload.jobs.filter(job => job.country === 'India').slice(0, source === 'juniper' ? 1 : 2)
    for (const raw of selected) {
      const [job] = engine.extractSearchResults({ jobs: [raw] })
      const page = await browser.newPage()
      try {
        const response = await page.goto(job.sourceUrl, { waitUntil: 'domcontentloaded', timeout: 35000 })
        const html = await response.text()
        await fs.writeFile(output + '/' + source + '-detail-' + job.jobId + '.html', html)
        const native = await page.evaluate(() => ({ jobDetail: globalThis.phApp?.ddo?.jobDetail,
          alternateLinks: [...document.querySelectorAll('link[rel="canonical"],link[rel="alternate"]')].map(link => ({ rel: link.rel, lang: link.hreflang, href: link.href })),
          jsonLd: [...document.querySelectorAll('script[type="application/ld+json"]')].map(script => { try { return JSON.parse(script.textContent) } catch { return null } }),
        }))
        await fs.writeFile(output + '/' + source + '-detail-' + job.jobId + '-native.json', JSON.stringify(native, null, 2))
        const data = native.jobDetail?.data?.job
        console.log(JSON.stringify({ source, listing: raw, requestedUrl: job.sourceUrl, responseUrl: response.url(), status: response.status(),
          detail: data && Object.fromEntries(['title', 'reqId', 'jobId', 'jobSeqNo', 'country', 'ml_country', 'standardisedCountry', 'multi_location', 'multi_location_array', 'location', 'cityStateCountry', 'applyUrl', 'locale', 'companyName'].map(key => [key, data[key]])),
          links: native.alternateLinks, jsonLd: native.jsonLd.map(value => ({ title: value?.title || value?.name, type: value?.['@type'], identifier: value?.identifier, jobLocation: value?.jobLocation, hiringOrganization: value?.hiringOrganization })),
          bytes: Buffer.byteLength(html), at: new Date().toISOString() }))
      } catch (error) { console.log(JSON.stringify({ source, jobId: job.jobId, error: error.message })) }
      finally { await page.close() }
    }
  }
} finally { await browser.close() }

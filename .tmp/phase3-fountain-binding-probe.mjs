import { chromium } from 'playwright'
import { writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { readNativeDocument } from '../scraper-support/utils/activeNativeHtml.js'
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage()
  for (const [name, url] of [
    ['cms-careers-binding', 'https://www.cms.com/careers'],
    ['cms-public-board', 'https://careers.ap-1.fountain.com/cms/a9218256-8fbf-40ab-936b-49ff5ff7c900'],
    ['cms-public-role', 'https://ap-1.fountain.com/cms/apply/chennai-project-manager-chennai'],
  ]) {
    try {
      const response = await page.goto(url, { timeout: 25000, waitUntil: 'domcontentloaded' })
      const html = await response.text()
      const links = readNativeDocument(html).nodes(node => node.tag === 'a').map(node => node.attrs.href).filter(href => /fountain|rekrutek/i.test(href || ''))
      const evidence = { capturedAt: new Date().toISOString(), requestedUrl: url,
        url: response.url(), status: response.status(), bodySha256: createHash('sha256').update(html).digest('hex'), links }
      await writeFile(new URL('./scraper-run-repairs-40078417408/phase3-provider-evidence/' + name + '.json', import.meta.url), JSON.stringify(evidence, null, 2))
      console.log(JSON.stringify(evidence))
    } catch (error) { console.log(JSON.stringify({ name, error: error.message })) }
  }
} finally { await browser.close() }

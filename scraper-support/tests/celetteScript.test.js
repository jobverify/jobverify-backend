import assert from 'node:assert/strict'
import test from 'node:test'

const loadCeletteModule = async () => {
  try {
    return await import('../../scraper/celette/script.js')
  } catch {
    return null
  }
}

const homepageHtml = `
  <html>
    <body>
      <div class="e-n-accordion-item-title-text">INDIA</div>
      <p><strong>CELETTE INDIA PVT LTD.</strong><br>2/122 B-1, Mylampatty Road, Karayampalayam, Coimbatore 641062 / INDIA</p>
      <a href="https://www.celette.com/workshop-equipment/">Workshop equipment</a>
      <a href="https://www.celette.com/contact/">Contact</a>
    </body>
  </html>
`

test('extractOpenings returns no jobs when the official Celette site exposes India office details but no public careers source', async () => {
  const celette = await loadCeletteModule()
  assert.ok(celette)

  assert.equal(celette.hasIndiaOfficeSignal(homepageHtml), true)
  assert.equal(celette.hasCareerLink(homepageHtml), false)
  assert.deepEqual(celette.extractOpenings(homepageHtml), [])
})

test('run fetches the official Celette site and returns an honest zero-openings result', async () => {
  const celette = await loadCeletteModule()
  assert.ok(celette)

  const requestedUrls = []
  const jobs = await celette.createCeletteScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return homepageHtml
    },
  })

  assert.deepEqual(requestedUrls, ['https://www.celette.com/'])
  assert.deepEqual(jobs, [])
})

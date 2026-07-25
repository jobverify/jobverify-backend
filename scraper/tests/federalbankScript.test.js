import assert from 'node:assert/strict'
import test from 'node:test'

const loadFederalBankModule = async () => {
  try {
    return await import('../federalbank/script.js')
  } catch {
    assert.fail('Expected Federal Bank scraper module at ../federalbank/script.js')
  }
}

const officialCareersPage = `
  <html>
    <head><title>Careers at Federal Bank | Shape the Future of Banking</title></head>
    <body>
      <h1>Career - Welcome</h1>
      <a href="https://federalbankcareers.zappyhire.com/">Explore Opportunities</a>
      <p>Federal Bank announces its job openings only on its official website.</p>
    </body>
  </html>
`

test('run validates the official Federal Bank careers surface before returning no public listings', async () => {
  const { CAREER_PAGE_URL, createFederalBankScraper } = await loadFederalBankModule()
  const requestedUrls = []

  const jobs = await createFederalBankScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return officialCareersPage
    },
  })

  assert.deepEqual(requestedUrls, [CAREER_PAGE_URL])
  assert.deepEqual(jobs, [])
})

test('run refuses to assume there are no Federal Bank listings when the official careers surface changes', async () => {
  const { createFederalBankScraper } = await loadFederalBankModule()

  await assert.rejects(
    () => createFederalBankScraper().run({ fetchText: async () => '<html><title>Unexpected</title></html>' }),
    /Federal Bank official careers surface changed/,
  )
})

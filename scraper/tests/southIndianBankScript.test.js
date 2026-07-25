import assert from 'node:assert/strict'
import test from 'node:test'

const loadSouthIndianBankModule = async () => {
  try {
    return await import('../southindianbank/script.js')
  } catch {
    assert.fail('Expected South Indian Bank scraper module at ../southindianbank/script.js')
  }
}

const careersHtml = `
  <html lang="en">
    <head>
      <title>South Indian Bank Careers</title>
    </head>
    <body>
      <h1>Recruitment Drive Portal</h1>
      <div class="rdc-logo">South Indian Bank</div>
      <section id="current-openings">
        <p>Currently, there are no job openings.</p>
      </section>
    </body>
  </html>
`

test('South Indian Bank scraper targets the official RDC portal and recognizes the verified empty-state signals', async () => {
  const southIndianBank = await loadSouthIndianBankModule()

  assert.equal(southIndianBank.CAREERS_URL, 'https://recruit.southindianbank.bank.in/RDC/')
  assert.equal(southIndianBank.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(southIndianBank.hasEmptyOpeningsSignal(careersHtml), true)
})

test('run returns no jobs when South Indian Bank exposes the verified no-openings public surface', async () => {
  const southIndianBank = await loadSouthIndianBankModule()
  const requestedUrls = []

  const jobs = await southIndianBank.createSouthIndianBankScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === southIndianBank.CAREERS_URL) return careersHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [southIndianBank.CAREERS_URL])
  assert.deepEqual(jobs, [])
})

test('run fails closed when the South Indian Bank public careers surface changes', async () => {
  const southIndianBank = await loadSouthIndianBankModule()

  await assert.rejects(
    southIndianBank.createSouthIndianBankScraper().run({
      fetchText: async () => '<html><title>Unexpected</title></html>',
    }),
    /verified official public surface/i,
  )

  await assert.rejects(
    southIndianBank.createSouthIndianBankScraper().run({
      fetchText: async () => `
        <html>
          <head><title>South Indian Bank Careers</title></head>
          <body>
            <h1>Recruitment Drive Portal</h1>
            <div class="rdc-logo">South Indian Bank</div>
            <p>Open positions are now available.</p>
          </body>
        </html>
      `,
    }),
    /no-openings surface/i,
  )
})

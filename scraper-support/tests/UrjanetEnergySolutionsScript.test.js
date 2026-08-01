import assert from 'node:assert/strict'
import test from 'node:test'

const faqHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Frequently asked questions | Arcadia</h1>
    <p>What happened to Urjanet? Arcadia acquired Urjanet in 2022.</p>
    <p>Urjanet is fully integrated — not a separate company or competitor.</p>
  </body>
</html>
`

const historyHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Company history &amp; acquisitions</h1>
    <p>Urjanet (2022, utility data automation)</p>
    <p>Current status: Fully integrated. Urjanet is not a separate company or competitor.</p>
  </body>
</html>
`

const careersHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Change the future of energy with us</h1>
    <div>Arcadia careers</div>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/urjanetenergysolutions/script.js')
  } catch {
    assert.fail('Expected Urjanet Energy Solutions scraper module at ../../scraper/urjanetenergysolutions/script.js')
  }
}

test('Urjanet Energy Solutions helpers stay pinned to the verified acquisition evidence', async () => {
  const urjanet = await loadModule()

  assert.equal(urjanet.SOURCE, 'urjanetenergysolutions')
  assert.equal(urjanet.COMPANY, 'Urjanet Energy Solutions')
  assert.equal(urjanet.CAREERS_URL, 'https://www.arcadia.com/careers')
  assert.equal(urjanet.hasAcquisitionFaqSignal(faqHtml), true)
  assert.equal(urjanet.hasAcquisitionHistorySignal(historyHtml), true)
  assert.equal(urjanet.hasParentCareersSignal(careersHtml), true)
})

test('Urjanet Energy Solutions run validates the acquisition evidence and stays fail-closed', async () => {
  const urjanet = await loadModule()
  const requestedUrls = []

  const jobs = await urjanet.createUrjanetEnergySolutionsScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === urjanet.FAQ_URL) return faqHtml
      if (url === urjanet.HISTORY_URL) return historyHtml
      if (url === urjanet.CAREERS_URL) return careersHtml
      throw new Error(`Unexpected Urjanet URL: ${url}`)
    },
  })

  assert.deepEqual(jobs, [])
  assert.deepEqual(requestedUrls, [
    urjanet.FAQ_URL,
    urjanet.HISTORY_URL,
    urjanet.CAREERS_URL,
  ])
})

test('Urjanet Energy Solutions fails closed when the acquisition evidence disappears', async () => {
  const urjanet = await loadModule()

  await assert.rejects(
    urjanet.createUrjanetEnergySolutionsScraper().run({
      fetchText: async () => '<html><body><h1>Urjanet Careers</h1></body></html>',
    }),
    /verified acquisition evidence/i,
  )
})

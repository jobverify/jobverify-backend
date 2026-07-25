import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Insurtech Careers & Jobs | Monocept</title>
  </head>
  <body>
    <h1>Insurtech Careers & Jobs</h1>
    <p>Build mission-critical insurance platforms in Hyderabad.</p>
    <a href="https://monocept.turbohire.co/careerpage/0e8227c1-c352-4202-8e40-c0aa16b6ca69">Explore Opportunities</a>
  </body>
</html>
`

const turboHireHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Monocept Consulting Pvt. Ltd. - Career Page</title>
  </head>
  <body>
    <div id="root"></div>
    <script src="/turbohire/app.js"></script>
    <footer>Powered by TurboHire Career Page</footer>
  </body>
</html>
`

const loadScriptModule = async () => {
  try {
    return await import('../monocept/script.js')
  } catch {
    assert.fail('Expected Monocept scraper module at ../monocept/script.js')
  }
}

test('Monocept scraper stays pinned to the first-party handoff plus JS-shell blocker', async () => {
  const monocept = await loadScriptModule()

  assert.equal(monocept.SOURCE, 'monocept')
  assert.equal(monocept.COMPANY, 'Monocept')
  assert.equal(monocept.VERIFIED_ON, '2026-07-18')
  assert.equal(monocept.CAREERS_URL, 'https://www.monocept.com/careers')
  assert.equal(monocept.HANDOFF_URL, 'https://monocept.turbohire.co/careerpage/0e8227c1-c352-4202-8e40-c0aa16b6ca69')
  assert.equal(monocept.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(monocept.hasTurboHireShellSignal(turboHireHtml), true)
  assert.equal(monocept.hasServerRenderedJobsSignal(turboHireHtml), false)
})

test('Monocept scraper returns [] while the TurboHire handoff remains a JS shell', async () => {
  const monocept = await loadScriptModule()
  const requestedUrls = []

  const jobs = await monocept.createMonoceptScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)
      if (url === monocept.CAREERS_URL) return { status: 200, url, html: careersHtml }
      if (url === monocept.HANDOFF_URL) return { status: 200, url, html: turboHireHtml }
      throw new Error(`Unexpected Monocept URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [monocept.CAREERS_URL, monocept.HANDOFF_URL])
  assert.deepEqual(jobs, [])
})

test('Monocept scraper fails closed when the handoff surface changes materially', async () => {
  const monocept = await loadScriptModule()

  await assert.rejects(
    monocept.createMonoceptScraper().run({
      fetchPage: async (url) => {
        if (url === monocept.CAREERS_URL) return { status: 200, url, html: '<title>Unexpected</title>' }
        throw new Error(`Unexpected Monocept URL: ${url}`)
      },
    }),
    /trusted handoff surface/i,
  )

  await assert.rejects(
    monocept.createMonoceptScraper().run({
      fetchPage: async (url) => {
        if (url === monocept.CAREERS_URL) return { status: 200, url, html: careersHtml }
        if (url === monocept.HANDOFF_URL) {
          return {
            status: 200,
            url,
            html: `${turboHireHtml}<section><h2>Current Openings</h2><a>Apply now</a></section>`,
          }
        }
        throw new Error(`Unexpected Monocept URL: ${url}`)
      },
    }),
    /needs a real scraper/i,
  )
})

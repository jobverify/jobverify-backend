import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers - Allyis, India - Tech Mahindra Allyis</title>
  </head>
  <body>
    <main>
      <h1>Join Our Team</h1>
      <h2>Jobs at Allyis, India</h2>
      <p>TechM Allyis</p>
      <p>Secunderabad 500003, India</p>
      <iframe id="jobs-iframe" src="https://staffing.allyisapps.com/home/listjobs/114025"></iframe>
    </main>
  </body>
</html>
`

const blockedIframeError = Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' })
const currentBlockedIframeError = Object.assign(
  new Error('fetch failed | Connect Timeout Error (attempted address: staffing.allyisapps.com:443, timeout: 10000ms)'),
  { code: 'UND_ERR_CONNECT_TIMEOUT' },
)

const loadModule = async () => {
  try {
    return await import('../../scraper/allyisindia/script.js')
  } catch {
    assert.fail('Expected Allyis India scraper module at ../../scraper/allyisindia/script.js')
  }
}

test('Allyis India helpers stay pinned to the verified first-party page and blocked embedded jobs handoff', async () => {
  const allyis = await loadModule()

  assert.equal(allyis.CAREERS_URL, 'https://www.allyis.com/ind/careers')
  assert.equal(allyis.EMBEDDED_JOBS_URL, 'https://staffing.allyisapps.com/home/listjobs/114025')
  assert.equal(allyis.hasOfficialCareersSignal(careersHtml), true)
})

test('Allyis India run stays fail-closed when the official page is intact but the embedded jobs surface is blocked', async () => {
  const allyis = await loadModule()
  const requestedUrls = []

  const jobs = await allyis.createAllyisIndiaScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === allyis.CAREERS_URL) {
        return { status: 200, url, html: careersHtml }
      }

      if (url === allyis.EMBEDDED_JOBS_URL) {
        throw blockedIframeError
      }

      throw new Error(`Unexpected Allyis URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [allyis.CAREERS_URL, allyis.EMBEDDED_JOBS_URL])
  assert.deepEqual(jobs, [])
})

test('Allyis India also treats the current connect-timeout iframe failure as a blocked embedded jobs surface', async () => {
  const allyis = await loadModule()

  const jobs = await allyis.createAllyisIndiaScraper().run({
    fetchPage: async (url) => {
      if (url === allyis.CAREERS_URL) {
        return { status: 200, url, html: careersHtml }
      }

      if (url === allyis.EMBEDDED_JOBS_URL) {
        throw currentBlockedIframeError
      }

      throw new Error(`Unexpected Allyis URL: ${url}`)
    },
  })

  assert.deepEqual(jobs, [])
})

test('Allyis India fails closed when the verified careers shell changes materially', async () => {
  const allyis = await loadModule()

  await assert.rejects(
    allyis.createAllyisIndiaScraper().run({
      fetchPage: async (url) => ({ status: 200, url, html: '<html><body>Unexpected</body></html>' }),
    }),
    /verified allyis india careers page/i,
  )
})

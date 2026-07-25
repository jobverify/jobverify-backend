import assert from 'node:assert/strict'
import test from 'node:test'

const archiveHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Archives: Current Opening</h1>
    <h2><a href="https://www.sourcedeskglobal.com/job/urgent-hiring-business-development-executive-online-bidder-required/">Urgent Hiring: Business Development Executive / Online Bidder Required</a></h2>
    <h2><a href="https://www.sourcedeskglobal.com/job/seo-strategy-manager/">SEO Strategy Manager</a></h2>
  </body>
</html>
`

const detailHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Find Your Job</h1>
    <a href="https://www.sourcedeskglobal.com/job/">Current Opening</a>
    <a href="#apply">Apply Now</a>
    <h2>Urgent Hiring: Business Development Executive / Online Bidder Required</h2>
    <p>We are seeking a talented and proactive Online Bidder / Business Development Executive (BDE) to join our dynamic team.</p>
    <p>Experience: 2 - 7 years</p>
    <p>Salary Range: 8 - 12 Lacs P.A.</p>
    <p>Location: Hiring office located in Kolkata</p>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../sourcedeskglobal/script.js')
  } catch {
    assert.fail('Expected Sourcedesk Global scraper module at ../sourcedeskglobal/script.js')
  }
}

test('Sourcedesk Global validates the first-party archive and extracts listing URLs', async () => {
  const sourcedesk = await loadModule()

  assert.equal(sourcedesk.SOURCE, 'sourcedeskglobal')
  assert.equal(sourcedesk.COMPANY, 'Sourcedesk Global')
  assert.equal(sourcedesk.CAREERS_URL, 'https://www.sourcedeskglobal.com/job/')
  assert.equal(sourcedesk.VERIFIED_ON, '2026-07-18')
  assert.equal(sourcedesk.hasOfficialArchiveSignal(archiveHtml), true)
  assert.deepEqual(sourcedesk.extractListingUrls(archiveHtml), [
    'https://www.sourcedeskglobal.com/job/urgent-hiring-business-development-executive-online-bidder-required/',
    'https://www.sourcedeskglobal.com/job/seo-strategy-manager/',
  ])
})

test('Sourcedesk Global run maps first-party detail pages into normalized jobs', async () => {
  const sourcedesk = await loadModule()
  const requestedUrls = []

  const jobs = await sourcedesk.createSourcedeskGlobalScraper({
    now: () => '2026-07-18T00:00:00.000Z',
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === sourcedesk.CAREERS_URL) return archiveHtml
      if (url === 'https://www.sourcedeskglobal.com/job/urgent-hiring-business-development-executive-online-bidder-required/') {
        return detailHtml
      }
      if (url === 'https://www.sourcedeskglobal.com/job/seo-strategy-manager/') {
        return detailHtml
          .replace(/Urgent Hiring: Business Development Executive \/ Online Bidder Required/g, 'SEO Strategy Manager')
          .replace(/Online Bidder \/ Business Development Executive \(BDE\)/g, 'SEO Strategy Manager')
          .replace(/2 - 7 years/g, '2 - 9 years')
          .replace(/8 - 12 Lacs P\.A\./g, '3.5-6.5 Lacs P.A.')
      }
      throw new Error(`Unexpected Sourcedesk URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    sourcedesk.CAREERS_URL,
    'https://www.sourcedeskglobal.com/job/urgent-hiring-business-development-executive-online-bidder-required/',
    'https://www.sourcedeskglobal.com/job/seo-strategy-manager/',
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].location, 'Kolkata, India')
  assert.equal(jobs[0].applyUrl, 'https://www.sourcedeskglobal.com/job/urgent-hiring-business-development-executive-online-bidder-required/')
  assert.equal(jobs[1].title, 'SEO Strategy Manager')
})

test('Sourcedesk Global fails closed when the archive or first-party detail contract drifts', async () => {
  const sourcedesk = await loadModule()

  await assert.rejects(
    sourcedesk.createSourcedeskGlobalScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected</h1></body></html>',
    }),
    /verified first-party current-opening archive/i,
  )
})

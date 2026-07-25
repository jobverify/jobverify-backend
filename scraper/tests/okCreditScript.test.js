import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Best Digital Bahi Khata & Ledger App | OkCredit</title>
    <meta name="description" content="OkCredit is a digital Udhar-Khata app for businesses & shop owners with free and premium plans." />
  </head>
  <body>
    <h1>Digital Udhar Bahi Khata</h1>
    <p>Keep track of receivables and payables. Make collections simpler and faster.</p>
    <p>Spread across 2,800 cities</p>
    <p>© OkCredit Psi Phi Global Solutions Pvt. Ltd. | All Rights Reserved</p>
  </body>
</html>
`

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Check out top career opportunities with us | OkCredit</title>
  </head>
  <body>
    <a href="./careers">Careers</a>
    <h1>Ready to create something big?</h1>
    <h2>We are not hiring at the moment</h2>
    <h2>No Current Job Openings</h2>
    <p>We are not hiring at the moment. Please feel free to contact us at peopleops@okcredit.in for any inquiries.</p>
    <p>Food is on us!</p>
    <p>Flexible work hours</p>
  </body>
</html>
`

const careersWithJobsHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Check out top career opportunities with us | OkCredit</title>
  </head>
  <body>
    <h1>Ready to create something big?</h1>
    <h2>Software Engineer</h2>
    <a href="https://jobs.lever.co/okcredit/software-engineer">Apply now</a>
  </body>
</html>
`

const loadOkCreditModule = async () => {
  try {
    return await import('../okcredit/script.js')
  } catch {
    assert.fail('Expected OkCredit scraper module at ../okcredit/script.js')
  }
}

test('OkCredit sentinel pins the verified first-party no-current-openings careers surface from Friday, July 17, 2026', async () => {
  const okCredit = await loadOkCreditModule()

  assert.equal(okCredit.SOURCE, 'okcredit')
  assert.equal(okCredit.COMPANY, 'OkCredit')
  assert.equal(okCredit.OFFICIAL_BRAND_NAME, 'OkCredit')
  assert.equal(okCredit.VERIFIED_ON, '2026-07-17')
  assert.equal(okCredit.HOMEPAGE_URL, 'https://okcredit.in/')
  assert.equal(okCredit.CAREERS_URL, 'https://okcredit.in/careers')
  assert.match(okCredit.VERIFIED_SURFACE_SUMMARY, /No Current Job Openings/i)

  assert.equal(okCredit.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(okCredit.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(okCredit.hasPublicJobsSignal(careersHtml), false)
  assert.equal(okCredit.hasPublicJobsSignal(careersWithJobsHtml), true)
})

test('OkCredit returns [] only while the official first-party careers page keeps the verified no-open-jobs state', async () => {
  const okCredit = await loadOkCreditModule()
  const requestedUrls = []

  const jobs = await okCredit.createOkCreditScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === okCredit.HOMEPAGE_URL) {
        return { status: 200, url, html: homepageHtml }
      }

      if (url === okCredit.CAREERS_URL) {
        return { status: 200, url, html: careersHtml }
      }

      throw new Error(`Unexpected OkCredit URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    okCredit.HOMEPAGE_URL,
    okCredit.CAREERS_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('OkCredit fails closed when the official careers surface drifts into public openings', async () => {
  const okCredit = await loadOkCreditModule()

  await assert.rejects(
    okCredit.createOkCreditScraper().run({
      fetchPage: async (url) => ({
        status: 200,
        url,
        html: '<html><body><h1>OkCredit</h1></body></html>',
      }),
    }),
    /homepage/i,
  )

  await assert.rejects(
    okCredit.createOkCreditScraper().run({
      fetchPage: async (url) => {
        if (url === okCredit.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        return { status: 200, url, html: careersWithJobsHtml }
      },
    }),
    /public jobs/i,
  )
})

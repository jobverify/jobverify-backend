import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Aurobindo Pharma - Leading Global Pharmaceutical Company</title>
  </head>
  <body>
    <nav>
      <a href="/careers">Careers</a>
      <a href="/careers/life-at-aurobindo">Life @ Aurobindo</a>
      <a target="_blank" href="https://aurobindo.talentrecruit.com/Search/">Work with us / Opportunities</a>
    </nav>
    <section>
      <h1>Aurobindo Pharma</h1>
      <p>Leading Global Pharmaceutical Company</p>
    </section>
  </body>
</html>
`

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Aurobindo Pharma Careers - Join Our Growing Team</title>
    <link rel="canonical" href="https://www.aurobindo.com/careers" />
  </head>
  <body>
    <main>
      <h1>Career</h1>
      <p>A culture of Inclusion, Inspiration, and Individual Growth.</p>
      <a href="/careers">Our Culture &amp; Values</a>
      <a href="/careers/life-at-aurobindo">Life @ Aurobindo</a>
      <a target="_blank" href="https://aurobindo.talentrecruit.com/Search/">Work with us / Opportunities</a>
      <section>
        <h2>Recruitment scam alert</h2>
        <p>This note is to caution you against any fake recruitment ad under the name of Aurbindo Pharma which seeks financial commitment from candidates prior or during the application process.</p>
        <p>We want to make it clear that Aurobindo Pharma Limited NEVER charges any fees at any stage of the recruitment process.</p>
      </section>
    </main>
  </body>
</html>
`

const brokenTalentRecruitSearchHtml = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <title>404 - File or directory not found.</title>
  </head>
  <body>
    <div id="header"><h1>Server Error</h1></div>
    <div id="content">
      <div class="content-container">
        <fieldset>
          <h2>404 - File or directory not found.</h2>
          <h3>The resource you are looking for might have been removed, had its name changed, or is temporarily unavailable.</h3>
        </fieldset>
      </div>
    </div>
  </body>
</html>
`

const brokenTalentRecruitHostHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>IIS Windows Server</title>
  </head>
  <body>
    <h1>IIS Windows Server</h1>
  </body>
</html>
`

const publicJobsHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Browse All Jobs</h1>
    <p>12 Jobs Found</p>
    <a href="/career-page/apply/abc123">Apply Now</a>
  </body>
</html>
`

const loadAurobindoPharmaModule = async () => {
  try {
    return await import('../aurobindopharma/script.js')
  } catch {
    assert.fail('Expected Aurobindo Pharma scraper module at ../aurobindopharma/script.js')
  }
}

test('Aurobindo Pharma constants stay pinned to the verified homepage, careers page, and broken TalentRecruit handoff state', async () => {
  const aurobindoPharma = await loadAurobindoPharmaModule()

  assert.equal(aurobindoPharma.SOURCE, 'aurobindopharma')
  assert.equal(aurobindoPharma.COMPANY, 'Aurobindo Pharma')
  assert.equal(aurobindoPharma.OFFICIAL_BRAND_NAME, 'Aurobindo Pharma')
  assert.equal(aurobindoPharma.VERIFIED_ON, '2026-07-15')
  assert.equal(aurobindoPharma.HOMEPAGE_URL, 'https://www.aurobindo.com/')
  assert.equal(aurobindoPharma.CAREERS_PAGE_URL, 'https://www.aurobindo.com/careers')
  assert.equal(aurobindoPharma.CAREERS_HANDOFF_URL, 'https://aurobindo.talentrecruit.com/Search/')
  assert.equal(aurobindoPharma.CAREERS_HOST_URL, 'https://aurobindo.talentrecruit.com/')
  assert.match(aurobindoPharma.VERIFIED_SURFACE_SUMMARY, /TalentRecruit/i)
  assert.equal(aurobindoPharma.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(aurobindoPharma.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(
    aurobindoPharma.hasBrokenTalentRecruitSearchSignal({
      status: 404,
      html: brokenTalentRecruitSearchHtml,
    }),
    true,
  )
  assert.equal(
    aurobindoPharma.hasBrokenTalentRecruitHostSignal({
      status: 200,
      html: brokenTalentRecruitHostHtml,
    }),
    true,
  )
  assert.equal(aurobindoPharma.hasPublicJobsSignal(publicJobsHtml), true)
})

test('Aurobindo Pharma sentinel returns [] only while the verified broken TalentRecruit handoff persists', async () => {
  const aurobindoPharma = await loadAurobindoPharmaModule()
  const requestedUrls = []

  const jobs = await aurobindoPharma.createAurobindoPharmaScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === aurobindoPharma.HOMEPAGE_URL) {
        return { status: 200, url, html: homepageHtml }
      }

      if (url === aurobindoPharma.CAREERS_PAGE_URL) {
        return { status: 200, url, html: careersHtml }
      }

      if (url === aurobindoPharma.CAREERS_HANDOFF_URL) {
        return { status: 404, url, html: brokenTalentRecruitSearchHtml }
      }

      if (url === aurobindoPharma.CAREERS_HOST_URL) {
        return { status: 200, url, html: brokenTalentRecruitHostHtml }
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    aurobindoPharma.HOMEPAGE_URL,
    aurobindoPharma.CAREERS_PAGE_URL,
    aurobindoPharma.CAREERS_HANDOFF_URL,
    aurobindoPharma.CAREERS_HOST_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('Aurobindo Pharma sentinel fails closed when the official pages drift or the TalentRecruit handoff becomes a real public board', async () => {
  const aurobindoPharma = await loadAurobindoPharmaModule()

  await assert.rejects(
    aurobindoPharma.createAurobindoPharmaScraper().run({
      fetchPage: async (url) => {
        if (url === aurobindoPharma.HOMEPAGE_URL) {
          return { status: 200, url, html: '<html><body><h1>Unexpected homepage</h1></body></html>' }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /official homepage/i,
  )

  await assert.rejects(
    aurobindoPharma.createAurobindoPharmaScraper().run({
      fetchPage: async (url) => {
        if (url === aurobindoPharma.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === aurobindoPharma.CAREERS_PAGE_URL) {
          return { status: 200, url, html: '<html><body><h1>Careers</h1></body></html>' }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /careers page/i,
  )

  await assert.rejects(
    aurobindoPharma.createAurobindoPharmaScraper().run({
      fetchPage: async (url) => {
        if (url === aurobindoPharma.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === aurobindoPharma.CAREERS_PAGE_URL) {
          return { status: 200, url, html: careersHtml }
        }

        if (url === aurobindoPharma.CAREERS_HANDOFF_URL) {
          return { status: 200, url, html: publicJobsHtml }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /talentrecruit handoff no longer matches the verified broken state/i,
  )

  await assert.rejects(
    aurobindoPharma.createAurobindoPharmaScraper().run({
      fetchPage: async (url) => {
        if (url === aurobindoPharma.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === aurobindoPharma.CAREERS_PAGE_URL) {
          return { status: 200, url, html: careersHtml }
        }

        if (url === aurobindoPharma.CAREERS_HANDOFF_URL) {
          return { status: 404, url, html: brokenTalentRecruitSearchHtml }
        }

        if (url === aurobindoPharma.CAREERS_HOST_URL) {
          return { status: 200, url, html: '<html><body><h1>TalentRecruit</h1></body></html>' }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /talentrecruit host no longer matches the verified default-host broken state/i,
  )
})

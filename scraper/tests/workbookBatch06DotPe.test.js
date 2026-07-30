import assert from 'node:assert/strict'
import test from 'node:test'

const VERIFIED_SURFACE_HTML = `
  <!doctype html>
  <html lang="en">
    <head>
      <title>DotPe</title>
    </head>
    <body>
      <main>
        <section class="top-banner-section">
          <p>Work at Dotpe</p>
          <h1>Build something exciting.</h1>
          <p>We are looking for passionate folks like you to reimagine the future of commerce in India</p>
          <a href="#" class="get-started-btn">View Open Roles</a>
        </section>

        <section class="see-openings-sec">
          <p>Help us transform commerce for millions of merchants.</p>
          <a href="#" class="see-openings-btn">See Openings</a>
        </section>

        <section class="hiring-section">
          <h1>We’re hiring</h1>
          <h2>innovators, boundary-pushers, problem solvers, forward thinkers</h2>
          <form class="form-inline">
            <input type="text" class="form-control" placeholder="Search Jobs, Enter Keyword">
            <button type="submit" class="btn btn-primary request-callback-btn">Search all Jobs</button>
          </form>
        </section>

        <section class="culture">
          <h2>Value that we seek in our people and cultivate in our culture.</h2>
          <h3>AWESOMENESS IN THEIR DNA</h3>
          <h3>CUSTOMER OBSESSION</h3>
          <h3>A FUNNY BONE</h3>
        </section>
      </main>
    </body>
  </html>
`

const loadModule = async () => {
  try {
    return await import('../workbookbatch06/dotpe.js')
  } catch {
    assert.fail('Expected DotPe scraper module at ../workbookbatch06/dotpe.js')
  }
}

test('DotPe validates the verified public careers surface and returns [] while no trustworthy public jobs contract exists', async () => {
  const dotpe = await loadModule()
  let requestedUrl = null

  const jobs = await dotpe.run({
    fetchHtml: async (url) => {
      requestedUrl = url
      return VERIFIED_SURFACE_HTML
    },
  })

  assert.equal(requestedUrl, dotpe.CAREERS_URL)
  assert.deepEqual(jobs, [])
  assert.equal(dotpe.SOURCE, 'dotpe')
  assert.equal(dotpe.COMPANY, 'DotPe')
  assert.equal(dotpe.OFFICIAL_BRAND, 'DotPe')
  assert.equal(dotpe.VERIFIED_ON, '2026-07-25')
  assert.equal(dotpe.CAREERS_URL, 'https://dotpe.in/careers.html')
  assert.equal(
    dotpe.DISPOSITION,
    'verified-first-party-careers-surface-with-non-navigating-open-roles-ctas',
  )
  assert.match(dotpe.VERIFIED_SURFACE_SUMMARY, /Saturday, July 25, 2026/)
  assert.match(dotpe.VERIFIED_SURFACE_SUMMARY, /https:\/\/dotpe\.in\/careers\.html/i)
  assert.match(dotpe.VERIFIED_SURFACE_SUMMARY, /View Open Roles/i)
  assert.match(dotpe.VERIFIED_SURFACE_SUMMARY, /See Openings/i)
  assert.match(dotpe.VERIFIED_SURFACE_SUMMARY, /Search all Jobs/i)
  assert.match(dotpe.VERIFIED_SURFACE_SUMMARY, /no trustworthy enumerable public jobs contract/i)
  assert.equal(dotpe.hasOfficialCareersPageSignal(VERIFIED_SURFACE_HTML), true)
  assert.deepEqual(dotpe.extractCareerCtaTargets(VERIFIED_SURFACE_HTML), {
    viewOpenRoles: '#',
    seeOpenings: '#',
  })
  assert.deepEqual(dotpe.extractSearchFormContract(VERIFIED_SURFACE_HTML), {
    action: null,
    method: 'GET',
    placeholder: 'Search Jobs, Enter Keyword',
    submitLabel: 'Search all Jobs',
  })
})

test('DotPe rejects when the verified official careers surface markers disappear', async () => {
  const dotpe = await loadModule()

  await assert.rejects(
    dotpe.run({
      fetchHtml: async () => `
        <html>
          <body>
            <main>
              <h1>Careers</h1>
              <p>Join us.</p>
            </main>
          </body>
        </html>
      `,
    }),
    /verified official careers surface changed/i,
  )
})

test('DotPe rejects when the verified non-navigating CTA contract changes', async () => {
  const dotpe = await loadModule()

  await assert.rejects(
    dotpe.run({
      fetchHtml: async () => VERIFIED_SURFACE_HTML.replace(
        'href="#" class="get-started-btn">View Open Roles',
        'href="https://jobs.lever.co/dotpe" class="get-started-btn">View Open Roles',
      ),
    }),
    /verified CTA contract changed|public jobs surface/i,
  )

  await assert.rejects(
    dotpe.run({
      fetchHtml: async () => VERIFIED_SURFACE_HTML.replace(
        'href="#" class="see-openings-btn">See Openings',
        'href="https://www.linkedin.com/company/dotpein/jobs/" class="see-openings-btn">See Openings',
      ),
    }),
    /verified CTA contract changed|public jobs surface/i,
  )
})

test('DotPe rejects when the verified search form becomes a real public jobs search surface', async () => {
  const dotpe = await loadModule()

  await assert.rejects(
    dotpe.run({
      fetchHtml: async () => VERIFIED_SURFACE_HTML.replace(
        '<form class="form-inline">',
        '<form class="form-inline" action="/jobs/search">',
      ),
    }),
    /verified search form contract changed|public jobs surface/i,
  )

  await assert.rejects(
    dotpe.run({
      fetchHtml: async () => VERIFIED_SURFACE_HTML.replace(
        'Search all Jobs',
        'Browse all openings',
      ),
    }),
    /verified search form contract changed/i,
  )
})

test('DotPe rejects when JobPosting markup, a trusted ATS host, or a same-origin jobs path appears', async () => {
  const dotpe = await loadModule()

  await assert.rejects(
    dotpe.run({
      fetchHtml: async () => `
        ${VERIFIED_SURFACE_HTML}
        <script type="application/ld+json">
          {"@context":"https://schema.org","@type":"JobPosting","title":"Backend Engineer"}
        </script>
      `,
    }),
    /JobPosting markup/i,
  )

  await assert.rejects(
    dotpe.run({
      fetchHtml: async () => `
        ${VERIFIED_SURFACE_HTML}
        <a href="https://boards.greenhouse.io/dotpe/jobs/123">Backend Engineer</a>
      `,
    }),
    /public jobs surface/i,
  )

  await assert.rejects(
    dotpe.run({
      fetchHtml: async () => `
        ${VERIFIED_SURFACE_HTML}
        <a href="/careers/backend-engineer">Backend Engineer</a>
      `,
    }),
    /public jobs surface/i,
  )
})

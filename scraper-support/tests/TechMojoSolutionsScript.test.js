import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-18T08:45:00.000Z'

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers at TechMojo | Build Systems at Scale</title>
    <link rel="canonical" href="https://techmojo.com/company/careers/" />
    <meta name="description" content="Explore careers at TechMojo in Hyderabad and build massively scalable platforms." />
  </head>
  <body>
    <span>Careers at TechMojo</span>
    <h1>Build where engineering is tested by reality.</h1>
    <a href="https://9am.careers/jobs/techmojo-solutions">View open roles</a>
    <a href="https://9am.careers/jobs/techmojo-solutions">Explore TechMojo jobs</a>
  </body>
</html>
`

const publicBoardHtml = `
<!doctype html>
<html lang="en">
  <head><title>9am Careers | Tech Jobs in India</title></head>
  <body>
    <script>
      (function(){
        const jobsData = ${JSON.stringify(JSON.stringify([
          {
            id: '0ca8adb1-854b-40c0-b086-bc9e1c550a33',
            title: 'Product Owner',
            description: '"<p>Own the product lifecycle.</p><ul><li>Define the product vision</li><li>The position is based in Hyderabad.</li></ul>"',
            company: 'TECHMOJO SOLUTIONS',
            displaySlug: 'techmojo-solutions',
            jobNameSlug: 'product-owner',
            sequenceNo: 101,
            jobUrlSegment: 'product-owner-101',
            location: 'HYDERABAD',
            location_extracted: {
              city: 'HYDERABAD',
              stateName: 'TELANGANA',
              raw_location: 'HYDERABAD',
              remote: false,
            },
            employment_type: 'FULL_TIME',
            workMode: 'WORK_FROM_OFFICE',
            created_at: '2026-08-17T11:13:32.994898',
            status: 'open',
            openings: 2,
          },
          {
            id: 'closed-role',
            title: 'Closed Role',
            company: 'TECHMOJO SOLUTIONS',
            displaySlug: 'techmojo-solutions',
            jobUrlSegment: 'closed-role-102',
            location: 'HYDERABAD',
            employment_type: 'FULL_TIME',
            status: 'closed',
          },
          {
            id: 'other-company',
            title: 'Other Company Role',
            company: 'OTHER',
            displaySlug: 'other-company',
            jobUrlSegment: 'other-role-1',
            location: 'BENGALURU',
            employment_type: 'FULL_TIME',
            status: 'open',
          },
        ]))};
        window.__jobs = JSON.parse(jobsData);
      })();
    </script>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/techmojosolutions/script.js')
  } catch {
    assert.fail('Expected TechMojo Solutions scraper module at ../../scraper/techmojosolutions/script.js')
  }
}

test('TechMojo Solutions helpers stay pinned to the current first-party careers handoff and 9am payload', async () => {
  const techmojo = await loadModule()

  assert.equal(techmojo.SOURCE, 'techmojosolutions')
  assert.equal(techmojo.COMPANY, 'TechMojo Solutions')
  assert.equal(techmojo.CAREERS_URL, 'https://techmojo.com/company/careers/')
  assert.equal(techmojo.PUBLIC_JOBS_URL, 'https://9am.careers/')
  assert.equal(techmojo.PUBLIC_COMPANY_BOARD_URL, 'https://9am.careers/jobs/techmojo-solutions')
  assert.equal(techmojo.VERIFIED_ON, '2026-09-14')
  assert.equal(techmojo.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(techmojo.hasPublicJobsPayloadSignal(publicBoardHtml), true)
})

test('TechMojo Solutions run parses open TechMojo roles from the linked 9am public payload', async () => {
  const techmojo = await loadModule()
  const requestedUrls = []
  const jobs = await techmojo.createTechMojoSolutionsScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === techmojo.CAREERS_URL) return careersHtml
      if (url === techmojo.PUBLIC_JOBS_URL) return publicBoardHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [techmojo.CAREERS_URL, techmojo.PUBLIC_JOBS_URL])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].title, 'Product Owner')
  assert.equal(jobs[0].location, 'Hyderabad, Telangana, India')
  assert.equal(jobs[0].employmentType, 'Full-time')
  assert.equal(jobs[0].sourceUrl, 'https://9am.careers/jobs/product-owner-101')
  assert.match(jobs[0].jobDescription, /Own the product lifecycle/i)
  assert.deepEqual(jobs[0].requiredSkills, [
    'Define the product vision',
    'The position is based in Hyderabad.',
  ])
  assert.equal(jobs[0].scrapedAt, FIXED_SCRAPED_AT)
})

test('TechMojo Solutions fails closed when the trusted careers handoff or public payload changes materially', async () => {
  const techmojo = await loadModule()

  await assert.rejects(
    techmojo.createTechMojoSolutionsScraper().run({
      fetchText: async () => '<html><body><h1>Jobs</h1></body></html>',
    }),
    /verified TechMojo Solutions careers page/i,
  )

  await assert.rejects(
    techmojo.createTechMojoSolutionsScraper().run({
      fetchText: async (url) => {
        if (url === techmojo.CAREERS_URL) return careersHtml
        return '<html><body>No public data</body></html>'
      },
    }),
    /9am public jobs payload/i,
  )
})

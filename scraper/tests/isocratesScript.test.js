import assert from 'node:assert/strict'
import test from 'node:test'

const loadIsocratesModule = async () => {
  try {
    return await import('../isocrates/script.js')
  } catch {
    assert.fail('Expected iSOCRATES scraper module at ../isocrates/script.js')
  }
}

const homepageHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Global Leader in MADTECH Resource Planning and Execution™</title>
  </head>
  <body>
    <h1>Global Leader in MADTECH Resource Planning and Execution™</h1>
    <a href="https://isocrates.com/careers/">Explore Career Opportunities</a>
  </body>
</html>
`

const careersHtml = `
<!doctype html>
<html>
  <head>
    <title>Careers | iSOCRATES</title>
  </head>
  <body>
    <script>
      window.khConfig = {
        identifier: '53772be4-e756-4beb-b9d6-91966b560812',
        domain: 'https://isocrates.keka.com/careers/',
        targetContainer: '#khembedjobs'
      };
    </script>
    <h1>Join us to do purposeful work that shapes the future of marketing intelligence</h1>
    <h2>Open positions</h2>
    <div id="khembedjobs"></div>
    <script src="https://isocrates.keka.com/careers/api/embedjobs/js/53772be4-e756-4beb-b9d6-91966b560812"></script>
  </body>
</html>
`

test('iSOCRATES verifies the official homepage and resolves the first-party Keka careers config', async () => {
  const isocrates = await loadIsocratesModule()

  assert.equal(isocrates.SOURCE, 'isocrates')
  assert.equal(isocrates.COMPANY, 'iSOCRATES')
  assert.equal(isocrates.HOMEPAGE_URL, 'https://isocrates.com/')
  assert.equal(isocrates.CAREER_PAGE_URL, 'https://isocrates.com/careers/')
  assert.equal(isocrates.EXPECTED_IDENTIFIER, '53772be4-e756-4beb-b9d6-91966b560812')
  assert.equal(isocrates.EXPECTED_KEKA_DOMAIN, 'https://isocrates.keka.com/careers/')

  assert.equal(isocrates.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(isocrates.hasOfficialCareersPageSignal(careersHtml), true)
  assert.deepEqual(isocrates.extractCareerConfig(careersHtml), {
    identifier: '53772be4-e756-4beb-b9d6-91966b560812',
    domain: 'https://isocrates.keka.com/careers/',
    portalName: 'default',
  })
  assert.equal(
    isocrates.buildActiveJobsUrl(isocrates.extractCareerConfig(careersHtml)),
    'https://isocrates.keka.com/careers/api/embedjobs/default/active/53772be4-e756-4beb-b9d6-91966b560812',
  )
})

test('iSOCRATES maps India roles from the verified Keka feed into the shared scraper contract', async () => {
  const isocrates = await loadIsocratesModule()
  const jobs = isocrates.extractSearchResults(
    [
      {
        id: 73365,
        title: 'Engineering Manager',
        description: '<div>Lead engineering across platform and data systems.</div>',
        departmentName: 'MADTECH.AI',
        jobLocations: [
          {
            id: 3452,
            name: 'Bengaluru, KA, IND',
            city: 'Bengaluru',
            state: 'KA',
            countryCode: 'IN',
            countryName: 'India',
          },
          {
            id: 9999,
            name: 'Austin, TX, USA',
            city: 'Austin',
            state: 'TX',
            countryCode: 'US',
            countryName: 'United States',
          },
        ],
        jobType: 2,
        experience: '12+ Years',
        salaryRangeFormat: 'INR 50,00,000.00 - 70,00,000.00',
        publishedOn: '2026-05-29T09:00:20.803Z',
        skillNames: ['AWS Cloud & Microservices Architecture', 'Leadership'],
      },
    ],
    {
      domain: 'https://isocrates.keka.com/careers/',
    },
  )

  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'Engineering Manager',
    company: 'iSOCRATES',
    department: 'MADTECH.AI',
    location: 'Bengaluru, KA, India',
    city: 'Bengaluru',
    country: 'India',
    jobId: '73365',
    requisitionId: '73365',
    sourceUrl: 'https://isocrates.keka.com/careers/jobdetails/73365',
    applyUrl: 'https://isocrates.keka.com/careers/applyjob/73365',
    employmentType: 'Full Time',
    experienceRequired: '12+ Years',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: ['AWS Cloud & Microservices Architecture', 'Leadership'],
    postingDate: '2026-05-29',
    closingDate: null,
    jobDescription: 'Lead engineering across platform and data systems.',
    remoteStatus: 'On-site',
    compensation: 'INR 50,00,000.00 - 70,00,000.00',
  })
})

test('iSOCRATES fails closed when the verified homepage, careers shell, or Keka config changes', async () => {
  const isocrates = await loadIsocratesModule()

  await assert.rejects(
    isocrates.createIsocratesScraper().run({
      fetchText: async (url) => {
        if (url === isocrates.HOMEPAGE_URL) {
          return '<html><body><h1>Unexpected homepage</h1></body></html>'
        }

        return careersHtml
      },
      fetchJson: async () => [],
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    isocrates.createIsocratesScraper().run({
      fetchText: async (url) => {
        if (url === isocrates.HOMEPAGE_URL) return homepageHtml
        if (url === isocrates.CAREER_PAGE_URL) {
          return careersHtml.replace('Open positions', 'Hiring soon')
        }
        return homepageHtml
      },
      fetchJson: async () => [],
    }),
    /verified careers page/i,
  )

  await assert.rejects(
    isocrates.createIsocratesScraper().run({
      fetchText: async (url) => {
        if (url === isocrates.HOMEPAGE_URL) return homepageHtml
        if (url === isocrates.CAREER_PAGE_URL) {
          return careersHtml.replace(
            '53772be4-e756-4beb-b9d6-91966b560812',
            '11111111-2222-3333-4444-555555555555',
          )
        }
        return homepageHtml
      },
      fetchJson: async () => [],
    }),
    /verified Keka job surface changed materially/i,
  )
})

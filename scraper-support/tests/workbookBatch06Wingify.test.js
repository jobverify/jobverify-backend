import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => {
  try {
    return await import('../../scraper/wingify/script.js')
  } catch {
    assert.fail('Expected Wingify scraper module at ../../scraper/wingify/script.js')
  }
}

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Wingify - Company Careers - Wingify</title>
    <link rel="canonical" href="https://wingify.com/company/careers/" />
  </head>
  <body>
    <h2>Open Positions</h2>
    <h3>Find your role</h3>
    <p>Click on available positions to apply. Or send your CV and work samples to careers@wingify.com</p>
    <a href="https://wingify.keka.com/careers/">Apply Now</a>
    <div class="js-careers-board" data-jobs-endpoint="https://wingify.com/wp-json/api/get-active-jobs"></div>
    <p>See all open positions</p>
  </body>
</html>
`

const kekaBoardHtml = `
<!doctype html>
<html>
  <body>
    <header>
      <span>Wingify Software Pvt. Ltd.</span>
      <a href="https://wingify.com/" target="_blank">Home</a>
    </header>
    <main>
      <h1>Be a part of building something great</h1>
      <button>Browse all jobs</button>
    </main>
    <footer>
      <span>Wingify Software Pvt. Ltd.</span>
      <span>&copy; 2026 Keka Hire. Powered by Keka.</span>
    </footer>
  </body>
</html>
`

const portalInfo = {
  name: 'Wingify Software Pvt. Ltd.',
  shortName: 'Wingify Software Pvt. Ltd.',
  careersPortalDomain: 'wingify.keka.com',
  companyWebsite: 'https://wingify.com/',
}

test('Wingify validates the verified first-party careers page, Keka board shell, and exact portal identity', async () => {
  const wingify = await loadModule()

  assert.equal(wingify.SOURCE, 'wingify')
  assert.equal(wingify.COMPANY, 'Wingify')
  assert.equal(wingify.VERIFIED_ON, '2026-10-03')
  assert.equal(wingify.CAREERS_URL, 'https://wingify.com/company/careers/')
  assert.equal(wingify.FIRST_PARTY_JOBS_URL, 'https://wingify.com/wp-json/api/get-active-jobs')
  assert.equal(wingify.KEKA_BOARD_URL, 'https://wingify.keka.com/careers/')
  assert.equal(
    wingify.CAREER_PORTAL_INFO_URL,
    'https://wingify.keka.com/careers/api/organization/default/careerportalinfo',
  )
  assert.equal(
    wingify.ACTIVE_JOBS_URL,
    'https://wingify.keka.com/careers/api/jobs/default/active',
  )
  assert.match(wingify.VERIFIED_SURFACE_SUMMARY, /October 3, 2026/)
  assert.equal(wingify.hasOfficialCareersPageSignal(careersHtml), true)
  assert.equal(
    wingify.extractKekaBoardUrl(careersHtml),
    'https://wingify.keka.com/careers/',
  )
  assert.equal(wingify.hasKekaBoardSignal(kekaBoardHtml), true)
  assert.equal(wingify.hasExpectedPortalIdentity(portalInfo), true)
  assert.equal(wingify.hasMatchingFirstPartyJobs([
    { title: 'Example', careerPortalUrl: 'https://wingify.keka.com/careers/jobdetails/135402' },
  ], [{ id: 135402, title: 'Example' }]), true)
  assert.equal(wingify.hasMatchingFirstPartyJobs([
    { title: 'Example', careerPortalUrl: 'https://wingify.keka.com/careers/jobdetails/135402' },
  ], [{ id: 135402, title: 'Different' }]), false)
})

test('Wingify keeps only India jobs from the verified Keka payload and maps them to the shared shape', async () => {
  const wingify = await loadModule()

  const jobs = wingify.extractSearchResults(
    [
      {
        id: 135025,
        title: 'Intern - Website Development',
        description: '<div>Build and improve the Wingify website experience.</div>',
        departmentName: 'Website Development',
        jobLocations: [
          {
            name: 'Remote',
            city: 'Delhi',
            state: 'DL',
            countryCode: 'IN',
            countryName: 'India',
          },
          {
            name: 'India',
            city: 'India',
            state: '',
            countryCode: 'IN',
            countryName: '',
          },
        ],
        jobType: 2,
        experience: '0-1 year',
        jobNumber: null,
        publishedOn: '2026-07-18T08:47:03.19Z',
        skillNames: [],
      },
      {
        id: 999001,
        title: 'Account Executive',
        description: '<div>Outside India role.</div>',
        departmentName: 'Sales',
        jobLocations: [
          {
            name: 'Paris',
            city: 'Paris',
            state: '',
            countryCode: 'FR',
            countryName: 'France',
          },
        ],
        jobType: 2,
      },
    ],
    {
      domain: 'https://wingify.keka.com/careers/',
    },
  )

  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'Intern - Website Development',
    company: 'Wingify',
    department: 'Website Development',
    location: 'Delhi, DL, India; India',
    city: 'Delhi',
    country: 'India',
    jobId: '135025',
    requisitionId: '135025',
    sourceUrl: 'https://wingify.keka.com/careers/jobdetails/135025',
    applyUrl: 'https://wingify.keka.com/careers/applyjob/135025',
    employmentType: 'Full Time',
    experienceRequired: '0-1 year',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-07-18',
    closingDate: null,
    jobDescription: 'Build and improve the Wingify website experience.',
  })
})

test('Wingify run validates the official careers handoff, Keka board shell, exact portal identity, and decorates India jobs', async () => {
  const wingify = await loadModule()
  const requestedTexts = []
  const requestedJson = []

  const jobs = await wingify.createWingifyScraper().run({
    fetchText: async (url) => {
      requestedTexts.push(url)
      if (url === wingify.CAREERS_URL) return careersHtml
      if (url === wingify.KEKA_BOARD_URL) return kekaBoardHtml
      throw new Error(`Unexpected text URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedJson.push(url)
      if (url === wingify.CAREER_PORTAL_INFO_URL) return portalInfo
      if (url === wingify.FIRST_PARTY_JOBS_URL) return [{ title: 'Technical Support Engineer (French Fluent)', careerPortalUrl: 'https://wingify.keka.com/careers/jobdetails/135402' }]
      if (url === wingify.ACTIVE_JOBS_URL) {
        return [
          {
            id: 135402,
            title: 'Technical Support Engineer (French Fluent)',
            description: '<div>Support customers across product and success workflows.</div>',
            departmentName: 'Product Success',
            jobLocations: [
              {
                name: 'India',
                city: 'India',
                state: '',
                countryCode: 'IN',
                countryName: '',
              },
            ],
            jobType: 2,
            experience: '2-6 years',
            jobNumber: null,
            publishedOn: '2026-07-21T11:22:18.66Z',
            skillNames: [],
          },
        ]
      }
      throw new Error(`Unexpected JSON URL: ${url}`)
    },
    now: () => '2026-07-25T00:00:00.000Z',
  })

  assert.deepEqual(requestedTexts, [wingify.CAREERS_URL, wingify.KEKA_BOARD_URL])
  assert.deepEqual(requestedJson, [
    wingify.CAREER_PORTAL_INFO_URL,
    wingify.FIRST_PARTY_JOBS_URL,
    wingify.ACTIVE_JOBS_URL,
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'wingify')
  assert.equal(jobs[0].company, 'Wingify')
  assert.equal(jobs[0].link, 'https://wingify.keka.com/careers/applyjob/135402')
  assert.equal(jobs[0].scrapedAt, '2026-07-25T00:00:00.000Z')
})

test('Wingify fails closed when the official careers handoff, Keka board shell, or exact portal identity changes', async () => {
  const wingify = await loadModule()

  await assert.rejects(
    wingify.createWingifyScraper().run({
      fetchText: async (url) => {
        if (url === wingify.CAREERS_URL) {
          return careersHtml.replace(
            'https://wingify.keka.com/careers/',
            'https://example.com/jobs',
          )
        }

        return kekaBoardHtml
      },
      fetchJson: async () => portalInfo,
    }),
    /verified official careers handoff/i,
  )

  await assert.rejects(
    wingify.createWingifyScraper().run({
      fetchText: async (url) => {
        if (url === wingify.CAREERS_URL) return careersHtml
        return kekaBoardHtml.replace('Browse all jobs', 'Apply now')
      },
      fetchJson: async () => portalInfo,
    }),
    /verified Keka board shell/i,
  )

  await assert.rejects(
    wingify.createWingifyScraper().run({
      fetchText: async (url) => {
        if (url === wingify.CAREERS_URL) return careersHtml
        return kekaBoardHtml
      },
      fetchJson: async (url) => {
        if (url === wingify.CAREER_PORTAL_INFO_URL) {
          return { ...portalInfo, careersPortalDomain: 'example.keka.com' }
        }

        return []
      },
    }),
    /exact company identity/i,
  )
})

test('Wingify rejects a first-party feed that disagrees with Keka', async () => {
  const wingify = await loadModule()

  await assert.rejects(
    wingify.createWingifyScraper().run({
      fetchText: async (url) => url === wingify.CAREERS_URL ? careersHtml : kekaBoardHtml,
      fetchJson: async (url) => {
        if (url === wingify.CAREER_PORTAL_INFO_URL) return portalInfo
        if (url === wingify.FIRST_PARTY_JOBS_URL) return [{ title: 'Different role', careerPortalUrl: 'https://wingify.keka.com/careers/jobdetails/135402' }]
        return [{ id: 135402, title: 'Technical Support Engineer (French Fluent)' }]
      },
    }),
    /first-party jobs endpoint no longer matches/i,
  )
})

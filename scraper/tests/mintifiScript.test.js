import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Mintifi - Careers</title>
  </head>
  <body>
    <a href="#khembedjobs">Browse all jobs</a>
    <script>
      const mintifiJobsWidget = {
        domain: 'https://mintifi.keka.com/careers/',
        targetContainer: '#khembedjobs'
      }
    </script>
    <script
      src="https://mintifi.keka.com/careers/api/embedjobs/js/0bdc40eb-1cda-4070-83e9-cd5c222a6399"
      defer
    ></script>
    <div id="khembedjobs"></div>
  </body>
</html>
`

const careerPortalInfo = {
  name: 'Mintifi',
  shortName: 'Mintifi',
  careersPortalDomain: 'mintifi.keka.com',
  companyWebsite: 'https://www.mintifi.com/',
}

const activeJobsPayload = [
  {
    id: 141017,
    title: 'Sales Manager - Retail',
    description: '<div>Promote supply chain finance solutions for retail partners.</div>',
    departmentName: 'Sales - Unsecured',
    jobLocations: [
      {
        id: 20330,
        name: 'Mumbai - HO',
        city: 'Mumbai HO',
        state: 'MH',
        countryCode: 'IN',
        countryName: 'India',
      },
    ],
    jobType: 2,
    experience: '2+ Years',
    publishedOn: '2026-05-20T05:18:55.47Z',
    skillNames: ['Channel Sales', 'Relationship Management'],
  },
  {
    id: 83523,
    title: 'Internal Audit Intern',
    description: '<div>Assist with audit reports and financial audits.</div>',
    departmentName: 'Internal Audit',
    jobLocations: [
      {
        id: 14153,
        name: 'Mumbai',
        city: 'Mumbai',
        state: 'MH',
        countryCode: 'IN',
        countryName: 'India',
      },
    ],
    jobType: 1,
    experience: null,
    publishedOn: '2026-07-16T11:05:19.8Z',
    skillNames: [],
  },
]

const loadMintifiModule = async () => {
  try {
    return await import('../mintifi/script.js')
  } catch {
    assert.fail('Expected Mintifi scraper module at ../mintifi/script.js')
  }
}

test('Mintifi scraper helpers stay pinned to the verified first-party careers page and Keka config', async () => {
  const mintifi = await loadMintifiModule()

  assert.equal(mintifi.SOURCE, 'mintifi')
  assert.equal(mintifi.COMPANY, 'Mintifi')
  assert.equal(mintifi.CAREERS_URL, 'https://mintifi.com/careers')
  assert.equal(mintifi.KEKA_CAREER_PAGE_URL, 'https://mintifi.keka.com/careers/')
  assert.equal(mintifi.EXPECTED_IDENTIFIER, '0bdc40eb-1cda-4070-83e9-cd5c222a6399')
  assert.equal(mintifi.EXPECTED_KEKA_DOMAIN, 'https://mintifi.keka.com/careers/')
  assert.equal(mintifi.EXPECTED_PORTAL_NAME, 'Mintifi')
  assert.equal(mintifi.hasVerifiedCareersPageSignal(careersHtml), true)
  assert.deepEqual(mintifi.extractCareerConfig(careersHtml), {
    identifier: '0bdc40eb-1cda-4070-83e9-cd5c222a6399',
    domain: 'https://mintifi.keka.com/careers/',
    portalName: 'default',
  })
  assert.equal(
    mintifi.buildCareerPortalInfoUrl(mintifi.extractCareerConfig(careersHtml)),
    'https://mintifi.keka.com/careers/api/organization/default/careerportalinfo',
  )
  assert.equal(
    mintifi.buildActiveJobsUrl(mintifi.extractCareerConfig(careersHtml)),
    'https://mintifi.keka.com/careers/api/embedjobs/default/active/0bdc40eb-1cda-4070-83e9-cd5c222a6399',
  )
  assert.equal(mintifi.hasExpectedPortalIdentity(careerPortalInfo), true)
  assert.deepEqual(
    mintifi.extractSearchResults(activeJobsPayload, {
      domain: 'https://mintifi.keka.com/careers/',
    }),
    [
      {
        title: 'Sales Manager - Retail',
        company: 'Mintifi',
        department: 'Sales - Unsecured',
        location: 'Mumbai HO, MH, India',
        city: 'Mumbai HO',
        country: 'India',
        jobId: '141017',
        requisitionId: '141017',
        sourceUrl: 'https://mintifi.keka.com/careers/jobdetails/141017',
        applyUrl: 'https://mintifi.keka.com/careers/applyjob/141017',
        employmentType: 'Full Time',
        experienceRequired: '2+ Years',
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: ['Channel Sales', 'Relationship Management'],
        postingDate: '2026-05-20',
        closingDate: null,
        jobDescription: 'Promote supply chain finance solutions for retail partners.',
      },
      {
        title: 'Internal Audit Intern',
        company: 'Mintifi',
        department: 'Internal Audit',
        location: 'Mumbai, MH, India',
        city: 'Mumbai',
        country: 'India',
        jobId: '83523',
        requisitionId: '83523',
        sourceUrl: 'https://mintifi.keka.com/careers/jobdetails/83523',
        applyUrl: 'https://mintifi.keka.com/careers/applyjob/83523',
        employmentType: null,
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: '2026-07-16',
        closingDate: null,
        jobDescription: 'Assist with audit reports and financial audits.',
      },
    ],
  )
})

test('Mintifi run returns public jobs from the verified first-party careers page and Keka APIs', async () => {
  const mintifi = await loadMintifiModule()
  const requestedPageUrls = []
  const requestedJsonUrls = []

  const jobs = await mintifi.createMintifiScraper({
    now: () => '2026-07-16T00:00:00.000Z',
  }).run({
    fetchPage: async (url) => {
      requestedPageUrls.push(url)

      if (url === mintifi.CAREERS_URL) {
        return { status: 200, url, html: careersHtml }
      }

      throw new Error(`Unexpected Mintifi page URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedJsonUrls.push(url)

      if (url === mintifi.CAREER_PORTAL_INFO_URL) {
        return { status: 200, url, json: careerPortalInfo }
      }

      if (url === mintifi.ACTIVE_JOBS_URL) {
        return { status: 200, url, json: activeJobsPayload }
      }

      throw new Error(`Unexpected Mintifi JSON URL: ${url}`)
    },
  })

  assert.deepEqual(requestedPageUrls, [mintifi.CAREERS_URL])
  assert.deepEqual(requestedJsonUrls, [
    mintifi.CAREER_PORTAL_INFO_URL,
    mintifi.ACTIVE_JOBS_URL,
  ])
  assert.deepEqual(jobs, [
    {
      title: 'Sales Manager - Retail',
      company: 'Mintifi',
      department: 'Sales - Unsecured',
      location: 'Mumbai HO, MH, India',
      city: 'Mumbai HO',
      country: 'India',
      jobId: '141017',
      requisitionId: '141017',
      sourceUrl: 'https://mintifi.keka.com/careers/jobdetails/141017',
      applyUrl: 'https://mintifi.keka.com/careers/applyjob/141017',
      employmentType: 'Full Time',
      experienceRequired: '2+ Years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: ['Channel Sales', 'Relationship Management'],
      postingDate: '2026-05-20',
      closingDate: null,
      jobDescription: 'Promote supply chain finance solutions for retail partners.',
      source: 'mintifi',
      link: 'https://mintifi.keka.com/careers/applyjob/141017',
      scrapedAt: '2026-07-16T00:00:00.000Z',
    },
    {
      title: 'Internal Audit Intern',
      company: 'Mintifi',
      department: 'Internal Audit',
      location: 'Mumbai, MH, India',
      city: 'Mumbai',
      country: 'India',
      jobId: '83523',
      requisitionId: '83523',
      sourceUrl: 'https://mintifi.keka.com/careers/jobdetails/83523',
      applyUrl: 'https://mintifi.keka.com/careers/applyjob/83523',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-07-16',
      closingDate: null,
      jobDescription: 'Assist with audit reports and financial audits.',
      source: 'mintifi',
      link: 'https://mintifi.keka.com/careers/applyjob/83523',
      scrapedAt: '2026-07-16T00:00:00.000Z',
    },
  ])
})

test('Mintifi fails closed when the verified careers page, Keka config, portal identity, or jobs feed changes', async () => {
  const mintifi = await loadMintifiModule()

  await assert.rejects(
    mintifi.createMintifiScraper().run({
      fetchPage: async (url) => ({ status: 200, url, html: '<html><body>No jobs widget</body></html>' }),
      fetchJson: async () => ({ status: 200, url: mintifi.CAREER_PORTAL_INFO_URL, json: careerPortalInfo }),
    }),
    /careers page/i,
  )

  await assert.rejects(
    mintifi.createMintifiScraper().run({
      fetchPage: async (url) => ({
        status: 200,
        url,
        html: careersHtml.replace(
          '0bdc40eb-1cda-4070-83e9-cd5c222a6399',
          '11111111-2222-3333-4444-555555555555',
        ),
      }),
      fetchJson: async () => ({ status: 200, url: mintifi.CAREER_PORTAL_INFO_URL, json: careerPortalInfo }),
    }),
    /verified Keka job surface changed materially/i,
  )

  await assert.rejects(
    mintifi.createMintifiScraper().run({
      fetchPage: async (url) => ({ status: 200, url, html: careersHtml }),
      fetchJson: async (url) => {
        if (url === mintifi.CAREER_PORTAL_INFO_URL) {
          return { status: 200, url, json: { ...careerPortalInfo, name: 'Different Company' } }
        }

        return { status: 200, url, json: activeJobsPayload }
      },
    }),
    /exact company identity/i,
  )

  await assert.rejects(
    mintifi.createMintifiScraper().run({
      fetchPage: async (url) => ({ status: 200, url, html: careersHtml }),
      fetchJson: async (url) => {
        if (url === mintifi.CAREER_PORTAL_INFO_URL) {
          return { status: 200, url, json: careerPortalInfo }
        }

        return { status: 200, url, json: { broken: true } }
      },
    }),
    /active jobs/i,
  )
})

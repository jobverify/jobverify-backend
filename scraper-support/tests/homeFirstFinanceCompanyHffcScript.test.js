import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-10T12:00:00.000Z'

const loadHomeFirstFinanceCompanyHffcModule = async () => {
  try {
    return await import('../../scraper/homefirstfinancecompanyhffc/script.js')
  } catch {
    assert.fail(
      'Expected Home First Finance Company (HFFC) scraper module at ../../scraper/homefirstfinancecompanyhffc/script.js',
    )
  }
}

const officialJobListingHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Home First Job Opportunities - Current Openings at Home First</title>
  </head>
  <body>
    <main>
      <h1>Job Listing</h1>
      <p>Browse job openings across India at Home First Finance Company.</p>
      <a href="mailto:Careers@homefirstindia.com">Careers@homefirstindia.com</a>
    </main>
    <script>
      window.__JOBIFY_FIXTURE__ = {
        "4118236341": {
          "b": {
            "JobList": [
              {
                "createDatetime": "2024-05-23 18:22:12",
                "startDatetime": "2024-05-21 12:06:48",
                "updateDatetime": "2024-05-23 18:22:12",
                "city": {
                  "name": "Kadapa",
                  "id": "city-kadapa",
                  "state": {
                    "name": "Andhra Pradesh",
                    "id": "state-ap"
                  }
                },
                "active": true,
                "id": "posting-001",
                "state": {
                  "name": "Andhra Pradesh",
                  "id": "state-ap"
                },
                "job": {
                  "updateDatetime": "2024-05-23 18:22:12",
                  "sendEmailTo": "Careers@homefirstindia.com",
                  "active": false,
                  "description": "Delight our customers through a smooth loan onboarding experience.",
                  "createDatetime": "2024-05-23 18:22:12",
                  "qualification": "Any graduate / Post graduate with 12+ years of experience",
                  "responsibility": "Own branch operations and reconciliations.",
                  "workModel": "Work from office",
                  "position": "Customer Service",
                  "id": "job-001",
                  "expectations": "Build strong relationships and provide a WOW experience.",
                  "department": "Operation",
                  "jobType": "Freshers"
                },
                "endDatetime": "2024-08-21 12:06:48"
              },
              {
                "createDatetime": "2024-05-23 18:21:06",
                "startDatetime": "2024-05-19 10:30:00",
                "updateDatetime": "2024-05-23 18:21:06",
                "city": {
                  "name": "Delhi",
                  "id": "city-delhi",
                  "state": {
                    "name": "NCR",
                    "id": "state-ncr"
                  }
                },
                "active": true,
                "id": "posting-002",
                "state": {
                  "name": "NCR",
                  "id": "state-ncr"
                },
                "job": {
                  "updateDatetime": "2024-05-23 18:21:06",
                  "sendEmailTo": "Careers@homefirstindia.com",
                  "active": false,
                  "description": "Drive branch growth and lead a high-performing sales team.",
                  "createDatetime": "2024-05-23 18:21:06",
                  "qualification": "Graduate with 6+ years of housing finance experience",
                  "responsibility": "Lead sourcing, underwriting coordination, and branch targets.",
                  "workModel": "Work from office",
                  "position": "Branch Manager",
                  "id": "job-002",
                  "expectations": "Strong people leadership and local market knowledge.",
                  "department": "Sales",
                  "jobType": "Experienced"
                },
                "endDatetime": "2024-08-19 12:06:48"
              }
            ]
          }
        }
      }
    </script>
  </body>
</html>
`

test('Home First Finance Company (HFFC) parser maps the verified first-party embedded JobList payload into runner-ready jobs', async () => {
  const homefirst = await loadHomeFirstFinanceCompanyHffcModule()

  assert.equal(homefirst.HOMEPAGE_URL, 'https://homefirstindia.com/')
  assert.equal(homefirst.CAREERS_URL, 'https://homefirstindia.com/careers')
  assert.equal(homefirst.JOB_LISTING_URL, 'https://homefirstindia.com/careers/job-listing')
  assert.equal(homefirst.hasOfficialJobListingSignal(officialJobListingHtml), true)

  assert.deepEqual(homefirst.extractEmbeddedJobList(officialJobListingHtml), [
    {
      createDatetime: '2024-05-23 18:22:12',
      startDatetime: '2024-05-21 12:06:48',
      updateDatetime: '2024-05-23 18:22:12',
      city: {
        name: 'Kadapa',
        id: 'city-kadapa',
        state: {
          name: 'Andhra Pradesh',
          id: 'state-ap',
        },
      },
      active: true,
      id: 'posting-001',
      state: {
        name: 'Andhra Pradesh',
        id: 'state-ap',
      },
      job: {
        updateDatetime: '2024-05-23 18:22:12',
        sendEmailTo: 'Careers@homefirstindia.com',
        active: false,
        description: 'Delight our customers through a smooth loan onboarding experience.',
        createDatetime: '2024-05-23 18:22:12',
        qualification: 'Any graduate / Post graduate with 12+ years of experience',
        responsibility: 'Own branch operations and reconciliations.',
        workModel: 'Work from office',
        position: 'Customer Service',
        id: 'job-001',
        expectations: 'Build strong relationships and provide a WOW experience.',
        department: 'Operation',
        jobType: 'Freshers',
      },
      endDatetime: '2024-08-21 12:06:48',
    },
    {
      createDatetime: '2024-05-23 18:21:06',
      startDatetime: '2024-05-19 10:30:00',
      updateDatetime: '2024-05-23 18:21:06',
      city: {
        name: 'Delhi',
        id: 'city-delhi',
        state: {
          name: 'NCR',
          id: 'state-ncr',
        },
      },
      active: true,
      id: 'posting-002',
      state: {
        name: 'NCR',
        id: 'state-ncr',
      },
      job: {
        updateDatetime: '2024-05-23 18:21:06',
        sendEmailTo: 'Careers@homefirstindia.com',
        active: false,
        description: 'Drive branch growth and lead a high-performing sales team.',
        createDatetime: '2024-05-23 18:21:06',
        qualification: 'Graduate with 6+ years of housing finance experience',
        responsibility: 'Lead sourcing, underwriting coordination, and branch targets.',
        workModel: 'Work from office',
        position: 'Branch Manager',
        id: 'job-002',
        expectations: 'Strong people leadership and local market knowledge.',
        department: 'Sales',
        jobType: 'Experienced',
      },
      endDatetime: '2024-08-19 12:06:48',
    },
  ])

  assert.deepEqual(homefirst.extractSearchResults(officialJobListingHtml), [
    {
      title: 'Customer Service',
      company: 'Home First Finance Company (HFFC)',
      department: 'Operation',
      location: 'Kadapa, Andhra Pradesh, India',
      city: 'Kadapa',
      country: 'India',
      jobId: 'posting-001',
      requisitionId: 'job-001',
      sourceUrl: 'https://homefirstindia.com/careers/job-listing',
      applyUrl: 'https://homefirstindia.com/careers/job-listing',
      employmentType: 'Freshers',
      experienceRequired: 'Any graduate / Post graduate with 12+ years of experience',
      minimumQualification: 'Any graduate / Post graduate with 12+ years of experience',
      preferredQualification: 'Build strong relationships and provide a WOW experience.',
      requiredSkills: [],
      postingDate: '2024-05-21',
      closingDate: '2024-08-21',
      jobDescription: 'Delight our customers through a smooth loan onboarding experience. Own branch operations and reconciliations. Build strong relationships and provide a WOW experience.',
      remoteStatus: 'On-site',
    },
    {
      title: 'Branch Manager',
      company: 'Home First Finance Company (HFFC)',
      department: 'Sales',
      location: 'Delhi, NCR, India',
      city: 'Delhi',
      country: 'India',
      jobId: 'posting-002',
      requisitionId: 'job-002',
      sourceUrl: 'https://homefirstindia.com/careers/job-listing',
      applyUrl: 'https://homefirstindia.com/careers/job-listing',
      employmentType: 'Experienced',
      experienceRequired: 'Graduate with 6+ years of housing finance experience',
      minimumQualification: 'Graduate with 6+ years of housing finance experience',
      preferredQualification: 'Strong people leadership and local market knowledge.',
      requiredSkills: [],
      postingDate: '2024-05-19',
      closingDate: '2024-08-19',
      jobDescription: 'Drive branch growth and lead a high-performing sales team. Lead sourcing, underwriting coordination, and branch targets. Strong people leadership and local market knowledge.',
      remoteStatus: 'On-site',
    },
  ])
})

test('run validates the verified HFFC job listing surface and decorates shared runner fields', async () => {
  const homefirst = await loadHomeFirstFinanceCompanyHffcModule()
  const requestedUrls = []

  const jobs = await homefirst.createHomeFirstFinanceCompanyHffcScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return officialJobListingHtml
    },
  })

  assert.deepEqual(requestedUrls, [homefirst.JOB_LISTING_URL])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'homefirstfinancecompanyhffc')
  assert.equal(jobs[0].link, homefirst.JOB_LISTING_URL)
  assert.equal(jobs[0].scrapedAt, FIXED_SCRAPED_AT)
})

test('Home First Finance Company (HFFC) scraper refuses to scrape when the verified first-party jobs surface changes materially', async () => {
  const homefirst = await loadHomeFirstFinanceCompanyHffcModule()

  await assert.rejects(
    homefirst.createHomeFirstFinanceCompanyHffcScraper().run({
      fetchText: async () => '<html><body>Unrelated site</body></html>',
    }),
    /verified official public jobs surface/i,
  )
})

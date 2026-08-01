import assert from 'node:assert/strict'
import test from 'node:test'

const loadAcciojobModule = async () => {
  try {
    return await import('../../scraper/acciojob/script.js')
  } catch {
    return null
  }
}

const careerPageHtml = `
<!DOCTYPE html>
<html>
  <body>
    <div id="content-container"></div>
    <script>
      fetch('/ats/documents/7d86eeef-8f44-46cd-bc3a-2155e3ff042c/careerportal/6aa32e2eecac4c51b41b0792c4cc1039.html')
        .then(response => response.text())
    </script>
  </body>
</html>
`

const portalHtml = `
<!DOCTYPE html>
<html>
  <head>
    <script>
      window.khConfig = {
        identifier: '7d86eeef-8f44-46cd-bc3a-2155e3ff042c',
        domain: 'https://acciojob.keka.com/careers/',
        targetContainer: '#khembedjobs'
      }
    </script>
  </head>
  <body>
    <div id="khembedjobs"></div>
  </body>
</html>
`

test('extractPortalDocumentUrl and extractCareerConfig resolve the public AccioJob Keka feed', async () => {
  const acciojob = await loadAcciojobModule()
  assert.ok(acciojob)

  assert.equal(
    acciojob.extractPortalDocumentUrl(careerPageHtml),
    'https://acciojob.keka.com/ats/documents/7d86eeef-8f44-46cd-bc3a-2155e3ff042c/careerportal/6aa32e2eecac4c51b41b0792c4cc1039.html',
  )

  assert.deepEqual(
    acciojob.extractCareerConfig(portalHtml),
    {
      identifier: '7d86eeef-8f44-46cd-bc3a-2155e3ff042c',
      domain: 'https://acciojob.keka.com/careers/',
      portalName: 'default',
    },
  )

  assert.equal(
    acciojob.buildActiveJobsUrl(acciojob.extractCareerConfig(portalHtml)),
    'https://acciojob.keka.com/careers/api/embedjobs/default/active/7d86eeef-8f44-46cd-bc3a-2155e3ff042c',
  )
})

test('extractSearchResults maps AccioJob Keka jobs into the shared scraper contract and filters non-India roles', async () => {
  const acciojob = await loadAcciojobModule()
  assert.ok(acciojob)

  const jobs = acciojob.extractSearchResults(
    [
      {
        id: 50123,
        title: 'Software Development Engineer',
        description: '<div>Build internal learning and placement workflows.</div>',
        departmentName: 'Engineering',
        jobLocations: [
          {
            id: 10,
            name: 'Gurugram',
            city: 'Gurugram',
            state: 'Haryana',
            countryCode: 'IN',
            countryName: 'India',
          },
        ],
        jobType: 2,
        experience: '2 to 4 years',
        salaryRangeFormat: 'INR 18,00,000.00 - 24,00,000.00',
        publishedOn: '2026-06-18T06:46:32.277Z',
        skillNames: ['node.js', 'react', 'mongodb'],
      },
      {
        id: 50124,
        title: 'Student Success Associate',
        description: '<p>Support learners in India remotely.</p>',
        departmentName: 'Operations',
        jobLocations: [
          {
            id: 11,
            name: 'Remote',
            city: 'Bengaluru',
          },
        ],
        jobType: 1,
        experience: '1 to 2 years',
        salaryRangeFormat: '',
        publishedOn: '2026-06-11T10:00:00.000Z',
        skillNames: [],
      },
      {
        id: 99999,
        title: 'Growth Lead',
        description: '<p>Scale our North America funnel.</p>',
        departmentName: 'Growth',
        jobLocations: [
          {
            id: 12,
            name: 'New York',
            city: 'New York',
            countryCode: 'US',
            countryName: 'United States',
          },
        ],
        jobType: 2,
        experience: '5+ years',
        salaryRangeFormat: '',
        publishedOn: '2026-06-01T08:00:00.000Z',
        skillNames: ['growth'],
      },
    ],
    {
      kekaDomain: 'https://acciojob.keka.com/careers/',
    },
  )

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'Software Development Engineer',
    company: 'AccioJob',
    department: 'Engineering',
    location: 'Gurugram, India',
    city: 'Gurugram',
    country: 'India',
    jobId: '50123',
    requisitionId: '50123',
    sourceUrl: 'https://acciojob.keka.com/careers/jobdetails/50123',
    applyUrl: 'https://acciojob.keka.com/careers/jobdetails/50123',
    employmentType: 'Full Time',
    experienceRequired: '2 to 4 years',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: ['node.js', 'react', 'mongodb'],
    postingDate: '2026-06-18',
    closingDate: null,
    jobDescription: 'Build internal learning and placement workflows.',
    remoteStatus: 'On-site',
    compensation: 'INR 18,00,000.00 - 24,00,000.00',
  })
  assert.equal(jobs[1].title, 'Student Success Associate')
  assert.equal(jobs[1].location, 'Remote, Bengaluru, India')
  assert.equal(jobs[1].employmentType, null)
  assert.equal(jobs[1].remoteStatus, 'Remote')
})

test('run fetches the AccioJob Keka page, resolves the portal HTML, and decorates jobs', async () => {
  const acciojob = await loadAcciojobModule()
  assert.ok(acciojob)

  const requestedTexts = []
  const requestedJson = []
  const scraper = acciojob.createAcciojobScraper()

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requestedTexts.push(url)
      if (url === acciojob.CAREER_PAGE_URL) return careerPageHtml
      if (url === 'https://acciojob.keka.com/ats/documents/7d86eeef-8f44-46cd-bc3a-2155e3ff042c/careerportal/6aa32e2eecac4c51b41b0792c4cc1039.html') {
        return portalHtml
      }
      throw new Error(`Unexpected text URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedJson.push(url)
      if (url === 'https://acciojob.keka.com/careers/api/embedjobs/default/active/7d86eeef-8f44-46cd-bc3a-2155e3ff042c') {
        return [
          {
            id: 76501,
            title: 'Backend Engineer',
            description: '<div>Own APIs for the student experience platform.</div>',
            departmentName: 'Engineering',
            jobLocations: [
              {
                id: 10,
                name: 'Gurugram',
                city: 'Gurugram',
                countryCode: 'IN',
                countryName: 'India',
              },
            ],
            jobType: 2,
            experience: '3 to 5 years',
            salaryRangeFormat: 'INR 20,00,000.00 - 28,00,000.00',
            publishedOn: '2026-06-19T06:46:32.277Z',
            skillNames: ['node.js', 'postgresql'],
          },
        ]
      }

      throw new Error(`Unexpected JSON URL: ${url}`)
    },
  })

  assert.deepEqual(requestedTexts, [
    acciojob.CAREER_PAGE_URL,
    'https://acciojob.keka.com/ats/documents/7d86eeef-8f44-46cd-bc3a-2155e3ff042c/careerportal/6aa32e2eecac4c51b41b0792c4cc1039.html',
  ])
  assert.deepEqual(requestedJson, [
    'https://acciojob.keka.com/careers/api/embedjobs/default/active/7d86eeef-8f44-46cd-bc3a-2155e3ff042c',
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'acciojob')
  assert.equal(jobs[0].link, 'https://acciojob.keka.com/careers/jobdetails/76501')
  assert.equal(jobs[0].company, 'AccioJob')
  assert.equal(typeof jobs[0].scrapedAt, 'string')
})

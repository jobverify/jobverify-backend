import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => import('../../scraper/openfinancialtechnologies/script.js')

const careerPageHtml = `
<!DOCTYPE html>
<html>
  <body>
    <script>
      window.khConfig = {
        identifier: '01234567-89ab-cdef-0123-456789abcdef',
        domain: 'https://openfinancial.keka.com/careers/',
        targetContainer: '#khembedjobs'
      };
    </script>
  </body>
</html>
`

const documentBackedCareerShellHtml = `
<!DOCTYPE html>
<html>
  <body>
    <div id="content-container"></div>
    <script>
      fetch('/ats/documents/161570d3-d2be-4e8c-b233-d006f70cd371/careerportal/ad813284387e414ba9c8c20b9615b368.html')
        .then((response) => response.text())
        .then((html) => { document.getElementById('content-container').innerHTML = html; });
    </script>
  </body>
</html>
`

test('extractCareerConfig resolves the Open Financial Technologies Keka identifier from public careers page markup', async () => {
  const openFinancial = await loadModule()

  assert.deepEqual(
    openFinancial.extractCareerConfig(careerPageHtml),
    {
      identifier: '01234567-89ab-cdef-0123-456789abcdef',
      domain: 'https://openfinancial.keka.com/careers/',
      portalName: 'default',
    },
  )

  assert.equal(
    openFinancial.buildActiveJobsUrl(openFinancial.extractCareerConfig(careerPageHtml)),
    'https://openfinancial.keka.com/careers/api/embedjobs/default/active/01234567-89ab-cdef-0123-456789abcdef',
  )
})

test('extractSearchResults keeps only India roles and maps them into the shared scraper contract', async () => {
  const openFinancial = await loadModule()

  const jobs = openFinancial.extractSearchResults(
    [
      {
        id: 77881,
        title: 'Senior Software Engineer - Payments',
        description: '<p>Build banking infrastructure.</p>',
        departmentName: 'Engineering',
        jobLocations: [
          {
            name: 'Bengaluru, Karnataka, India',
            city: 'Bengaluru',
            state: 'Karnataka',
            countryCode: 'IN',
            countryName: 'India',
          },
        ],
        jobType: 2,
        experience: '4 - 7 Yrs',
        publishedOn: '2026-07-08T07:30:00Z',
        skillNames: ['Node.js', 'Payments'],
      },
      {
        id: 77882,
        title: 'US Operations Associate',
        description: '<p>Support US operations.</p>',
        departmentName: 'Operations',
        jobLocations: [
          {
            name: 'New York, United States',
            city: 'New York',
            state: 'New York',
            countryCode: 'US',
            countryName: 'United States',
          },
        ],
        jobType: 2,
        experience: '2 - 4 Yrs',
        publishedOn: '2026-07-08T07:30:00Z',
        skillNames: [],
      },
    ],
    {
      domain: 'https://openfinancial.keka.com/careers/',
    },
  )

  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'Senior Software Engineer - Payments',
    company: 'Open Financial Technologies Private Limited',
    department: 'Engineering',
    location: 'Bengaluru, Karnataka, India',
    city: 'Bengaluru',
    country: 'India',
    jobId: '77881',
    requisitionId: '77881',
    sourceUrl: 'https://openfinancial.keka.com/careers/jobdetails/77881',
    applyUrl: 'https://openfinancial.keka.com/careers/jobdetails/77881',
    employmentType: 'Full Time',
    experienceRequired: '4 - 7 Yrs',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: ['Node.js', 'Payments'],
    postingDate: '2026-07-08',
    closingDate: null,
    jobDescription: 'Build banking infrastructure.',
  })
})

test('run fetches the Open Financial careers page, resolves the active Keka feed, and decorates jobs', async () => {
  const openFinancial = await loadModule()

  const requestedTexts = []
  const requestedJson = []
  const scraper = openFinancial.createOpenFinancialTechnologiesScraper()

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requestedTexts.push(url)
      if (url === openFinancial.CAREER_PAGE_URL) return careerPageHtml
      throw new Error(`Unexpected text URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedJson.push(url)
      if (url === 'https://openfinancial.keka.com/careers/api/embedjobs/default/active/01234567-89ab-cdef-0123-456789abcdef') {
        return [
          {
            id: 77883,
            title: 'Senior Product Designer',
            description: '<p>Design delightful fintech experiences.</p>',
            departmentName: 'Design',
            jobLocations: [
              {
                name: 'Bengaluru, India',
                city: 'Bengaluru',
                state: 'Karnataka',
                countryCode: 'IN',
                countryName: 'India',
              },
            ],
            jobType: 2,
            experience: '5 - 8 Yrs',
            publishedOn: '2026-07-08T08:30:00Z',
            skillNames: ['Figma'],
          },
        ]
      }

      throw new Error(`Unexpected JSON URL: ${url}`)
    },
  })

  assert.deepEqual(requestedTexts, [openFinancial.CAREER_PAGE_URL])
  assert.deepEqual(requestedJson, [
    'https://openfinancial.keka.com/careers/api/embedjobs/default/active/01234567-89ab-cdef-0123-456789abcdef',
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'openfinancialtechnologies')
  assert.equal(jobs[0].link, 'https://openfinancial.keka.com/careers/jobdetails/77883')
  assert.equal(jobs[0].company, 'Open Financial Technologies Private Limited')
  assert.equal(typeof jobs[0].scrapedAt, 'string')
})

test('run follows the current document-backed Open Financial Technologies careers shell', async () => {
  const openFinancial = await loadModule()
  const documentUrl =
    'https://openfinancial.keka.com/ats/documents/161570d3-d2be-4e8c-b233-d006f70cd371/careerportal/ad813284387e414ba9c8c20b9615b368.html'

  assert.equal(
    openFinancial.extractCareerDocumentUrl(documentBackedCareerShellHtml, openFinancial.CAREER_PAGE_URL),
    documentUrl,
  )

  const requestedTexts = []
  const requestedJson = []
  const jobs = await openFinancial.createOpenFinancialTechnologiesScraper().run({
    fetchText: async (url) => {
      requestedTexts.push(url)
      if (url === openFinancial.CAREER_PAGE_URL) return documentBackedCareerShellHtml
      if (url === documentUrl) return careerPageHtml
      throw new Error(`Unexpected text URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedJson.push(url)
      if (url === 'https://openfinancial.keka.com/careers/api/embedjobs/default/active/01234567-89ab-cdef-0123-456789abcdef') {
        return [
          {
            id: 72143,
            title: 'AI/ML Lead',
            description: '<p>Lead applied ML work.</p>',
            departmentName: 'Engineering',
            jobType: 2,
            publishedOn: '2026-05-18T12:41:11.210Z',
            jobLocations: [
              {
                name: 'Bengaluru, Karnataka',
                city: 'Bengaluru',
                state: 'KA',
                countryCode: 'IN',
                countryName: 'India',
              },
            ],
          },
        ]
      }

      throw new Error(`Unexpected JSON URL: ${url}`)
    },
  })

  assert.deepEqual(requestedTexts, [
    openFinancial.CAREER_PAGE_URL,
    documentUrl,
  ])
  assert.deepEqual(requestedJson, [
    'https://openfinancial.keka.com/careers/api/embedjobs/default/active/01234567-89ab-cdef-0123-456789abcdef',
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].title, 'AI/ML Lead')
  assert.equal(jobs[0].source, 'openfinancialtechnologies')
})

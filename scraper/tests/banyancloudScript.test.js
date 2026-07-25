import assert from 'node:assert/strict'
import test from 'node:test'

const loadBanyanModule = async () => {
  try {
    return await import('../banyancloud/script.js')
  } catch {
    return null
  }
}

const careerPageHtml = `
<!doctype html>
<html>
  <body>
    <script>
      window.khConfig = {
        identifier: 'e480b0c5-0897-4495-be6f-34982c1f6be4',
        domain: 'https://banyancloud.keka.com/careers/',
        targetContainer: '#khembedjobs'
      };
    </script>
    <div id="khembedjobs"></div>
  </body>
</html>
`

test('extractCareerConfig reads the public Keka embed config from the Banyan Cloud careers page', async () => {
  const banyan = await loadBanyanModule()
  assert.ok(banyan)

  assert.deepEqual(
    banyan.extractCareerConfig(careerPageHtml),
    {
      identifier: 'e480b0c5-0897-4495-be6f-34982c1f6be4',
      domain: 'https://banyancloud.keka.com/careers/',
      portalName: 'default',
    },
  )

  assert.equal(
    banyan.buildActiveJobsUrl(banyan.extractCareerConfig(careerPageHtml)),
    'https://banyancloud.keka.com/careers/api/embedjobs/default/active/e480b0c5-0897-4495-be6f-34982c1f6be4',
  )
})

test('extractSearchResults maps public Keka jobs into the shared scraper contract for Banyan Cloud', async () => {
  const banyan = await loadBanyanModule()
  assert.ok(banyan)

  const jobs = banyan.extractSearchResults(
    [
      {
        id: 140714,
        title: 'Senior Platform Engineer',
        description: '<div>Build cloud security platform features.</div>',
        departmentName: 'Engineering',
        jobLocations: [
          {
            id: 407,
            name: 'Delhi',
            city: 'Delhi',
            state: 'DL',
            countryCode: 'IN',
            countryName: '',
          },
        ],
        jobType: 2,
        experience: '4 to 7 years',
        salaryRangeFormat: '',
        publishedOn: '2026-07-05T06:46:32.277Z',
        skillNames: ['aws', 'golang'],
      },
      {
        id: 140715,
        title: 'Cyber Security Sales Engineer (Fresher)',
        description: '<p>Support customer security demos.</p>',
        departmentName: null,
        jobLocations: [],
        jobType: 2,
        experience: '0 to 1 years',
        salaryRangeFormat: '',
        publishedOn: '2026-07-01T06:46:32.277Z',
        skillNames: [],
      },
    ],
    {
      kekaDomain: 'https://banyancloud.keka.com/careers/',
    },
  )

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'Senior Platform Engineer',
    company: 'Banyan Cloud',
    department: 'Engineering',
    location: 'Delhi, India',
    city: 'Delhi',
    country: 'India',
    jobId: '140714',
    requisitionId: '140714',
    sourceUrl: 'https://banyancloud.keka.com/careers/jobdetails/140714',
    applyUrl: 'https://banyancloud.keka.com/careers/jobdetails/140714',
    employmentType: 'Full Time',
    experienceRequired: '4 to 7 years',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: ['aws', 'golang'],
    postingDate: '2026-07-05',
    closingDate: null,
    jobDescription: 'Build cloud security platform features.',
    remoteStatus: 'On-site',
    compensation: null,
  })
  assert.equal(jobs[1].title, 'Cyber Security Sales Engineer (Fresher)')
  assert.equal(jobs[1].location, 'India')
  assert.equal(jobs[1].city, null)
  assert.equal(jobs[1].country, 'India')
  assert.equal(jobs[1].employmentType, 'Full Time')
})

test('run fetches the Banyan Cloud careers page, resolves the public Keka config, and decorates jobs', async () => {
  const banyan = await loadBanyanModule()
  assert.ok(banyan)

  const requestedTexts = []
  const requestedJson = []
  const scraper = banyan.createBanyanCloudScraper()

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requestedTexts.push(url)
      if (url === banyan.CAREER_PAGE_URL) return careerPageHtml
      throw new Error(`Unexpected text URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedJson.push(url)
      if (url === 'https://banyancloud.keka.com/careers/api/embedjobs/default/active/e480b0c5-0897-4495-be6f-34982c1f6be4') {
        return [
          {
            id: 140714,
            title: 'Senior Platform Engineer',
            description: '<div>Build cloud security platform features.</div>',
            departmentName: 'Engineering',
            jobLocations: [
              {
                id: 407,
                name: 'Delhi',
                city: 'Delhi',
                state: 'DL',
                countryCode: 'IN',
                countryName: '',
              },
            ],
            jobType: 2,
            experience: '4 to 7 years',
            salaryRangeFormat: '',
            publishedOn: '2026-07-05T06:46:32.277Z',
            skillNames: ['aws', 'golang'],
          },
        ]
      }

      throw new Error(`Unexpected JSON URL: ${url}`)
    },
  })

  assert.deepEqual(requestedTexts, [banyan.CAREER_PAGE_URL])
  assert.deepEqual(requestedJson, [
    'https://banyancloud.keka.com/careers/api/embedjobs/default/active/e480b0c5-0897-4495-be6f-34982c1f6be4',
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'banyancloud')
  assert.equal(jobs[0].link, 'https://banyancloud.keka.com/careers/jobdetails/140714')
  assert.equal(jobs[0].company, 'Banyan Cloud')
  assert.equal(typeof jobs[0].scrapedAt, 'string')
})

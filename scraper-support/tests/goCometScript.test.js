import assert from 'node:assert/strict'
import test from 'node:test'

const loadGoCometModule = async () => import('../../scraper/gocomet/script.js')

test('run pins GoComet Keka endpoints, keeps India jobs, and returns runner metadata', async () => {
  const gocomet = await loadGoCometModule()
  const requestedTexts = []
  const requestedJson = []

  const jobs = await gocomet.createGoCometScraper().run({
    fetchText: async (url) => {
      requestedTexts.push(url)
      if (url === gocomet.CAREER_PAGE_URL) {
        return `
          <main>
            <h1>Careers at GoComet</h1>
            <script src="https://gocomet.keka.com/careers/api/embedjobs/js/f83ffa9c-65f8-451a-b4ad-ead39efd7867"></script>
          </main>
        `
      }
      if (url === gocomet.EMBED_CONFIG_URL) {
        return 'window.khConfig = { identifier: "f83ffa9c-65f8-451a-b4ad-ead39efd7867" }'
      }
      throw new Error(`Unexpected text URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedJson.push(url)
      if (url === gocomet.ACTIVE_JOBS_URL) {
        return [
          {
            id: 133725,
            title: 'Senior Product Designer',
            departmentId: 'design',
            description: '<p>Build global logistics workflows.</p>',
            experience: '5-8 years',
            skillNames: ['Figma', 'UX Research'],
            jobLocations: [
              { name: 'Mumbai', city: 'Mumbai', countryCode: 'IN', countryName: 'India' },
            ],
            jobType: 2,
            publishedOn: '2026-07-09T08:00:00.000Z',
          },
          {
            id: 155001,
            title: 'US Enterprise AE',
            departmentId: 'sales',
            jobLocations: [
              { name: 'Chicago', city: 'Chicago', countryCode: 'US', countryName: 'United States' },
            ],
          },
        ]
      }
      if (url === gocomet.DEPARTMENTS_URL) {
        return [
          { id: 'design', name: 'Design' },
          { id: 'sales', name: 'Sales' },
        ]
      }
      throw new Error(`Unexpected JSON URL: ${url}`)
    },
    now: () => '2026-07-09T13:00:00.000Z',
  })

  assert.deepEqual(requestedTexts, [gocomet.CAREER_PAGE_URL, gocomet.EMBED_CONFIG_URL])
  assert.deepEqual(requestedJson, [gocomet.ACTIVE_JOBS_URL, gocomet.DEPARTMENTS_URL])
  assert.equal(gocomet.PROVIDER_METADATA.source, 'gocomet')
  assert.equal(gocomet.PROVIDER_METADATA.adapter, 'script')
  assert.equal(gocomet.PROVIDER_METADATA.atsPlatform, 'keka-embed-api')
  assert.match(gocomet.PROVIDER_METADATA.modulePath, /gocomet[\\/]script\.js$/i)

  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'Senior Product Designer',
    company: 'GoComet',
    department: 'Design',
    location: 'Mumbai, India',
    city: 'Mumbai',
    country: 'India',
    jobId: '133725',
    requisitionId: '133725',
    sourceUrl: 'https://gocomet.keka.com/careers/jobdetails/133725',
    applyUrl: 'https://gocomet.keka.com/careers/applyjob/133725',
    employmentType: 'Full Time',
    experienceRequired: '5-8 years',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: ['Figma', 'UX Research'],
    postingDate: '2026-07-09',
    closingDate: null,
    jobDescription: 'Build global logistics workflows.',
    remoteStatus: 'On-site',
    compensation: null,
    source: 'gocomet',
    link: 'https://gocomet.keka.com/careers/applyjob/133725',
    scrapedAt: '2026-07-09T13:00:00.000Z',
  })
})

import assert from 'node:assert/strict'
import test from 'node:test'

const loadAmmachiModule = async () => {
  try {
    return await import('../ammachilabs/script.js')
  } catch {
    return null
  }
}

test('extractSearchResults maps the Ammachi Labs WordPress jobs API into shared scraper fields', async () => {
  const ammachi = await loadAmmachiModule()
  assert.ok(ammachi)

  const jobs = ammachi.extractSearchResults([
    {
      id: 58601,
      link: 'https://ammachilabs.org/job/field-investigator/',
      date_gmt: '2026-05-26T04:41:14',
      title: { rendered: 'Field Investigator' },
      position_title: 'Field Investigator in Wayanad district, Kerala',
      position_employment_type: ['FULL_TIME'],
      position_job_location: '',
      position_description: '<p>Lead community eye-care programs.</p>',
      position_responsibilities: '<ul><li>Coordinate field visits</li></ul>',
      position_qualifications: '<ul><li>BSW/MSW preferred</li></ul>',
    },
    {
      id: 58602,
      link: 'https://ammachilabs.org/job/remote-learning-designer/',
      date_gmt: '2026-05-20T06:00:00',
      title: { rendered: 'Remote Learning Designer' },
      position_title: 'Remote Learning Designer',
      position_employment_type: ['CONTRACTOR'],
      position_job_location: 'Remote, India',
      position_description: '<p>Create digital learning experiences.</p>',
      position_responsibilities: '<ul><li>Collaborate with content teams</li></ul>',
      position_qualifications: '<ul><li>Instructional design experience</li></ul>',
    },
  ])

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'Field Investigator in Wayanad district, Kerala',
    company: 'Ammachi Labs',
    department: null,
    location: 'Wayanad district, Kerala, India',
    city: 'Wayanad district',
    country: 'India',
    jobId: '58601',
    requisitionId: '58601',
    sourceUrl: 'https://ammachilabs.org/job/field-investigator/',
    applyUrl: 'https://ammachilabs.org/job/field-investigator/',
    employmentType: 'Full-time',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-05-26T04:41:14.000Z',
    closingDate: null,
    jobDescription: 'Lead community eye-care programs. Responsibilities Coordinate field visits Qualifications BSW/MSW preferred',
    remoteStatus: 'On-site',
  })
  assert.equal(jobs[1].title, 'Remote Learning Designer')
  assert.equal(jobs[1].city, null)
  assert.equal(jobs[1].remoteStatus, 'Remote')
  assert.equal(jobs[1].employmentType, 'Contract')
})

test('run fetches the Ammachi Labs jobs API and decorates jobs', async () => {
  const ammachi = await loadAmmachiModule()
  assert.ok(ammachi)

  const requestedUrls = []
  const scraper = ammachi.createAmmachiLabsScraper()

  const jobs = await scraper.run({
    fetchJson: async (url) => {
      requestedUrls.push(url)
      if (url === ammachi.JOBS_API_URL) {
        return [
          {
            id: 59001,
            link: 'https://ammachilabs.org/job/stem-educator/',
            date_gmt: '2026-06-01T04:00:00',
            title: { rendered: 'STEM Educator' },
            position_title: 'STEM Educator',
            position_employment_type: ['FULL_TIME'],
            position_job_location: 'Amritapuri, Kerala, India',
            position_description: '<p>Teach STEM programs across community cohorts.</p>',
            position_responsibilities: '<ul><li>Facilitate lab sessions</li></ul>',
            position_qualifications: '<ul><li>Education background preferred</li></ul>',
          },
        ]
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.equal(ammachi.buildSearchUrl(), ammachi.JOBS_API_URL)
  assert.deepEqual(requestedUrls, [ammachi.JOBS_API_URL])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'ammachilabs')
  assert.equal(jobs[0].link, 'https://ammachilabs.org/job/stem-educator/')
  assert.equal(jobs[0].company, 'Ammachi Labs')
  assert.equal(typeof jobs[0].scrapedAt, 'string')
})

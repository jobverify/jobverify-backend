import assert from 'node:assert/strict'
import test from 'node:test'

const samplePayload = {
  jobs: [
    {
      absolute_url: 'https://www.sisense.com/careers/job/?gh_jid=9000001',
      id: 9000001,
      requisition_id: 'JR-2001001',
      title: 'Senior Software Engineer',
      first_published: '2026-07-21T10:34:52-04:00',
      content: '<p>Build analytics features for India.</p>',
      location: { name: 'Bengaluru, Karnataka, India' },
      departments: [{ name: 'Product Engineering' }],
      offices: [{ location: 'Bengaluru, Karnataka, India' }],
      metadata: [{ name: 'Country', value: ['India'] }],
    },
    {
      absolute_url: 'https://www.sisense.com/careers/job/?gh_jid=9000002',
      id: 9000002,
      requisition_id: 'JR-2001002',
      title: 'Head of Sales',
      first_published: '2026-07-21T10:34:52-04:00',
      content: '<p>Lead sales in New York.</p>',
      location: { name: 'New York, NY' },
      departments: [{ name: 'Sales' }],
      offices: [{ location: 'New York, NY' }],
      metadata: [{ name: 'Country', value: ['United States'] }],
    },
  ],
}

const loadModule = async () => {
  try {
    return await import('../sisense/script.js')
  } catch {
    assert.fail('Expected Sisense scraper module at ../sisense/script.js')
  }
}

test('Sisense scraper helpers stay pinned to the verified Greenhouse surface and India filtering', async () => {
  const sisense = await loadModule()

  assert.equal(sisense.SOURCE, 'sisense')
  assert.equal(sisense.COMPANY, 'Sisense')
  assert.equal(sisense.CAREERS_URL, 'https://www.sisense.com/about/careers/')
  assert.equal(
    sisense.GREENHOUSE_BOARD_URL,
    'https://job-boards.greenhouse.io/embed/job_board?for=sisense',
  )
  assert.equal(
    sisense.GREENHOUSE_API_URL,
    'https://boards-api.greenhouse.io/v1/boards/sisense/jobs?content=true',
  )
  assert.equal(sisense.VERIFIED_ON, '2026-07-25')
  assert.equal(sisense.isIndiaJob(samplePayload.jobs[0]), true)
  assert.equal(sisense.isIndiaJob(samplePayload.jobs[1]), false)
  assert.deepEqual(sisense.extractJobsFromGreenhousePayload(samplePayload), [
    {
      title: 'Senior Software Engineer',
      company: 'Sisense',
      department: 'Product Engineering',
      location: 'Bengaluru, Karnataka, India',
      city: 'Bengaluru',
      country: 'India',
      jobId: '9000001',
      requisitionId: 'JR-2001001',
      sourceUrl: 'https://www.sisense.com/careers/job/?gh_jid=9000001',
      applyUrl: 'https://www.sisense.com/careers/job/?gh_jid=9000001',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-07-21',
      closingDate: null,
      jobDescription: 'Build analytics features for India.',
    },
  ])
})

test('Sisense run returns decorated India jobs from the official Greenhouse API and allows empty current boards', async () => {
  const sisense = await loadModule()
  const requestedUrls = []

  const jobs = await sisense.createSisenseScraper().run({
    fetchJson: async (url) => {
      requestedUrls.push(url)
      return samplePayload
    },
    now: () => '2026-07-25T00:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [sisense.GREENHOUSE_API_URL])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'sisense')
  assert.equal(jobs[0].link, 'https://www.sisense.com/careers/job/?gh_jid=9000001')
  assert.equal(jobs[0].scrapedAt, '2026-07-25T00:00:00.000Z')

  const emptyJobs = await sisense.createSisenseScraper().run({
    fetchJson: async () => ({ jobs: [samplePayload.jobs[1]] }),
    now: () => '2026-07-25T00:00:00.000Z',
  })

  assert.deepEqual(emptyJobs, [])
})

import assert from 'node:assert/strict'
import test from 'node:test'

const loadAccoliteModule = async () => {
  try {
    return await import('../../scraper/accolitedigital/script.js')
  } catch {
    return null
  }
}

const sampleTurboHirePayload = {
  response: [
    {
      id: 't__12345678-90ab-cdef-1234-567890abcdef',
      id_raw: '12345678-90ab-cdef-1234-567890abcdef',
      text: 'Senior Android Developer',
      description: '<p>Build mobile apps for enterprise clients.</p>',
      experience: {
        MinExp: 6,
        MaxExp: 8,
      },
      country: 'in',
      skills: ['Android', 'Kotlin'],
      workplaceType: 'onsite',
      categories: {
        department: 'Accolite',
        team: 'BU',
        commitment: 'Full Time',
        allLocations: ['Chennai'],
        location: 'Chennai',
      },
      applyUrl: '',
    },
    {
      id: 't__other-1',
      id_raw: 'other-1',
      text: 'Data Engineer',
      description: '<p>Build data products.</p>',
      country: 'in',
      skills: ['Python'],
      categories: {
        department: 'Bounteous',
        team: 'Data',
        commitment: 'Full Time',
        allLocations: ['Bengaluru, India'],
        location: 'Bengaluru, India',
      },
      applyUrl: '',
    },
  ],
}

test('extractSearchResults keeps only Accolite Digital India jobs from the Bounteous TurboHire feed', async () => {
  const accolite = await loadAccoliteModule()
  assert.ok(accolite)

  const jobs = accolite.extractSearchResults(sampleTurboHirePayload)

  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'Senior Android Developer',
    company: 'Accolite Digital',
    department: 'Accolite',
    location: 'Chennai, India',
    city: 'Chennai',
    country: 'India',
    jobId: 't__12345678-90ab-cdef-1234-567890abcdef',
    requisitionId: '12345678-90ab-cdef-1234-567890abcdef',
    sourceUrl: 'https://www.bounteous.com/careers/job/t__12345678-90ab-cdef-1234-567890abcdef',
    applyUrl: 'https://www.bounteous.com/careers/job/t__12345678-90ab-cdef-1234-567890abcdef',
    employmentType: 'Full Time',
    experienceRequired: '6-8 years',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: ['Android', 'Kotlin'],
    postingDate: null,
    closingDate: null,
    jobDescription: 'Build mobile apps for enterprise clients.',
    remoteStatus: 'On-site',
  })
})

test('run fetches the public Accolite TurboHire feed and decorates results', async () => {
  const accolite = await loadAccoliteModule()
  assert.ok(accolite)

  const requestedUrls = []
  const scraper = accolite.createAccoliteDigitalScraper()

  const jobs = await scraper.run({
    fetchJson: async (url) => {
      requestedUrls.push(url)
      if (url === accolite.TURBOHIRE_ENDPOINT) return sampleTurboHirePayload
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    accolite.TURBOHIRE_ENDPOINT,
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'accolitedigital')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.equal(typeof jobs[0].scrapedAt, 'string')
  assert.equal(accolite.CAREER_PAGE_URL, 'https://www.bounteous.com/careers/search-results')
})

import assert from 'node:assert/strict'
import test from 'node:test'

const loadBounteousModule = async () => {
  try {
    return await import('../../scraper/bounteous/script.js')
  } catch {
    return null
  }
}

const sampleLeverJobs = [
  {
    id: 'lever-india-1',
    text: 'Data Engineer',
    createdAt: Date.parse('2026-06-05T10:00:00.000Z'),
    descriptionPlain: 'Build data pipelines for client programs.',
    openingPlain: 'Bounteous delivers digital engineering solutions.',
    additionalPlain: 'Equal opportunity employer.',
    categories: {
      commitment: 'Full Time',
      department: 'Data & AI & Cloud',
      location: 'Bengaluru, India',
      team: 'Technology: Data',
      allLocations: ['Bengaluru, India'],
    },
    hostedUrl: 'https://jobs.lever.co/bounteous/lever-india-1',
    applyUrl: 'https://jobs.lever.co/bounteous/lever-india-1/apply',
  },
  {
    id: 'lever-canada-1',
    text: 'Applied AI Engineer',
    createdAt: Date.parse('2026-06-06T10:00:00.000Z'),
    categories: {
      location: 'Montreal, QC',
      allLocations: ['Montreal, QC'],
    },
    hostedUrl: 'https://jobs.lever.co/bounteous/lever-canada-1',
    applyUrl: 'https://jobs.lever.co/bounteous/lever-canada-1/apply',
    country: 'CA',
  },
]

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
      id: 't__eu-1',
      id_raw: 'eu-1',
      text: 'Python Developer',
      description: '<p>Work on backend services.</p>',
      country: 'eu',
      skills: ['Python'],
      categories: {
        location: 'Glasgow, UK',
        allLocations: ['Glasgow, UK'],
      },
      applyUrl: 'https://accoliteuk.turbohire.co/job/publicjobs/eu-1',
    },
  ],
}

test('extractSearchResults merges Bounteous Lever and TurboHire jobs while keeping only India roles', async () => {
  const bounteous = await loadBounteousModule()
  assert.ok(bounteous)

  const jobs = bounteous.extractSearchResults({
    leverJobs: sampleLeverJobs,
    turboHirePayload: sampleTurboHirePayload,
  })

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'Data Engineer',
    company: 'Bounteous',
    department: 'Technology: Data',
    location: 'Bengaluru, India',
    city: 'Bengaluru',
    country: 'India',
    jobId: 'lever-india-1',
    requisitionId: 'lever-india-1',
    sourceUrl: 'https://jobs.lever.co/bounteous/lever-india-1',
    applyUrl: 'https://jobs.lever.co/bounteous/lever-india-1/apply',
    employmentType: 'Full Time',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-06-05T10:00:00.000Z',
    closingDate: null,
    jobDescription: 'Bounteous delivers digital engineering solutions. Build data pipelines for client programs. Equal opportunity employer.',
    remoteStatus: null,
  })
  assert.deepEqual(jobs[1], {
    title: 'Senior Android Developer',
    company: 'Bounteous',
    department: 'BU',
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

test('run fetches both public Bounteous job sources and decorates the India results', async () => {
  const bounteous = await loadBounteousModule()
  assert.ok(bounteous)

  const requestedUrls = []
  const scraper = bounteous.createBounteousScraper()

  const jobs = await scraper.run({
    fetchJson: async (url) => {
      requestedUrls.push(url)
      if (url === bounteous.LEVER_ENDPOINT) return sampleLeverJobs
      if (url === bounteous.TURBOHIRE_ENDPOINT) return sampleTurboHirePayload
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    bounteous.LEVER_ENDPOINT,
    bounteous.TURBOHIRE_ENDPOINT,
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'bounteous')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.equal(jobs[1].source, 'bounteous')
  assert.equal(typeof jobs[0].scrapedAt, 'string')
  assert.equal(bounteous.CAREER_PAGE_URL, 'https://www.bounteous.com/careers/search-results')
})

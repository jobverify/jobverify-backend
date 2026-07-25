import assert from 'node:assert/strict'
import test from 'node:test'

const vacancyCategories = [
  {
    id: 16,
    name: 'Vacatures',
    slug: 'vacatures',
    count: 1,
  },
  {
    id: 20,
    name: 'Nieuws',
    slug: 'nieuws',
    count: 8,
  },
]

const vacancyPosts = [
  {
    id: 1444,
    date: '2025-11-05T10:02:40',
    date_gmt: '2025-11-05T10:02:40',
    link: 'https://www.doppio-espresso.nl/barista-doppio-leeuwarden/',
    status: 'publish',
    categories: [16],
    title: {
      rendered: 'Barista Doppio Leeuwarden',
    },
    content: {
      rendered: [
        '<p>Op zoek naar een nieuwe uitdaging? Of een leuke (bij)baan?</p>',
        '<p>Mooi! Want bij Doppio Espresso hebben we binnen ons team meerdere (parttime en fulltime) vacatures.</p>',
        '<p>Full Time  |  </p>',
      ].join(''),
    },
  },
]

const summarizeJob = (job) => ({
  title: job.title,
  company: job.company,
  location: job.location,
  city: job.city,
  country: job.country,
  jobId: job.jobId,
  requisitionId: job.requisitionId,
  sourceUrl: job.sourceUrl,
  applyUrl: job.applyUrl,
  employmentType: job.employmentType,
  postingDate: job.postingDate,
  source: job.source,
  link: job.link,
})

const loadDoppioModule = async () => {
  try {
    return await import('../doppio/script.js')
  } catch {
    assert.fail('Expected Doppio scraper module at ../doppio/script.js')
  }
}

test('extractVacancyPosts maps Doppio vacancy posts into truthful public jobs', async () => {
  const doppio = await loadDoppioModule()
  const jobs = doppio.extractVacancyPosts(vacancyPosts)

  assert.equal(jobs.length, 1)
  assert.deepEqual(summarizeJob({
    ...jobs[0],
    source: 'doppio',
    link: doppio.CAREERS_PAGE_URL,
  }), {
    title: 'Barista Doppio Leeuwarden',
    company: 'Doppio',
    location: 'Leeuwarden, Netherlands',
    city: 'Leeuwarden',
    country: 'Netherlands',
    jobId: '1444',
    requisitionId: '1444',
    sourceUrl: 'https://www.doppio-espresso.nl/barista-doppio-leeuwarden/',
    applyUrl: 'https://www.doppio-espresso.nl/werken-bij-doppio/',
    employmentType: 'Full Time',
    postingDate: '2025-11-05T10:02:40.000Z',
    source: 'doppio',
    link: 'https://www.doppio-espresso.nl/werken-bij-doppio/',
  })
  assert.match(jobs[0].jobDescription, /Op zoek naar een nieuwe uitdaging/i)
})

test('run pins the verified Doppio vacatures category and uses the first-party careers apply handoff', async () => {
  const doppio = await loadDoppioModule()
  const requestedUrls = []

  const jobs = await doppio.createDoppioScraper().run({
    fetchJson: async (url) => {
      requestedUrls.push(url)

      if (url === doppio.VACANCY_CATEGORY_API_URL) {
        return vacancyCategories
      }

      if (url === doppio.buildVacancyPostsApiUrl(16)) {
        return vacancyPosts
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    doppio.VACANCY_CATEGORY_API_URL,
    doppio.buildVacancyPostsApiUrl(16),
  ])
  assert.equal(doppio.VACANCIES_PAGE_URL, 'https://www.doppio-espresso.nl/category/vacatures/')
  assert.equal(doppio.CAREERS_PAGE_URL, 'https://www.doppio-espresso.nl/werken-bij-doppio/')
  assert.deepEqual(jobs.map(summarizeJob), [
    {
      title: 'Barista Doppio Leeuwarden',
      company: 'Doppio',
      location: 'Leeuwarden, Netherlands',
      city: 'Leeuwarden',
      country: 'Netherlands',
      jobId: '1444',
      requisitionId: '1444',
      sourceUrl: 'https://www.doppio-espresso.nl/barista-doppio-leeuwarden/',
      applyUrl: 'https://www.doppio-espresso.nl/werken-bij-doppio/',
      employmentType: 'Full Time',
      postingDate: '2025-11-05T10:02:40.000Z',
      source: 'doppio',
      link: 'https://www.doppio-espresso.nl/werken-bij-doppio/',
    },
  ])
  assert.equal(typeof jobs[0].scrapedAt, 'string')
})

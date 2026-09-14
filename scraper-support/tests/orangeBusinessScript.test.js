import assert from 'node:assert/strict'
import test from 'node:test'

const loadOrangeModule = async () => {
  try {
    return await import('../../scraper/orangebusiness/script.js')
  } catch {
    assert.fail('Expected Orange Business scraper module at ../../scraper/orangebusiness/script.js')
  }
}

const searchHtml = `<html><body><script>phApp.ddo = ${JSON.stringify({
  siteConfig: { data: { widgetApiEndpoint: 'https://orange.jobs/widgets' } },
  eagerLoadRefineSearch: {
    totalHits: 2,
    hits: 2,
    data: {
      jobs: [
        {
          reqId: 'ICM-587014',
          jobId: '27990',
          title: 'OSS Solution Architect',
          cityStateCountry: 'Bangalore, Karnātaka, INDIA',
          city: 'Bangalore',
          country: 'INDIA',
          companyName: 'Orange Business',
          category: 'Technology',
          type: 'Full time',
          postedDate: '2026-07-09',
          descriptionTeaser: 'Build OSS solutions for enterprise customers.',
        },
        {
          reqId: 'ICM-587015',
          jobId: '27991',
          title: 'Security Consultant',
          cityStateCountry: 'Gurgaon, Haryana, INDIA',
          city: 'Gurgaon',
          country: 'INDIA',
          companyName: 'Orange Cyberdefense',
          category: 'Security',
          type: 'Full time',
          postedDate: '2026-07-08',
          descriptionTeaser: 'Support cyber customers.',
        },
      ],
      aggregations: [
        { field: 'country', value: { INDIA: 79 } },
      ],
    },
  },
})};</script></body></html>`

const detailHtml = `<html><head><script type="application/ld+json">${JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'JobPosting',
  title: 'OSS Solution Architect',
  description: '<p>Design OSS architecture for Orange Business platforms.</p><p><strong>Required Skills</strong></p><ul><li>OSS/BSS architecture</li><li>Enterprise integration</li></ul>',
  datePosted: '2026-07-09',
  employmentType: 'FULL_TIME',
  jobLocation: {
    '@type': 'Place',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Bangalore',
      addressRegion: 'Karnātaka',
      addressCountry: 'India',
    },
  },
})}</script></head><body><script>phApp.ddo = ${JSON.stringify({
  jobDetail: {
    data: {
      job: {
        jobId: '27990',
        reqId: 'ICM-587014',
        title: 'OSS Solution Architect',
        category: 'Technology',
        ml_country: 'INDIA',
        applyUrl: 'https://careers-orange.icims.com/jobs/27990/oss-solution-architect/job/login',
      },
    },
  },
})};</script></body></html>`

test('buildSearchResultsPageUrl keeps Orange Business listings on the scoped Phenom search route', async () => {
  const { buildSearchResultsPageUrl } = await loadOrangeModule()
  const searchUrl = new URL(buildSearchResultsPageUrl())
  const pagedSearchUrl = new URL(buildSearchResultsPageUrl(20))

  assert.equal(searchUrl.origin, 'https://orange.jobs')
  assert.equal(searchUrl.pathname, '/gb/en/search-results')
  assert.equal(searchUrl.searchParams.get('companyName'), 'Orange Business')
  assert.equal(pagedSearchUrl.origin, 'https://orange.jobs')
  assert.equal(pagedSearchUrl.pathname, '/gb/en/search-results')
  assert.equal(pagedSearchUrl.searchParams.get('companyName'), 'Orange Business')
  assert.equal(pagedSearchUrl.searchParams.get('from'), '20')
})

test('run supports the legacy companyName field and enriches verified Orange Business India jobs', async () => {
  const {
    buildSearchResultsPageUrl,
    run,
  } = await loadOrangeModule()
  const requestedUrls = []

  const jobs = await run({
    fetchJson: async (url) => {
      requestedUrls.push(url)
      const payload = JSON.parse(searchHtml.split('phApp.ddo = ')[1].split(';</script>')[0]).eagerLoadRefineSearch
      payload.data.jobs = payload.data.jobs.filter(job => job.companyName === 'Orange Business')
      payload.status = 200
      payload.totalHits = payload.hits = payload.data.jobs.length
      payload.data.aggregations = [{ field: 'country', value: { INDIA: payload.totalHits } }]
      return { refineSearch: payload }
    },
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === buildSearchResultsPageUrl()) return searchHtml
      if (url === 'https://orange.jobs/gb/en/job/ICM-587014/OSS-Solution-Architect') {
        return detailHtml
      }
      throw new Error(`Unexpected Orange Business fixture URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    'https://orange.jobs/widgets',
    'https://orange.jobs/gb/en/job/ICM-587014/OSS-Solution-Architect',
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].company, 'Orange Business')
  assert.equal(jobs[0].source, 'orangebusiness')
  assert.equal(jobs[0].jobId, '27990')
  assert.equal(jobs[0].requisitionId, 'ICM-587014')
  assert.equal(
    jobs[0].applyUrl,
    'https://careers-orange.icims.com/jobs/27990/oss-solution-architect/job/login',
  )
})

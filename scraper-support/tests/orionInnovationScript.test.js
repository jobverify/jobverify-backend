import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-08-04T12:00:00.000Z'

const careersPageData = {
  title: 'Life at Orion - Orion Innovation',
  text: 'Where people grow and innovation thrives. Explore Opportunities today.',
  links: [
    {
      href: 'https://www.orioninnovation.com/careers/job/?gh_jid=4697474006',
    },
  ],
}

const openJobsPageData = {
  title: 'Job - Orion Innovation',
  text: 'Open Jobs Open Positions Load more',
  links: [
    {
      href: 'https://www.orioninnovation.com/careers/job/?gh_jid=4697474006',
    },
    {
      href: 'https://www.orioninnovation.com/careers/job/?gh_jid=4697169006',
    },
  ],
}

const renderedCards = [
  {
    title: 'Data Engineer',
    location: 'India',
    category: 'Delivery',
    workType: 'Full-time',
    href: 'https://www.orioninnovation.com/careers/job/?gh_jid=4697474006',
  },
  {
    title: '.NET Full Stack Developer',
    location: 'Mumbai, Maharashtra',
    category: 'Delivery',
    workType: 'Full-time',
    href: 'https://www.orioninnovation.com/careers/job/?gh_jid=4697169006',
  },
  {
    title: 'US Sales Director',
    location: 'New York, United States',
    category: 'Sales',
    workType: 'Full-time',
    href: 'https://www.orioninnovation.com/careers/job/?gh_jid=4000000000',
  },
]

const dataEngineerWrapperHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Job - Orion Innovation</title>
  </head>
  <body>
    <iframe
      src="https://job-boards.greenhouse.io/embed/job_app?for=orioninnovation&amp;validityToken=test-validity-token&amp;token=4697474006"
    ></iframe>
  </body>
</html>
`

const dataEngineerGreenhouseHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Job Application for Data Engineer at Orion Innovation</title>
    <meta
      name="description"
      content="Design modern data platforms. Candidates should bring 10+ years of data engineering experience."
    />
  </head>
  <body>
    <main>
      <h1>Data Engineer</h1>
      <section>
        <h2>Job Description</h2>
        <p>Design modern data platforms for enterprise customers.</p>
        <p>Candidates should bring 10+ years of data engineering experience.</p>
      </section>
    </main>
  </body>
</html>
`

const dotNetWrapperHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Job - Orion Innovation</title>
  </head>
  <body>
    <iframe
      src="https://job-boards.greenhouse.io/embed/job_app?for=orioninnovation&amp;validityToken=test-validity-token&amp;token=4697169006"
    ></iframe>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/orioninnovation/script.js')
  } catch {
    assert.fail('Expected Orion Innovation scraper module at ../../scraper/orioninnovation/script.js')
  }
}

test('Orion Innovation helpers stay pinned to the verified official job surface and decode embedded Greenhouse job_app URLs', async () => {
  const orion = await loadModule()

  assert.equal(orion.SOURCE, 'orioninnovation')
  assert.equal(orion.COMPANY, 'Orion Innovation')
  assert.equal(orion.CAREERS_PAGE_URL, 'https://www.orioninnovation.com/careers/life-at-orion/')
  assert.equal(orion.OPEN_JOBS_URL, 'https://www.orioninnovation.com/careers/job/')
  assert.equal(orion.hasOfficialCareersSignal([
    careersPageData.title,
    careersPageData.text,
    careersPageData.links[0].href,
  ].join(' ')), true)
  assert.equal(orion.hasOfficialOpenJobsSignal(openJobsPageData), true)
  assert.equal(
    orion.extractEmbeddedGreenhouseJobAppUrl(dataEngineerWrapperHtml),
    'https://job-boards.greenhouse.io/embed/job_app?for=orioninnovation&validityToken=test-validity-token&token=4697474006',
  )
  assert.deepEqual(orion.extractJobsFromCards(renderedCards), [
    {
      title: 'Data Engineer',
      company: 'Orion Innovation',
      department: 'Delivery',
      location: 'India',
      city: 'Remote',
      country: 'India',
      jobId: '4697474006',
      requisitionId: '4697474006',
      sourceUrl: 'https://www.orioninnovation.com/careers/job/?gh_jid=4697474006',
      applyUrl: 'https://www.orioninnovation.com/careers/job/?gh_jid=4697474006',
      employmentType: 'Full-time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
    },
    {
      title: '.NET Full Stack Developer',
      company: 'Orion Innovation',
      department: 'Delivery',
      location: 'Mumbai, Maharashtra',
      city: 'Mumbai',
      country: 'India',
      jobId: '4697169006',
      requisitionId: '4697169006',
      sourceUrl: 'https://www.orioninnovation.com/careers/job/?gh_jid=4697169006',
      applyUrl: 'https://www.orioninnovation.com/careers/job/?gh_jid=4697169006',
      employmentType: 'Full-time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
    },
  ])
})

test('Orion Innovation run enriches official cards from embedded Greenhouse details and marks broken embeds as public-checked', async () => {
  const orion = await loadModule()
  const createdPages = []
  const fetchedUrls = []

  const jobs = await orion.createOrionInnovationScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    launchBrowserImpl: async () => ({
      close: async () => {},
    }),
    createOptimizedPageImpl: async () => {
      const page = {
        waitForSelector: async () => {},
      }
      createdPages.push(page)
      return page
    },
    collectPageDataImpl: async (_page, url) => {
      if (url === orion.CAREERS_PAGE_URL) return careersPageData
      if (url === orion.OPEN_JOBS_URL) return openJobsPageData
      throw new Error(`Unexpected Orion page data URL: ${url}`)
    },
    readRenderedJobCardsImpl: async () => renderedCards,
    fetchRenderedHtmlImpl: async (_page, url) => {
      fetchedUrls.push(url)
      if (url === 'https://www.orioninnovation.com/careers/job/?gh_jid=4697474006') {
        return dataEngineerWrapperHtml
      }
      if (url === 'https://job-boards.greenhouse.io/embed/job_app?for=orioninnovation&validityToken=test-validity-token&token=4697474006') {
        return dataEngineerGreenhouseHtml
      }
      if (url === 'https://www.orioninnovation.com/careers/job/?gh_jid=4697169006') {
        return dotNetWrapperHtml
      }
      if (url === 'https://job-boards.greenhouse.io/embed/job_app?for=orioninnovation&validityToken=test-validity-token&token=4697169006') {
        throw new Error('HTTP 502 for broken embedded Greenhouse application')
      }
      throw new Error(`Unexpected Orion rendered HTML URL: ${url}`)
    },
  })

  assert.equal(createdPages.length, 0)
  assert.deepEqual(fetchedUrls, [
    'https://www.orioninnovation.com/careers/job/?gh_jid=4697474006',
    'https://job-boards.greenhouse.io/embed/job_app?for=orioninnovation&validityToken=test-validity-token&token=4697474006',
    'https://www.orioninnovation.com/careers/job/?gh_jid=4697169006',
    'https://job-boards.greenhouse.io/embed/job_app?for=orioninnovation&validityToken=test-validity-token&token=4697169006',
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].title, 'Data Engineer')
  assert.equal(jobs[0].experienceRequired, '10+ years')
  assert.equal(jobs[0].publicExperienceChecked, true)
  assert.equal(jobs[0].link, 'https://www.orioninnovation.com/careers/job/?gh_jid=4697474006')
  assert.equal(jobs[0].scrapedAt, FIXED_SCRAPED_AT)
  assert.match(jobs[0].jobDescription || '', /10\+ years of data engineering experience/i)
  assert.equal(jobs[1].title, '.NET Full Stack Developer')
  assert.equal(jobs[1].experienceRequired, null)
  assert.equal(jobs[1].publicExperienceChecked, true)
  assert.equal(jobs[1].link, 'https://www.orioninnovation.com/careers/job/?gh_jid=4697169006')
  assert.equal(jobs[1].scrapedAt, FIXED_SCRAPED_AT)
})

test('Orion Innovation run fails closed when the verified open jobs page drifts', async () => {
  const orion = await loadModule()

  await assert.rejects(
    orion.createOrionInnovationScraper().run({
      launchBrowserImpl: async () => ({
        close: async () => {},
      }),
      createOptimizedPageImpl: async () => ({
        waitForSelector: async () => {},
      }),
      collectPageDataImpl: async (_page, url) => {
        if (url === orion.CAREERS_PAGE_URL) return careersPageData
        if (url === orion.OPEN_JOBS_URL) {
          return {
            title: 'Job - Orion Innovation',
            text: 'Unexpected content without the official open positions module',
            links: [],
          }
        }
        throw new Error(`Unexpected Orion page data URL: ${url}`)
      },
      readRenderedJobCardsImpl: async () => renderedCards,
    }),
    /open jobs page no longer matches/i,
  )
})

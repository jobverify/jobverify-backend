import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const loadBlastlineModule = async () => {
  try {
    return await import('../../scraper/blastlineindiapvtltd/script.js')
  } catch {
    assert.fail('Expected BLASTLINE INDIA PVT LTD scraper module at ../../scraper/blastlineindiapvtltd/script.js')
  }
}

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const fixturesDir = path.join(currentDir, 'fixtures', 'blastlineindiapvtltd')

const homepageHtml = fs.readFileSync(path.join(fixturesDir, 'homepage.html'), 'utf8')
const careersHtml = fs.readFileSync(path.join(fixturesDir, 'careers.html'), 'utf8')
const careersPagePayload = fs.readFileSync(path.join(fixturesDir, 'careers-page.json'), 'utf8')

test('BLASTLINE INDIA PVT LTD validates the verified homepage, careers page, and page payload contract', async () => {
  const blastline = await loadBlastlineModule()

  assert.equal(blastline.SOURCE, 'blastlineindiapvtltd')
  assert.equal(blastline.COMPANY, 'BLASTLINE INDIA PVT LTD')
  assert.equal(blastline.HOMEPAGE_URL, 'https://blastlineindia.com/')
  assert.equal(blastline.CAREERS_URL, 'https://blastlineindia.com/about-us/careers/')
  assert.equal(blastline.CAREERS_PAGE_API_URL, 'https://blastlineindia.com/wp-json/wp/v2/pages/2957')
  assert.equal(blastline.APPLICATION_ANCHOR_URL, 'https://blastlineindia.com/about-us/careers/#career-form')

  assert.equal(blastline.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(blastline.hasVerifiedCareersLink(homepageHtml), true)
  assert.equal(blastline.hasOfficialCareersSignal(careersHtml), true)

  const renderedHtml = blastline.extractRenderedHtmlFromPagePayload(careersPagePayload)
  const jobs = blastline.extractPublicJobs(renderedHtml)

  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].title, 'Digital Marketing Specialist')
  assert.equal(jobs[0].company, 'BLASTLINE INDIA PVT LTD')
  assert.equal(jobs[0].location, 'Kochi, Ernakulam, Kerala, India')
  assert.equal(jobs[0].city, 'Kochi')
  assert.equal(jobs[0].country, 'India')
  assert.equal(
    jobs[0].jobId,
    'blastlineindiapvtltd-digital-marketing-specialist-kochi-ernakulam-kerala-india',
  )
  assert.equal(jobs[0].applyUrl, 'https://blastlineindia.com/about-us/careers/#career-form')
  assert.equal(jobs[0].sourceUrl, 'https://blastlineindia.com/about-us/careers/')
  assert.equal(jobs[0].employmentType, 'Full-time')
  assert.equal(jobs[0].experienceRequired, '2+ years')
  assert.equal(jobs[0].remoteStatus, 'Hybrid')
  assert.deepEqual(jobs[0].requiredSkills, [
    'Take ownership of search engine and social media marketing.',
    'Develop and execute a comprehensive SEO strategy.',
    'Manage and optimize Google Ads and PPC campaigns.',
    'Develop, implement, and manage the social media strategy across key platforms.',
    'Analyse website traffic and campaign performance using Google Analytics.',
  ])
  assert.match(jobs[0].jobDescription, /Search Engine Optimization \(SEO\)/i)
  assert.match(jobs[0].jobDescription, /Key Responsibilities/i)
})

test('BLASTLINE INDIA PVT LTD run validates the official surfaces and decorates the public job', async () => {
  const blastline = await loadBlastlineModule()
  const requestedTextUrls = []
  const requestedJsonUrls = []

  const jobs = await blastline.createBlastlineIndiaPvtLtdScraper().run({
    fetchText: async (url) => {
      requestedTextUrls.push(url)
      if (url === blastline.HOMEPAGE_URL) return homepageHtml
      if (url === blastline.CAREERS_URL) return careersHtml
      throw new Error(`Unexpected text URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedJsonUrls.push(url)
      if (url === blastline.CAREERS_PAGE_API_URL) return JSON.parse(careersPagePayload)
      throw new Error(`Unexpected JSON URL: ${url}`)
    },
    now: () => '2026-07-11T00:00:00.000Z',
  })

  assert.deepEqual(requestedTextUrls, [blastline.HOMEPAGE_URL, blastline.CAREERS_URL])
  assert.deepEqual(requestedJsonUrls, [blastline.CAREERS_PAGE_API_URL])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'blastlineindiapvtltd')
  assert.equal(jobs[0].company, 'BLASTLINE INDIA PVT LTD')
  assert.equal(jobs[0].companyCareerPage, 'https://blastlineindia.com/about-us/careers/')
  assert.equal(jobs[0].companyDomain, 'blastlineindia.com')
  assert.equal(jobs[0].atsPlatform, 'official-company-careers')
  assert.equal(jobs[0].jobType, 'Full-time Experienced')
  assert.equal(jobs[0].link, 'https://blastlineindia.com/about-us/careers/#career-form')
  assert.equal(jobs[0].scrapedTimestamp?.toISOString(), '2026-07-11T00:00:00.000Z')
})

test('BLASTLINE INDIA PVT LTD fails closed when the verified homepage or public careers surface drifts', async () => {
  const blastline = await loadBlastlineModule()

  await assert.rejects(
    blastline.createBlastlineIndiaPvtLtdScraper().run({
      fetchText: async (url) => {
        if (url === blastline.HOMEPAGE_URL) {
          return '<html><head><title>Unexpected</title></head><body>No official homepage markers.</body></html>'
        }
        return careersHtml
      },
      fetchJson: async () => JSON.parse(careersPagePayload),
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    blastline.createBlastlineIndiaPvtLtdScraper().run({
      fetchText: async (url) => {
        if (url === blastline.HOMEPAGE_URL) return homepageHtml
        if (url === blastline.CAREERS_URL) {
          return careersHtml.replace('Current Openings', 'Open Roles')
        }
        throw new Error(`Unexpected text URL: ${url}`)
      },
      fetchJson: async () => JSON.parse(careersPagePayload),
    }),
    /verified public careers surface/i,
  )

  await assert.rejects(
    blastline.createBlastlineIndiaPvtLtdScraper().run({
      fetchText: async (url) => {
        if (url === blastline.HOMEPAGE_URL) return homepageHtml
        if (url === blastline.CAREERS_URL) return careersHtml
        throw new Error(`Unexpected text URL: ${url}`)
      },
      fetchJson: async () => ({
        id: 2957,
        slug: 'careers',
        link: 'https://blastlineindia.com/about-us/careers/',
        title: { rendered: 'Careers' },
        content: { rendered: '<div><h2>Current Openings</h2><p>No tabbed openings here anymore.</p></div>' },
      }),
    }),
    /verified page payload|verified inline public openings/i,
  )
})

test('BLASTLINE INDIA PVT LTD follows its new board and excludes other group companies', async () => {
  const blastline = await loadBlastlineModule()
  const boardUrl = 'https://careers.blastlineindia.com/'
  const detailsUrl = `${boardUrl}jobs/export-sales-co-ordinator`
  const currentCareersHtml = '<title>Careers - Blastline India</title><h2>Current Openings</h2><a href="https://careers.blastlineindia.com/">VIEW OPEN POSITIONS</a>'
  const boardHtml = `<title>Careers | Blastline India</title><p>3 roles</p>
    <article class="job-card"><h3><a href="/jobs/export-sales-co-ordinator">Export Sales Co-ordinator</a></h3><span class="company-badge"><i></i>Blastline India</span><ul class="job-meta"><li>Angamaly, Ernakulam</li><li>Sales</li><li>5–8 years experience</li><li>Full-time</li></ul></article>
    <article class="job-card"><h3><a href="/o/jolly-industries/jobs/design-engineer">Design Engineer</a></h3><span class="company-badge"><i></i>Jolly Industries</span></article>
    <footer>Blastline India Pvt Ltd</footer>`
  const detailHtml = `<title>Export Sales Co-ordinator | Blastline India</title><main><script type="application/ld+json">${JSON.stringify({
    '@type': 'JobPosting', title: 'Export Sales Co-ordinator', description: '<p>Export sales role</p>',
    datePosted: '2026-09-28', validThrough: '2026-10-31T23:59:59+05:30',
    employmentType: 'FULL_TIME', directApply: true,
    hiringOrganization: { name: 'Blastline India Pvt Ltd', sameAs: 'https://blastlineindia.com' },
    jobLocation: { address: { addressCountry: 'IN' } },
  })}</script><form class="apply-form"><h2 id="apply">Apply for this role</h2><input name="resume"/></form></main>`
  const requestedUrls = []
  const jobs = await blastline.createBlastlineIndiaPvtLtdScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      const responses = new Map([
        [blastline.HOMEPAGE_URL, homepageHtml], [blastline.CAREERS_URL, currentCareersHtml],
        [boardUrl, boardHtml], [detailsUrl, detailHtml],
      ])
      if (!responses.has(url)) throw new Error(`Unexpected URL: ${url}`)
      return responses.get(url)
    },
    fetchJson: async () => ({
      id: 2957, slug: 'careers', link: blastline.CAREERS_URL,
      title: { rendered: 'Careers' },
      content: { rendered: '<h2>Current Openings</h2><a href="https://careers.blastlineindia.com/">VIEW OPEN POSITIONS</a>' },
    }),
    now: () => '2026-10-03T00:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [blastline.HOMEPAGE_URL, blastline.CAREERS_URL, boardUrl, detailsUrl])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].title, 'Export Sales Co-ordinator')
  assert.equal(jobs[0].applyUrl, `${detailsUrl}#apply`)
  assert.equal(jobs[0].company, 'BLASTLINE INDIA PVT LTD')
})

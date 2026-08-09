import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREERS_PAGE_URL,
  COMPANY_NAME,
  HOMEPAGE_URL,
  SAMPLE_APPLY_URL,
  SOURCE,
  buildJobFromCard,
  createDishTvScraper,
  extractJobCards,
  hasOfficialCareersPageSignal,
  hasOfficialHomepageSignal,
  sitemapIncludesCareersPage,
} from './script.js'

const homepagePage = {
  status: 200,
  url: HOMEPAGE_URL,
  html: `
    <html>
      <head>
        <title>DishTV Recharge Online &#x26; New DTH Connection</title>
        <link rel="canonical" href="https://www.dishtv.in/">
      </head>
      <body>
        <h1>Snack on the content you love.</h1>
        <h2>All day, every day.</h2>
        <p>I'm an Existing Customer</p>
        <p>I'm a New Customer</p>
      </body>
    </html>
  `,
}

const sitemapXml = `
  <urlset>
    <url><loc>https://www.dishtv.in/careers.html</loc></url>
  </urlset>
`

const careersPage = {
  status: 200,
  url: CAREERS_PAGE_URL,
  html: `
    <html>
      <head>
        <title>DISHTV Jobs - Job Openings in DISHTV</title>
        <link rel="canonical" href="https://www.dishtv.in/careers.html">
        <meta property="og:url" content="https://www.dishtv.in/careers.html">
      </head>
      <body>
        <p>jobs@dishd2h.com</p>
        <h2>CURRENT OPENINGS</h2>
        <p>All Locations</p>
        <p>All Experience Levels</p>
        <p>No openings match your search. Try adjusting the filters.</p>

        <div class="jobCard">
          <div class="job-card" data-department="Others" data-location="Any" data-experience="Fresher">
            <h3 class="job-card__title">Freelance - Customer Support</h3>
            <div class="job-card__custom-desc">
              Earn from home opportunity for freshers with strong Hindi and English communication skills.
            </div>
            <div class="job-card__footer">
              <a href="https://forms.office.com/r/57DD6f1beK" class="job-card__apply-btn">Apply Now</a>
              <p class="job-card__contact">
                <strong>Mr. Kuldeep Kumar</strong>
                <a href="mailto:kuldeep.kumar@dishtv.in">kuldeep.kumar@dishtv.in</a>
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `,
}

test('DishTV verifies the current homepage, sitemap, and careers page contract', () => {
  assert.equal(SOURCE, 'dishtv')
  assert.equal(COMPANY_NAME, 'DishTV')
  assert.equal(HOMEPAGE_URL, 'https://www.dishtv.in/')
  assert.equal(CAREERS_PAGE_URL, 'https://www.dishtv.in/careers.html')
  assert.equal(SAMPLE_APPLY_URL, 'https://forms.office.com/r/57DD6f1beK')
  assert.equal(hasOfficialHomepageSignal(homepagePage), true)
  assert.equal(sitemapIncludesCareersPage(sitemapXml), true)
  assert.equal(hasOfficialCareersPageSignal(careersPage), true)
})

test('DishTV extracts trusted current-opening cards and maps them to Jobverify jobs', () => {
  const cards = extractJobCards(careersPage.html)

  assert.equal(cards.length, 1)
  assert.deepEqual(cards[0], {
    title: 'Freelance - Customer Support',
    department: 'Others',
    location: 'Any',
    experience: 'Fresher',
    applyUrl: 'https://forms.office.com/r/57DD6f1beK',
    contactName: 'Mr. Kuldeep Kumar',
    contactEmail: 'kuldeep.kumar@dishtv.in',
    jobDescription: 'Earn from home opportunity for freshers with strong Hindi and English communication skills.',
    requiredSkills: [],
  })

  assert.deepEqual(buildJobFromCard(cards[0]), {
    title: 'Freelance - Customer Support',
    company: 'DishTV',
    department: 'Others',
    location: 'Any',
    city: null,
    state: null,
    country: 'India',
    jobId: 'dishtv-freelance-customer-support-others-any-fresher',
    requisitionId: 'dishtv-freelance-customer-support-others-any-fresher',
    sourceUrl: 'https://www.dishtv.in/careers.html',
    applyUrl: 'https://forms.office.com/r/57DD6f1beK',
    employmentType: null,
    experienceRequired: 'Fresher',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    contactName: 'Mr. Kuldeep Kumar',
    contactEmail: 'kuldeep.kumar@dishtv.in',
    postingDate: null,
    closingDate: null,
    jobDescription: 'Earn from home opportunity for freshers with strong Hindi and English communication skills.',
  })
})

test('DishTV run validates the verified homepage handoff and decorates jobs for persistence', async () => {
  const requestedUrls = []
  const jobs = await createDishTvScraper({
    now: () => '2026-08-01T12:00:00.000Z',
  }).run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === HOMEPAGE_URL) return homepagePage
      if (url === 'https://www.dishtv.in/sitemap.xml') {
        return { status: 200, url, html: sitemapXml }
      }
      if (url === CAREERS_PAGE_URL) return careersPage

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    HOMEPAGE_URL,
    'https://www.dishtv.in/sitemap.xml',
    CAREERS_PAGE_URL,
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'dishtv')
  assert.equal(jobs[0].link, 'https://forms.office.com/r/57DD6f1beK')
  assert.equal(jobs[0].scrapedAt, '2026-08-01T12:00:00.000Z')
})

import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREERS_HOME_URL,
  CATEGORIES_URL,
  buildCategoriesPageUrl,
  createOfBusinessScraper,
  extractPaginationQueryParam,
  hasOfficialCareersHomeSignal,
  hasOfficialCategoriesSignal,
} from './script.js'

const warmupData = {
  platform: {
    ssrPropsUpdates: [
      {
        collectionState: {
          totalPages: 1,
        },
      },
    ],
  },
  appsWarmupData: {
    dataBinding: {
      dataStore: {
        recordsByCollectionId: {
          Jobs: {
            job_1: {
              _id: 'job_1',
              jobTitle: 'B2B sales',
              category: 'cat_bd',
              location: 'Jaipur',
              'link-jobs-jobTitle': '/categories/b2b-sales',
              jobType: 'Full-Time',
              experienceRequiredRangeyrs: '2-7',
              _createdDate: {
                $date: '2026-06-18T00:00:00.000Z',
              },
              jobDescription: '<p>Sell supply-chain solutions.</p>',
            },
          },
          Categories: {
            cat_bd: {
              _id: 'cat_bd',
              category: 'Business Development',
            },
          },
        },
      },
    },
  },
}

const careersHomeHtml = `
  <!doctype html>
  <html lang="en">
    <body>
      <h1>Careers @ OfBusiness</h1>
      <p>OfBusiness Group is India's largest and most efficient supply chain platform</p>
      <a href="https://www.ofbcareers.com/categories">Explore Roles</a>
      <h2>Why join us?</h2>
      <h2>How we hire?</h2>
      <p>career@ofbusiness.in</p>
      <footer>OFB Tech Pvt. Ltd</footer>
    </body>
  </html>
`

const categoriesHtml = `
  <!doctype html>
  <html lang="en">
    <head>
      <title>OfBusiness Careers | Explore High-Growth roles with us</title>
    </head>
    <body>
      <p>Filter by Job Function</p>
      <p>Filter by Location</p>
      <a href="https://www.ofbcareers.com/categories?comp-lyh6vd88_page=2">2</a>
      <p>Didn&#39;t find a role that suits you?</p>
      <p>career@ofbusiness.in</p>
      <p>earlycareers@ofbusiness.in</p>
      <script type="application/json" id="wix-warmup-data">${JSON.stringify(warmupData)}</script>
    </body>
  </html>
`
const paginatedCategoriesHtml = categoriesHtml.replace(
  '<title>OfBusiness Careers | Explore High-Growth roles with us</title>',
  '<title>OfBusiness Careers | Explore High-Growth roles with us 2/18</title>',
)

test('OfBusiness accepts the current careers home and categories page text contracts', () => {
  assert.equal(hasOfficialCareersHomeSignal(careersHomeHtml), true)
  assert.equal(hasOfficialCategoriesSignal(categoriesHtml), true)
  assert.equal(hasOfficialCategoriesSignal(paginatedCategoriesHtml), true)
  assert.equal(extractPaginationQueryParam(categoriesHtml), 'comp-lyh6vd88_page')
  assert.equal(buildCategoriesPageUrl(1), CATEGORIES_URL)
  assert.equal(buildCategoriesPageUrl(2), 'https://www.ofbcareers.com/categories?comp-lyh6vd88_page=2')
})

test('OfBusiness validates the first-party Wix warmup payload before normalizing jobs', async () => {
  const requestedUrls = []

  const jobs = await createOfBusinessScraper({
    now: () => '2026-08-01T00:00:00.000Z',
  }).run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === CAREERS_HOME_URL) {
        return { status: 200, url, html: careersHomeHtml }
      }

      if (url === CATEGORIES_URL) {
        return { status: 200, url, html: categoriesHtml }
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [CAREERS_HOME_URL, CATEGORIES_URL])
  assert.deepEqual(jobs, [
    {
      title: 'B2B sales',
      company: 'OfBusiness',
      department: 'Business Development',
      location: 'Jaipur',
      city: 'Jaipur',
      country: 'India',
      jobId: 'job_1',
      requisitionId: null,
      sourceUrl: 'https://www.ofbcareers.com/categories/b2b-sales',
      applyUrl: 'https://www.ofbcareers.com/categories/b2b-sales',
      employmentType: 'Full-Time',
      experienceRequired: '2-7',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-06-18T00:00:00.000Z',
      closingDate: null,
      jobDescription: 'Sell supply-chain solutions.',
      source: 'ofbusiness',
      link: 'https://www.ofbcareers.com/categories/b2b-sales',
      companyCareerPage: 'https://www.ofbcareers.com/categories',
      companyDomain: 'ofbcareers.com',
      atsPlatform: 'wix-embedded-data',
      scrapedAt: '2026-08-01T00:00:00.000Z',
    },
  ])
})

import assert from 'node:assert/strict'
import test from 'node:test'

const careersHomeHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>OfBusiness Careers | Explore High-Growth roles with us</title>
  </head>
  <body>
    <h1>Careers @ OfBusiness</h1>
    <p>OfBusiness Group is India's largest and most efficient supply chain platform.</p>
    <a href="https://www.ofbcareers.com/categories">Explore Roles</a>
    <h2>Why join us?</h2>
    <h2>How we hire?</h2>
    <p>career@ofbusiness.in</p>
    <p>©2024 OFB Tech Pvt. Ltd, All Rights Reserved.</p>
  </body>
</html>
`

const categories = {
  'cat-business': {
    _id: 'cat-business',
    category: 'Business Development',
  },
  'cat-tech': {
    _id: 'cat-tech',
    category: 'Technology',
  },
  'cat-hr': {
    _id: 'cat-hr',
    category: 'Human Resource',
  },
}

const pageOneJobs = {
  'job-1': {
    _id: 'job-1',
    jobTitle: 'B2B Sales',
    location: 'Ahmedabad',
    _createdDate: { $date: '2026-06-18T07:17:26.867Z' },
    jobType: 'Full-Time',
    experienceRequiredRangeyrs: '2-6',
    category: categories['cat-business'],
    empId: 'KP64',
    'link-jobs-jobTitle': '/jobs/b2b-sales',
    jobDescription: '<p>OfBusiness Group is India’s largest supply chain platform.</p>',
    whatYouWillDo: '<p>Prospect, identify, and target potential B2B clients.</p>',
    whatWeAreLookingFor: '<p>MBA graduate with strong communication skills.</p>',
    whatWeAreOffering: '<p>Competitive Compensation</p>',
  },
  'job-2': {
    _id: 'job-2',
    jobTitle: 'Product Engineer',
    location: 'Bengaluru',
    _createdDate: { $date: '2026-06-20T10:00:00.000Z' },
    jobType: 'Full-Time',
    experienceRequiredRangeyrs: '2-5',
    category: 'cat-tech',
    empId: 'PC57',
    'link-jobs-jobTitle': '/jobs/product-engineer',
    jobDescription: '<p>Build product experiences for manufacturing customers.</p>',
    whatYouWillDo: '<p>Ship features across web workflows.</p>',
    whatWeAreLookingFor: '<p>Strong JavaScript fundamentals.</p>',
    whatWeAreOffering: '<p>High-Impact Roles</p>',
  },
}

const pageTwoJobs = {
  'job-2': pageOneJobs['job-2'],
  'job-3': {
    _id: 'job-3',
    jobTitle: 'Talent Acquisition',
    location: 'Pune',
    _createdDate: { $date: '2026-06-25T09:30:00.000Z' },
    jobType: 'Full-Time',
    experienceRequiredRangeyrs: '2-5',
    category: 'cat-hr',
    empId: 'AR81',
    'link-jobs-jobTitle': '/jobs/talent-acquisition',
    jobDescription: '<p>Help scale our talent engine across functions.</p>',
    whatYouWillDo: '<p>Design and update job descriptions.</p>',
    whatWeAreLookingFor: '<p>Must have relevant recruitment experience.</p>',
    whatWeAreOffering: '<p>Fast-track Career Growth</p>',
  },
}

const buildCategoriesPageHtml = ({
  jobs,
  totalPages = 2,
  currentPage = 1,
  includePagination = true,
}) => {
  const warmupData = {
    platform: {
      ssrPropsUpdates: [
        { 'comp-lyiu91k8': { currentPage, totalPages } },
      ],
    },
    appsWarmupData: {
      dataBinding: {
        dataStore: {
          recordsByCollectionId: {
            Categories: categories,
            Jobs: jobs,
          },
        },
      },
    },
  }

  return `
<!doctype html>
<html lang="en">
  <head>
    <title>OfBusiness Careers | Explore High-Growth roles with us</title>
  </head>
  <body>
    <h1>Filter by Job Function</h1>
    <h2>Filter by Location</h2>
    <p>Didn't find a role that suits you?</p>
    <p>For Experienced: career@ofbusiness.in</p>
    <p>For Freshers: earlycareers@ofbusiness.in</p>
    ${includePagination ? '<a href="https://www.ofbcareers.com/categories?comp-lyh6vd88_page=2">2</a>' : ''}
    <!-- warmup data start -->
    <script type="application/json" id="wix-warmup-data">${JSON.stringify(warmupData)}</script>
    <!-- warmup data end -->
  </body>
</html>
`
}

const categoriesPageOneHtml = buildCategoriesPageHtml({
  jobs: pageOneJobs,
  currentPage: 1,
})

const categoriesPageTwoHtml = buildCategoriesPageHtml({
  jobs: pageTwoJobs,
  currentPage: 2,
})

const loadOfBusinessModule = async () => {
  try {
    return await import('../../scraper/ofbusiness/script.js')
  } catch {
    assert.fail('Expected OfBusiness scraper module at ../../scraper/ofbusiness/script.js')
  }
}

test('OfBusiness verifies the official careers homepage, embedded Wix warmup data, and paginated categories contract', async () => {
  const ofBusiness = await loadOfBusinessModule()

  assert.equal(ofBusiness.SOURCE, 'ofbusiness')
  assert.equal(ofBusiness.COMPANY, 'OfBusiness')
  assert.equal(ofBusiness.OFFICIAL_BRAND_NAME, 'OfBusiness')
  assert.equal(ofBusiness.VERIFIED_ON, '2026-07-17')
  assert.equal(ofBusiness.CAREERS_HOME_URL, 'https://www.ofbcareers.com/')
  assert.equal(ofBusiness.CATEGORIES_URL, 'https://www.ofbcareers.com/categories')
  assert.equal(ofBusiness.WIX_WARMUP_DATA_SCRIPT_ID, 'wix-warmup-data')
  assert.equal(ofBusiness.PAGINATION_QUERY_PARAM, 'comp-lyh6vd88_page')
  assert.match(ofBusiness.VERIFIED_SURFACE_SUMMARY, /72 unique public postings/i)

  assert.equal(ofBusiness.hasOfficialCareersHomeSignal(careersHomeHtml), true)
  assert.equal(ofBusiness.hasOfficialCategoriesSignal(categoriesPageOneHtml), true)
  assert.equal(ofBusiness.extractPaginationQueryParam(categoriesPageOneHtml), 'comp-lyh6vd88_page')
  assert.equal(ofBusiness.buildCategoriesPageUrl(1), 'https://www.ofbcareers.com/categories')
  assert.equal(
    ofBusiness.buildCategoriesPageUrl(2),
    'https://www.ofbcareers.com/categories?comp-lyh6vd88_page=2',
  )

  const warmupData = ofBusiness.parseWixWarmupData(categoriesPageOneHtml)
  assert.equal(ofBusiness.extractTotalPagesFromWarmupData(warmupData), 2)
  assert.equal(ofBusiness.extractJobsFromWarmupData(warmupData).length, 2)

  assert.deepEqual(
    ofBusiness.normalizeOfBusinessJob(pageOneJobs['job-1'], categories),
    {
      title: 'B2B Sales',
      company: 'OfBusiness',
      department: 'Business Development',
      location: 'Ahmedabad',
      city: 'Ahmedabad',
      country: 'India',
      jobId: 'job-1',
      requisitionId: 'KP64',
      sourceUrl: 'https://www.ofbcareers.com/jobs/b2b-sales',
      applyUrl: 'https://www.ofbcareers.com/jobs/b2b-sales',
      employmentType: 'Full-Time',
      experienceRequired: '2-6',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-06-18T07:17:26.867Z',
      closingDate: null,
      jobDescription: 'OfBusiness Group is India’s largest supply chain platform. Prospect, identify, and target potential B2B clients. MBA graduate with strong communication skills. Competitive Compensation',
    },
  )
})

test('OfBusiness paginates the official categories board and deduplicates first-party jobs across page slices', async () => {
  const ofBusiness = await loadOfBusinessModule()
  const requestedUrls = []

  const jobs = await ofBusiness.createOfBusinessScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === ofBusiness.CAREERS_HOME_URL) {
        return { status: 200, url, html: careersHomeHtml }
      }

      if (url === ofBusiness.CATEGORIES_URL) {
        return { status: 200, url, html: categoriesPageOneHtml }
      }

      if (url === `${ofBusiness.CATEGORIES_URL}?comp-lyh6vd88_page=2`) {
        return { status: 200, url, html: categoriesPageTwoHtml }
      }

      throw new Error(`Unexpected OfBusiness URL: ${url}`)
    },
    now: () => '2026-07-17T12:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [
    ofBusiness.CAREERS_HOME_URL,
    ofBusiness.CATEGORIES_URL,
    `${ofBusiness.CATEGORIES_URL}?comp-lyh6vd88_page=2`,
  ])
  assert.equal(jobs.length, 3)
  assert.deepEqual(
    jobs.map((job) => job.title),
    ['B2B Sales', 'Product Engineer', 'Talent Acquisition'],
  )
  assert.equal(jobs[0].source, 'ofbusiness')
  assert.equal(jobs[0].companyCareerPage, 'https://www.ofbcareers.com/categories')
  assert.equal(jobs[0].companyDomain, 'ofbcareers.com')
  assert.equal(jobs[0].atsPlatform, 'wix-embedded-data')
  assert.equal(jobs[0].scrapedAt, '2026-07-17T12:00:00.000Z')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
})

test('OfBusiness fails closed when the official careers or pagination contract drifts materially', async () => {
  const ofBusiness = await loadOfBusinessModule()

  await assert.rejects(
    ofBusiness.createOfBusinessScraper().run({
      fetchPage: async (url) => ({
        status: 200,
        url,
        html: '<html><body><h1>OfBusiness</h1></body></html>',
      }),
    }),
    /careers homepage/i,
  )

  await assert.rejects(
    ofBusiness.createOfBusinessScraper().run({
      fetchPage: async (url) => {
        if (url === ofBusiness.CAREERS_HOME_URL) {
          return { status: 200, url, html: careersHomeHtml }
        }

        return {
          status: 200,
          url,
          html: buildCategoriesPageHtml({
            jobs: pageOneJobs,
            includePagination: false,
          }),
        }
      },
    }),
    /pagination/i,
  )
})

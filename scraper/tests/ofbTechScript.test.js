import assert from 'node:assert/strict'
import test from 'node:test'

const loadOfbTechModule = async () => {
  try {
    return await import('../ofbtech/script.js')
  } catch {
    assert.fail('Expected OFB Tech scraper module at ../ofbtech/script.js')
  }
}

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>OfBusiness Careers | Explore High-Growth roles with us</title>
  </head>
  <body>
    <main>
      <h1>Careers @ OfBusiness</h1>
      <a href="https://www.ofbcareers.com/categories">Explore Roles</a>
      <footer>©2024 OFB Tech Pvt. Ltd, All Rights Reserved.</footer>
    </main>
  </body>
</html>
`

const listingsPageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>OfBusiness Careers | Explore High-Growth roles with us</title>
  </head>
  <body>
    <main>
      <h1>Technology</h1>
      <div>View Details</div>
      <script id="wix-warmup-data" type="application/json">
        {
          "platform": {
            "bootstrapData": {
              "appsWarmupData": {
                "jobs-board": {
                  "data": {
                    "jobsPageDataset": {
                      "Jobs": {
                        "job-frontend": {
                          "_id": "job-frontend",
                          "jobTitle": "Frontend Developer",
                          "location": "Gurugram",
                          "experienceRequiredRangeyrs": "2-5 Yrs",
                          "link-jobs-jobTitle": "/jobs/frontend-developer-",
                          "jobType": "Full-Time",
                          "empId": "PC57",
                          "_createdDate": {
                            "$date": "2026-07-10T05:29:26.634Z"
                          },
                          "category": {
                            "category": "Technology"
                          },
                          "jobDescription": "<p>OFB Tech (OfBusiness) builds digital products for high-growth B2B commerce.</p>",
                          "whatYouWillDo": "<p>Build and ship product experiences for internal and external users.</p>",
                          "whatWeAreLookingFor": "<p>Strong JavaScript, React, and collaboration skills.</p>",
                          "whatWeAreOffering": "<p>High-impact role with ownership and learning opportunities.</p>"
                        },
                        "job-finance": {
                          "_id": "job-finance",
                          "jobTitle": "Finance Deputy Manager (CA)",
                          "location": "Bengaluru",
                          "experienceRequiredRangeyrs": "5-7 Yrs",
                          "link-jobs-jobTitle": "/jobs/finance-deputy-manager-(ca)",
                          "jobType": "Full-Time",
                          "empId": "AB33",
                          "_createdDate": {
                            "$date": "2026-07-09T03:12:00.000Z"
                          },
                          "category": {
                            "category": "Finance & Accounts"
                          },
                          "jobDescription": "<p>Lead financial reporting, accounting, and planning operations.</p>",
                          "whatYouWillDo": "<p>Own reporting, budgeting, and treasury workflows.</p>",
                          "whatWeAreLookingFor": "<p>CA or equivalent finance qualification.</p>",
                          "whatWeAreOffering": "<p>Career growth and cross-functional exposure.</p>"
                        }
                      },
                      "Categories": {
                        "technology": {
                          "category": "Technology"
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      </script>
    </main>
  </body>
</html>
`

const driftedListingsPageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Jobs</title>
  </head>
  <body>
    <main>
      <h1>Jobs</h1>
      <p>No embedded dataset</p>
    </main>
  </body>
</html>
`

test('OFB Tech helper exports stay pinned to the verified homepage and embedded Wix jobs dataset', async () => {
  const ofbTech = await loadOfbTechModule()

  assert.equal(ofbTech.SOURCE, 'ofbtech')
  assert.equal(ofbTech.COMPANY, 'OFB Tech')
  assert.equal(ofbTech.VERIFIED_ON, '2026-07-17')
  assert.equal(ofbTech.HOMEPAGE_URL, 'https://www.ofbcareers.com/')
  assert.equal(ofbTech.LISTINGS_PAGE_URL, 'https://www.ofbcareers.com/categories')
  assert.equal(ofbTech.JOB_DETAILS_BASE_URL, 'https://www.ofbcareers.com/jobs/')
  assert.equal(ofbTech.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(ofbTech.hasOfficialListingsPageSignal(listingsPageHtml), true)

  const warmupData = ofbTech.extractWarmupData(listingsPageHtml)
  const dataset = ofbTech.extractJobsDataset(warmupData)

  assert.equal(typeof warmupData, 'object')
  assert.equal(dataset['job-frontend'].jobTitle, 'Frontend Developer')
  assert.deepEqual(ofbTech.extractJobs(listingsPageHtml), [
    {
      jobId: 'job-finance',
      requisitionId: 'AB33',
      title: 'Finance Deputy Manager (CA)',
      company: 'OFB Tech',
      department: 'Finance & Accounts',
      location: 'Bengaluru, India',
      city: 'Bangalore',
      country: 'India',
      sourceUrl: 'https://www.ofbcareers.com/jobs/finance-deputy-manager-(ca)',
      applyUrl: 'https://www.ofbcareers.com/jobs/finance-deputy-manager-(ca)',
      employmentType: 'Full-time',
      experienceRequired: '5-7 Yrs',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-07-09T03:12:00.000Z',
      closingDate: null,
      jobDescription:
        'About the business: Lead financial reporting, accounting, and planning operations. What you will do: Own reporting, budgeting, and treasury workflows. What we are looking for: CA or equivalent finance qualification. What we offer: Career growth and cross-functional exposure.',
      remoteStatus: 'On-site',
    },
    {
      jobId: 'job-frontend',
      requisitionId: 'PC57',
      title: 'Frontend Developer',
      company: 'OFB Tech',
      department: 'Technology',
      location: 'Gurugram, India',
      city: 'Gurgaon',
      country: 'India',
      sourceUrl: 'https://www.ofbcareers.com/jobs/frontend-developer-',
      applyUrl: 'https://www.ofbcareers.com/jobs/frontend-developer-',
      employmentType: 'Full-time',
      experienceRequired: '2-5 Yrs',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-07-10T05:29:26.634Z',
      closingDate: null,
      jobDescription:
        'About the business: OFB Tech (OfBusiness) builds digital products for high-growth B2B commerce. What you will do: Build and ship product experiences for internal and external users. What we are looking for: Strong JavaScript, React, and collaboration skills. What we offer: High-impact role with ownership and learning opportunities.',
      remoteStatus: 'On-site',
    },
  ])
})

test('OFB Tech run validates the verified homepage and embedded listings contract conservatively', async () => {
  const ofbTech = await loadOfbTechModule()
  const requestedUrls = []

  const jobs = await ofbTech.createOfbTechScraper({
    now: () => '2026-07-17T09:15:00.000Z',
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === ofbTech.HOMEPAGE_URL) return homepageHtml
      if (url === ofbTech.LISTINGS_PAGE_URL) return listingsPageHtml

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    'https://www.ofbcareers.com/',
    'https://www.ofbcareers.com/categories',
  ])
  assert.deepEqual(jobs, [
    {
      jobId: 'job-finance',
      requisitionId: 'AB33',
      title: 'Finance Deputy Manager (CA)',
      company: 'OFB Tech',
      department: 'Finance & Accounts',
      location: 'Bengaluru, India',
      city: 'Bangalore',
      country: 'India',
      link: 'https://www.ofbcareers.com/jobs/finance-deputy-manager-(ca)',
      sourceUrl: 'https://www.ofbcareers.com/jobs/finance-deputy-manager-(ca)',
      applyUrl: 'https://www.ofbcareers.com/jobs/finance-deputy-manager-(ca)',
      source: 'ofbtech',
      employmentType: 'Full-time',
      experienceRequired: '5-7 Yrs',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-07-09T03:12:00.000Z',
      closingDate: null,
      jobDescription:
        'About the business: Lead financial reporting, accounting, and planning operations. What you will do: Own reporting, budgeting, and treasury workflows. What we are looking for: CA or equivalent finance qualification. What we offer: Career growth and cross-functional exposure.',
      remoteStatus: 'On-site',
      scrapedAt: '2026-07-17T09:15:00.000Z',
    },
    {
      jobId: 'job-frontend',
      requisitionId: 'PC57',
      title: 'Frontend Developer',
      company: 'OFB Tech',
      department: 'Technology',
      location: 'Gurugram, India',
      city: 'Gurgaon',
      country: 'India',
      link: 'https://www.ofbcareers.com/jobs/frontend-developer-',
      sourceUrl: 'https://www.ofbcareers.com/jobs/frontend-developer-',
      applyUrl: 'https://www.ofbcareers.com/jobs/frontend-developer-',
      source: 'ofbtech',
      employmentType: 'Full-time',
      experienceRequired: '2-5 Yrs',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-07-10T05:29:26.634Z',
      closingDate: null,
      jobDescription:
        'About the business: OFB Tech (OfBusiness) builds digital products for high-growth B2B commerce. What you will do: Build and ship product experiences for internal and external users. What we are looking for: Strong JavaScript, React, and collaboration skills. What we offer: High-impact role with ownership and learning opportunities.',
      remoteStatus: 'On-site',
      scrapedAt: '2026-07-17T09:15:00.000Z',
    },
  ])
})

test('OFB Tech fails closed when the verified homepage or embedded listings dataset drifts', async () => {
  const ofbTech = await loadOfbTechModule()

  await assert.rejects(
    ofbTech.createOfbTechScraper().run({
      fetchText: async (url) => {
        if (url === ofbTech.HOMEPAGE_URL) {
          return '<html><body><h1>Jobs</h1><a href="/apply">Apply</a></body></html>'
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified homepage/i,
  )

  await assert.rejects(
    ofbTech.createOfbTechScraper().run({
      fetchText: async (url) => {
        if (url === ofbTech.HOMEPAGE_URL) return homepageHtml
        if (url === ofbTech.LISTINGS_PAGE_URL) return driftedListingsPageHtml

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified listings page/i,
  )
})

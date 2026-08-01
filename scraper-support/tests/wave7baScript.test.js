import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-18T00:00:00.000Z'

const loadModule = async (relativePath) => {
  try {
    return await import(relativePath)
  } catch {
    assert.fail(`Expected scraper module at ${relativePath}`)
  }
}

const novigoCareersHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Life @ Novigo</h1>
    <h2>Opportunities with us</h2>
    <p>See our current job openings and where you can fit in</p>
    <h3>.Net Developer (2-5 Years)</h3>
    <p>Bangalore / Mangalore / Remote work during Pandemic.</p>
    <h3>Requirements:</h3>
    <p>Overall 2+ years of relevant experience in .Net</p>
    <p>In-depth knowledge in .NET / MVC /Entity Framework, HTML, CSS, Javascript.</p>
    <p>Knowledge of OOPs, MVC, DB Design, Git</p>
    <p>See More</p>
    <p>Apply Now</p>
    <h3>Angular Developer (3-6 Years)</h3>
    <p>Bangalore / Mangalore / Remote work during Pandemic.</p>
    <h3>Requirements:</h3>
    <p>Minimum of 3 years experience of JavaScript front end development.</p>
    <p>Minimum of 3-5 years experience with Angular and AngularJS.</p>
    <p>Experience with Angular CLI, Webpack, Docker, Jenkins, Selenium, GIT, Swagger, SonarQube, Mocha, Karma, Jasmine.</p>
    <p>See More</p>
    <p>Apply Now</p>
    <h3>Python Developer (3-6 Years)</h3>
    <p>Bangalore / Mangalore / Remote work during Pandemic.</p>
    <h3>Requirements:</h3>
    <p>Minimum 3 years experience as a Software Engineer, including system analysis, design, development, and deployment.</p>
    <p>Minimum 2 years of experience in Python development (Python 3).</p>
    <p>Worked on XML, JSON formats, SOAP API development, RESTful APIs.</p>
    <p>See More</p>
    <p>Apply Now</p>
    <h4>Apply Online</h4>
    <p>Attach your Resume (pdf/docx Only, not more than 2MB)</p>
  </body>
</html>
`

const appliedCloudBoardHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Applied Cloud Computing</h1>
    <a href="https://www.appliedcloudcomputing.com/">Applied Cloud Computing</a>
    <h2>Careers at Applied Cloud Computing</h2>
    <h3>Jobs at Applied Cloud Computing</h3>
    <a href="https://jobs.smartrecruiters.com/AppliedCloudComputing/744000140000001-cloud-operations-engineer-gcp-kubernetes">
      Cloud Operations Engineer (GCP & Kubernetes) Navi Mumbai, India Full-time
    </a>
    <a href="https://jobs.smartrecruiters.com/AppliedCloudComputing/744000140000002-l3-cloud-engineer-applied-cloud-computing">
      L3 Cloud Engineer - Applied Cloud Computing Mumbai, India Full-time
    </a>
  </body>
</html>
`

const appliedCloudListingPayload = {
  totalFound: 2,
  content: [
    {
      id: '744000140000001',
      name: 'Cloud Operations Engineer (GCP & Kubernetes)',
      refNumber: 'ACC-1001',
      releasedDate: '2026-07-12T09:15:00.000Z',
      location: {
        city: 'Navi Mumbai',
        region: 'MH',
        country: 'in',
        fullLocation: 'Navi Mumbai, MH, India',
      },
      company: {
        identifier: 'AppliedCloudComputing',
        name: 'Applied Cloud Computing',
      },
      department: {
        label: 'Cloud Operations',
      },
      typeOfEmployment: {
        id: 'full-time',
        label: 'Full-time',
      },
      experienceLevel: {
        id: 'mid-level',
        label: 'Mid-Level',
      },
      ref: 'https://api.smartrecruiters.com/v1/companies/AppliedCloudComputing/postings/744000140000001',
    },
    {
      id: '744000140000002',
      name: 'L3 Cloud Engineer - Applied Cloud Computing',
      refNumber: 'ACC-1002',
      releasedDate: '2026-07-10T07:10:00.000Z',
      location: {
        city: 'Mumbai',
        region: 'MH',
        country: 'in',
        fullLocation: 'Mumbai, MH, India',
      },
      company: {
        identifier: 'AppliedCloudComputing',
        name: 'Applied Cloud Computing',
      },
      department: {
        label: 'Cloud Engineering',
      },
      typeOfEmployment: {
        id: 'full-time',
        label: 'Full-time',
      },
      experienceLevel: {
        id: 'senior',
        label: 'Senior',
      },
      ref: 'https://api.smartrecruiters.com/v1/companies/AppliedCloudComputing/postings/744000140000002',
    },
  ],
}

const appliedCloudDetailPayloadById = {
  '744000140000001': {
    id: '744000140000001',
    name: 'Cloud Operations Engineer (GCP & Kubernetes)',
    refNumber: 'ACC-1001',
    releasedDate: '2026-07-12T09:15:00.000Z',
    postingUrl:
      'https://jobs.smartrecruiters.com/AppliedCloudComputing/744000140000001-cloud-operations-engineer-gcp-kubernetes',
    applyUrl:
      'https://jobs.smartrecruiters.com/AppliedCloudComputing/744000140000001-cloud-operations-engineer-gcp-kubernetes?oga=true',
    location: {
      city: 'Navi Mumbai',
      region: 'MH',
      country: 'in',
      fullLocation: 'Navi Mumbai, MH, India',
    },
    department: {
      label: 'Cloud Operations',
    },
    typeOfEmployment: {
      id: 'full-time',
      label: 'Full-time',
    },
    experienceLevel: {
      id: 'mid-level',
      label: 'Mid-Level',
    },
    jobAd: {
      sections: {
        jobDescription: {
          text: '<p>Manage GCP and Kubernetes production workloads for regulated cloud environments.</p>',
        },
        qualifications: {
          text: '<p>3+ years of experience with Kubernetes and public cloud operations.</p>',
        },
        additionalInformation: {
          text: '<p>Shift flexibility and BFSI cloud support experience are preferred.</p>',
        },
      },
    },
  },
  '744000140000002': {
    id: '744000140000002',
    name: 'L3 Cloud Engineer - Applied Cloud Computing',
    refNumber: 'ACC-1002',
    releasedDate: '2026-07-10T07:10:00.000Z',
    postingUrl:
      'https://jobs.smartrecruiters.com/AppliedCloudComputing/744000140000002-l3-cloud-engineer-applied-cloud-computing',
    applyUrl:
      'https://jobs.smartrecruiters.com/AppliedCloudComputing/744000140000002-l3-cloud-engineer-applied-cloud-computing?oga=true',
    location: {
      city: 'Mumbai',
      region: 'MH',
      country: 'in',
      fullLocation: 'Mumbai, MH, India',
    },
    department: {
      label: 'Cloud Engineering',
    },
    typeOfEmployment: {
      id: 'full-time',
      label: 'Full-time',
    },
    experienceLevel: {
      id: 'senior',
      label: 'Senior',
    },
    jobAd: {
      sections: {
        jobDescription: {
          text: '<p>Lead multi-cloud platform engineering and incident response for enterprise clients.</p>',
        },
        qualifications: {
          text: '<p>Strong hands-on experience with AWS, Azure, and infrastructure automation.</p>',
        },
        additionalInformation: {
          text: '<p>Pune and Mumbai collaboration with immediate joiners preferred.</p>',
        },
      },
    },
  },
}

const mobiloitteCareersHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Careers at Mobiloitte That Build Your Future</h1>
    <p>Where Purpose Meets Possibility</p>
    <h2>Current Openings</h2>
    <p>Search Jobs</p>
    <p>Location All Locations India United Kingdom Singapore Ireland United Arab Emirates Remote Hybrid</p>
    <h3>No Jobs Found</h3>
    <p>We couldn't find any jobs matching your criteria. Try adjusting your filters.</p>
    <h3>Didn't find the right position?</h3>
    <p>We're always looking for talented individuals. Send us your resume and we'll keep you in mind for future opportunities.</p>
    <p>Upload PDF or Word file (max 5MB)</p>
    <p>Reach us via the Contact Us page or email careers@mobiloitte.com for hiring inquiries and updates.</p>
  </body>
</html>
`

const competentCareersHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Competent Software | Careers</h1>
    <h2>Join our rich environment for learning and striving for excellence.</h2>
    <h3>Career opportunities with us:</h3>
    <ul>
      <li>Process Associate</li>
      <li>Data Analyst</li>
      <li>Software Developer</li>
      <li>Network Administrator</li>
      <li>Database Administrator</li>
    </ul>
    <p>Attach Resume</p>
    <p>Apply Now</p>
    <p>Note: Currently there are no open positions. Please check back later for updates. For any further queries, kindly write to us at careers@competentsoftware.com</p>
    <p>C-56/23, Sector 62, Noida, Uttar Pradesh - 201309, India.</p>
  </body>
</html>
`

const vserveHomepageHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Ecommerce Solution Providers</h1>
    <p>Vserve is one of the leading providers of Supply Chain Management and E-Commerce solutions.</p>
    <p>Whether you're optimizing operations, scaling ecommerce performance, or exploring new opportunities with AI, our teams are ready to help.</p>
    <h2>Contact Us</h2>
    <p>99 Wall Street #625, NY-10005, USA</p>
    <p>info@vservesolution.com</p>
    <p>USA: +1 332 223 8085</p>
    <p>INDIA: +91 80654 21788</p>
    <p>For job inquiries:</p>
    <p>jobopenings@vservesolution.com</p>
    <p>© 2026 Vserve eBusiness Solutions. All Rights Reserved.</p>
  </body>
</html>
`

test('Novigo Solutions run returns normalized jobs from the verified first-party careers page', async () => {
  const novigo = await loadModule('../../scraper/novigosolutions/script.js')

  assert.equal(novigo.hasOfficialCareersSignal(novigoCareersHtml), true)
  assert.equal(novigo.extractVisibleRoles(novigoCareersHtml).length, 3)

  const jobs = await novigo.createNovigoSolutionsScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      assert.equal(url, novigo.CAREERS_URL)
      return novigoCareersHtml
    },
  })

  assert.equal(jobs.length, 3)
  assert.equal(jobs[0].title, '.Net Developer')
  assert.equal(jobs[0].location, 'Bangalore / Mangalore / Remote work during Pandemic.')
  assert.equal(jobs[0].remoteStatus, 'Hybrid')
  assert.equal(jobs[1].title, 'Angular Developer')
  assert.match(jobs[1].jobDescription, /Angular CLI, Webpack, Docker/i)
  assert.equal(jobs[2].title, 'Python Developer')
  assert.match(jobs[2].jobDescription, /Python 3/i)
})

test('Applied Cloud Computing run validates the exact-name SmartRecruiters board and maps jobs from the API', async () => {
  const appliedCloud = await loadModule('../../scraper/appliedcloudcomputing/script.js')
  const requestedUrls = []

  assert.equal(appliedCloud.hasVerifiedBoardSignal(appliedCloudBoardHtml), true)

  const jobs = await appliedCloud.createAppliedCloudComputingScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      assert.equal(url, appliedCloud.BOARD_URL)
      return appliedCloudBoardHtml
    },
    fetchJson: async (url) => {
      requestedUrls.push(url)

      if (
        url
        === 'https://api.smartrecruiters.com/v1/companies/AppliedCloudComputing/postings?limit=100&country=in&offset=0'
      ) {
        return appliedCloudListingPayload
      }

      const detailId = url.split('/').pop()
      if (detailId && appliedCloudDetailPayloadById[detailId]) {
        return appliedCloudDetailPayloadById[detailId]
      }

      throw new Error(`Unexpected Applied Cloud Computing URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    appliedCloud.BOARD_URL,
    'https://api.smartrecruiters.com/v1/companies/AppliedCloudComputing/postings?limit=100&country=in&offset=0',
    'https://api.smartrecruiters.com/v1/companies/AppliedCloudComputing/postings/744000140000001',
    'https://api.smartrecruiters.com/v1/companies/AppliedCloudComputing/postings/744000140000002',
  ])

  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].title, 'Cloud Operations Engineer (GCP & Kubernetes)')
  assert.equal(jobs[0].department, 'Cloud Operations')
  assert.equal(jobs[0].country, 'India')
  assert.equal(
    jobs[0].applyUrl,
    'https://jobs.smartrecruiters.com/AppliedCloudComputing/744000140000001-cloud-operations-engineer-gcp-kubernetes?oga=true',
  )
  assert.equal(jobs[1].title, 'L3 Cloud Engineer - Applied Cloud Computing')
  assert.match(jobs[1].jobDescription, /multi-cloud platform engineering/i)
})

test('Mobiloitte Technologies sentinel validates the official careers empty state and returns []', async () => {
  const mobiloitte = await loadModule('../../scraper/mobiloittetechnologies/script.js')

  assert.equal(mobiloitte.hasOfficialCareersSignal(mobiloitteCareersHtml), true)
  assert.equal(mobiloitte.hasNoJobsFoundState(mobiloitteCareersHtml), true)

  const jobs = await mobiloitte.createMobiloitteTechnologiesScraper().run({
    fetchText: async (url) => {
      assert.equal(url, mobiloitte.CAREERS_URL)
      return mobiloitteCareersHtml
    },
  })

  assert.deepEqual(jobs, [])
})

test('Competent Software sentinel validates the official careers no-open-positions note and returns []', async () => {
  const competent = await loadModule('../../scraper/competentsoftware/script.js')

  assert.equal(competent.hasOfficialCareersSignal(competentCareersHtml), true)
  assert.equal(competent.hasNoOpenPositionsNote(competentCareersHtml), true)

  const jobs = await competent.createCompetentSoftwareScraper().run({
    fetchText: async (url) => {
      assert.equal(url, competent.CAREERS_URL)
      return competentCareersHtml
    },
  })

  assert.deepEqual(jobs, [])
})

test('Vserve Ebusiness Solutions sentinel validates the homepage contract and returns [] while no public openings are exposed', async () => {
  const vserve = await loadModule('../../scraper/vserveebusinesssolutions/script.js')

  assert.equal(vserve.hasTrustedHomepageSignal(vserveHomepageHtml), true)
  assert.equal(vserve.exposesPublicOpeningsSurface(vserveHomepageHtml), false)

  const jobs = await vserve.createVserveEbusinessSolutionsScraper().run({
    fetchText: async (url) => {
      assert.equal(url, vserve.HOMEPAGE_URL)
      return vserveHomepageHtml
    },
  })

  assert.deepEqual(jobs, [])
})

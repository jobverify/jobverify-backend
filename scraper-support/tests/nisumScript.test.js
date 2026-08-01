import assert from 'node:assert/strict'
import test from 'node:test'

const verifiedHomepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Nisum | A Technology Consulting Partner</title>
  </head>
  <body>
    <a href="https://www.nisum.com/careers">Careers</a>
    <h1>Building Success Together</h1>
  </body>
</html>
`

const verifiedCareersLandingHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Global Careers | Nisum</title>
  </head>
  <body>
    <h1>Careers</h1>
    <a href="https://www.nisum.com/careers/careers-india">India</a>
    <p>Where Do You Want To Start Your Career?</p>
  </body>
</html>
`

const verifiedIndiaCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers India | Nisum</title>
  </head>
  <body>
    <h2>Careers in India</h2>
    <div id="current-openings"></div>
    <script defer data-cookieyes="functional" type="text/javascript" src="https://jobsapi.ceipal.com/APISource/widget.js" data-ceipal-api-key="SGhXQ3RNWlVBV2JZRGpZbytlMjZ1dz09" data-ceipal-career-portal-id="Z3RkUkt2OXZJVld2MjFpOVRSTXoxZz09"></script>
  </body>
</html>
`

const pageOnePayload = {
  count: 4,
  num_pages: 2,
  limit: 20,
  page_number: 1,
  next: 'https://careerapi.ceipal.com/SGhXQ3RNWlVBV2JZRGpZbytlMjZ1dz09/CareerPortalJobPostings/?page=2',
  previous: null,
  results: [
    {
      id: 'req-1',
      job_id: 15026,
      public_job_title: '.Net Full Stack Developer',
      country: 'India',
      state: 'Odisha, Telangana',
      city: '',
      created: '09/07/2026',
      modified: '16/07/2026',
      public_job_desc: "What You'll Do: Build enterprise-grade web applications.",
      requistion_description: 'Responsibilities: Build and maintain scalable applications.',
      job_code: 'IN876',
      remote_opportunities: 0,
      tax_terms: '',
      apply_job: 'https://candidateportal.ceipal.com/login/job-1',
      campus_portal_job_details_url: 'https://candidateportal.ceipal.com/job-details/job-1',
      multpile_job_location: '(Hyderabad, TG, 500023), (Bhubaneaswar Pur, OR, 755043)',
    },
    {
      id: 'req-chile',
      job_id: 14000,
      public_job_title: 'Senior Business Developer',
      country: 'Chile',
      state: 'Region Metropolitana',
      city: '',
      created: '21/04/2026',
      modified: '08/07/2026',
      public_job_desc: 'Chile-only role.',
      requistion_description: 'Chile-only detail.',
      job_code: 'KI100',
      remote_opportunities: 0,
      tax_terms: 'Full Time',
      apply_job: 'https://candidateportal.ceipal.com/login/job-cl',
      campus_portal_job_details_url: 'https://candidateportal.ceipal.com/job-details/job-cl',
      multpile_job_location: '(Santiago, Region Metropolitana, 8320000)',
    },
  ],
}

const pageTwoPayload = {
  count: 4,
  num_pages: 2,
  limit: 20,
  page_number: 2,
  next: null,
  previous: 'https://careerapi.ceipal.com/SGhXQ3RNWlVBV2JZRGpZbytlMjZ1dz09/CareerPortalJobPostings/?page=1',
  results: [
    {
      id: 'req-2',
      job_id: 15027,
      public_job_title: 'Data Engineer',
      country: 'India',
      state: 'Telangana',
      city: '',
      created: '08/06/2026',
      modified: '14/07/2026',
      public_job_desc: 'Design and maintain API-driven systems.',
      requistion_description: 'Role: Data Engineer.',
      job_code: 'IN836',
      remote_opportunities: 2,
      tax_terms: '',
      apply_job: 'https://candidateportal.ceipal.com/login/job-2',
      campus_portal_job_details_url: 'https://candidateportal.ceipal.com/job-details/job-2',
      multpile_job_location: '(Kondapur, TG, 504346)',
    },
    {
      id: 'req-3',
      job_id: 15028,
      public_job_title: 'ML Engineer GenAI Applications',
      country: 'India',
      state: 'Telangana',
      city: '',
      created: '03/07/2026',
      modified: '08/07/2026',
      public_job_desc: 'Build and deploy GenAI applications.',
      requistion_description: 'ML engineering role.',
      job_code: 'IN871',
      remote_opportunities: 0,
      tax_terms: '',
      apply_job: 'https://candidateportal.ceipal.com/login/job-3',
      campus_portal_job_details_url: 'https://candidateportal.ceipal.com/job-details/job-3',
      multpile_job_location: '(Kondapur, Telangana, 500084)',
    },
  ],
}

const loadNisumModule = async () => {
  try {
    return await import('../../scraper/nisum/script.js')
  } catch {
    assert.fail('Expected Nisum scraper module at ../../scraper/nisum/script.js')
  }
}

test('Nisum verifies the first-party careers flow and maps India jobs from the CEIPAL postings API', async () => {
  const nisum = await loadNisumModule()

  assert.equal(
    nisum.buildWidgetUrl({
      apiKey: 'SGhXQ3RNWlVBV2JZRGpZbytlMjZ1dz09',
      careerPortalId: 'Z3RkUkt2OXZJVld2MjFpOVRSTXoxZz09',
    }),
    'https://jobsapi.ceipal.com/APISource/v2/index.html?api_key=SGhXQ3RNWlVBV2JZRGpZbytlMjZ1dz09&cp_id=Z3RkUkt2OXZJVld2MjFpOVRSTXoxZz09',
  )
  assert.equal(
    nisum.buildJobPostingsApiUrl({ apiKey: 'SGhXQ3RNWlVBV2JZRGpZbytlMjZ1dz09', page: 2 }),
    'https://careerapi.ceipal.com/SGhXQ3RNWlVBV2JZRGpZbytlMjZ1dz09/CareerPortalJobPostings/?page=2',
  )
  assert.deepEqual(
    nisum.buildJobPostingsPayload({
      apiKey: 'SGhXQ3RNWlVBV2JZRGpZbytlMjZ1dz09',
      careerPortalId: 'Z3RkUkt2OXZJVld2MjFpOVRSTXoxZz09',
      page: 1,
    }),
    {
      page: '1',
      api_key: 'SGhXQ3RNWlVBV2JZRGpZbytlMjZ1dz09',
      method: 'CareerPortalJobPostings',
      cp_id: 'Z3RkUkt2OXZJVld2MjFpOVRSTXoxZz09',
      from_career_portal: '1',
    },
  )
  assert.equal(nisum.hasOfficialHomepageSignal(verifiedHomepageHtml), true)
  assert.equal(nisum.hasCareersLandingSignal(verifiedCareersLandingHtml), true)
  assert.equal(nisum.hasIndiaCareersSignal(verifiedIndiaCareersHtml), true)
  assert.deepEqual(nisum.extractWidgetConfig(verifiedIndiaCareersHtml), {
    apiKey: 'SGhXQ3RNWlVBV2JZRGpZbytlMjZ1dz09',
    careerPortalId: 'Z3RkUkt2OXZJVld2MjFpOVRSTXoxZz09',
  })

  const jobs = nisum.extractIndiaJobsFromJobPostingsPayload(pageOnePayload, {
    scrapedAt: '2026-07-16T00:00:00.000Z',
  })

  assert.deepEqual(jobs, [
    {
      title: '.Net Full Stack Developer',
      company: 'Nisum',
      department: null,
      location: 'Hyderabad, TG, 500023; Bhubaneaswar Pur, OR, 755043',
      city: 'Hyderabad',
      state: 'Odisha, Telangana',
      country: 'India',
      workplaceType: 'On-site',
      jobId: '15026',
      requisitionId: 'req-1',
      sourceUrl: 'https://candidateportal.ceipal.com/job-details/job-1',
      applyUrl: 'https://candidateportal.ceipal.com/login/job-1',
      link: 'https://candidateportal.ceipal.com/login/job-1',
      employmentType: null,
      experienceRequired: null,
      postingDate: '2026-07-09',
      jobDescription: "What You'll Do: Build enterprise-grade web applications.",
      jobCode: 'IN876',
      requiredSkills: [],
      source: 'nisum',
      scrapedAt: '2026-07-16T00:00:00.000Z',
    },
  ])
})

test('Nisum run validates the first-party careers flow and paginates the CEIPAL postings API while filtering non-India roles', async () => {
  const nisum = await loadNisumModule()
  const requested = []

  const jobs = await nisum.createNisumScraper().run({
    fetchText: async (url) => {
      requested.push({ type: 'text', url })
      if (url === nisum.HOMEPAGE_URL) return verifiedHomepageHtml
      if (url === nisum.CAREERS_LANDING_URL) return verifiedCareersLandingHtml
      if (url === nisum.INDIA_CAREERS_URL) return verifiedIndiaCareersHtml
      throw new Error(`Unexpected Nisum text fixture URL: ${url}`)
    },
    fetchJson: async (url, options = {}) => {
      requested.push({ type: 'json', url, options })
      if (url === nisum.buildJobPostingsApiUrl({ apiKey: nisum.CEIPAL_API_KEY, page: 1 })) {
        return pageOnePayload
      }
      if (url === nisum.buildJobPostingsApiUrl({ apiKey: nisum.CEIPAL_API_KEY, page: 2 })) {
        return pageTwoPayload
      }
      throw new Error(`Unexpected Nisum JSON fixture URL: ${url}`)
    },
    now: () => '2026-07-16T00:00:00.000Z',
  })

  assert.deepEqual(
    requested.map((entry) => ({ type: entry.type, url: entry.url, method: entry.options?.method ?? null })),
    [
      { type: 'text', url: nisum.HOMEPAGE_URL, method: null },
      { type: 'text', url: nisum.CAREERS_LANDING_URL, method: null },
      { type: 'text', url: nisum.INDIA_CAREERS_URL, method: null },
      {
        type: 'json',
        url: 'https://careerapi.ceipal.com/SGhXQ3RNWlVBV2JZRGpZbytlMjZ1dz09/CareerPortalJobPostings/?page=1',
        method: 'POST',
      },
      {
        type: 'json',
        url: 'https://careerapi.ceipal.com/SGhXQ3RNWlVBV2JZRGpZbytlMjZ1dz09/CareerPortalJobPostings/?page=2',
        method: 'POST',
      },
    ],
  )
  assert.equal(jobs.length, 3)
  assert.equal(jobs.every((job) => job.country === 'India'), true)
  assert.equal(jobs[0].jobId, '15026')
  assert.equal(jobs[1].jobId, '15027')
  assert.equal(jobs[2].jobId, '15028')
})

test('Nisum fails closed when the verified first-party careers flow or CEIPAL API contract drifts', async () => {
  const nisum = await loadNisumModule()

  await assert.rejects(
    nisum.createNisumScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected</h1></body></html>',
    }),
    /verified Nisum homepage/i,
  )

  await assert.rejects(
    nisum.createNisumScraper().run({
      fetchText: async (url) => {
        if (url === nisum.HOMEPAGE_URL) return verifiedHomepageHtml
        if (url === nisum.CAREERS_LANDING_URL) return verifiedCareersLandingHtml
        if (url === nisum.INDIA_CAREERS_URL) {
          return verifiedIndiaCareersHtml.replace('data-ceipal-api-key=', 'data-api-key=')
        }
        throw new Error(`Unexpected Nisum text fixture URL: ${url}`)
      },
    }),
    /verified Nisum India careers page/i,
  )

  await assert.rejects(
    nisum.createNisumScraper().run({
      fetchText: async (url) => {
        if (url === nisum.HOMEPAGE_URL) return verifiedHomepageHtml
        if (url === nisum.CAREERS_LANDING_URL) return verifiedCareersLandingHtml
        if (url === nisum.INDIA_CAREERS_URL) return verifiedIndiaCareersHtml
        throw new Error(`Unexpected Nisum text fixture URL: ${url}`)
      },
      fetchJson: async () => ({ results: 'unexpected' }),
    }),
    /ceipal job postings/i,
  )
})

import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-17T00:00:00.000Z'

const OFFICIAL_CAREERS_HTML = `
<!doctype html>
<html>
  <head>
    <title>Careers | Presto</title>
  </head>
  <body>
    <h1>Join Presto</h1>
    <h5 class="no-margin-bottom">Current openings</h5>
    <div id="job-listings"></div>
    <script src="assets/js/js-p2023.js"></script>
  </body>
</html>
`

const JOBS_SCRIPT = `
$(document).ready(function () {
  var jobPostings = [
    {
      title: "Frontend Developer",
      description: "Designing, Developing, Testing, and Debugging responsive web and mobile applications.",
      keywords:"React JS Developer | Presto | LinkedIn",
      link: "https://www.linkedin.com/jobs/cap/view/3561451074?pathWildcard=3561451074&trk=mcm&lipi=urn%3Ali%3Apage%3Ad_talent_job_post_tab%3BucmV7UrHSWWoeTbj1xXAKA%3D%3D"
    },
    {
      title: "Product Marketing Manager",
      description: "Product Marketing Strategy, collaterals, presentations, whitepapers, blog, post articles, analysis, Content creation",
      keywords:"Product Marketing Manager | Presto | LinkedIn",
      link: "https://www.linkedin.com/jobs/cap/view/3574415071?pathWildcard=3574415071&trk=mcm&lipi=urn%3Ali%3Apage%3Ad_talent_job_post_tab%3BQoKqXeCsSAyYH7gTQMd9ww%3D%3D"
    },
  ];
});
`

const DRIFTED_CAREERS_HTML = `
<!doctype html>
<html>
  <body>
    <main>
      <h1>Careers</h1>
      <p>Placeholder</p>
    </main>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../presto/script.js')
  } catch {
    assert.fail('Expected Presto scraper module at ../presto/script.js')
  }
}

test('Presto helpers keep the verified first-party careers page and inline job array contract stable', async () => {
  const presto = await loadModule()

  assert.equal(presto.SOURCE, 'presto')
  assert.equal(presto.COMPANY, 'Presto')
  assert.equal(presto.OFFICIAL_BRAND_NAME, 'Presto')
  assert.equal(presto.VERIFIED_ON, '2026-07-17')
  assert.equal(presto.HOMEPAGE_URL, 'https://www.presto-apps.com/')
  assert.equal(presto.OFFICIAL_CAREERS_URL, 'https://www.presto-apps.com/careers')
  assert.equal(presto.OFFICIAL_JOBS_SCRIPT_URL, 'https://www.presto-apps.com/assets/js/js-p2023.js')
  assert.equal(presto.hasOfficialCareersPageSignal(OFFICIAL_CAREERS_HTML), true)
  assert.equal(presto.hasOfficialCareersPageSignal(DRIFTED_CAREERS_HTML), false)
  assert.equal(
    presto.extractLinkedInJobId(
      'https://www.linkedin.com/jobs/cap/view/3561451074?pathWildcard=3561451074',
    ),
    '3561451074',
  )
  assert.deepEqual(presto.extractInlineJobPostings(JOBS_SCRIPT), [
    {
      title: 'Frontend Developer',
      description: 'Designing, Developing, Testing, and Debugging responsive web and mobile applications.',
      keywords: 'React JS Developer | Presto | LinkedIn',
      link: 'https://www.linkedin.com/jobs/cap/view/3561451074?pathWildcard=3561451074&trk=mcm&lipi=urn%3Ali%3Apage%3Ad_talent_job_post_tab%3BucmV7UrHSWWoeTbj1xXAKA%3D%3D',
    },
    {
      title: 'Product Marketing Manager',
      description: 'Product Marketing Strategy, collaterals, presentations, whitepapers, blog, post articles, analysis, Content creation',
      keywords: 'Product Marketing Manager | Presto | LinkedIn',
      link: 'https://www.linkedin.com/jobs/cap/view/3574415071?pathWildcard=3574415071&trk=mcm&lipi=urn%3Ali%3Apage%3Ad_talent_job_post_tab%3BQoKqXeCsSAyYH7gTQMd9ww%3D%3D',
    },
  ])
})

test('Presto run fetches the verified careers page and maps inline JS job postings into shared job fields', async () => {
  const presto = await loadModule()
  const requestedUrls = []

  const jobs = await presto.createPrestoScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === presto.OFFICIAL_CAREERS_URL) {
        return OFFICIAL_CAREERS_HTML
      }

      if (url === presto.OFFICIAL_JOBS_SCRIPT_URL) {
        return JOBS_SCRIPT
      }

      throw new Error(`Unexpected Presto URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    presto.OFFICIAL_CAREERS_URL,
    presto.OFFICIAL_JOBS_SCRIPT_URL,
  ])
  assert.deepEqual(jobs, [
    {
      title: 'Frontend Developer',
      company: 'Presto',
      department: null,
      location: null,
      city: null,
      jobId: '3561451074',
      requisitionId: '3561451074',
      sourceUrl: 'https://www.linkedin.com/jobs/cap/view/3561451074?pathWildcard=3561451074&trk=mcm&lipi=urn%3Ali%3Apage%3Ad_talent_job_post_tab%3BucmV7UrHSWWoeTbj1xXAKA%3D%3D',
      applyUrl: 'https://www.linkedin.com/jobs/cap/view/3561451074?pathWildcard=3561451074&trk=mcm&lipi=urn%3Ali%3Apage%3Ad_talent_job_post_tab%3BucmV7UrHSWWoeTbj1xXAKA%3D%3D',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Designing, Developing, Testing, and Debugging responsive web and mobile applications.',
      source: 'presto',
      link: 'https://www.linkedin.com/jobs/cap/view/3561451074?pathWildcard=3561451074&trk=mcm&lipi=urn%3Ali%3Apage%3Ad_talent_job_post_tab%3BucmV7UrHSWWoeTbj1xXAKA%3D%3D',
      scrapedAt: FIXED_SCRAPED_AT,
    },
    {
      title: 'Product Marketing Manager',
      company: 'Presto',
      department: null,
      location: null,
      city: null,
      jobId: '3574415071',
      requisitionId: '3574415071',
      sourceUrl: 'https://www.linkedin.com/jobs/cap/view/3574415071?pathWildcard=3574415071&trk=mcm&lipi=urn%3Ali%3Apage%3Ad_talent_job_post_tab%3BQoKqXeCsSAyYH7gTQMd9ww%3D%3D',
      applyUrl: 'https://www.linkedin.com/jobs/cap/view/3574415071?pathWildcard=3574415071&trk=mcm&lipi=urn%3Ali%3Apage%3Ad_talent_job_post_tab%3BQoKqXeCsSAyYH7gTQMd9ww%3D%3D',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Product Marketing Strategy, collaterals, presentations, whitepapers, blog, post articles, analysis, Content creation',
      source: 'presto',
      link: 'https://www.linkedin.com/jobs/cap/view/3574415071?pathWildcard=3574415071&trk=mcm&lipi=urn%3Ali%3Apage%3Ad_talent_job_post_tab%3BQoKqXeCsSAyYH7gTQMd9ww%3D%3D',
      scrapedAt: FIXED_SCRAPED_AT,
    },
  ])
})

test('Presto fails closed when the official careers page or inline jobs script drifts', async () => {
  const presto = await loadModule()

  await assert.rejects(
    presto.createPrestoScraper().run({
      fetchText: async (url) => {
        if (url === presto.OFFICIAL_CAREERS_URL) {
          return DRIFTED_CAREERS_HTML
        }

        return JOBS_SCRIPT
      },
    }),
    /careers page/i,
  )

  await assert.rejects(
    presto.createPrestoScraper().run({
      fetchText: async (url) => {
        if (url === presto.OFFICIAL_CAREERS_URL) {
          return OFFICIAL_CAREERS_HTML
        }

        return 'var jobPostings = [];'
      },
    }),
    /job postings/i,
  )
})

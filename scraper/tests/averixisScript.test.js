import assert from 'node:assert/strict'
import test from 'node:test'

const CAREER_SHELL_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <div id="root"></div>
    <script type="module" src="/assets/index-CEQVHvwH.js"></script>
    <footer>
      <a href="https://www.linkedin.com/company/averixis-solutions/">LinkedIn</a>
    </footer>
  </body>
</html>
`

const CURRENT_CAREER_SHELL_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Averixis Solutions</title>
    <meta name="description" content="Averixis Solutions is a global technology and training company." />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" crossorigin src="/assets/index-CEQVHvwH.js"></script>
  </body>
</html>
`

const CAREER_BUNDLE = `
const openings=[{"title":"QA Engineer","location":"Bengaluru","type":"Full Time","experience":"2-4 years","description":"Ensure product quality across releases."},{"title":"Data Analyst","location":"Chennai","type":"Full Time","experience":"1-3 years","description":"Analyze business and product datasets."}];
const pageMeta={heading:"Career",cta:"Apply",applyUrl:"https://averixis.com/contact",brand:"Averixis Solutions"};
`

const CURRENT_CAREER_BUNDLE = `
const nav={brand:"Averixis Solutions",links:[{to:"/contact",label:"Contact"}]};
eb=[{title:"Frontend Developer",location:"Bengaluru, India",type:"Full Time"},{title:"UI/UX Designer",location:"Remote",type:"Part Time"},{title:"Digital Marketing Associate",location:"Hybrid",type:"Part Time"},{title:"Technical Trainer",location:"Bengaluru, India",type:"Full Time"},{title:"Business Development Intern",location:"Remote",type:"Internship"},{title:"Content Researcher",location:"Remote",type:"Part Time"}],render=()=>["Current openings","Search job titles",eb.filter(Boolean)];
`

const loadAverixisModule = async () => import('../averixis/script.js')

test('Averixis validates the official careers shell, extracts the hashed bundle URL, and maps bundle openings', async () => {
  const averixis = await loadAverixisModule()

  assert.equal(averixis.CAREER_PAGE_URL, 'https://averixis.com/career')
  assert.equal(averixis.CONTACT_PAGE_URL, 'https://averixis.com/contact')
  assert.equal(averixis.pageIndicatesCareerShell(CAREER_SHELL_HTML), true)
  assert.equal(averixis.pageIndicatesCareerShell(CURRENT_CAREER_SHELL_HTML), true)
  assert.equal(
    averixis.extractBundleUrl(CAREER_SHELL_HTML),
    'https://averixis.com/assets/index-CEQVHvwH.js',
  )
  assert.equal(averixis.bundleIndicatesCareerContent(CAREER_BUNDLE), true)
  assert.equal(averixis.bundleIndicatesCareerContent(CURRENT_CAREER_BUNDLE), true)

  const jobs = averixis.extractJobsFromBundle(CAREER_BUNDLE)

  assert.deepEqual(jobs, [
    {
      title: 'Data Analyst',
      company: 'Averixis Solutions',
      department: null,
      location: 'Chennai, India',
      city: 'Chennai',
      country: 'India',
      jobId: 'averixis-data-analyst',
      requisitionId: 'averixis-data-analyst',
      sourceUrl: 'https://averixis.com/career',
      applyUrl: 'https://averixis.com/contact',
      employmentType: 'Full Time',
      experienceRequired: '1-3 years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Analyze business and product datasets.',
    },
    {
      title: 'QA Engineer',
      company: 'Averixis Solutions',
      department: null,
      location: 'Bengaluru, India',
      city: 'Bengaluru',
      country: 'India',
      jobId: 'averixis-qa-engineer',
      requisitionId: 'averixis-qa-engineer',
      sourceUrl: 'https://averixis.com/career',
      applyUrl: 'https://averixis.com/contact',
      employmentType: 'Full Time',
      experienceRequired: '2-4 years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Ensure product quality across releases.',
    },
  ])

  const currentJobs = averixis.extractJobsFromBundle(CURRENT_CAREER_BUNDLE)

  assert.deepEqual(
    currentJobs.map((job) => ({
      title: job.title,
      location: job.location,
      city: job.city,
      employmentType: job.employmentType,
      jobId: job.jobId,
    })),
    [
      {
        title: 'Business Development Intern',
        location: 'Remote, India',
        city: 'Remote',
        employmentType: 'Internship',
        jobId: 'averixis-business-development-intern',
      },
      {
        title: 'Content Researcher',
        location: 'Remote, India',
        city: 'Remote',
        employmentType: 'Part Time',
        jobId: 'averixis-content-researcher',
      },
      {
        title: 'Digital Marketing Associate',
        location: 'Hybrid, India',
        city: 'Hybrid',
        employmentType: 'Part Time',
        jobId: 'averixis-digital-marketing-associate',
      },
      {
        title: 'Frontend Developer',
        location: 'Bengaluru, India',
        city: 'Bengaluru',
        employmentType: 'Full Time',
        jobId: 'averixis-frontend-developer',
      },
      {
        title: 'Technical Trainer',
        location: 'Bengaluru, India',
        city: 'Bengaluru',
        employmentType: 'Full Time',
        jobId: 'averixis-technical-trainer',
      },
      {
        title: 'UI/UX Designer',
        location: 'Remote, India',
        city: 'Remote',
        employmentType: 'Part Time',
        jobId: 'averixis-ui-ux-designer',
      },
    ],
  )
})

test('run fetches the Averixis career shell and bundle, then decorates runner metadata', async () => {
  const averixis = await loadAverixisModule()
  const requestedUrls = []

  const jobs = await averixis.createAverixisScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === averixis.CAREER_PAGE_URL) return CAREER_SHELL_HTML
      if (url === 'https://averixis.com/assets/index-CEQVHvwH.js') return CAREER_BUNDLE
      throw new Error(`Unexpected URL: ${url}`)
    },
    now: () => '2026-07-09T14:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [
    'https://averixis.com/career',
    'https://averixis.com/assets/index-CEQVHvwH.js',
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'averixis')
  assert.equal(jobs[0].link, 'https://averixis.com/contact')
  assert.equal(jobs[0].scrapedAt, '2026-07-09T14:00:00.000Z')
})

test('run fails closed when the Averixis careers shell or bundle changes', async () => {
  const averixis = await loadAverixisModule()

  await assert.rejects(
    averixis.createAverixisScraper().run({
      fetchText: async () => '<html><body>Unexpected shell</body></html>',
    }),
    /Averixis careers page no longer exposes the expected bundle shell/i,
  )

  await assert.rejects(
    averixis.createAverixisScraper().run({
      fetchText: async (url) => {
        if (url === averixis.CAREER_PAGE_URL) return CAREER_SHELL_HTML
        return 'const emptyState = true'
      },
    }),
    /Averixis careers bundle no longer exposes the expected openings content/i,
  )
})

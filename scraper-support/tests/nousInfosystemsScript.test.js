import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-08-03T00:00:00.000Z'

const ROOT_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Artizent (formerly known as Nous Infosystems) | The Engineering Partner for Mission Critical AI</title>
    <meta name="description" content="Artizent builds, modernizes, and operates production grade AI systems for enterprises where scale is massive, money is real, and outcomes matter.">
    <meta property="og:site_name" content="Artizent">
    <script src="/runtime-config.js"></script>
    <script type="module" src="/assets/index-live.js"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`

const MAIN_BUNDLE = `
const __vite__mapDeps=(i)=>i;
const deps=["assets/Careers-live.js","assets/JobOpenings-live.js","assets/jobs-live.js","assets/JobDetail-live.js"];
export {};
`

const JOB_OPENINGS_ASSET = `
function JobOpenings(){
  return "/insights/careers/openings/\${t.slug}";
}
const backHref="/insights/careers";
const title="Open Positions";
const filterA="Select Designation";
const filterB="Select Location";
const button="Back to Careers";
`

const JOB_DETAIL_ASSET = `
const accept=".pdf,.doc,.docx";
const submit=()=>fetch("/api/apply",{method:"POST"});
const sent="Application received";
const fullNameError="Full name is required";
const resumeError="Resume is required";
`

const JOBS_ASSET = `
const e=[
  {
    slug:"java-fullstack-developer-ai",
    title:"Java Full Stack Developer",
    team:"Software Engineering",
    location:"Pune",
    openings:1,
    type:"Full time",
    experience:"8 to 12 Years",
    description:[
      "Build full stack AI-enabled product experiences.",
      "Collaborate with product and delivery teams."
    ],
    skills:["Java full stack development","React.js","Java Spring Boot"]
  },
  {
    slug:"databricks-team-lead-pyspark",
    title:"Databricks Team Lead (PySpark)",
    team:"Data Engineering",
    location:"Bangalore",
    openings:1,
    type:"Full time",
    experience:"7 to 10 Years",
    description:[
      "Lead Data Engineers and design scalable Databricks solutions."
    ],
    skills:["Databricks","PySpark","Python"]
  }
];
export { e as J };
`

const loadModule = async () => {
  try {
    return await import('../../scraper/nousinfosystems/script.js')
  } catch {
    assert.fail('Expected Nous Infosystems scraper module at ../../scraper/nousinfosystems/script.js')
  }
}

test('Nous Infosystems helpers stay pinned to the verified Artizent jobs-asset contract', async () => {
  const nous = await loadModule()

  assert.equal(nous.SOURCE, 'nousinfosystems')
  assert.equal(nous.COMPANY, 'Nous Infosystems')
  assert.equal(nous.OFFICIAL_BRAND_NAME, 'Artizent')
  assert.equal(nous.VERIFIED_ON, '2026-08-03')
  assert.equal(nous.LEGACY_HOMEPAGE_URL, 'https://www.nousinfosystems.com/')
  assert.equal(nous.HOMEPAGE_REDIRECT_URL, 'https://www.artizent.com/')
  assert.equal(nous.CAREERS_URL, 'https://www.artizent.com/insights/careers')
  assert.equal(nous.OPENINGS_URL, 'https://www.artizent.com/insights/careers/openings')
  assert.equal(nous.hasOfficialHomepageSignal(ROOT_HTML), true)
  assert.equal(
    nous.isVerifiedHomepageRedirect({
      status: 200,
      url: 'https://www.artizent.com/',
      html: ROOT_HTML,
    }),
    true,
  )
  assert.equal(nous.extractBundleAssetPath(ROOT_HTML), '/assets/index-live.js')
  assert.equal(nous.extractJobsAssetPath(MAIN_BUNDLE), 'assets/jobs-live.js')
  assert.equal(nous.extractJobOpeningsAssetPath(MAIN_BUNDLE), 'assets/JobOpenings-live.js')
  assert.equal(nous.extractJobDetailAssetPath(MAIN_BUNDLE), 'assets/JobDetail-live.js')
  assert.equal(nous.routeMatchesVerifiedShell(ROOT_HTML, '/assets/index-live.js'), true)
  assert.equal(nous.hasVerifiedJobOpeningsAssetSignal(JOB_OPENINGS_ASSET), true)
  assert.equal(nous.hasVerifiedJobDetailAssetSignal(JOB_DETAIL_ASSET), true)

  assert.deepEqual(nous.extractJobsFromAssetText(JOBS_ASSET), [
    {
      slug: 'java-fullstack-developer-ai',
      title: 'Java Full Stack Developer',
      department: 'Software Engineering',
      location: 'Pune',
      city: 'Pune',
      openings: 1,
      employmentType: 'Full-time',
      experienceRequired: '8 to 12 Years',
      requiredSkills: ['Java full stack development', 'React.js', 'Java Spring Boot'],
      jobDescription: 'Build full stack AI-enabled product experiences. Collaborate with product and delivery teams.',
    },
    {
      slug: 'databricks-team-lead-pyspark',
      title: 'Databricks Team Lead (PySpark)',
      department: 'Data Engineering',
      location: 'Bangalore',
      city: 'Bangalore',
      openings: 1,
      employmentType: 'Full-time',
      experienceRequired: '7 to 10 Years',
      requiredSkills: ['Databricks', 'PySpark', 'Python'],
      jobDescription: 'Lead Data Engineers and design scalable Databricks solutions.',
    },
  ])
})

test('Nous Infosystems run verifies the Artizent asset contract and maps current openings into jobs', async () => {
  const nous = await loadModule()
  const requestedPages = []
  const requestedAssets = []

  const jobs = await nous.createNousInfosystemsScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchPage: async (url) => {
      requestedPages.push(url)
      if (url === nous.LEGACY_HOMEPAGE_URL) {
        return { status: 200, url: nous.HOMEPAGE_REDIRECT_URL, html: ROOT_HTML }
      }
      if (url === nous.CAREERS_URL) {
        return { status: 200, url: nous.CAREERS_URL, html: ROOT_HTML }
      }
      throw new Error(`Unexpected page URL: ${url}`)
    },
    fetchText: async (url) => {
      requestedAssets.push(url)
      if (url === 'https://www.artizent.com/assets/index-live.js') return MAIN_BUNDLE
      if (url === 'https://www.artizent.com/assets/JobOpenings-live.js') return JOB_OPENINGS_ASSET
      if (url === 'https://www.artizent.com/assets/JobDetail-live.js') return JOB_DETAIL_ASSET
      if (url === 'https://www.artizent.com/assets/jobs-live.js') return JOBS_ASSET
      throw new Error(`Unexpected asset URL: ${url}`)
    },
  })

  assert.deepEqual(requestedPages, [nous.LEGACY_HOMEPAGE_URL, nous.CAREERS_URL])
  assert.deepEqual(requestedAssets, [
    'https://www.artizent.com/assets/index-live.js',
    'https://www.artizent.com/assets/JobOpenings-live.js',
    'https://www.artizent.com/assets/JobDetail-live.js',
    'https://www.artizent.com/assets/jobs-live.js',
  ])
  assert.equal(jobs.length, 2)

  assert.deepEqual(jobs[0], {
    title: 'Java Full Stack Developer',
    company: 'Nous Infosystems',
    department: 'Software Engineering',
    location: 'Pune',
    city: 'Pune',
    country: 'India',
    jobId: 'java-fullstack-developer-ai',
    requisitionId: 'java-fullstack-developer-ai',
    sourceUrl: 'https://www.artizent.com/insights/careers/openings/java-fullstack-developer-ai',
    applyUrl: 'https://www.artizent.com/insights/careers/openings/java-fullstack-developer-ai',
    employmentType: 'Full-time',
    experienceRequired: '8 to 12 Years',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: ['Java full stack development', 'React.js', 'Java Spring Boot'],
    postingDate: null,
    closingDate: null,
    jobDescription: 'Build full stack AI-enabled product experiences. Collaborate with product and delivery teams.',
    remoteStatus: 'On-site',
    source: 'nousinfosystems',
    link: 'https://www.artizent.com/insights/careers/openings/java-fullstack-developer-ai',
    companyCareerPage: 'https://www.artizent.com/insights/careers/openings',
    companyDomain: 'artizent.com',
    atsPlatform: 'official-company-careers',
    scrapedAt: FIXED_SCRAPED_AT,
  })

  assert.equal(jobs[1].title, 'Databricks Team Lead (PySpark)')
  assert.equal(jobs[1].location, 'Bangalore')
  assert.equal(jobs[1].jobId, 'databricks-team-lead-pyspark')
  assert.equal(jobs[1].applyUrl, 'https://www.artizent.com/insights/careers/openings/databricks-team-lead-pyspark')
  assert.equal(jobs[1].scrapedAt, FIXED_SCRAPED_AT)
})

test('Nous Infosystems fails closed when the verified jobs asset contract drifts', async () => {
  const nous = await loadModule()

  await assert.rejects(
    nous.createNousInfosystemsScraper().run({
      fetchPage: async (url) => {
        if (url === nous.LEGACY_HOMEPAGE_URL) {
          return { status: 200, url: nous.HOMEPAGE_REDIRECT_URL, html: ROOT_HTML }
        }
        return { status: 200, url: nous.CAREERS_URL, html: ROOT_HTML }
      },
      fetchText: async (url) => {
        if (url === 'https://www.artizent.com/assets/index-live.js') return MAIN_BUNDLE
        if (url === 'https://www.artizent.com/assets/JobOpenings-live.js') return JOB_OPENINGS_ASSET
        if (url === 'https://www.artizent.com/assets/JobDetail-live.js') return JOB_DETAIL_ASSET
        if (url === 'https://www.artizent.com/assets/jobs-live.js') return 'const broken=true; export { broken };'
        throw new Error(`Unexpected asset URL: ${url}`)
      },
    }),
    /jobs asset no longer matches the verified exported array contract/i,
  )
})

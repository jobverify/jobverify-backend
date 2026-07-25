import assert from 'node:assert/strict'
import test from 'node:test'

const MODERN_CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <h2>Join Our Team</h2>
    <p>Build Your Future with Alchemy Techsol</p>
    <h1>Current Openings</h1>
    <p>Your browser does not support JavaScript, or it is disabled. JavaScript must be enabled in order to view listings.</p>
  </body>
</html>
`

const LEGACY_CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <head><title>Career - Alchemy Techsol</title></head>
  <body>
    <h1>Explore By Category</h1>
    <a href="./career/testing/testing.html">Testing <span>3 open positions</span></a>
    <a href="./career/devops/devops.html">Devops <span>3 open positions</span></a>
  </body>
</html>
`

const TESTING_CATEGORY_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Testing</h1>
    <div class="job-item">
      <h5>IN | Ariba Testing Business Analyst</h5>
      <span><i class="fa fa-map-marker-alt"></i> Mumbai</span>
      <span><i class="far fa-clock"></i> Full Time</span>
      <a href="testing_details.html">Apply Now</a>
    </div>
    <div class="job-item">
      <h5>Test Specialist Performance &amp; Resilience Management</h5>
      <span><i class="fa fa-map-marker-alt"></i> Bangalore</span>
      <span><i class="far fa-clock"></i> Full Time</span>
      <a href="testing_details.html">Apply Now</a>
    </div>
    <!--
    <div class="job-item">
      <h5>Software Engineer</h5>
      <span><i class="fa fa-map-marker-alt"></i> New York, USA</span>
      <span><i class="far fa-clock"></i> Full Time</span>
      <a href="#">Apply Now</a>
    </div>
    -->
  </body>
</html>
`

const DEVOPS_CATEGORY_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Devops</h1>
    <div class="job-item">
      <h5>BCard_AWS DevOps</h5>
      <span><i class="fa fa-map-marker-alt"></i> Pune</span>
      <span><i class="far fa-clock"></i> Full Time</span>
      <a href="devops_details.html">Apply Now</a>
    </div>
  </body>
</html>
`

const loadAlchemyTechsolModule = async () => {
  try {
    return await import('../alchemytechsolindia/script.js')
  } catch {
    assert.fail('Expected Alchemy Techsol India scraper module at ../alchemytechsolindia/script.js')
  }
}

test('extractCurrentOpenings still recognizes the modern official Alchemy Techsol careers surface when its widget is empty', async () => {
  const alchemy = await loadAlchemyTechsolModule()

  assert.equal(alchemy.CAREERS_URL, 'https://alchemytechsol.com/career/')
  assert.equal(alchemy.LEGACY_CAREERS_URL, 'https://www.alchemytechsol.com/eng/careernew.html')
  assert.equal(alchemy.pageIndicatesOfficialCareersSurface(MODERN_CAREERS_HTML), true)
  assert.deepEqual(alchemy.extractCurrentOpenings(MODERN_CAREERS_HTML), [])
})

test('extractLegacyCategoryUrls and extractLegacyCategoryOpenings parse live legacy category pages without commented template jobs', async () => {
  const alchemy = await loadAlchemyTechsolModule()

  assert.deepEqual(alchemy.extractLegacyCategoryUrls(LEGACY_CAREERS_HTML), [
    'https://www.alchemytechsol.com/eng/career/testing/testing.html',
    'https://www.alchemytechsol.com/eng/career/devops/devops.html',
  ])
  assert.deepEqual(alchemy.extractLegacyCategoryOpenings(TESTING_CATEGORY_HTML, 'https://www.alchemytechsol.com/eng/career/testing/testing.html'), [
    {
      title: 'IN | Ariba Testing Business Analyst',
      location: 'Mumbai',
      employmentType: 'Full Time',
      applyUrl: 'https://www.alchemytechsol.com/eng/career/testing/testing_details.html',
      categoryUrl: 'https://www.alchemytechsol.com/eng/career/testing/testing.html',
    },
    {
      title: 'Test Specialist Performance & Resilience Management',
      location: 'Bangalore',
      employmentType: 'Full Time',
      applyUrl: 'https://www.alchemytechsol.com/eng/career/testing/testing_details.html',
      categoryUrl: 'https://www.alchemytechsol.com/eng/career/testing/testing.html',
    },
  ])
})

test('run validates Alchemy Techsol public careers surfaces and returns India jobs from legacy categories when the modern listing widget is empty', async () => {
  const alchemy = await loadAlchemyTechsolModule()
  const requestedUrls = []

  const jobs = await alchemy.createAlchemyTechsolIndiaScraper({
    now: () => '2026-07-19T00:00:00.000Z',
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === alchemy.CAREERS_URL) return MODERN_CAREERS_HTML
      if (url === alchemy.LEGACY_CAREERS_URL) return LEGACY_CAREERS_HTML
      if (url.endsWith('/testing/testing.html')) return TESTING_CATEGORY_HTML
      if (url.endsWith('/devops/devops.html')) return DEVOPS_CATEGORY_HTML

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    'https://alchemytechsol.com/career/',
    'https://www.alchemytechsol.com/eng/careernew.html',
    'https://www.alchemytechsol.com/eng/career/testing/testing.html',
    'https://www.alchemytechsol.com/eng/career/devops/devops.html',
  ])
  assert.deepEqual(jobs.map(({ scrapedAt, ...job }) => job), [
    {
      title: 'IN | Ariba Testing Business Analyst',
      company: 'Alchemy Techsol India Pvt Ltd',
      department: null,
      location: 'Mumbai, India',
      city: 'Mumbai',
      country: 'India',
      jobId: 'alchemytechsolindia-in-ariba-testing-business-analyst-mumbai',
      requisitionId: 'alchemytechsolindia-in-ariba-testing-business-analyst-mumbai',
      sourceUrl: 'https://www.alchemytechsol.com/eng/career/testing/testing.html',
      applyUrl: 'https://www.alchemytechsol.com/eng/career/testing/testing_details.html',
      employmentType: 'Full Time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: 'On-site',
      source: 'alchemytechsolindia',
      link: 'https://www.alchemytechsol.com/eng/career/testing/testing_details.html',
    },
    {
      title: 'Test Specialist Performance & Resilience Management',
      company: 'Alchemy Techsol India Pvt Ltd',
      department: null,
      location: 'Bangalore, India',
      city: 'Bangalore',
      country: 'India',
      jobId: 'alchemytechsolindia-test-specialist-performance-resilience-management-bangalore',
      requisitionId: 'alchemytechsolindia-test-specialist-performance-resilience-management-bangalore',
      sourceUrl: 'https://www.alchemytechsol.com/eng/career/testing/testing.html',
      applyUrl: 'https://www.alchemytechsol.com/eng/career/testing/testing_details.html',
      employmentType: 'Full Time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: 'On-site',
      source: 'alchemytechsolindia',
      link: 'https://www.alchemytechsol.com/eng/career/testing/testing_details.html',
    },
    {
      title: 'BCard_AWS DevOps',
      company: 'Alchemy Techsol India Pvt Ltd',
      department: null,
      location: 'Pune, India',
      city: 'Pune',
      country: 'India',
      jobId: 'alchemytechsolindia-bcard-aws-devops-pune',
      requisitionId: 'alchemytechsolindia-bcard-aws-devops-pune',
      sourceUrl: 'https://www.alchemytechsol.com/eng/career/devops/devops.html',
      applyUrl: 'https://www.alchemytechsol.com/eng/career/devops/devops_details.html',
      employmentType: 'Full Time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: 'On-site',
      source: 'alchemytechsolindia',
      link: 'https://www.alchemytechsol.com/eng/career/devops/devops_details.html',
    },
  ])
  assert.equal(jobs.every((job) => job.scrapedAt === '2026-07-19T00:00:00.000Z'), true)
})

test('run throws when the Alchemy Techsol careers page no longer matches the verified official public surface', async () => {
  const alchemy = await loadAlchemyTechsolModule()

  await assert.rejects(
    alchemy.createAlchemyTechsolIndiaScraper().run({
      fetchText: async () => '<main>Unexpected careers experience</main>',
    }),
    /verified official careers surface/i,
  )
})

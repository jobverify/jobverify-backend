import assert from 'node:assert/strict'
import test from 'node:test'

const CAREERS_HTML = `
<!doctype html>
<html>
  <head>
    <title>PolicyBazaar Careers</title>
  </head>
  <body>
    <div class="dreamjob-container">
      <div class="career-heading-title md full" id="dreamjob">Find the job that's right for you</div>
      <ul class="ijp">
        <li>
          <span class="content">
            <p class="heading">Associate Sales Consultant</p>
            <p class="text"><strong>Role: </strong>Assist customers in buying various financial products, focusing on insurance policies, over the phone.</p>
            <p class="text"><strong>Eligibility: </strong>Seeking SSC, Graduates or higher education applicants; regardless of experience.</p>
          </span>
          <span class="applynow"><a href="javascript:void(0)">Apply now</a></span>
        </li>
        <li>
          <span class="content">
            <p class="heading">Associate Service Consultant</p>
            <p class="text"><strong>Role: </strong>Provide customers with product details and resolve their queries.</p>
            <p class="text"><strong>Eligibility: </strong>Seeking SSC, Graduates or higher education applicants; regardless of experience.</p>
          </span>
          <span class="applynow"><a href="javascript:void(0)">Apply now</a></span>
        </li>
        <li>
          <span class="content">
            <p class="heading">Relationship Manager</p>
            <p class="text"><strong>Role: </strong>Drive new business through direct channels, meeting set targets.</p>
            <p class="text"><strong>Eligibility: </strong>Seeking SSC, Graduates or higher education applicants; regardless of experience.</p>
          </span>
          <span class="applynow"><a href="javascript:void(0)">Apply now</a></span>
        </li>
        <li>
          <span class="content">
            <p class="heading">Careers in Technology</p>
            <p class="text"><strong>Role: </strong>Work with the best talent in the country to disrupt insurance distribution.</p>
          </span>
          <span class="applynow"><a href="javascript:void(0)">Apply now</a></span>
        </li>
        <li class="heading"><div class="heading-text">Apply for other jobs</div></li>
        <li>
          <span class="content">
            <p class="heading">Don't see a Job Opening which interests you?</p>
            <p class="text">Share your resume and dream role with us.</p>
          </span>
          <span class="applynow extra"><a href="javascript:void(0)">Apply now</a></span>
        </li>
      </ul>
    </div>
    <div class="heading">Currently hiring for</div>
    <div class="heading">Gurugram</div>
    <div class="heading">Mumbai</div>
    <div class="heading">Pune</div>
    <div class="heading">Kolkata</div>
    <div class="heading">Chennai</div>
    <div class="heading">Bangalore</div>
    <div class="heading">Hyderabad</div>
    <form id="careerFormReferer">
      <select id="refPosition" name="refPosition">
        <option value="">select</option>
        <option value="Associate Sales Consultant">Associate Sales Consultant</option>
        <option value="Associate Service Consultant">Associate Service Consultant</option>
        <option value="Relationship Manager">Relationship Manager</option>
        <option value="Careers in Technology">Careers in Technology</option>
        <option value="Others">Others</option>
      </select>
      <label>Position applied for</label>
    </form>
  </body>
</html>
`

const CURRENT_HIRING_CITIES_HTML = `
<!doctype html>
<html>
  <body>
    <div class="office-add">
      <div class="address">
        <div class="heading">Currently hiring for</div>
        <div class="city-info-wrapper">
          <ul class="accordian-box">
            <li>
              <span class="city-location gurugram" data-id="gurugram"><i class="plus-icon"></i>Gurugram</span>
            </li>
            <li>
              <span class="city-location mumbai" data-id="mumbai"><i class="plus-icon"></i>Mumbai</span>
            </li>
            <li>
              <span class="city-location pune" data-id="pune"><i class="plus-icon"></i>Pune</span>
            </li>
            <li>
              <span class="city-location kolkata" data-id="kolkata"><i class="plus-icon"></i>Kolkata</span>
            </li>
            <li>
              <span class="city-location chennai" data-id="chennai"><i class="plus-icon"></i>Chennai</span>
            </li>
            <li>
              <span class="city-location bangalore" data-id="bangalore"><i class="plus-icon"></i>Bangalore</span>
            </li>
            <li>
              <span class="city-location hyderabad" data-id="hyderabad"><i class="plus-icon"></i>Hyderabad</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </body>
</html>
`

const DRIFTED_HTML = `
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
    return await import('../../scraper/policybazaar/script.js')
  } catch {
    assert.fail('Expected Policybazaar scraper module at ../../scraper/policybazaar/script.js')
  }
}

test('Policybazaar helpers keep the verified first-party inline careers page contract stable', async () => {
  const policybazaar = await loadModule()

  assert.equal(policybazaar.COMPANY, 'Policybazaar')
  assert.equal(policybazaar.OFFICIAL_BRAND_NAME, 'Policybazaar')
  assert.equal(policybazaar.VERIFIED_ON, '2026-07-16')
  assert.equal(policybazaar.HOMEPAGE_URL, 'https://www.policybazaar.com/')
  assert.equal(policybazaar.CAREERS_URL, 'https://www.policybazaar.com/careers/')
  assert.equal(policybazaar.PUBLIC_BOARD_URL, 'https://www.policybazaar.com/careers/')
  assert.equal(policybazaar.hasOfficialCareersPageSignal(CAREERS_HTML), true)
  assert.equal(policybazaar.hasSharedApplicationFormSignal(CAREERS_HTML), true)
  assert.deepEqual(policybazaar.extractHiringCities(CAREERS_HTML), [
    'Gurugram',
    'Mumbai',
    'Pune',
    'Kolkata',
    'Chennai',
    'Bangalore',
    'Hyderabad',
  ])
  assert.deepEqual(policybazaar.extractHiringCities(CURRENT_HIRING_CITIES_HTML), [
    'Gurugram',
    'Mumbai',
    'Pune',
    'Kolkata',
    'Chennai',
    'Bangalore',
    'Hyderabad',
  ])
})

test('extractSearchResults maps Policybazaar inline job cards into shared scraper fields', async () => {
  const policybazaar = await loadModule()
  const jobs = policybazaar.extractSearchResults(CAREERS_HTML)

  assert.equal(jobs.length, 4)
  assert.deepEqual(jobs[0], {
    title: 'Associate Sales Consultant',
    company: 'Policybazaar',
    department: null,
    location: 'Multiple locations, India',
    city: null,
    country: 'India',
    jobId: 'associate-sales-consultant',
    requisitionId: 'associate-sales-consultant',
    sourceUrl: 'https://www.policybazaar.com/careers/',
    applyUrl: 'https://www.policybazaar.com/careers/',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: 'Seeking SSC, Graduates or higher education applicants; regardless of experience.',
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: 'Assist customers in buying various financial products, focusing on insurance policies, over the phone.',
    remoteStatus: 'On-site',
  })
  assert.equal(jobs[1].title, 'Associate Service Consultant')
  assert.equal(jobs[2].title, 'Relationship Manager')
  assert.equal(jobs[3].title, 'Careers in Technology')
})

test('run stays empty until a trustworthy public Policybazaar jobs contract exists', async () => {
  const policybazaar = await loadModule()
  let fetchAttempted = false

  const jobs = await policybazaar.createPolicybazaarScraper({ maxJobs: 2 }).run({
    fetchText: async (url) => {
      fetchAttempted = true
      throw new Error(`Unexpected Policybazaar fetch: ${url}`)
    },
  })

  assert.equal(fetchAttempted, false)
  assert.deepEqual(jobs, [])
})

test('run remains empty even when the first-party careers page is supplied', async () => {
  const policybazaar = await loadModule()

  const jobs = await policybazaar.createPolicybazaarScraper().run({
    fetchText: async () => DRIFTED_HTML,
  })

  assert.deepEqual(jobs, [])
})

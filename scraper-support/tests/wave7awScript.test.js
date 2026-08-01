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

const velocityCareersHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Careers</h1>
    <p>Join our dynamic team to innovate, create, and excel in a supportive environment fostering growth and cutting-edge technology.</p>
    <a href="https://www.velsof.com/jobs/ui-ux-designer/">UI/UX Designer Design Noida, India 2+ years Full-time Feb 15, 2026</a>
    <a href="https://www.velsof.com/jobs/flutter-mobile-app-developer/">Flutter Mobile App Developer Mobile Development Noida, India / Remote 2-3 years Full-time Feb 15, 2026</a>
    <a href="https://www.velsof.com/jobs/senior-laravel-developer/">Senior Laravel Developer Engineering Noida, India 3-5 years Full-time Feb 15, 2026</a>
  </body>
</html>
`

const velocityUiUxHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>UI/UX Designer</h1>
    <p>Design Noida, India 2+ years Full-time</p>
    <h2>About the Role</h2>
    <p>We need a creative UI/UX Designer to craft intuitive interfaces for web and mobile applications.</p>
    <h2>Requirements</h2>
    <ul>
      <li>2+ years of experience in UI/UX design</li>
      <li>Proficiency in Figma, Sketch, or Adobe XD</li>
      <li>Understanding of design systems and accessibility</li>
    </ul>
  </body>
</html>
`

const velocityFlutterHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Flutter Mobile App Developer</h1>
    <p>Mobile Development Noida, India / Remote 2-3 years Full-time</p>
    <h2>About the Role</h2>
    <p>Join our mobile development team and work on cutting-edge Flutter applications for international clients.</p>
    <h2>Requirements</h2>
    <ul>
      <li>2-3 years of experience with Flutter/Dart</li>
      <li>Published apps on Google Play or App Store</li>
      <li>Understanding of state management (Bloc/Provider)</li>
    </ul>
  </body>
</html>
`

const velocityLaravelHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Senior Laravel Developer</h1>
    <p>Engineering Noida, India 3-5 years Full-time</p>
    <h2>About the Role</h2>
    <p>We are looking for a Senior Laravel Developer to join our engineering team and help build scalable web applications for our global clients.</p>
    <h2>Requirements</h2>
    <ul>
      <li>3-5 years of experience with PHP and Laravel</li>
      <li>Strong understanding of RESTful APIs and MVC architecture</li>
      <li>Experience with MySQL/PostgreSQL databases</li>
    </ul>
  </body>
</html>
`

const lavenderHomepageHtml = `
<!doctype html>
<html lang="en">
  <body>
    <nav>Home About Products Contact Get Quote</nav>
    <h1>Expanding Horizons with Hybrid & Web Development</h1>
    <p>12+ Years of Excellence</p>
    <p>Serving clients globally including UAE, Canada, South Africa, and all over Kerala.</p>
    <p>Alappuzha, Kerala, India</p>
    <p>info@lavendertechnologies.com</p>
    <a href="/contact">Go to Contact Form</a>
  </body>
</html>
`

const bitwiseCareersHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Careers</h1>
    <p>Engineer the systems that power intelligent enterprises and grow with a team that values disciplined execution and shared ownership.</p>
    <a href="https://www.bitwiseglobal.com/company/careers/openings">View Open Positions</a>
    <h2>Join Our Team</h2>
  </body>
</html>
`

const bitwiseOpeningsHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Current Openings</h1>
    <p>Are you a dedicated technology professional driven by passion, innovation, collaboration, and excellence? Find your place in the Bitwise family.</p>
    <div>All Locations</div>
    <div>All Types</div>
    <input aria-label="Search" />
    <p>No openings found</p>
    <p>Try adjusting your filters or search.</p>
  </body>
</html>
`

const wissenCareersHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Opportunities at Wissen Technology</h1>
    <p>Important Notice - Fraudulent Job Offers in the Name of Wissen Technology Pvt. Ltd.</p>
    <p>All legitimate job openings are published only on our official website www.wissen.com in the career section.</p>
    <section class="job-card">
      <h2>Senior Level Java Technical Lead</h2>
      <p>Wissen Technology is now hiring for a Senior Java Technical Lead with relevant experience. Job Description: Role: Java Technical Lead Location: Bangalore, Mumbai, and Pune Experience: 8 to 15 years.</p>
      <p>Full-time</p>
      <p>Location</p>
      <p>Bengaluru/Mumbai/Pune</p>
      <a href="https://www.wissen.com/contact/writetous">Send resume now</a>
    </section>
    <section class="job-card">
      <h2>Data Engineer</h2>
      <p>Wissen Technology is now hiring for Data Engineer with relevant experience. Job Title: Data Engineer Location: Bangalore and Mumbai Experience - 7+ years.</p>
      <p>Full-time</p>
      <p>Location</p>
      <p>Bengaluru/Mumbai</p>
      <a href="https://www.wissen.com/contact/writetous">Send resume now</a>
    </section>
    <section class="job-card">
      <h2>Python Developer</h2>
      <p>Wissen Technology is now hiring for Python Developer - Bangalore with 3 - 11 years of relevant experience.</p>
      <p>Full-time</p>
      <p>Location</p>
      <p>Bengaluru</p>
      <a href="https://www.wissen.com/contact/writetous">Send resume now</a>
    </section>
  </body>
</html>
`

const cloud4cCareersHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Cloud4C Makes a Difference. For the Industry and its Brightest Talents</h1>
    <p>Discover your new career that makes you happy</p>
    <a href="https://careers.cloud4c.com/go/All-Jobs/517580/">Apply Now</a>
    <p>Couldn't find the right opportunity? Write to us, and we will get back to you if anything comes up</p>
    <a href="https://www.cloud4c.com/applicant-form/careers">Write to us</a>
  </body>
</html>
`

const cloud4cApplicationFormHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Application form</h1>
    <label>Job Title*</label>
    <input name="jobTitle" />
    <label>Job Location*</label>
    <input name="jobLocation" />
    <label>Name*</label>
    <input name="name" />
    <label>Email*</label>
    <input name="email" />
    <label>Experience*</label>
    <input name="experience" />
    <p>Allowed extensions:doc docx pdf</p>
  </body>
</html>
`

test('Velocity Software Solutions run returns normalized jobs from the verified careers index and detail pages', async () => {
  const velocity = await loadModule('../../scraper/velocitysoftwaresolutions/script.js')
  const requestedUrls = []

  assert.equal(velocity.hasOfficialCareersSignal(velocityCareersHtml), true)
  assert.deepEqual(velocity.extractJobLinks(velocityCareersHtml), [
    'https://www.velsof.com/jobs/ui-ux-designer/',
    'https://www.velsof.com/jobs/flutter-mobile-app-developer/',
    'https://www.velsof.com/jobs/senior-laravel-developer/',
  ])

  const jobs = await velocity.createVelocitySoftwareSolutionsScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === velocity.CAREERS_URL) return velocityCareersHtml
      if (url === 'https://www.velsof.com/jobs/ui-ux-designer/') return velocityUiUxHtml
      if (url === 'https://www.velsof.com/jobs/flutter-mobile-app-developer/') return velocityFlutterHtml
      if (url === 'https://www.velsof.com/jobs/senior-laravel-developer/') return velocityLaravelHtml
      throw new Error(`Unexpected Velocity URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    velocity.CAREERS_URL,
    'https://www.velsof.com/jobs/ui-ux-designer/',
    'https://www.velsof.com/jobs/flutter-mobile-app-developer/',
    'https://www.velsof.com/jobs/senior-laravel-developer/',
  ])
  assert.equal(jobs.length, 3)
  assert.equal(jobs[0].title, 'Flutter Mobile App Developer')
  assert.equal(jobs[0].location, 'Noida, India / Remote')
  assert.equal(jobs[0].remoteStatus, 'Hybrid')
  assert.equal(jobs[1].title, 'Senior Laravel Developer')
  assert.equal(jobs[1].department, 'Engineering')
  assert.equal(jobs[2].title, 'UI/UX Designer')
  assert.equal(jobs[2].department, 'Design')
})

test('Lavender Technology sentinel validates the exact-name homepage and returns [] while no careers surface exists', async () => {
  const lavender = await loadModule('../../scraper/lavendertechnology/script.js')

  assert.equal(lavender.hasTrustedHomepageSignal(lavenderHomepageHtml), true)
  assert.equal(lavender.hasPublicCareersSurface(lavenderHomepageHtml), false)

  const jobs = await lavender.createLavenderTechnologyScraper().run({
    fetchText: async (url) => {
      assert.equal(url, lavender.HOMEPAGE_URL)
      return lavenderHomepageHtml
    },
  })

  assert.deepEqual(jobs, [])
})

test('Bitwise Solutions sentinel validates the first-party current openings page and returns [] when it explicitly says no openings found', async () => {
  const bitwise = await loadModule('../../scraper/bitwisesolutions/script.js')
  const requestedUrls = []

  assert.equal(bitwise.hasOfficialCareersSignal(bitwiseCareersHtml), true)
  assert.equal(bitwise.hasNoOpeningsSignal(bitwiseOpeningsHtml), true)

  const jobs = await bitwise.createBitwiseSolutionsScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === bitwise.CAREERS_URL) return bitwiseCareersHtml
      if (url === bitwise.OPENINGS_URL) return bitwiseOpeningsHtml
      throw new Error(`Unexpected Bitwise URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [bitwise.CAREERS_URL, bitwise.OPENINGS_URL])
  assert.deepEqual(jobs, [])
})

test('Wissen Technology run returns normalized openings from the verified first-party openings page', async () => {
  const wissen = await loadModule('../../scraper/wissentechnology/script.js')

  assert.equal(wissen.hasOfficialCareersSignal(wissenCareersHtml), true)
  assert.equal(wissen.extractVisibleJobs(wissenCareersHtml).length, 3)

  const jobs = await wissen.createWissenTechnologyScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      assert.equal(url, wissen.CAREERS_URL)
      return wissenCareersHtml
    },
  })

  assert.equal(jobs.length, 3)
  assert.equal(jobs[0].title, 'Data Engineer')
  assert.equal(jobs[0].location, 'Bengaluru/Mumbai')
  assert.equal(jobs[0].applyUrl, wissen.CONTACT_URL)
  assert.equal(jobs[1].title, 'Python Developer')
  assert.equal(jobs[1].location, 'Bengaluru')
  assert.equal(jobs[2].title, 'Senior Level Java Technical Lead')
  assert.equal(jobs[2].location, 'Bengaluru/Mumbai/Pune')
})

test('Cloud4C sentinel validates the exact-name careers page and generic application form before returning []', async () => {
  const cloud4c = await loadModule('../../scraper/cloud4c/script.js')
  const requestedUrls = []

  assert.equal(cloud4c.hasOfficialCareersSignal(cloud4cCareersHtml), true)
  assert.equal(cloud4c.isGenericApplicationForm(cloud4cApplicationFormHtml), true)

  const jobs = await cloud4c.createCloud4CScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === cloud4c.CAREERS_URL) return cloud4cCareersHtml
      if (url === cloud4c.APPLICATION_FORM_URL) return cloud4cApplicationFormHtml
      throw new Error(`Unexpected Cloud4C URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [cloud4c.CAREERS_URL, cloud4c.APPLICATION_FORM_URL])
  assert.deepEqual(jobs, [])
})

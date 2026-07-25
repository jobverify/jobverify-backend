import assert from 'node:assert/strict'
import test from 'node:test'

const loadVimaanModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    return null
  }
}

const homepageHtml = `
  <html>
    <body>
      <h1>100% Inventory Accuracy &amp; Visibility</h1>
      <p>Computer vision that brings real-world accuracy to your warehouse.</p>
      <p>Dozens of Warehouses Use Vimaan</p>
      <a href="https://vimaan.ai/careers/">Careers</a>
    </body>
  </html>
`

const aboutHtml = `
  <html>
    <body>
      <h1>About Vimaan</h1>
      <h2>At Vimaan We Have No Limits</h2>
      <p>Vimaan is a computer vision and AI solution company dedicated to providing 3PLs, Brands and Retailers with a 100% accurate view of their warehouse inventory.</p>
      <p>Based in the heart of Silicon Valley, Vimaan was founded by KG Ganapathi in 2017.</p>
      <p>Roles include Full Stack Engineers and Computer Vision Engineers &amp; Scientists.</p>
    </body>
  </html>
`

const contactHtml = `
  <html>
    <body>
      <h2>Let’s Talk</h2>
      <p>Our Warehouse Automation Experts are available.</p>
      <p>We typically get back to queries within a single day!</p>
      <p>sales@vimaan.ai</p>
      <p>2391 Zanker Rd, Suite 360, San Jose, CA 95131</p>
    </body>
  </html>
`

const careersShellHtml = `
  <html>
    <body>
      <h1>Careers</h1>
      <h2>big brains wanted</h2>
      <h2>vimaan job openings</h2>
      <p>It’s true, we only want you for your brain</p>
      <p>The demand for Vimaan solutions has never been greater, and we are actively building our teams across the company in all departments.</p>
      <p>AI – COMPUTER VISION – MACHINE LEARNING – ROBOTICS – ENGINEERING</p>
      <label>Keywords</label>
      <label>Location</label>
      <label>Remote positions only</label>
      <p>Your browser does not support JavaScript, or it is disabled. JavaScript must be enabled in order to view listings.</p>
      <button>Load more listings</button>
    </body>
  </html>
`

const publicJobsHtml = `
  <html>
    <body>
      <h2>vimaan job openings</h2>
      <article class="job_listing type-job_listing">
        <a href="https://vimaan.ai/jobs/full-stack-engineer/">Full Stack Engineer</a>
        <a href="https://vimaan.ai/jobs/full-stack-engineer/">Apply for job</a>
      </article>
    </body>
  </html>
`

test('Vimaan sentinel stays pinned to the verified first-party pages and the careers-shell contract', async () => {
  const vimaan = await loadVimaanModule()
  assert.ok(vimaan, 'Expected Vimaan scraper module at ./script.js')

  assert.equal(vimaan.SOURCE, 'vimaan')
  assert.equal(vimaan.COMPANY, 'Vimaan')
  assert.equal(vimaan.HOMEPAGE_URL, 'https://vimaan.ai/')
  assert.equal(vimaan.ABOUT_URL, 'https://vimaan.ai/company/')
  assert.equal(vimaan.CONTACT_URL, 'https://vimaan.ai/contact-us/')
  assert.equal(vimaan.CAREERS_URL, 'https://vimaan.ai/careers/')
  assert.equal(vimaan.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(vimaan.hasOfficialAboutSignal(aboutHtml), true)
  assert.equal(vimaan.hasOfficialContactSignal(contactHtml), true)
  assert.equal(vimaan.hasOfficialCareersSignal(careersShellHtml), true)
  assert.equal(vimaan.hasRenderedPublicJobCards(careersShellHtml), false)
  assert.equal(vimaan.hasRenderedPublicJobCards(publicJobsHtml), true)
})

test('run returns an empty list when Vimaan exposes only a verified JavaScript jobs shell without rendered public job cards', async () => {
  const vimaan = await loadVimaanModule()
  assert.ok(vimaan, 'Expected Vimaan scraper module at ./script.js')

  const requestedUrls = []
  const jobs = await vimaan.createVimaanScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === vimaan.HOMEPAGE_URL) {
        return { status: 200, url, html: homepageHtml }
      }

      if (url === vimaan.ABOUT_URL) {
        return { status: 200, url, html: aboutHtml }
      }

      if (url === vimaan.CONTACT_URL) {
        return { status: 200, url, html: contactHtml }
      }

      if (url === vimaan.CAREERS_URL) {
        return { status: 200, url, html: careersShellHtml }
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    vimaan.HOMEPAGE_URL,
    vimaan.ABOUT_URL,
    vimaan.CONTACT_URL,
    vimaan.CAREERS_URL,
  ])
  assert.deepEqual(jobs, [])
})

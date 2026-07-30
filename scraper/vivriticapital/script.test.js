import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    return null
  }
}

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Financial services companies | Vivriti Capital</title>
  </head>
  <body>
    <nav>
      <a href="https://www.vivriticapital.com/vivriti-group.html">Vivriti Group</a>
      <a href="https://www.vivriticapital.com/work-with-us.html">Careers</a>
      <a href="https://www.vivriticapital.com/contact-us.html">Contact</a>
    </nav>
    <main>
      <p>Public Notice</p>
      <p>Vivriti Capital Limited</p>
      <p>Careers All the hot jobs that are open at Vivriti Capital</p>
      <a href="https://vivriti.darwinbox.in">Apply Now</a>
      <p>FOR BUSINESS ENQUIRIES +91 44 4007 4801 sales@vivriticapital.com</p>
    </main>
  </body>
</html>
`

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Career | Vivriti Capital</title>
  </head>
  <body>
    <main>
      <h3>People Are at the Heart of What We Do</h3>
      <p>At Vivriti, we are guided by values that support every person's potential and well-being.</p>
      <h3>Join Our Team</h3>
      <p>Discover roles across various departments, tailored to your expertise and aspirations.</p>
      <p>Use our filters to find opportunities that match your skills, location preferences, and experience level.</p>
      <p>Apply now to embark on a rewarding professional trajectory with one of India's top-rated employers.</p>
      <a href="https://vivriti.darwinbox.in">APPLY NOW</a>
    </main>
  </body>
</html>
`

const liveCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Career | Vivriti Capital</title>
  </head>
  <body>
    <main>
      <h3>People Are at the Heart of What We Do</h3>
      <h3>Join Our Team</h3>
      <p>Discover roles across various departments, tailored to your expertise and aspirations.</p>
      <p>Use our filters to find opportunities that match your skills, location preferences, and experience level.</p>
      <a href="https://vivriti.darwinbox.in/ms/candidate/careers">Apply Now</a>
    </main>
  </body>
</html>
`

const aboutHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Vivriti Group | financial solutions</title>
  </head>
  <body>
    <main>
      <h1>Vivriti Means Progress Vivriti Group Is All About Transformation</h1>
      <p>Vivriti Group is the pioneering Mid-Market Lender with game-changing performing credit products and solutions.</p>
      <p>Vivriti Group comprises Vivriti Capital Ltd., a fintech NBFC, and Vivriti Asset Management Pvt. Ltd.</p>
      <p>Vivriti Capital, established in 2017, is a fintech NBFC that aims to bring necessary debt finance to hundreds of mid-market enterprises across India.</p>
    </main>
  </body>
</html>
`

const contactHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Contact us | Vivriti Capital</title>
  </head>
  <body>
    <main>
      <h4>HEAD OFFICE</h4>
      <p>Prestige Zackria Metropolitan, No.200/1-8, 2nd Floor, Block 1, Anna Salai, Chennai 600002</p>
      <p>FOR BUSINESS ENQUIRIES</p>
      <p>+91 44 4007 4801</p>
      <p>sales@vivriticapital.com</p>
      <p>FOR GRIEVANCES</p>
      <p>grievanceredressal@vivriticapital.com</p>
    </main>
  </body>
</html>
`

test('Vivriti Capital validates the verified homepage, careers page, about page, and contact page with explicit Darwinbox handoff', async () => {
  const vivriti = await loadModule()
  assert.ok(vivriti, 'Vivriti Capital scraper module should load')

  assert.equal(vivriti.SOURCE, 'vivriticapital')
  assert.equal(vivriti.COMPANY, 'Vivriti Capital')
  assert.equal(vivriti.HOMEPAGE_URL, 'https://www.vivriticapital.com/')
  assert.equal(vivriti.CAREERS_URL, 'https://www.vivriticapital.com/work-with-us.html')
  assert.equal(vivriti.ABOUT_URL, 'https://www.vivriticapital.com/vivriti-group.html')
  assert.equal(vivriti.CONTACT_URL, 'https://www.vivriticapital.com/contact-us.html')
  assert.equal(vivriti.DARWINBOX_HANDOFF_URL, 'https://vivriti.darwinbox.in')
  assert.equal(vivriti.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(vivriti.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(vivriti.hasOfficialCareersSignal(liveCareersHtml), true)
  assert.equal(vivriti.hasOfficialAboutSignal(aboutHtml), true)
  assert.equal(vivriti.hasOfficialContactSignal(contactHtml), true)
  assert.equal(vivriti.extractOfficialDarwinboxUrl(careersHtml), 'https://vivriti.darwinbox.in')
})

test('Vivriti Capital run returns an empty list only while the verified official site exposes the same Darwinbox handoff contract', async () => {
  const vivriti = await loadModule()
  assert.ok(vivriti, 'Vivriti Capital scraper module should load')

  const requestedUrls = []
  const jobs = await vivriti.createVivritiCapitalScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === vivriti.HOMEPAGE_URL) return homepageHtml
      if (url === vivriti.CAREERS_URL) return careersHtml
      if (url === vivriti.ABOUT_URL) return aboutHtml
      if (url === vivriti.CONTACT_URL) return contactHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    vivriti.HOMEPAGE_URL,
    vivriti.CAREERS_URL,
    vivriti.ABOUT_URL,
    vivriti.CONTACT_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('Vivriti Capital fails closed when the homepage, careers page, about page, contact page, or Darwinbox handoff changes materially', async () => {
  const vivriti = await loadModule()
  assert.ok(vivriti, 'Vivriti Capital scraper module should load')

  await assert.rejects(
    vivriti.createVivritiCapitalScraper().run({
      fetchText: async (url) => {
        if (url === vivriti.HOMEPAGE_URL) return '<html><body><h1>Placeholder</h1></body></html>'
        if (url === vivriti.CAREERS_URL) return careersHtml
        if (url === vivriti.ABOUT_URL) return aboutHtml
        if (url === vivriti.CONTACT_URL) return contactHtml
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /homepage/i,
  )

  await assert.rejects(
    vivriti.createVivritiCapitalScraper().run({
      fetchText: async (url) => {
        if (url === vivriti.HOMEPAGE_URL) return homepageHtml
        if (url === vivriti.CAREERS_URL) return '<html><body><h1>Jobs</h1></body></html>'
        if (url === vivriti.ABOUT_URL) return aboutHtml
        if (url === vivriti.CONTACT_URL) return contactHtml
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /careers page/i,
  )

  await assert.rejects(
    vivriti.createVivritiCapitalScraper().run({
      fetchText: async (url) => {
        if (url === vivriti.HOMEPAGE_URL) return homepageHtml
        if (url === vivriti.CAREERS_URL) return careersHtml.replace('https://vivriti.darwinbox.in', 'https://example.com')
        if (url === vivriti.ABOUT_URL) return aboutHtml
        if (url === vivriti.CONTACT_URL) return contactHtml
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /darwinbox handoff/i,
  )

  await assert.rejects(
    vivriti.createVivritiCapitalScraper().run({
      fetchText: async (url) => {
        if (url === vivriti.HOMEPAGE_URL) return homepageHtml
        if (url === vivriti.CAREERS_URL) return careersHtml
        if (url === vivriti.ABOUT_URL) return '<html><body><h1>About</h1></body></html>'
        if (url === vivriti.CONTACT_URL) return contactHtml
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /about/i,
  )

  await assert.rejects(
    vivriti.createVivritiCapitalScraper().run({
      fetchText: async (url) => {
        if (url === vivriti.HOMEPAGE_URL) return homepageHtml
        if (url === vivriti.CAREERS_URL) return careersHtml
        if (url === vivriti.ABOUT_URL) return aboutHtml
        if (url === vivriti.CONTACT_URL) return '<html><body><h1>Contact</h1></body></html>'
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /contact/i,
  )
})

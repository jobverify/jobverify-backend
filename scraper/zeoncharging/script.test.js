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
  <html>
    <head>
      <title>Zeon Charging</title>
      <link rel="canonical" href="https://zeoncharging.com/">
    </head>
    <body>
      <header>
        <a href="/about_us">About Us</a>
        <a href="/careers">Careers</a>
        <a href="/contact_us">Contact</a>
      </header>
      <footer>
        <a href="/careers">Careers</a>
      </footer>
    </body>
  </html>
`

const aboutHtml = `
  <html>
    <body>
      <h1>About Zeon</h1>
      <p>Zeon Electric Pvt Ltd is building EV charging infrastructure across India.</p>
    </body>
  </html>
`

const contactHtml = `
  <html>
    <body>
      <h1>Contact Us</h1>
      <p>Tiruppur, Tamil Nadu, India</p>
      <a href="mailto:care@zeoncharging.com">care@zeoncharging.com</a>
    </body>
  </html>
`

const careersHtml = `
  <html>
    <body>
      <section>
        <h1>Join Us</h1>
        <h2>Open Positions</h2>
        <article class="position-card">
          <h3>Customer Support Executive</h3>
          <p>Support Zeon's EV charging customers across India.</p>
        </article>
        <article class="position-card">
          <h3>Team Lead - Customer Support</h3>
          <p>Lead the support team and improve customer issue resolution.</p>
        </article>
        <article class="position-card">
          <h3>Internship - Infrastructure Development</h3>
          <p>Assist the infrastructure team with charging-network rollout work.</p>
        </article>
      </section>
    </body>
  </html>
`

test('Zeon Charging constants stay pinned to the verified legacy redirect, legal-name, contact, and careers contract', async () => {
  const zeon = await loadModule()
  assert.ok(zeon, 'Zeon Charging scraper module should load')

  assert.equal(zeon.SOURCE, 'zeoncharging')
  assert.equal(zeon.COMPANY, 'Zeon Electric Pvt Ltd')
  assert.equal(zeon.LEGACY_HOMEPAGE_URL, 'https://zeonelectric.in/')
  assert.equal(zeon.HOMEPAGE_URL, 'https://zeoncharging.com/')
  assert.equal(zeon.ABOUT_URL, 'https://zeoncharging.com/about_us')
  assert.equal(zeon.CONTACT_URL, 'https://zeoncharging.com/contact_us')
  assert.equal(zeon.CAREERS_URL, 'https://zeoncharging.com/careers')
  assert.equal(zeon.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(zeon.hasOfficialAboutSignal(aboutHtml), true)
  assert.equal(zeon.hasOfficialContactSignal(contactHtml), true)
  assert.equal(zeon.hasOfficialCareersSignal(careersHtml), true)
})

test('extractJobCards returns the verified inline Zeon roles from the public careers page', async () => {
  const zeon = await loadModule()
  assert.ok(zeon, 'Zeon Charging scraper module should load')

  assert.deepEqual(zeon.extractJobCards(careersHtml), [
    {
      title: 'Customer Support Executive',
      company: 'Zeon Electric Pvt Ltd',
      department: null,
      location: null,
      city: null,
      state: null,
      country: 'India',
      jobId: 'zeoncharging-customer-support-executive',
      requisitionId: 'zeoncharging-customer-support-executive',
      sourceUrl: 'https://zeoncharging.com/careers',
      applyUrl: 'https://zeoncharging.com/careers',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Support Zeon\'s EV charging customers across India.',
      remoteStatus: 'On-site',
    },
    {
      title: 'Team Lead - Customer Support',
      company: 'Zeon Electric Pvt Ltd',
      department: null,
      location: null,
      city: null,
      state: null,
      country: 'India',
      jobId: 'zeoncharging-team-lead-customer-support',
      requisitionId: 'zeoncharging-team-lead-customer-support',
      sourceUrl: 'https://zeoncharging.com/careers',
      applyUrl: 'https://zeoncharging.com/careers',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Lead the support team and improve customer issue resolution.',
      remoteStatus: 'On-site',
    },
    {
      title: 'Internship - Infrastructure Development',
      company: 'Zeon Electric Pvt Ltd',
      department: null,
      location: null,
      city: null,
      state: null,
      country: 'India',
      jobId: 'zeoncharging-internship-infrastructure-development',
      requisitionId: 'zeoncharging-internship-infrastructure-development',
      sourceUrl: 'https://zeoncharging.com/careers',
      applyUrl: 'https://zeoncharging.com/careers',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Assist the infrastructure team with charging-network rollout work.',
      remoteStatus: 'On-site',
    },
  ])
})

test('run validates the Zeon first-party chain and decorates careers-page roles', async () => {
  const zeon = await loadModule()
  assert.ok(zeon, 'Zeon Charging scraper module should load')

  const requestedUrls = []
  const jobs = await zeon.createZeonChargingScraper({ maxJobs: 2 }).run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === zeon.LEGACY_HOMEPAGE_URL) {
        return {
          status: 200,
          url: zeon.HOMEPAGE_URL,
          html: homepageHtml,
        }
      }
      if (url === zeon.ABOUT_URL) return { status: 200, url, html: aboutHtml }
      if (url === zeon.CONTACT_URL) return { status: 200, url, html: contactHtml }
      if (url === zeon.CAREERS_URL) return { status: 200, url, html: careersHtml }

      throw new Error(`Unexpected URL: ${url}`)
    },
    now: () => '2026-07-12T00:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [
    zeon.LEGACY_HOMEPAGE_URL,
    zeon.ABOUT_URL,
    zeon.CONTACT_URL,
    zeon.CAREERS_URL,
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'zeoncharging')
  assert.equal(jobs[0].link, 'https://zeoncharging.com/careers')
  assert.equal(jobs[0].scrapedAt, '2026-07-12T00:00:00.000Z')
})

test('run fails closed when the Zeon redirect, about page, contact page, or careers contract changes', async () => {
  const zeon = await loadModule()
  assert.ok(zeon, 'Zeon Charging scraper module should load')

  await assert.rejects(
    zeon.createZeonChargingScraper().run({
      fetchPage: async (url) => {
        if (url === zeon.LEGACY_HOMEPAGE_URL) {
          return { status: 200, url: 'https://example.com/', html: homepageHtml }
        }
        return { status: 200, url, html: careersHtml }
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    zeon.createZeonChargingScraper().run({
      fetchPage: async (url) => {
        if (url === zeon.LEGACY_HOMEPAGE_URL) {
          return { status: 200, url: zeon.HOMEPAGE_URL, html: homepageHtml }
        }
        if (url === zeon.ABOUT_URL) {
          return { status: 200, url, html: '<html><body><p>About Zeon Charging</p></body></html>' }
        }
        if (url === zeon.CONTACT_URL) return { status: 200, url, html: contactHtml }
        return { status: 200, url, html: careersHtml }
      },
    }),
    /legal-name about page/i,
  )

  await assert.rejects(
    zeon.createZeonChargingScraper().run({
      fetchPage: async (url) => {
        if (url === zeon.LEGACY_HOMEPAGE_URL) {
          return { status: 200, url: zeon.HOMEPAGE_URL, html: homepageHtml }
        }
        if (url === zeon.ABOUT_URL) return { status: 200, url, html: aboutHtml }
        if (url === zeon.CONTACT_URL) {
          return { status: 200, url, html: '<html><body><p>Reach us later</p></body></html>' }
        }
        return { status: 200, url, html: careersHtml }
      },
    }),
    /official contact page/i,
  )

  await assert.rejects(
    zeon.createZeonChargingScraper().run({
      fetchPage: async (url) => {
        if (url === zeon.LEGACY_HOMEPAGE_URL) {
          return { status: 200, url: zeon.HOMEPAGE_URL, html: homepageHtml }
        }
        if (url === zeon.ABOUT_URL) return { status: 200, url, html: aboutHtml }
        if (url === zeon.CONTACT_URL) return { status: 200, url, html: contactHtml }
        return { status: 200, url, html: '<html><body><h1>Join Us</h1></body></html>' }
      },
    }),
    /official careers page/i,
  )
})

import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ABOUT_URL,
  CAREERS_URL,
  COMPANY,
  CONTACT_URL,
  CUTSHORT_COMPANY_URL,
  HOMEPAGE_URL,
  JOBS_URL,
  LINKEDIN_COMPANY_URL,
  SOURCE,
  createPantheonDigitalScraper,
  extractCompanyPageData,
  hasOfficialAboutSignal,
  hasOfficialContactSignal,
  hasOfficialCutshortSignal,
  hasOfficialHomepageSignal,
} from './script.js'

const homepageHtml = `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <title>Pantheon Digital</title>
      <meta property="og:description" content="Empowering your business with end-to-end digital solutions" />
    </head>
    <body>
      <header>
        <img alt="Pantheon Digitals Logo" src="/Logo.svg" />
        <a href="/Projects">Projects</a>
        <a href="/About">About Us</a>
        <a href="/Contact_Us">Contact Us</a>
      </header>
      <main>
        <p>Welcome to Pantheon Digital, where innovation meets excellence.</p>
      </main>
      <footer>
        <a href="https://www.instagram.com/pantheondigitals/">Instagram</a>
        <a href="https://x.com/PantheonDigi">X</a>
      </footer>
    </body>
  </html>
`

const aboutHtml = `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <title>About Pantheon Digital | Creative Digital Experts &amp; Innovators | Pantheon Digital</title>
      <meta
        name="description"
        content="Meet Pantheon Digitals: a passionate team of digital experts delivering creative solutions"
      />
    </head>
    <body>
      <h1>About Us</h1>
      <p>Welcome to Pantheon Digital, where innovation meets excellence.</p>
      <p>Meet Pantheon Digitals: a passionate team of digital experts delivering creative solutions.</p>
      <a href="/Contact_Us">Contact Us</a>
    </body>
  </html>
`

const contactHtml = `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <title>Pantheon Digital</title>
      <meta
        name="description"
        content="Empowering your business with end-to-end digital solutions—web development, branding, marketing, and software."
      />
    </head>
    <body>
      <main>
        <h1>Contact Us</h1>
        <p>Pantheon Digital</p>
        <p>Empowering your business with end-to-end digital solutions</p>
        <p>This page could not be found.</p>
      </main>
    </body>
  </html>
`

const cutshortData = {
  companyDetails: {
    name: 'pantheon digital',
    alias: 'pantheon-digital-96-46NMdJSa',
    founded: 2017,
    type: 'Products & Services',
    size: '20-100',
    stage: 'Profitable',
    links: {
      website: 'https://pantheondigitals.com',
      about: 'https://pantheondigitals.com/about',
      linkedin: 'https://linkedin.com/company/pantheon-digitals',
      instagram: 'https://instagram.com/pantheondigitals',
      twitter: 'https://twitter.com/pantheondigi',
    },
  },
  companyJobs: {
    jobs: [
      {
        _id: '68639d50a9c58fa0ff1a5f6d',
        publicUrl: 'https://cutshort.io/job/International-Sales-Executive-Delhi-pantheon-digital-CJhfL7as',
        headline: 'International Sales Executive',
        allSkills: ['International sales', 'Business Process Outsourcing (BPO)', 'Lead Generation'],
        locations: ['Delhi'],
        locationsText: 'Delhi',
        companyDetails: {
          alias: 'pantheon-digital-96-46NMdJSa',
          name: 'pantheon digital',
          links: {
            website: 'https://pantheondigitals.com',
            linkedin: 'https://linkedin.com/company/pantheon-digitals',
          },
        },
        expRange: {
          min: 1,
          max: 3,
          minVanity: 1,
          maxVanity: 3,
        },
        sanitizedComment: `
          <p><strong>Sales Role in Australian Energy Process</strong></p>
          <ul>
            <li>Company: Pantheon Digital Pvt. Ltd</li>
            <li>Shift Timing: 05:00 Am to 02:00 Pm</li>
          </ul>
          <p>We at Pantheon Digital are expanding our remote sales team.</p>
        `,
        roleTypes: ['full_time'],
        hiringIntentShownOn: '2025-10-29T08:04:22.045Z',
        authApplyUrl: 'https://cutshort.io/profile/view/j/68639d50a9c58fa0ff1a5f6d',
      },
    ],
    page: 1,
    totalPages: 1,
  },
}

const cutshortHtml = `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <title>pantheon digital careers | 1 pantheon digital Jobs in India | Cutshort</title>
      <meta
        name="description"
        content="Apply to 1 jobs at pantheon digital. Apply for new pantheon digital job vacancies online at Cutshort."
      />
    </head>
    <body>
      <h1>pantheon digital</h1>
      <a href="https://pantheondigitals.com">https://pantheondigitals.com</a>
      <a href="https://linkedin.com/company/pantheon-digitals">LinkedIn</a>
      <h2>Jobs at pantheon digital</h2>
      <script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
    props: {
      pageProps: {
        dehydratedState: {
          queries: [
            {
              queryKey: ['companyPageData', 'pantheon-digital-96-46NMdJSa'],
              state: {
                data: cutshortData,
              },
            },
          ],
        },
      },
    },
    page: '/company/[slug]',
    query: {
      slug: 'pantheon-digital-96-46NMdJSa',
    },
  })}</script>
    </body>
  </html>
`

test('Pantheon Digital verified signals and structured Cutshort payload stay anchored to the official public surfaces', () => {
  assert.equal(SOURCE, 'pantheondigitalpvtltd')
  assert.equal(COMPANY, 'Pantheon Digital Pvt Ltd')
  assert.equal(HOMEPAGE_URL, 'https://pantheondigitals.com/')
  assert.equal(ABOUT_URL, 'https://pantheondigitals.com/About')
  assert.equal(CONTACT_URL, 'https://pantheondigitals.com/Contact_Us')
  assert.equal(CAREERS_URL, 'https://pantheondigitals.com/careers')
  assert.equal(JOBS_URL, 'https://pantheondigitals.com/jobs')
  assert.equal(CUTSHORT_COMPANY_URL, 'https://cutshort.io/company/pantheon-digital-96-46NMdJSa')
  assert.equal(LINKEDIN_COMPANY_URL, 'https://linkedin.com/company/pantheon-digitals')

  assert.equal(hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(hasOfficialAboutSignal(aboutHtml), true)
  assert.equal(hasOfficialContactSignal(contactHtml), true)
  assert.equal(hasOfficialCutshortSignal(cutshortHtml), true)
  assert.deepEqual(extractCompanyPageData(cutshortHtml), cutshortData)
})

test('run returns normalized Pantheon Digital jobs from the official Cutshort company page', async () => {
  const requestedUrls = []

  const jobs = await createPantheonDigitalScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === HOMEPAGE_URL) return homepageHtml
      if (url === ABOUT_URL) return aboutHtml
      if (url === CONTACT_URL) return contactHtml
      if (url === CUTSHORT_COMPANY_URL) return cutshortHtml
      if (url === CAREERS_URL || url === JOBS_URL) {
        throw new Error(`HTTP 404 for ${url}`)
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
    now: () => '2026-07-13T00:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [
    HOMEPAGE_URL,
    ABOUT_URL,
    CONTACT_URL,
    CAREERS_URL,
    JOBS_URL,
    CUTSHORT_COMPANY_URL,
  ])

  assert.deepEqual(jobs, [
    {
      title: 'International Sales Executive',
      company: 'Pantheon Digital Pvt Ltd',
      location: 'Delhi, India',
      city: 'Delhi',
      country: 'India',
      jobId: '68639d50a9c58fa0ff1a5f6d',
      requisitionId: '68639d50a9c58fa0ff1a5f6d',
      sourceUrl: 'https://cutshort.io/job/International-Sales-Executive-Delhi-pantheon-digital-CJhfL7as',
      applyUrl: 'https://cutshort.io/profile/view/j/68639d50a9c58fa0ff1a5f6d',
      employmentType: 'Full-time',
      department: null,
      experienceRequired: '1 - 3 years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: ['International sales', 'Business Process Outsourcing (BPO)', 'Lead Generation'],
      postingDate: '2025-10-29T08:04:22.045Z',
      closingDate: null,
      jobDescription: 'Sales Role in Australian Energy Process Company: Pantheon Digital Pvt. Ltd Shift Timing: 05:00 Am to 02:00 Pm We at Pantheon Digital are expanding our remote sales team.',
      source: 'pantheondigitalpvtltd',
      link: 'https://cutshort.io/job/International-Sales-Executive-Delhi-pantheon-digital-CJhfL7as',
      scrapedAt: '2026-07-13T00:00:00.000Z',
    },
  ])
})

test('run fails closed when the first-party site or official Cutshort handoff drifts', async () => {
  await assert.rejects(
    createPantheonDigitalScraper().run({
      fetchText: async (url) => {
        if (url === HOMEPAGE_URL) return '<html><body><h1>Unexpected homepage</h1></body></html>'
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified homepage/i,
  )

  await assert.rejects(
    createPantheonDigitalScraper().run({
      fetchText: async (url) => {
        if (url === HOMEPAGE_URL) return homepageHtml
        if (url === ABOUT_URL) return aboutHtml
        if (url === CONTACT_URL) return contactHtml
        if (url === CAREERS_URL) return '<html><body><h1>Now hiring</h1></body></html>'
        if (url === JOBS_URL) throw new Error(`HTTP 404 for ${url}`)
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /first-party jobs surface changed/i,
  )

  await assert.rejects(
    createPantheonDigitalScraper().run({
      fetchText: async (url) => {
        if (url === HOMEPAGE_URL) return homepageHtml
        if (url === ABOUT_URL) return aboutHtml
        if (url === CONTACT_URL) return contactHtml
        if (url === CAREERS_URL || url === JOBS_URL) {
          throw new Error(`HTTP 404 for ${url}`)
        }
        if (url === CUTSHORT_COMPANY_URL) {
          return cutshortHtml.replace(
            '"website":"https://pantheondigitals.com"',
            '"website":"https://example.com"',
          )
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /official cutshort surface/i,
  )
})

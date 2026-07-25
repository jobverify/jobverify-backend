import assert from 'node:assert/strict'
import test from 'node:test'

import {
  BAMBOOHR_CV_URL,
  CAREERS_URL,
  COMPANY,
  HOMEPAGE_URL,
  INDIA_URL,
  SOURCE,
  WORKING_AT_SBD_URL,
  createSbdAutomotiveScraper,
  extractBambooHrCareerLinks,
  hasOfficialCareersSignal,
  hasOfficialHomepageSignal,
  hasOfficialIndiaSignal,
  hasOfficialWorkingAtSbdSignal,
  hasOnlyVerifiedCvHandoff,
  hasPublicJobsSignal,
} from './script.js'

const homepageHtml = `
  <html>
    <body>
      <h1>SBD Automotive</h1>
      <p>A global team of research and consulting experts helping our industry deliver Safe, Secure, Sustainable & Seamless mobility.</p>
    </body>
  </html>
`

const indiaHtml = `
  <html>
    <head>
      <title>India | SBD Automotive</title>
    </head>
    <body>
      <h1>SBD Automotive Bengaluru, India</h1>
      <p>Founded by Abhishek Visveswaran in 2015, the talented team that makes up our India office is responsible for designing and building the foundations and infrastructure that much of our data, reports and software are built upon.</p>
      <p>SBD Automotive India Team</p>
    </body>
  </html>
`

const careersHtml = `
  <html>
    <head>
      <title>Careers | SBD Automotive</title>
    </head>
    <body>
      <h1>SBD Automotive Careers</h1>
      <p>Help us shape the future of the automotive industry and unlock your potential with a career at SBD Automotive.</p>
      <p>We're hiring</p>
    </body>
  </html>
`

const workingHtml = `
  <html>
    <head>
      <title>Working at SBD | SBD Automotive</title>
    </head>
    <body>
      <h2>Take a look at our current vacancies</h2>
      <p>Browse our up-to-date careers page to find your potential next role.</p>
      <h2>Don't see the role you're looking for?</h2>
      <p>Submit your CV</p>
      <a href="${BAMBOOHR_CV_URL}">Submit your CV</a>
    </body>
  </html>
`

const publicJobsHtml = `
  <html>
    <head>
      <title>Working at SBD | SBD Automotive</title>
    </head>
    <body>
      <h2>Take a look at our current vacancies</h2>
      <p>Browse our up-to-date careers page to find your potential next role.</p>
      <h2>Don't see the role you're looking for?</h2>
      <p>Submit your CV</p>
      <a href="${BAMBOOHR_CV_URL}">Submit your CV</a>
      <h1>Current Openings</h1>
      <a href="https://sbdautomotive.bamboohr.com/careers/102">Apply now</a>
    </body>
  </html>
`

test('SBD Automotive sentinel stays pinned to the official homepage, India page, careers shell, and BambooHR CV handoff', () => {
  assert.equal(SOURCE, 'sbdautomotive')
  assert.equal(COMPANY, 'SBD Automotive')
  assert.equal(HOMEPAGE_URL, 'https://www.sbdautomotive.com/')
  assert.equal(INDIA_URL, 'https://www.sbdautomotive.com/india')
  assert.equal(CAREERS_URL, 'https://www.sbdautomotive.com/careers-vacancies')
  assert.equal(WORKING_AT_SBD_URL, 'https://www.sbdautomotive.com/working-at-sbd')
  assert.equal(BAMBOOHR_CV_URL, 'https://sbdautomotive.bamboohr.com/careers/91')
  assert.equal(hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(hasOfficialIndiaSignal(indiaHtml), true)
  assert.equal(hasOfficialCareersSignal(careersHtml), true)
  assert.equal(hasOfficialWorkingAtSbdSignal(workingHtml), true)
  assert.deepEqual(extractBambooHrCareerLinks(workingHtml), [BAMBOOHR_CV_URL])
  assert.equal(hasOnlyVerifiedCvHandoff(workingHtml), true)
  assert.equal(hasPublicJobsSignal(careersHtml), false)
  assert.equal(hasPublicJobsSignal(publicJobsHtml), true)
})

test('run returns an empty list when SBD Automotive exposes only the verified careers shell and single CV handoff', async () => {
  const requestedUrls = []
  const scraper = createSbdAutomotiveScraper()

  const jobs = await scraper.run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === HOMEPAGE_URL) {
        return { status: 200, url, html: homepageHtml }
      }

      if (url === INDIA_URL) {
        return { status: 200, url, html: indiaHtml }
      }

      if (url === CAREERS_URL) {
        return { status: 200, url, html: careersHtml }
      }

      if (url === WORKING_AT_SBD_URL) {
        return { status: 200, url, html: workingHtml }
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [HOMEPAGE_URL, INDIA_URL, CAREERS_URL, WORKING_AT_SBD_URL])
  assert.deepEqual(jobs, [])
})

test('run fails closed when SBD Automotive starts exposing public job links instead of the verified CV handoff', async () => {
  const scraper = createSbdAutomotiveScraper()

  await assert.rejects(
    scraper.run({
      fetchPage: async (url) => {
        if (url === HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
        if (url === INDIA_URL) return { status: 200, url, html: indiaHtml }
        if (url === CAREERS_URL) return { status: 200, url, html: careersHtml }
        if (url === WORKING_AT_SBD_URL) return { status: 200, url, html: publicJobsHtml }
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified BambooHR CV handoff|rendered public jobs/i,
  )
})

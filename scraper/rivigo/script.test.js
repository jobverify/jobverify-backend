import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREERS_URL,
  HOMEPAGE_URL,
  PARENT_DARWINBOX_URL,
  REDIRECTED_HOMEPAGE_URL,
  createRivigoScraper,
  hasVerifiedParentCareersSignal,
  hasVerifiedParentDarwinboxSignal,
  hasVerifiedRedirectedHomepageSignal,
} from './script.js'

const redirectedHomepageHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>B2B Express Services: Fastest Courier &amp; Parcel Deliveries</title>
  </head>
  <body>
    <header>
      <a href="https://mahindralogistics.com/work-with-us/">Work With Us</a>
    </header>
    <main>
      <h1>B2B Express That Delivers — Every Single Time</h1>
      <p>Mahindra Logistics serves customers across India.</p>
    </main>
  </body>
</html>
`

const parentCareersHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Work With Us - Mahindra Logistics</title>
  </head>
  <body>
    <main>
      <h1>Work With Us: Igniting Mutual Success &amp; Growth</h1>
      <p>
        Whether you are a seasoned professional or just starting your career, we have a diverse range of job
        opportunities available.
      </p>
      <a href="https://nectar.darwinbox.in/ms/candidate/careers" target="_blank" rel="noopener">
        Explore Opportunities
      </a>
    </main>
  </body>
</html>
`

const parentDarwinboxHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Mahindra Logistics and Subsidiaries</title>
  </head>
  <body>
    <main>
      <a href="https://nectar.darwinbox.in/ms/candidatev2/main/careers/allJobs">Open Jobs</a>
      <p>We Have 31 Open Jobs</p>
    </main>
  </body>
</html>
`

test('Rivigo recognizes the verified Mahindra redirect and parent-company handoff surfaces', () => {
  assert.equal(
    hasVerifiedRedirectedHomepageSignal({
      url: REDIRECTED_HOMEPAGE_URL,
      html: redirectedHomepageHtml,
    }),
    true,
  )

  assert.equal(
    hasVerifiedParentCareersSignal({
      url: CAREERS_URL,
      html: parentCareersHtml,
    }),
    true,
  )

  assert.equal(
    hasVerifiedParentDarwinboxSignal({
      url: 'https://nectar.darwinbox.in/ms/candidatev2/main/careers/home',
      html: parentDarwinboxHtml,
    }),
    true,
  )
})

test('Rivigo returns no jobs when the official brand only hands off to the parent-company board', async () => {
  const requestedUrls = []

  const jobs = await createRivigoScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === HOMEPAGE_URL) {
        return {
          status: 200,
          url: REDIRECTED_HOMEPAGE_URL,
          html: redirectedHomepageHtml,
        }
      }

      if (url === CAREERS_URL) {
        return {
          status: 200,
          url: CAREERS_URL,
          html: parentCareersHtml,
        }
      }

      if (url === PARENT_DARWINBOX_URL) {
        return {
          status: 200,
          url: 'https://nectar.darwinbox.in/ms/candidatev2/main/careers/home',
          html: parentDarwinboxHtml,
        }
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    HOMEPAGE_URL,
    CAREERS_URL,
    PARENT_DARWINBOX_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('Rivigo fails closed when the parent-company handoff changes materially', async () => {
  await assert.rejects(
    createRivigoScraper().run({
      fetchPage: async (url) => {
        if (url === HOMEPAGE_URL) {
          return {
            status: 200,
            url: REDIRECTED_HOMEPAGE_URL,
            html: redirectedHomepageHtml,
          }
        }

        if (url === CAREERS_URL) {
          return {
            status: 200,
            url: CAREERS_URL,
            html: parentCareersHtml.replace(
              'https://nectar.darwinbox.in/ms/candidate/careers',
              'https://boards.greenhouse.io/mahindralogistics',
            ),
          }
        }

        return {
          status: 200,
          url: 'https://nectar.darwinbox.in/ms/candidatev2/main/careers/home',
          html: parentDarwinboxHtml,
        }
      },
    }),
    /parent-company careers handoff/i,
  )

  await assert.rejects(
    createRivigoScraper().run({
      fetchPage: async (url) => {
        if (url === HOMEPAGE_URL) {
          return {
            status: 200,
            url: REDIRECTED_HOMEPAGE_URL,
            html: redirectedHomepageHtml,
          }
        }

        if (url === CAREERS_URL) {
          return {
            status: 200,
            url: CAREERS_URL,
            html: parentCareersHtml,
          }
        }

        return {
          status: 200,
          url: 'https://nectar.darwinbox.in/ms/candidatev2/main/careers/home',
          html: parentDarwinboxHtml.replace(
            'Mahindra Logistics and Subsidiaries',
            'Rivigo Careers',
          ),
        }
      },
    }),
    /parent-company Darwinbox board/i,
  )
})

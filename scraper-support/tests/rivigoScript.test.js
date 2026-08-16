import assert from 'node:assert/strict'
import test from 'node:test'

const redirectedHomepagePage = {
  url: 'https://mahindralogistics.com/b2b-express/',
  html: `
    <!doctype html>
    <html lang="en">
      <head>
        <title>B2B Express Services: Fastest Courier & Parcel Deliveries</title>
      </head>
      <body>
        <main>
          <h1>B2B Express That Delivers</h1>
          <p>Mahindra Logistics helps businesses move parcels quickly.</p>
        </main>
      </body>
    </html>
  `,
}

const parentCareersPage = {
  url: 'https://mahindralogistics.com/work-with-us/',
  html: `
    <!doctype html>
    <html lang="en">
      <head>
        <title>Work With Us - Mahindra Logistics</title>
      </head>
      <body>
        <main>
          <h1>Work With Us: Igniting Mutual Success & Growth</h1>
          <a href="https://nectar.darwinbox.in/ms/candidate/careers">Apply now</a>
        </main>
      </body>
    </html>
  `,
}

const parentDarwinboxPage = {
  url: 'https://nectar.darwinbox.in/ms/candidatev2/main/careers/home',
  html: `
    <!doctype html>
    <html lang="en">
      <head>
        <title>Mahindra Logistics and Subsidiaries</title>
      </head>
      <body>
        <main>
          <h1>Mahindra Logistics and Subsidiaries</h1>
          <p>We Have 52 Open Jobs</p>
          <p>Open Jobs</p>
        </main>
      </body>
    </html>
  `,
}

const parentDarwinboxJavascriptShellPage = {
  url: 'https://nectar.darwinbox.in/ms/candidate/careers',
  html: `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <title></title>
        <base href="/ms/candidate/">
      </head>
      <body>
        <noscript>Please enable Javascript!</noscript>
        <script src="runtime-es2015.darwinbox.js"></script>
      </body>
    </html>
  `,
}

const loadRivigoModule = async () => {
  try {
    return await import('../../scraper/rivigo/script.js')
  } catch {
    assert.fail('Expected Rivigo scraper module at ../../scraper/rivigo/script.js')
  }
}

test('Rivigo helper signals stay pinned to the verified Mahindra Logistics redirect and parent-company handoff surface', async () => {
  const rivigo = await loadRivigoModule()

  assert.equal(rivigo.SOURCE, 'rivigo')
  assert.equal(rivigo.COMPANY, 'Rivigo')
  assert.equal(rivigo.HOMEPAGE_URL, 'https://mahindralogistics.com/b2b-express/')
  assert.equal(rivigo.REDIRECTED_HOMEPAGE_URL, 'https://mahindralogistics.com/b2b-express/')
  assert.equal(rivigo.CAREERS_URL, 'https://mahindralogistics.com/work-with-us/')
  assert.equal(rivigo.PARENT_DARWINBOX_URL, 'https://nectar.darwinbox.in/ms/candidate/careers')
  assert.equal(
    rivigo.PARENT_DARWINBOX_HOME_URL,
    'https://nectar.darwinbox.in/ms/candidatev2/main/careers/home',
  )
  assert.equal(rivigo.VERIFIED_ON, '2026-08-04')
  assert.equal(rivigo.hasVerifiedRedirectedHomepageSignal(redirectedHomepagePage), true)
  assert.equal(rivigo.hasVerifiedParentCareersSignal(parentCareersPage), true)
  assert.equal(rivigo.hasVerifiedParentDarwinboxSignal(parentDarwinboxPage), true)
  assert.equal(rivigo.hasVerifiedParentDarwinboxSignal(parentDarwinboxJavascriptShellPage), true)
})

test('Rivigo returns [] while the verified brand redirect and parent-company careers handoff remain intact', async () => {
  const rivigo = await loadRivigoModule()
  const requestedUrls = []

  const jobs = await rivigo.createRivigoScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === rivigo.HOMEPAGE_URL) {
        return {
          status: 200,
          ...redirectedHomepagePage,
        }
      }

      if (url === rivigo.CAREERS_URL) {
        return {
          status: 200,
          ...parentCareersPage,
        }
      }

      if (url === rivigo.PARENT_DARWINBOX_URL) {
        return {
          status: 200,
          ...parentDarwinboxJavascriptShellPage,
        }
      }

      throw new Error(`Unexpected Rivigo fixture URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    rivigo.HOMEPAGE_URL,
    rivigo.CAREERS_URL,
    rivigo.PARENT_DARWINBOX_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('Rivigo fails closed when the verified redirect, careers handoff, or parent-company board drifts', async () => {
  const rivigo = await loadRivigoModule()

  await assert.rejects(
    rivigo.createRivigoScraper().run({
      fetchPage: async () => ({
        status: 200,
        url: rivigo.HOMEPAGE_URL,
        html: '<html><head><title>Unexpected</title></head><body>No verified markers</body></html>',
      }),
    }),
    /B2B Express landing/i,
  )

  await assert.rejects(
    rivigo.createRivigoScraper().run({
      fetchPage: async (url) => {
        if (url === rivigo.HOMEPAGE_URL) {
          return {
            status: 200,
            ...redirectedHomepagePage,
          }
        }

        return {
          status: 200,
          url: rivigo.CAREERS_URL,
          html: parentCareersPage.html.replace('https://nectar.darwinbox.in/ms/candidate/careers', '/missing'),
        }
      },
    }),
    /parent-company careers handoff/i,
  )

  await assert.rejects(
    rivigo.createRivigoScraper().run({
      fetchPage: async (url) => {
        if (url === rivigo.HOMEPAGE_URL) {
          return {
            status: 200,
            ...redirectedHomepagePage,
          }
        }

        if (url === rivigo.CAREERS_URL) {
          return {
            status: 200,
            ...parentCareersPage,
          }
        }

        return {
          status: 200,
          url: rivigo.PARENT_DARWINBOX_HOME_URL,
          html: parentDarwinboxPage.html.replace('Mahindra Logistics and Subsidiaries', 'Different Board'),
        }
      },
    }),
    /parent-company Darwinbox board/i,
  )
})

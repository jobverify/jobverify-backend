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
      <title>Astronics Test Systems - Test Solutions for Maintenance</title>
    </head>
    <body>
      <main>
        <h1>Diagnosys is now part of Astronics Test Systems</h1>
        <p>Serving aerospace and defense customers worldwide.</p>
        <p>Bangalore, India</p>
      </main>
      <footer>
        <p>© Astronics Test Systems</p>
      </footer>
    </body>
  </html>
`

const careersHtml = `
  <!doctype html>
  <html lang="en">
    <head>
      <title>Astronics Careers</title>
    </head>
    <body>
      <main>
        <h1>Careers at Astronics</h1>
        <a href="/us-jobs">Search U.S. Jobs</a>
      </main>
    </body>
  </html>
`

const jobsHtml = `
  <!doctype html>
  <html lang="en">
    <head>
      <title>Search U.S. Jobs | Astronics</title>
    </head>
    <body>
      <main>
        <h1>Search U.S. Jobs</h1>
        <iframe src="https://www2.appone.com/Search/Search.aspx?ServerVar=astronics.appone.com"></iframe>
      </main>
    </body>
  </html>
`

const currentCountryLimitedJobsHtml = `
  <!doctype html>
  <html lang="en">
    <head>
      <title>Astronics Jobs in the United States</title>
    </head>
    <body>
      <main>
        <h1>Astronics Career Search</h1>
        <h2>United States</h2>
        <a href="https://www.astronics.com/canada-jobs">Search for Jobs in Canada</a>
        <a href="https://francejobs.astronics.com/">Search for Jobs in France</a>
        <p>The search application that will load below shows current job openings for all locations in the United States.</p>
        <p>Your browser does not support iframes.</p>
      </main>
    </body>
  </html>
`

const apponeHtml = `
  <!doctype html>
  <html lang="en">
    <head>
      <title>Astronics Jobs</title>
    </head>
    <body>
      <form>
        <input type="hidden" name="ServerVar" value="astronics.appone.com" />
        <p>Powered by myStaffingPro Applicant Tracking System</p>
        <select name="LocationID">
          <option value="0">Select a location</option>
          <option value="1001">New Hampshire, Nashua</option>
          <option value="1002">Québec, Montréal</option>
          <option value="1003">France, Cluses</option>
        </select>
      </form>
    </body>
  </html>
`

test('Astronics validates the Diagnosys homepage bridge and AppOne board without India locations', async () => {
  const astronics = await loadModule()
  assert.ok(astronics, 'Astronics scraper module should load')

  assert.equal(astronics.SOURCE, 'astronics')
  assert.equal(astronics.COMPANY, 'Astronics Test Systems')
  assert.equal(astronics.HOMEPAGE_URL, 'https://www.diagnosys.com/')
  assert.equal(astronics.CAREERS_URL, 'https://www.astronics.com/careers')
  assert.equal(astronics.JOBS_URL, 'https://www.astronics.com/us-jobs')
  assert.equal(astronics.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(astronics.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(
    astronics.extractJobsPageUrl(careersHtml),
    'https://www.astronics.com/us-jobs',
  )
  assert.equal(
    astronics.extractEmbeddedJobsUrl(jobsHtml),
    'https://www2.appone.com/Search/Search.aspx?ServerVar=astronics.appone.com',
  )
  assert.equal(astronics.hasVerifiedApponeLandingPage(apponeHtml), true)
  assert.deepEqual(astronics.extractLocationOptions(apponeHtml), [
    { value: '1001', label: 'New Hampshire, Nashua' },
    { value: '1002', label: 'Québec, Montréal' },
    { value: '1003', label: 'France, Cluses' },
  ])
  assert.equal(astronics.hasIndiaLocationOptions(astronics.extractLocationOptions(apponeHtml)), false)
})

test('Astronics returns no jobs while the verified AppOne board exposes no India locations', async () => {
  const astronics = await loadModule()
  assert.ok(astronics, 'Astronics scraper module should load')

  const requestedUrls = []
  const jobs = await astronics.createAstronicsScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === astronics.HOMEPAGE_URL) return homepageHtml
      if (url === astronics.CAREERS_URL) return careersHtml
      if (url === astronics.JOBS_URL) return jobsHtml
      if (url === 'https://www2.appone.com/Search/Search.aspx?ServerVar=astronics.appone.com') {
        return apponeHtml
      }

      throw new Error(`Unexpected Astronics URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    'https://www.diagnosys.com/',
    'https://www.astronics.com/careers',
    'https://www.astronics.com/us-jobs',
    'https://www2.appone.com/Search/Search.aspx?ServerVar=astronics.appone.com',
  ])
  assert.deepEqual(jobs, [])
})

test('Astronics returns no jobs when the current public jobs page is country-limited outside India without an embedded AppOne board', async () => {
  const astronics = await loadModule()
  assert.ok(astronics, 'Astronics scraper module should load')

  const requestedUrls = []
  const jobs = await astronics.createAstronicsScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === astronics.HOMEPAGE_URL) return homepageHtml
      if (url === astronics.CAREERS_URL) return careersHtml
      if (url === astronics.JOBS_URL) return currentCountryLimitedJobsHtml

      throw new Error(`Unexpected Astronics URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    'https://www.diagnosys.com/',
    'https://www.astronics.com/careers',
    'https://www.astronics.com/us-jobs',
  ])
  assert.deepEqual(jobs, [])
})

test('Astronics fails closed when the verified bridge or AppOne board contract changes', async () => {
  const astronics = await loadModule()
  assert.ok(astronics, 'Astronics scraper module should load')

  await assert.rejects(
    astronics.createAstronicsScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected homepage</h1></body></html>',
    }),
    /verified Diagnosys homepage/i,
  )

  await assert.rejects(
    astronics.createAstronicsScraper().run({
      fetchText: async (url) => {
        if (url === astronics.HOMEPAGE_URL) return homepageHtml
        if (url === astronics.CAREERS_URL) return '<html><body><h1>Unexpected careers page</h1></body></html>'
        throw new Error(`Unexpected Astronics URL: ${url}`)
      },
    }),
    /verified Astronics careers page/i,
  )

  await assert.rejects(
    astronics.createAstronicsScraper().run({
      fetchText: async (url) => {
        if (url === astronics.HOMEPAGE_URL) return homepageHtml
        if (url === astronics.CAREERS_URL) return careersHtml
        if (url === astronics.JOBS_URL) return jobsHtml
        return apponeHtml.replace(
          '</select>',
          '<option value="2001">Karnataka, Bangalore</option></select>',
        )
      },
    }),
    /now exposes india locations/i,
  )
})

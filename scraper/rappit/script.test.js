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
    <title>Rappit</title>
  </head>
  <body>
    <main>
      <h1>Rappit</h1>
      <p>Business apps powered by low-code velocity.</p>
      <a href="https://rappit.io/about-us/">About Us</a>
    </main>
  </body>
</html>
`

const aboutHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>About Us | Rappit</title>
  </head>
  <body>
    <main>
      <h1>About Us</h1>
      <p>Vanenburg Software started in 2009.</p>
      <p>Vanenburg rebrands to Rappit in 2024.</p>
    </main>
  </body>
</html>
`

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers | Rappit</title>
  </head>
  <body>
    <main>
      <h1>Careers</h1>
      <a href="https://rappit.io/vacancies/">Vacancies</a>
    </main>
  </body>
</html>
`

const vacanciesHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Vacancies | Rappit</title>
  </head>
  <body>
    <main>
      <h1>Job Openings</h1>
      <p>0 vacancies</p>
    </main>
  </body>
</html>
`

test('Rappit validates the verified homepage, rebrand about page, careers page, and empty vacancies board', async () => {
  const rappit = await loadModule()
  assert.ok(rappit, 'Rappit scraper module should load')

  assert.equal(rappit.SOURCE, 'rappit')
  assert.equal(rappit.COMPANY, 'Rappit')
  assert.equal(rappit.HOMEPAGE_URL, 'https://rappit.io/')
  assert.equal(rappit.ABOUT_URL, 'https://rappit.io/about-us/')
  assert.equal(rappit.CAREERS_URL, 'https://rappit.io/about-us/careers/')
  assert.equal(rappit.VACANCIES_URL, 'https://rappit.io/vacancies/')
  assert.equal(rappit.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(rappit.hasRebrandAboutSignal(aboutHtml), true)
  assert.equal(rappit.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(rappit.hasEmptyVacanciesSignal(vacanciesHtml), true)
})

test('Rappit run returns an empty list while the verified first-party vacancies board shows zero vacancies', async () => {
  const rappit = await loadModule()
  assert.ok(rappit, 'Rappit scraper module should load')

  const requestedUrls = []
  const jobs = await rappit.createRappitScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)
      if (url === rappit.HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
      if (url === rappit.ABOUT_URL) return { status: 200, url, html: aboutHtml }
      if (url === rappit.CAREERS_URL) return { status: 200, url, html: careersHtml }
      if (url === rappit.VACANCIES_URL) return { status: 200, url, html: vacanciesHtml }
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    rappit.HOMEPAGE_URL,
    rappit.ABOUT_URL,
    rappit.CAREERS_URL,
    rappit.VACANCIES_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('Rappit fails closed when the homepage, rebrand proof, careers page, or vacancies state drifts', async () => {
  const rappit = await loadModule()
  assert.ok(rappit, 'Rappit scraper module should load')

  await assert.rejects(
    rappit.createRappitScraper().run({
      fetchPage: async (url) => {
        if (url === rappit.HOMEPAGE_URL) return { status: 200, url, html: '<html><body><h1>Placeholder</h1></body></html>' }
        if (url === rappit.ABOUT_URL) return { status: 200, url, html: aboutHtml }
        if (url === rappit.CAREERS_URL) return { status: 200, url, html: careersHtml }
        if (url === rappit.VACANCIES_URL) return { status: 200, url, html: vacanciesHtml }
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /homepage/i,
  )

  await assert.rejects(
    rappit.createRappitScraper().run({
      fetchPage: async (url) => {
        if (url === rappit.HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
        if (url === rappit.ABOUT_URL) return { status: 200, url, html: '<html><body><h1>About</h1></body></html>' }
        if (url === rappit.CAREERS_URL) return { status: 200, url, html: careersHtml }
        if (url === rappit.VACANCIES_URL) return { status: 200, url, html: vacanciesHtml }
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /about page/i,
  )

  await assert.rejects(
    rappit.createRappitScraper().run({
      fetchPage: async (url) => {
        if (url === rappit.HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
        if (url === rappit.ABOUT_URL) return { status: 200, url, html: aboutHtml }
        if (url === rappit.CAREERS_URL) return { status: 200, url, html: '<html><body><h1>Careers</h1></body></html>' }
        if (url === rappit.VACANCIES_URL) return { status: 200, url, html: vacanciesHtml }
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /careers page/i,
  )

  await assert.rejects(
    rappit.createRappitScraper().run({
      fetchPage: async (url) => {
        if (url === rappit.HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
        if (url === rappit.ABOUT_URL) return { status: 200, url, html: aboutHtml }
        if (url === rappit.CAREERS_URL) return { status: 200, url, html: careersHtml }
        if (url === rappit.VACANCIES_URL) {
          return {
            status: 200,
            url,
            html: '<html><body><h1>Job Openings</h1><a href="/vacancies/platform-engineer">Platform Engineer</a></body></html>',
          }
        }
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /vacancies page/i,
  )
})

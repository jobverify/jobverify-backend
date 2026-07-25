import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Getmyuni - Discover Colleges, Courses, Exams, and More</title>
  </head>
  <body>
    <header>
      <a href="/">Getmyuni</a>
      <nav>
        <a href="/careers">Careers</a>
        <a href="/contact-us">Contact Us</a>
      </nav>
    </header>
    <main>
      <h1>Discover Colleges, Courses, Exams, and More</h1>
      <p>India's trusted college discovery platform.</p>
    </main>
  </body>
</html>
`

const contactUsHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Contact Us | Getmyuni</title>
  </head>
  <body>
    <h1>Get in Touch</h1>
    <p>Want to work with us? contact@getmyuni.com</p>
    <p>We would love to hear from you.</p>
  </body>
</html>
`

const informationalCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers | Getmyuni</title>
  </head>
  <body>
    <h1>Careers</h1>
    <p>Explore careers after 12th, graduation, engineering, MBA, and BCom.</p>
    <p>Learn about career options, entrance exams, and education planning.</p>
  </body>
</html>
`

const publicJobsHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Jobs | Getmyuni</title>
  </head>
  <body>
    <h1>Current Openings</h1>
    <a href="https://jobs.lever.co/getmyuni/apply">Apply now</a>
  </body>
</html>
`

const loadGetMyUniModule = async () => {
  try {
    return await import('../getmyuni/script.js')
  } catch {
    assert.fail('Expected GetMyUni scraper module at ../getmyuni/script.js')
  }
}

test('GetMyUni sentinel pins the verified homepage, contact-us page, and informational careers route', async () => {
  const getMyUni = await loadGetMyUniModule()

  assert.equal(getMyUni.SOURCE, 'getmyuni')
  assert.equal(getMyUni.COMPANY, 'GetMyUni')
  assert.equal(getMyUni.HOMEPAGE_URL, 'https://www.getmyuni.com/')
  assert.equal(getMyUni.CONTACT_US_URL, 'https://www.getmyuni.com/contact-us')
  assert.equal(getMyUni.CAREERS_INFO_URL, 'https://www.getmyuni.com/careers')
  assert.equal(getMyUni.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(getMyUni.hasContactUsWorkWithUsSignal(contactUsHtml), true)
  assert.equal(getMyUni.hasInformationalCareersSignal(informationalCareersHtml), true)
  assert.equal(getMyUni.hasPublicJobsSignal(homepageHtml), false)
  assert.equal(getMyUni.hasPublicJobsSignal(publicJobsHtml), true)
})

test('GetMyUni returns no jobs only while the verified first-party empty state remains unchanged', async () => {
  const getMyUni = await loadGetMyUniModule()
  const requested = []

  const jobs = await getMyUni.createGetMyUniScraper().run({
    fetchText: async (url) => {
      requested.push(url)

      if (url === getMyUni.HOMEPAGE_URL) return homepageHtml
      if (url === getMyUni.CONTACT_US_URL) return contactUsHtml
      if (url === getMyUni.CAREERS_INFO_URL) return informationalCareersHtml

      throw new Error(`Unexpected GetMyUni fixture URL: ${url}`)
    },
  })

  assert.deepEqual(requested, [
    getMyUni.HOMEPAGE_URL,
    getMyUni.CONTACT_US_URL,
    getMyUni.CAREERS_INFO_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('GetMyUni fails closed when the homepage, contact page, or careers route drifts into a public jobs surface', async () => {
  const getMyUni = await loadGetMyUniModule()

  await assert.rejects(
    getMyUni.createGetMyUniScraper().run({
      fetchText: async (url) => {
        if (url === getMyUni.HOMEPAGE_URL) {
          return '<html><body><h1>Unexpected</h1></body></html>'
        }

        throw new Error(`Unexpected GetMyUni fixture URL: ${url}`)
      },
    }),
    /verified getmyuni homepage/i,
  )

  await assert.rejects(
    getMyUni.createGetMyUniScraper().run({
      fetchText: async (url) => {
        if (url === getMyUni.HOMEPAGE_URL) return homepageHtml
        if (url === getMyUni.CONTACT_US_URL) return publicJobsHtml
        throw new Error(`Unexpected GetMyUni fixture URL: ${url}`)
      },
    }),
    /contact-us page no longer matches the verified work-with-us surface/i,
  )

  await assert.rejects(
    getMyUni.createGetMyUniScraper().run({
      fetchText: async (url) => {
        if (url === getMyUni.HOMEPAGE_URL) return homepageHtml
        if (url === getMyUni.CONTACT_US_URL) return contactUsHtml
        if (url === getMyUni.CAREERS_INFO_URL) return publicJobsHtml
        throw new Error(`Unexpected GetMyUni fixture URL: ${url}`)
      },
    }),
    /informational careers route no longer matches the verified no-public-jobs surface/i,
  )
})

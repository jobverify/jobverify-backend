import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Digital Nirvana: AI and Media Intelligence Solutions</title>
  </head>
  <body>
    <main>
      <h1>Automate Workflows, Streamline Operations, Comply with Regulations, & Drive Insights with AI</h1>
      <p>Digital Nirvana delivers knowledge management solutions, business process automation, and AI-based workflows.</p>
      <footer>
        <h3>Contact Us</h3>
        <p>Support Email : support@digital-nirvana.com</p>
        <p>Careers</p>
        <p>Locations: Fremont, USA Hyderabad, India</p>
      </footer>
      <section class="career-fragment">
        <h4>Required skill set:</h4>
        <ul>
          <li>Exceptional audio sensitivity.</li>
          <li>Good comprehension skills.</li>
        </ul>
        <span>Apply Now</span>
      </section>
      <section class="career-fragment">
        <h4>Required skill set:</h4>
        <ul>
          <li>7+ years of Linux or Unix OS experience.</li>
          <li>Must have working knowledge in AWS or other Cloud computing.</li>
        </ul>
        <span>Apply Now</span>
      </section>
    </main>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/digitalnirvanainformationsystems/script.js')
  } catch {
    assert.fail('Expected Digital Nirvana Information Systems scraper module at ../../scraper/digitalnirvanainformationsystems/script.js')
  }
}

test('Digital Nirvana Information Systems helpers stay pinned to the verified homepage careers fragments from Friday, July 17, 2026', async () => {
  const digitalNirvana = await loadModule()

  assert.equal(digitalNirvana.SOURCE, 'digitalnirvanainformationsystems')
  assert.equal(digitalNirvana.COMPANY, 'Digital Nirvana Information Systems')
  assert.equal(digitalNirvana.HOMEPAGE_URL, 'https://digital-nirvana.com/')
  assert.equal(digitalNirvana.VERIFIED_ON, '2026-07-17')
  assert.equal(digitalNirvana.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(digitalNirvana.hasEmbeddedCareersFragments(homepageHtml), true)
  assert.equal(digitalNirvana.pageExposesStructuredJobListings(homepageHtml), false)
})

test('Digital Nirvana Information Systems returns no jobs while only unstructured homepage careers fragments are publicly exposed', async () => {
  const digitalNirvana = await loadModule()
  const requestedUrls = []

  const jobs = await digitalNirvana.createDigitalNirvanaInformationSystemsScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === digitalNirvana.HOMEPAGE_URL) return homepageHtml
      throw new Error(`Unexpected Digital Nirvana URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [digitalNirvana.HOMEPAGE_URL])
  assert.deepEqual(jobs, [])
})

test('Digital Nirvana Information Systems fails closed when the homepage identity changes or a structured careers surface appears', async () => {
  const digitalNirvana = await loadModule()

  await assert.rejects(
    digitalNirvana.createDigitalNirvanaInformationSystemsScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected</h1></body></html>',
    }),
    /verified Digital Nirvana homepage/i,
  )

  await assert.rejects(
    digitalNirvana.createDigitalNirvanaInformationSystemsScraper().run({
      fetchText: async () => homepageHtml.replace(
        '<span>Apply Now</span>',
        '<a href="https://digital-nirvana.com/careers/linux-systems-administrator">Apply Now</a>',
      ),
    }),
    /structured public job listings/i,
  )
})

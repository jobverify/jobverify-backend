import assert from 'node:assert/strict'
import test from 'node:test'

const loadCourse5iModule = async () => {
  try {
    return await import('../../scraper/course5i/script.js')
  } catch {
    assert.fail('Expected Course5i scraper module at ../../scraper/scraper/course5i/script.js')
  }
}

const careerPageHtml = `
  <html>
    <head><title>C5i Careers</title></head>
    <body>
      <h1>Find Your Flourish. Ignite Your Impact.</h1>
      <h2>Careers with C5i</h2>
      <p>If you meet our position requirements, email your resume and cover letter to careers@c5i.ai.</p>
    </body>
  </html>
`

test('run returns no jobs when Course5i publishes email applications without public opening records', async () => {
  const course5i = await loadCourse5iModule()
  const requestedUrls = []

  assert.equal(course5i.hasCareerPageSignal(careerPageHtml), true)

  const jobs = await course5i.createCourse5iScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      assert.equal(url, course5i.CAREER_PAGE_URL)
      return careerPageHtml
    },
  })

  assert.deepEqual(requestedUrls, [course5i.CAREER_PAGE_URL])
  assert.deepEqual(jobs, [])
})

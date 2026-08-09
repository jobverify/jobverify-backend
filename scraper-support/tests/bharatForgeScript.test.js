import assert from 'node:assert/strict'
import test from 'node:test'

const loadBharatForgeModule = async () => {
  try {
    return await import('../../scraper/bharatforge/script.js')
  } catch {
    return null
  }
}

const careerPageHtml = `
<!DOCTYPE html>
<html>
  <body>
    <section class="career-form">
      <h2>Build Your Future with Bharat Forge</h2>
      <form id="career-form" method="post" action="https://www.bharatforge.com/careers/submit">
        <input type="hidden" name="_token" value="csrf-token" />
      </form>
      <p>Share your resume with us at <a href="mailto:careers@kalyani.in">careers@kalyani.in</a></p>
    </section>
  </body>
</html>
`

test('extractSearchResults returns no openings when the Bharat Forge page only exposes a resume form', async () => {
  const bharatForge = await loadBharatForgeModule()
  assert.ok(bharatForge)

  assert.deepEqual(bharatForge.extractSearchResults(careerPageHtml), [])
})

test('run fetches the Bharat Forge careers page and returns an empty job list when no structured openings are published', async () => {
  const bharatForge = await loadBharatForgeModule()
  assert.ok(bharatForge)

  const requestedTexts = []
  const scraper = bharatForge.createBharatForgeScraper()

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requestedTexts.push(url)
      if (url === bharatForge.CAREER_PAGE_URL) return careerPageHtml
      throw new Error(`Unexpected text URL: ${url}`)
    },
  })

  assert.deepEqual(requestedTexts, [bharatForge.CAREER_PAGE_URL])
  assert.deepEqual(jobs, [])
})

import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <h1>Dynamic Pricing Software: Achieve the Right Prices with AI</h1>
      <p>Take charge of your pricing today with real-time AI pricing optimization.</p>
      <p>info@sciative.com</p>
      <p>1201, 12th Floor, Rupa Sapphire, Plot No. 12, Sector 18, Vashi, Navi Mumbai – 400703, MH, India.</p>
    </main>
  </body>
</html>
`

const aboutHtml = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <h2>Our People</h2>
      <p>Humans of Sciative</p>
      <button>Join Our Talent Community</button>
      <h3>Awards & Recognition</h3>
    </main>
  </body>
</html>
`

const publicJobsHtml = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <h2>Our People</h2>
      <button>Join Our Talent Community</button>
      <a href="/careers/senior-full-stack-developer">Senior Full Stack Developer</a>
      <button>Apply Now</button>
    </main>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../sciative/script.js')
  } catch {
    assert.fail('Expected Sciative Solutions scraper module at ../sciative/script.js')
  }
}

test('Sciative Solutions helpers stay pinned to the verified talent-community-only first-party surface from Friday, July 17, 2026', async () => {
  const sciative = await loadModule()

  assert.equal(sciative.SOURCE, 'sciative')
  assert.equal(sciative.COMPANY, 'Sciative Solutions')
  assert.equal(sciative.OFFICIAL_BRAND_NAME, 'Sciative')
  assert.equal(sciative.VERIFIED_ON, '2026-07-17')
  assert.equal(sciative.HOMEPAGE_URL, 'https://sciative.com/')
  assert.equal(sciative.ABOUT_URL, 'https://sciative.com/about-us')
  assert.equal(sciative.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(sciative.hasAboutTalentCommunitySignal(aboutHtml), true)
  assert.equal(sciative.pageExposesPublicJobListings(aboutHtml), false)
  assert.equal(sciative.pageExposesPublicJobListings(publicJobsHtml), true)
})

test('Sciative Solutions returns [] while the verified first-party surface only exposes a talent community prompt', async () => {
  const sciative = await loadModule()
  const requestedUrls = []

  const jobs = await sciative.createSciativeSolutionsScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === sciative.HOMEPAGE_URL) return homepageHtml
      if (url === sciative.ABOUT_URL) return aboutHtml
      throw new Error(`Unexpected Sciative URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [sciative.HOMEPAGE_URL, sciative.ABOUT_URL])
  assert.deepEqual(jobs, [])
})

test('Sciative Solutions fails closed when the verified homepage or talent-community page drifts into a public jobs surface', async () => {
  const sciative = await loadModule()

  await assert.rejects(
    sciative.createSciativeSolutionsScraper().run({
      fetchText: async (url) => (url === sciative.HOMEPAGE_URL ? '<html><body>Home</body></html>' : aboutHtml),
    }),
    /homepage/i,
  )

  await assert.rejects(
    sciative.createSciativeSolutionsScraper().run({
      fetchText: async (url) => (url === sciative.HOMEPAGE_URL ? homepageHtml : publicJobsHtml),
    }),
    /public job listings|talent community/i,
  )
})

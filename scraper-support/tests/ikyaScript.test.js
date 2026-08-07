import assert from 'node:assert/strict'
import test from 'node:test'

const careersBoardHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers at ikya</title>
  </head>
  <body>
    <h1>ikya</h1>
    <nav>
      <a href="https://www.ikya.com/">Home Page</a>
    </nav>
    <section>
      <h2>Jobs at ikya</h2>
      <p>No job postings are currently available.</p>
    </section>
  </body>
</html>
`

const activeBoardHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers at ikya</title>
  </head>
  <body>
    <h1>ikya</h1>
    <nav>
      <a href="https://www.ikya.com/">Home Page</a>
    </nav>
    <section>
      <h2>Jobs at ikya</h2>
      <a href="https://careers.smartrecruiters.com/Ikya1/operations-manager">Operations Manager</a>
    </section>
  </body>
</html>
`

const placeholderHomepageBody = 'OK'

const comingSoonHomepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>www.ikya.com - Coming Soon</title>
  </head>
  <body>
    <p>This domain is coming soon.</p>
  </body>
</html>
`

const realHomepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>IKYA HCS</title>
  </head>
  <body>
    <h1>Leading HR Solutions</h1>
  </body>
</html>
`

const loadIkyaModule = async () => {
  try {
    return await import('../../scraper/ikya/script.js')
  } catch {
    assert.fail('Expected Ikya scraper module at ../../scraper/ikya/script.js')
  }
}

test('Ikya pins the verified empty SmartRecruiters board and placeholder homepage signals', async () => {
  const ikya = await loadIkyaModule()

  assert.equal(ikya.SOURCE, 'ikya')
  assert.equal(ikya.COMPANY_NAME, 'Ikya')
  assert.equal(ikya.CAREERS_URL, 'https://careers.smartrecruiters.com/Ikya1')
  assert.equal(ikya.HOMEPAGE_URL, 'http://www.ikya.com/')
  assert.equal(ikya.VERIFIED_ON, '2026-08-02')
  assert.equal(ikya.hasVerifiedEmptyBoardSignal(careersBoardHtml), true)
  assert.deepEqual(
    ikya.extractPublicJobLinksFromBoard(careersBoardHtml),
    [],
  )
  assert.deepEqual(
    ikya.extractPublicJobLinksFromBoard(activeBoardHtml),
    ['https://careers.smartrecruiters.com/Ikya1/operations-manager'],
  )
  assert.equal(ikya.hasHomepagePlaceholderSignal(placeholderHomepageBody), true)
  assert.equal(ikya.hasHomepagePlaceholderSignal(comingSoonHomepageHtml), true)
  assert.equal(ikya.hasHomepagePlaceholderSignal(realHomepageHtml), false)
})

test('Ikya returns [] only while the SmartRecruiters board stays empty and the homepage stays a placeholder', async () => {
  const ikya = await loadIkyaModule()
  const requestedUrls = []

  const jobs = await ikya.createIkyaScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)
      if (url === ikya.CAREERS_URL) return { status: 200, url, html: careersBoardHtml }
      if (url === ikya.HOMEPAGE_URL) return { status: 200, url, html: comingSoonHomepageHtml }
      throw new Error(`Unexpected Ikya URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    ikya.CAREERS_URL,
    ikya.HOMEPAGE_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('Ikya fails closed when the public board starts listing jobs or the homepage becomes a real HTML site', async () => {
  const ikya = await loadIkyaModule()

  await assert.rejects(
    ikya.createIkyaScraper().run({
      fetchPage: async (url) => {
        if (url === ikya.CAREERS_URL) return { status: 200, url, html: activeBoardHtml }
        if (url === ikya.HOMEPAGE_URL) return { status: 200, url, html: comingSoonHomepageHtml }
        throw new Error(`Unexpected Ikya URL: ${url}`)
      },
    }),
    /public jobs surface/i,
  )

  await assert.rejects(
    ikya.createIkyaScraper().run({
      fetchPage: async (url) => {
        if (url === ikya.CAREERS_URL) return { status: 200, url, html: careersBoardHtml }
        if (url === ikya.HOMEPAGE_URL) return { status: 200, url, html: realHomepageHtml }
        throw new Error(`Unexpected Ikya URL: ${url}`)
      },
    }),
    /homepage/i,
  )
})

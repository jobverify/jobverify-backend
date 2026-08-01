import assert from 'node:assert/strict'
import test from 'node:test'

const loadCyveritasModule = async () => {
  try {
    return await import('../../scraper/cyveritas/script.js')
  } catch {
    return null
  }
}

const careersPageHtml = `
  <html>
    <head>
      <title>Careers</title>
    </head>
    <body>
      <nav>
        <a href="https://cyveritas.com/what-we-do">What We Do</a>
        <a href="https://cyveritas.com/our-story#career">Careers</a>
        <a href="https://cyveritas.com/contact-us">Contact Us</a>
      </nav>
      <footer>
        <a href="mailto:info@cyveritas.com">info@cyveritas.com</a>
        <a href="tel:+918891005110">+91 8891005110</a>
      </footer>
    </body>
  </html>
`

test('extractOpenings returns no jobs when the official Cyveritas careers page exposes only a static careers shell', async () => {
  const cyveritas = await loadCyveritasModule()
  assert.ok(cyveritas)

  assert.equal(cyveritas.hasCareerPageSignal(careersPageHtml), true)
  assert.equal(cyveritas.hasContactSignal(careersPageHtml), true)
  assert.deepEqual(cyveritas.extractOpenings(careersPageHtml), [])
})

test('run fetches the official Cyveritas careers page and returns an honest zero-openings result', async () => {
  const cyveritas = await loadCyveritasModule()
  assert.ok(cyveritas)

  const requestedUrls = []
  const jobs = await cyveritas.createCyveritasScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return careersPageHtml
    },
  })

  assert.deepEqual(requestedUrls, ['https://cyveritas.com/careers'])
  assert.deepEqual(jobs, [])
})

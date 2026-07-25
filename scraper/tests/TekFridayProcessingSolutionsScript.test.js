import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Innovation at the intersection of finance & technology</h1>
    <nav>
      <a href="/Company.html">Company</a>
      <a href="/Technologies.html">Technologies</a>
      <a href="/ContactUs.html">Contact</a>
    </nav>
  </body>
</html>
`

const contactHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>happytohelp.always</h1>
    <p>tag@tekfriday.com</p>
    <p>99896 00277</p>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../tekfridayprocessingsolutions/script.js')
  } catch {
    assert.fail('Expected TekFriday Processing Solutions scraper module at ../tekfridayprocessingsolutions/script.js')
  }
}

test('TekFriday Processing Solutions validators stay pinned to the verified no-public-careers surface', async () => {
  const tekfriday = await loadModule()

  assert.equal(tekfriday.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(tekfriday.hasPublicCareersLink(homepageHtml), false)
  assert.equal(tekfriday.hasVerifiedContactSignal(contactHtml), true)
})

test('TekFriday Processing Solutions run returns no jobs while the verified generic first-party surface remains unchanged', async () => {
  const tekfriday = await loadModule()
  const requests = []

  const jobs = await tekfriday.run({
    fetchText: async (url) => {
      requests.push(url)
      if (url === tekfriday.HOMEPAGE_URL) return homepageHtml
      if (url === tekfriday.CONTACT_URL) return contactHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requests, [tekfriday.HOMEPAGE_URL, tekfriday.CONTACT_URL])
  assert.deepEqual(jobs, [])
})

test('TekFriday Processing Solutions fails closed when the homepage starts exposing careers links or the contact signal changes', async () => {
  const tekfriday = await loadModule()

  await assert.rejects(
    tekfriday.run({
      fetchText: async (url) => {
        if (url === tekfriday.HOMEPAGE_URL) {
          return homepageHtml.replace('</nav>', '<a href="/careers">Careers</a></nav>')
        }
        return contactHtml
      },
    }),
    /verified TekFriday Processing Solutions homepage/i,
  )

  await assert.rejects(
    tekfriday.run({
      fetchText: async (url) => (url === tekfriday.HOMEPAGE_URL ? homepageHtml : '<html><body><h1>Jobs</h1></body></html>'),
    }),
    /verified TekFriday Processing Solutions contact surface/i,
  )
})

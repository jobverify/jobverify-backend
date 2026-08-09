import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <h2>FamApp by Trio</h2>
      <p>FamApp by Trio (formerly FamPay) focuses on financial inclusion of the next generation.</p>
      <section>
        <h3>Want to shape finance for the next gen?</h3>
        <a href="/careers/">Join the Fam</a>
      </section>
      <footer>
        <p>Address: 3rd Floor, Obeya Verve, HSR Layout, Bengaluru, Karnataka 560102</p>
      </footer>
    </main>
  </body>
</html>
`

const careersHtml = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <p>#JoinTheFam</p>
      <h1>Be a part of the team setting the bar for new-world work culture</h1>
      <h2>So like, what does Fam do?</h2>
      <h3>Challenge the status quo</h3>
      <p>Warning: our perks might make your friends mad</p>
      <p>Free therapy with mental health professionals</p>
      <p>FamApp by Trio (formerly FamPay) focuses on financial inclusion of the next generation.</p>
      <a href="/jobs/">View openings</a>
    </main>
  </body>
</html>
`

const loadFamAppModule = async () => {
  try {
    return await import('../../scraper/famapp/script.js')
  } catch {
    assert.fail('Expected FamApp scraper module at ../../scraper/famapp/script.js')
  }
}

test('FamApp accepts the current official homepage and careers copy while no direct public jobs surface is exposed', async () => {
  const famapp = await loadFamAppModule()
  const requestedUrls = []

  assert.equal(famapp.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(famapp.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(famapp.hasPublicJobsSignal(careersHtml), true)
  assert.equal(famapp.hasKnownFirstPartyJobsHandoffSignal(careersHtml), true)

  const jobs = await famapp.createFamAppScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === famapp.HOMEPAGE_URL) {
        return { status: 200, url, html: homepageHtml }
      }

      if (url === famapp.CAREERS_URL) {
        return { status: 200, url, html: careersHtml }
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [famapp.HOMEPAGE_URL, famapp.CAREERS_URL])
  assert.deepEqual(jobs, [])
})

test('FamApp fails closed when the official homepage identity changes', async () => {
  const famapp = await loadFamAppModule()

  await assert.rejects(
    famapp.createFamAppScraper().run({
      fetchPage: async (url) => {
        if (url === famapp.HOMEPAGE_URL) {
          return { status: 200, url, html: '<html><body>Unrelated homepage</body></html>' }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified official homepage/i,
  )
})

test('FamApp fails closed when the careers page starts exposing a direct public jobs surface', async () => {
  const famapp = await loadFamAppModule()
  const careersWithPublicJobs = careersHtml.replace(
    '</main>',
    '<a href="https://jobs.lever.co/famapp/role">Apply now</a></main>',
  )

  await assert.rejects(
    famapp.createFamAppScraper().run({
      fetchPage: async (url) => {
        if (url === famapp.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === famapp.CAREERS_URL) {
          return { status: 200, url, html: careersWithPublicJobs }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /direct public jobs surface/i,
  )
})

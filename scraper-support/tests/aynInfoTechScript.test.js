import assert from 'node:assert/strict'
import test from 'node:test'

const compromisedHomepageHtml = `
<!doctype html>
<html lang="en">
  <body>
    <a href="https://run.ayninfotech.com/">LOGIN</a>
    <h1>Deposit Pulsa Indosat ! Main Situs Pake Slot Pulsa Indosat Dan Platform Deposit Tri IM3 Cuman 5000 Pasti WD Terus</h1>
    <p>Powered by team</p>
  </body>
</html>
`

const currentCompromisedHomepageHtml = `
<!doctype html>
<html lang="id">
  <head>
    <link rel="canonical" href="https://www.bigskyworldview.org/contact" />
    <link rel="amphtml" href="https://view.bigskyworldview.org/" />
    <title>Deposit Indosat ! Gabung Bareng Slot Pulsa Indosat Dan Platform Slot Deposit Pulsa Indosat 5000 Pasti JP Terus</title>
  </head>
  <body>
    <p>Platform slot pulsa indosat yang menghadirkan permainan slot deposit pulsa indosat dan pulsa tri paling top pasti gacor.</p>
    <footer>Powered by Shopify</footer>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/ayninfotech/script.js')
  } catch {
    assert.fail('Expected AYN InfoTech scraper module at ../../scraper/ayninfotech/script.js')
  }
}

test('AYN InfoTech sentinel stays pinned to the verified untrusted-domain signals', async () => {
  const aynInfotech = await loadModule()

  assert.equal(aynInfotech.SOURCE, 'ayninfotech')
  assert.equal(aynInfotech.COMPANY, 'AYN InfoTech')
  assert.equal(aynInfotech.VERIFIED_ON, '2026-07-17')
  assert.equal(aynInfotech.HOMEPAGE_URL, 'https://www.ayninfotech.com/')
  assert.equal(aynInfotech.hasCompromisedHomepageSignal(compromisedHomepageHtml), true)
})

test('AYN InfoTech sentinel recognizes the current bigskyworldview compromised redirect variant', async () => {
  const aynInfotech = await loadModule()

  assert.equal(aynInfotech.hasCompromisedHomepageSignal(currentCompromisedHomepageHtml), true)
  assert.equal(
    aynInfotech.isVerifiedUntrustedRoute({
      status: 200,
      url: 'https://www.bigskyworldview.org/contact',
      html: currentCompromisedHomepageHtml,
    }),
    true,
  )
})

test('AYN InfoTech sentinel returns [] only while every checked first-party route remains untrusted', async () => {
  const aynInfotech = await loadModule()
  const requestedUrls = []

  const jobs = await aynInfotech.createAynInfotechScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)
      return {
        status: 200,
        url: 'https://account.umbrellainabox.com/',
        html: compromisedHomepageHtml,
      }
    },
  })

  assert.deepEqual(requestedUrls, [
    aynInfotech.HOMEPAGE_URL,
    ...aynInfotech.CHECKED_ROUTE_URLS,
  ])
  assert.deepEqual(jobs, [])
})

test('AYN InfoTech sentinel fails closed when the first-party domain starts exposing a different surface', async () => {
  const aynInfotech = await loadModule()

  await assert.rejects(
    aynInfotech.createAynInfotechScraper().run({
      fetchPage: async (url) => ({
        status: 200,
        url,
        html: `
          <html>
            <body>
              <h1>AYN InfoTech</h1>
              <a href="/careers">Careers</a>
            </body>
          </html>
        `,
      }),
    }),
    /verified untrusted domain state changed/i,
  )
})

import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    return null
  }
}

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Walkaroo - Men's, Women's & Kid's Footwear | India's No.1 PU Brand – Walkaroo Footwear</title>
  </head>
  <body>
    <nav>
      <a href="https://www.walkaroo.in/pages/about-us">About Us</a>
      <a href="https://www.walkaroo.in/pages/contact-us">Contact Us</a>
    </nav>
    <main>
      <h1>Walkaroo Footwear</h1>
      <p>Homegrown Indian Brand</p>
      <p>Free shipping above ₹500</p>
    </main>
  </body>
</html>
`

const aboutHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>About Walkaroo | Comfort-Driven Footwear for Every Step – Walkaroo Footwear</title>
  </head>
  <body>
    <main>
      <h1>About us</h1>
      <h2>Walkaroo: The SOLE and SOUL of young India</h2>
      <p>At Walkaroo, we believe walking is the simplest solution to staying active and healthy.</p>
      <footer>
        <a href="https://recruitcareers.zappyhire.com/en/walkaroo">Careers</a>
      </footer>
    </main>
  </body>
</html>
`

const contactHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Walkaroo Help Desk | Contact Us for Product or Order Support – Walkaroo Footwear</title>
  </head>
  <body>
    <main>
      <h1>Contact Us</h1>
      <p>Walkaroo International Pvt Ltd.</p>
      <p>customercare@walkaroo.in</p>
      <p>CIN : U19200TZ2011PTC029228</p>
      <footer>
        <a href="https://recruitcareers.zappyhire.com/en/walkaroo">Careers</a>
      </footer>
    </main>
  </body>
</html>
`

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers</title>
  </head>
  <body>
    <main>
      <h1>Careers</h1>
      <p>walkaroo</p>
      <p>Powered by Zappyhire</p>
    </main>
  </body>
</html>
`

test('Walkaroo validates the verified homepage, about page, contact page, and official Zappyhire careers handoff', async () => {
  const walkaroo = await loadModule()
  assert.ok(walkaroo, 'Walkaroo scraper module should load')

  assert.equal(walkaroo.SOURCE, 'walkaroo')
  assert.equal(walkaroo.COMPANY, 'Walkaroo')
  assert.equal(walkaroo.HOMEPAGE_URL, 'https://www.walkaroo.in/')
  assert.equal(walkaroo.ABOUT_URL, 'https://www.walkaroo.in/pages/about-us')
  assert.equal(walkaroo.CONTACT_URL, 'https://www.walkaroo.in/pages/contact-us')
  assert.equal(walkaroo.CAREERS_URL, 'https://recruitcareers.zappyhire.com/en/walkaroo')
  assert.equal(walkaroo.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(walkaroo.hasAboutPageSignal(aboutHtml), true)
  assert.equal(walkaroo.hasContactPageSignal(contactHtml), true)
  assert.equal(walkaroo.hasOfficialCareersHandoffSignal(careersHtml), true)
})

test('Walkaroo run returns an empty list only while the verified Zappyhire handoff remains a guarded official surface', async () => {
  const walkaroo = await loadModule()
  assert.ok(walkaroo, 'Walkaroo scraper module should load')

  const requestedUrls = []
  const jobs = await walkaroo.createWalkarooScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === walkaroo.HOMEPAGE_URL) return homepageHtml
      if (url === walkaroo.ABOUT_URL) return aboutHtml
      if (url === walkaroo.CONTACT_URL) return contactHtml
      if (url === walkaroo.CAREERS_URL) return careersHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    'https://www.walkaroo.in/',
    'https://www.walkaroo.in/pages/about-us',
    'https://www.walkaroo.in/pages/contact-us',
    'https://recruitcareers.zappyhire.com/en/walkaroo',
  ])
  assert.deepEqual(jobs, [])
})

test('Walkaroo fails closed when the homepage, about page, contact page, or careers handoff changes materially', async () => {
  const walkaroo = await loadModule()
  assert.ok(walkaroo, 'Walkaroo scraper module should load')

  await assert.rejects(
    walkaroo.createWalkarooScraper().run({
      fetchText: async (url) => {
        if (url === walkaroo.HOMEPAGE_URL) return '<html><body><h1>Placeholder</h1></body></html>'
        if (url === walkaroo.ABOUT_URL) return aboutHtml
        if (url === walkaroo.CONTACT_URL) return contactHtml
        if (url === walkaroo.CAREERS_URL) return careersHtml
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /homepage/i,
  )

  await assert.rejects(
    walkaroo.createWalkarooScraper().run({
      fetchText: async (url) => {
        if (url === walkaroo.HOMEPAGE_URL) return homepageHtml
        if (url === walkaroo.ABOUT_URL) return '<html><body><h1>About</h1></body></html>'
        if (url === walkaroo.CONTACT_URL) return contactHtml
        if (url === walkaroo.CAREERS_URL) return careersHtml
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /about page/i,
  )

  await assert.rejects(
    walkaroo.createWalkarooScraper().run({
      fetchText: async (url) => {
        if (url === walkaroo.HOMEPAGE_URL) return homepageHtml
        if (url === walkaroo.ABOUT_URL) return aboutHtml
        if (url === walkaroo.CONTACT_URL) return '<html><body><h1>Contact</h1></body></html>'
        if (url === walkaroo.CAREERS_URL) return careersHtml
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /contact page/i,
  )

  await assert.rejects(
    walkaroo.createWalkarooScraper().run({
      fetchText: async (url) => {
        if (url === walkaroo.HOMEPAGE_URL) return homepageHtml
        if (url === walkaroo.ABOUT_URL) return aboutHtml
        if (url === walkaroo.CONTACT_URL) return contactHtml
        if (url === walkaroo.CAREERS_URL) return '<html><body><h1>Jobs</h1></body></html>'
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /careers handoff/i,
  )
})

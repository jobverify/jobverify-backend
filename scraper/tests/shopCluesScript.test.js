import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-17T12:00:00.000Z'

const careersLandingHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Career</title>
  </head>
  <body>
    <h1>Career</h1>
    <p>Interested in exploring a career with disruptive & innovative startup?</p>
    <h4>Jobs by Group</h4>
    <a href="https://www.shopclues.com/current-opening.html">View All Jobs</a>
    <p>Send us your resume at career@ShopClues.com</p>
  </body>
</html>
`

const currentOpeningsHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Current Opening</title>
  </head>
  <body>
    <h1>Current Opening</h1>
    <h2>Careers</h2>
    <p>Interested in exploring a career with a pathbreaking company? You've reached the right place!</p>
    <p>Send us your resume at career@ShopClues.com</p>
    <h2>Open Positions</h2>
    <h4>Technology</h4>
    <h5>Position: Software Engineer (PHP, MYSQL)</h5>
    <p>Apply for this Position Location: Gurgaon, Delhi NCR.</p>
    <p>
      As Software Engineer, you will be working with cutting edge product development using PHP,
      MySQL, memcache, varnish, and other open source technologies.
    </p>
    <p>ShopClues offers competitive compensation, stock options, great learning & exposure.</p>
    <h5>Position: Senior QA Manager</h5>
    <p>Apply for this Position Location: Gurgaon, Delhi NCR.</p>
    <p>
      As Senior QA Manager, you will be responsible in defining quality standards and implementing
      automated testing for functional, performance and scalability testing.
    </p>
    <h4>Marketing</h4>
    <h5>Position: Brand Manager</h5>
    <p>Apply for this Position Location: Gurgaon, Delhi NCR.</p>
    <p>Lead consumer campaigns, content strategy, and category growth initiatives.</p>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../shopclues/script.js')
  } catch {
    assert.fail('Expected ShopClues scraper module at ../shopclues/script.js')
  }
}

test('ShopClues helpers stay pinned to the verified official careers landing and current openings page', async () => {
  const shopclues = await loadModule()

  assert.equal(shopclues.SOURCE, 'shopclues')
  assert.equal(shopclues.COMPANY_NAME, 'ShopClues')
  assert.equal(shopclues.OFFICIAL_BRAND_NAME, 'ShopClues')
  assert.equal(shopclues.VERIFIED_ON, '2026-07-17')
  assert.equal(shopclues.HOMEPAGE_URL, 'https://www.shopclues.com/')
  assert.equal(shopclues.CAREERS_URL, 'https://www.shopclues.com/career.html')
  assert.equal(shopclues.CURRENT_OPENINGS_URL, 'https://www.shopclues.com/current-opening.html')
  assert.equal(shopclues.hasOfficialCareersLandingSignal(careersLandingHtml), true)
  assert.equal(shopclues.hasOfficialCareersLandingSignal('<html><body>Careers</body></html>'), false)
  assert.equal(shopclues.hasOfficialCurrentOpeningsSignal(currentOpeningsHtml), true)
  assert.equal(shopclues.hasOfficialCurrentOpeningsSignal('<html><body>Current Opening</body></html>'), false)
  assert.deepEqual(
    shopclues.extractOpenPositionBlocks(currentOpeningsHtml),
    [
      {
        department: 'Technology',
        title: 'Software Engineer (PHP, MYSQL)',
        location: 'Gurgaon, Delhi NCR.',
        description:
          'As Software Engineer, you will be working with cutting edge product development using PHP, MySQL, memcache, varnish, and other open source technologies. ShopClues offers competitive compensation, stock options, great learning & exposure.',
      },
      {
        department: 'Technology',
        title: 'Senior QA Manager',
        location: 'Gurgaon, Delhi NCR.',
        description:
          'As Senior QA Manager, you will be responsible in defining quality standards and implementing automated testing for functional, performance and scalability testing.',
      },
      {
        department: 'Marketing',
        title: 'Brand Manager',
        location: 'Gurgaon, Delhi NCR.',
        description: 'Lead consumer campaigns, content strategy, and category growth initiatives.',
      },
    ],
  )
})

test('ShopClues run validates the official surfaces and builds normalized jobs from static position blocks', async () => {
  const shopclues = await loadModule()
  const requestedUrls = []

  const jobs = await shopclues.createShopCluesScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === shopclues.CAREERS_URL) return careersLandingHtml
      if (url === shopclues.CURRENT_OPENINGS_URL) return currentOpeningsHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    shopclues.CAREERS_URL,
    shopclues.CURRENT_OPENINGS_URL,
  ])
  assert.deepEqual(
    jobs.map((job) => [job.title, job.department, job.city, job.state, job.source, job.link, job.scrapedAt]),
    [
      [
        'Software Engineer (PHP, MYSQL)',
        'Technology',
        'Gurgaon',
        'Delhi NCR',
        'shopclues',
        'https://www.shopclues.com/current-opening.html',
        FIXED_SCRAPED_AT,
      ],
      [
        'Senior QA Manager',
        'Technology',
        'Gurgaon',
        'Delhi NCR',
        'shopclues',
        'https://www.shopclues.com/current-opening.html',
        FIXED_SCRAPED_AT,
      ],
      [
        'Brand Manager',
        'Marketing',
        'Gurgaon',
        'Delhi NCR',
        'shopclues',
        'https://www.shopclues.com/current-opening.html',
        FIXED_SCRAPED_AT,
      ],
    ],
  )
  assert.equal(jobs.length, 3)
})

test('ShopClues fails closed when the verified public surface drifts materially', async () => {
  const shopclues = await loadModule()

  await assert.rejects(
    shopclues.createShopCluesScraper().run({
      fetchText: async (url) => {
        if (url === shopclues.CAREERS_URL) return '<html><body>Career</body></html>'
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /official ShopClues careers landing/i,
  )

  await assert.rejects(
    shopclues.createShopCluesScraper().run({
      fetchText: async (url) => {
        if (url === shopclues.CAREERS_URL) return careersLandingHtml
        if (url === shopclues.CURRENT_OPENINGS_URL) {
          return `
            <!doctype html>
            <html>
              <body>
                <h1>Current Opening</h1>
                <h2>Open Positions</h2>
              </body>
            </html>
          `
        }
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /official ShopClues current openings page/i,
  )
})

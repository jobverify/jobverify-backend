import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-17T00:00:00.000Z'

const OFFICIAL_CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers | Slack</title>
    <link rel="canonical" href="https://slack.com/intl/en-in/careers" />
  </head>
  <body>
    <main>
      <h1>Careers at Slack</h1>
      <h2>Work with us</h2>
      <section>
        <h3>Career opportunities</h3>
        <p>Explore our open roles for working totally remotely, from the office or somewhere in between.</p>
      </section>
      <section aria-label="Job filters">
        <h3>Filter job listings</h3>
        <div>
          <span>All locations</span>
          <ul data-filter-name="locations">
            <li>California - Remote</li>
            <li>California - San Francisco</li>
            <li>Georgia - Atlanta</li>
            <li>Netherlands - Amsterdam</li>
            <li>New York - New York</li>
            <li>Texas - Dallas</li>
            <li>United Kingdom - London</li>
            <li>Virginia - Herndon</li>
            <li>Virginia - Mclean</li>
            <li>Washington - Seattle</li>
            <li>Washington - Seattle Metro - Remote</li>
          </ul>
        </div>
        <div>
          <span>All departments</span>
          <ul data-filter-name="departments">
            <li>Product</li>
            <li>Sales</li>
            <li>Software Engineering</li>
          </ul>
        </div>
      </section>
      <section aria-label="Open positions">
        <p>10Open positions</p>
        <article>
          <h4>Senior Director, Product Management</h4>
          <p>California - San Francisco</p>
          <a href="https://salesforce.wd12.myworkdayjobs.com/Slack/job/California---San-Francisco/Senior-Director--Product-Management_JR345452">Apply</a>
        </article>
        <article>
          <h4>Slack Cloud Account Executive</h4>
          <p>United Kingdom - London</p>
          <a href="https://salesforce.wd12.myworkdayjobs.com/Slack/job/United-Kingdom---London/Slack-Cloud-Account-Executive_JR345900">Apply</a>
        </article>
      </section>
    </main>
  </body>
</html>
`

const INDIA_LOCATION_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers | Slack</title>
  </head>
  <body>
    <main>
      <h1>Careers at Slack</h1>
      <h2>Work with us</h2>
      <section aria-label="Job filters">
        <h3>Filter job listings</h3>
        <div>
          <span>All locations</span>
          <ul data-filter-name="locations">
            <li>India - Hyderabad</li>
            <li>United Kingdom - London</li>
          </ul>
        </div>
      </section>
      <section aria-label="Open positions">
        <article>
          <h4>Proactive Monitoring Engineering Role (Slack, Salesforce)</h4>
          <p>India - Hyderabad</p>
          <a href="https://salesforce.wd12.myworkdayjobs.com/External_Career_Site/job/India---Hyderabad/Proactive-Monitoring-Engineering-Role--Slack--Salesforce-_JR343726">Apply</a>
        </article>
      </section>
    </main>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../slack/script.js')
  } catch {
    assert.fail('Expected Slack scraper module at ../slack/script.js')
  }
}

test('Slack pins the verified first-party careers page and public Workday apply-link host', async () => {
  const slack = await loadModule()

  assert.equal(slack.SOURCE, 'slack')
  assert.equal(slack.COMPANY, 'Slack')
  assert.equal(slack.OFFICIAL_BRAND_NAME, 'Slack')
  assert.equal(slack.VERIFIED_ON, '2026-07-17')
  assert.equal(slack.CAREERS_PAGE_URL, 'https://slack.com/intl/en-in/careers')
  assert.equal(slack.OFFICIAL_CAREERS_PAGE_URL, 'https://slack.com/careers')
  assert.equal(slack.PUBLIC_JOB_BOARD_HOSTNAME, 'salesforce.wd12.myworkdayjobs.com')
  assert.equal(slack.hasOfficialCareersSignal(OFFICIAL_CAREERS_HTML), true)
  assert.deepEqual(slack.extractLocationOptions(OFFICIAL_CAREERS_HTML), [
    'California - Remote',
    'California - San Francisco',
    'Georgia - Atlanta',
    'Netherlands - Amsterdam',
    'New York - New York',
    'Texas - Dallas',
    'United Kingdom - London',
    'Virginia - Herndon',
    'Virginia - Mclean',
    'Washington - Seattle',
    'Washington - Seattle Metro - Remote',
  ])
  assert.deepEqual(slack.extractPublicJobUrls(OFFICIAL_CAREERS_HTML), [
    'https://salesforce.wd12.myworkdayjobs.com/Slack/job/California---San-Francisco/Senior-Director--Product-Management_JR345452',
    'https://salesforce.wd12.myworkdayjobs.com/Slack/job/United-Kingdom---London/Slack-Cloud-Account-Executive_JR345900',
  ])
})

test('Slack returns an honest empty array when the verified first-party careers page exposes no India locations', async () => {
  const slack = await loadModule()
  const requestedUrls = []

  const jobs = await slack.createSlackScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return OFFICIAL_CAREERS_HTML
    },
  })

  assert.deepEqual(requestedUrls, [slack.CAREERS_PAGE_URL])
  assert.deepEqual(jobs, [])
})

test('Slack fails closed when the first-party careers page drifts or starts exposing India roles', async () => {
  const slack = await loadModule()

  await assert.rejects(
    slack.createSlackScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected</h1></body></html>',
    }),
    /verified official slack careers page/i,
  )

  await assert.rejects(
    slack.createSlackScraper().run({
      fetchText: async () => INDIA_LOCATION_HTML,
    }),
    /verified slack india slice changed materially/i,
  )
})

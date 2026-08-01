import assert from 'node:assert/strict'
import test from 'node:test'

const officialContactHtml = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <h2>CONTACT US</h2>
      <p>Explore Job Openings at</p>
      <a href="https://careers.smartrecruiters.com/CloudMoyo/">United States</a>
      <a href="https://careers.smartrecruiters.com/CloudMoyo/cloudmoyo-india-careers">Pune, India</a>
      <p>Career Opportunities</p>
      <p>recruitment@cloudmoyo.com</p>
      <a href="https://careers.smartrecruiters.com/CloudMoyo/cloudmoyo-india-careers">View India openings</a>
    </main>
  </body>
</html>
`

const emptyBoardHtml = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <h1>CloudMoyo</h1>
      <h2>Why Work for us?</h2>
      <h3>Current Openings - India</h3>
      <p>No job postings are currently available.</p>
    </main>
  </body>
</html>
`

const publicBoardHtml = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <h1>CloudMoyo</h1>
      <h3>Current Openings - India</h3>
      <a href="https://jobs.smartrecruiters.com/CloudMoyo/744000140000001-full-stack-developer">Full Stack Developer</a>
      <p>Pune, India</p>
    </main>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/cloudmoyo/script.js')
  } catch {
    assert.fail('Expected CloudMoyo scraper module at ../../scraper/cloudmoyo/script.js')
  }
}

test('CloudMoyo helpers stay pinned to the verified contact-page handoff and empty India SmartRecruiters board from Friday, July 17, 2026', async () => {
  const cloudmoyo = await loadModule()

  assert.equal(cloudmoyo.SOURCE, 'cloudmoyo')
  assert.equal(cloudmoyo.COMPANY, 'CloudMoyo')
  assert.equal(cloudmoyo.VERIFIED_ON, '2026-07-17')
  assert.equal(cloudmoyo.CONTACT_URL, 'https://www.cloudmoyo.com/contact-us/')
  assert.equal(
    cloudmoyo.BOARD_URL,
    'https://careers.smartrecruiters.com/CloudMoyo/cloudmoyo-india-careers?remoteLocation=true',
  )
  assert.equal(cloudmoyo.hasOfficialContactSignal(officialContactHtml), true)
  assert.equal(cloudmoyo.hasVerifiedEmptyBoardSignal(emptyBoardHtml), true)
  assert.equal(cloudmoyo.pageExposesPublicJobListings(emptyBoardHtml), false)
  assert.equal(cloudmoyo.pageExposesPublicJobListings(publicBoardHtml), true)
})

test('CloudMoyo returns [] while the verified SmartRecruiters India board stays empty', async () => {
  const cloudmoyo = await loadModule()
  const requestedUrls = []

  const jobs = await cloudmoyo.createCloudMoyoScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === cloudmoyo.CONTACT_URL) return officialContactHtml
      if (url === cloudmoyo.BOARD_URL) return emptyBoardHtml
      throw new Error(`Unexpected CloudMoyo URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [cloudmoyo.CONTACT_URL, cloudmoyo.BOARD_URL])
  assert.deepEqual(jobs, [])
})

test('CloudMoyo fails closed when the verified contact page or empty board drift', async () => {
  const cloudmoyo = await loadModule()

  await assert.rejects(
    cloudmoyo.createCloudMoyoScraper().run({
      fetchText: async (url) => (url === cloudmoyo.CONTACT_URL ? '<html><body>Contact</body></html>' : emptyBoardHtml),
    }),
    /contact page/i,
  )

  await assert.rejects(
    cloudmoyo.createCloudMoyoScraper().run({
      fetchText: async (url) => (url === cloudmoyo.CONTACT_URL ? officialContactHtml : publicBoardHtml),
    }),
    /public job listings|empty board/i,
  )
})

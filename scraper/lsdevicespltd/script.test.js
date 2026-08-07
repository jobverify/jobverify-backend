import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    assert.fail('Expected LS Devices (P) Ltd scraper module at ./script.js')
  }
}

const noPublicJobsHtml = `
<!DOCTYPE html>
<html lang="en">
<head><title>Careers at Lifesigns | Challenge convention</title></head>
<body>
  <h1>We challenge convention</h1>
  <h5>Explore our open roles</h5>
  <p>If you're ready to take on the challenge and make your mark, we'd love to have you.</p>
  <h6>Didn't see the role you're looking for?</h6>
  <p>That's okay - reach out to us and share how you'd like to contribute.</p>
  <button>Leave a message</button>
</body>
</html>
`

const publicJobsHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <title>Careers at Lifesigns</title>
  <script type="application/ld+json">
    {"@context":"https://schema.org","@type":"JobPosting","title":"Clinical Support Specialist"}
  </script>
</head>
<body><a href="/apply/clinical-support-specialist">Apply now</a></body>
</html>
`

const liveNoPublicJobsHtml = noPublicJobsHtml
  .replace(/you're/g, `you${String.fromCharCode(0x2019)}re`)
  .replace("That's okay -", `That${String.fromCharCode(0x2019)}s okay${String.fromCharCode(0x2014)}`)

test('LS Devices (P) Ltd verifies the live Lifesigns careers surface', async () => {
  const scraper = await loadModule()

  assert.equal(scraper.SOURCE, 'lsdevicespltd')
  assert.equal(scraper.COMPANY, 'LS Devices (P) Ltd')
  assert.equal(scraper.CAREERS_URL, 'https://www.lifesigns.us/careers/')
  assert.equal(scraper.hasVerifiedNoPublicJobsSignal(noPublicJobsHtml), true)
  assert.equal(scraper.hasVerifiedNoPublicJobsSignal(liveNoPublicJobsHtml), true)
  assert.equal(scraper.hasPublicJobsSignal(noPublicJobsHtml), false)
  assert.equal(scraper.hasPublicJobsSignal(publicJobsHtml), true)
})

test('LS Devices (P) Ltd returns [] when its verified first-party careers page has no published jobs', async () => {
  const scraper = await loadModule()
  const requestedUrls = []

  const jobs = await scraper.createLSDevicesScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return noPublicJobsHtml
    },
  })

  assert.deepEqual(requestedUrls, [scraper.CAREERS_URL])
  assert.deepEqual(jobs, [])
})

test('LS Devices (P) Ltd fails closed when the careers page changes or publishes jobs', async () => {
  const scraper = await loadModule()

  await assert.rejects(
    scraper.createLSDevicesScraper().run({
      fetchText: async () => '<html><head><title>Lifesigns</title></head><body>Welcome</body></html>',
    }),
    /careers page no longer matches the verified no-public-jobs surface/i,
  )

  await assert.rejects(
    scraper.createLSDevicesScraper().run({ fetchText: async () => publicJobsHtml }),
    /careers page now appears to expose public jobs/i,
  )
})

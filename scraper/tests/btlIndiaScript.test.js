import assert from 'node:assert/strict'
import test from 'node:test'

const CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <h1>BE PART OF OUR TEAM !</h1>
    <p>
      BTL India is always looking forward to welcome enthusiastic and driven individuals to our family.
      send us your resume at btlinrd-hr@btlnet.com today.
    </p>
    <h4>Job Opportunities</h4>
    <h4><a href="/admin/image/career/Job%20Description%20-%20Firmware%20developer%20%205%20yrs.pdf">Firmware Design engineer - 4 to 6 years</a></h4>
    <h4><a href="/admin/image/career/Job%20Description%20-%20Hardware%20Engineer%206%20to%208%20yrs..pdf">Hardware Design engineer - 6 to 8 years</a></h4>
    <h4><a href="/admin/image/career/Job%20Description%20-%20I%26S%20Software%20Design%20Engineer%205%20to%208%20yrs.pdf">Software design engineer (R&amp;D Improvement &amp; Support)- 5 to 8 years</a></h4>
    <h4><a href="/admin/image/career/Job%20Description%20-%20I%26S%20Hardware%20Engineer%206%20to%208%20yrs..pdf">Hardware engineer (R&amp;D Improvement &amp; Support) - 6 to 8 years</a></h4>
  </body>
</html>
`

const loadBtlModule = async () => {
  try {
    return await import('../btlindia/script.js')
  } catch {
    assert.fail('Expected BTL India scraper module at ../btlindia/script.js')
  }
}

test('hasOfficialCareersSignal validates the verified BTL India careers surface', async () => {
  const btl = await loadBtlModule()

  assert.equal(btl.hasOfficialCareersSignal(CAREERS_HTML), true)
})

test('extractPublicListings parses BTL India static PDF job links with mailto apply', async () => {
  const btl = await loadBtlModule()

  assert.equal(btl.CAREERS_URL, 'https://www.btlnet.co.in/careers.php')
  assert.equal(btl.APPLY_EMAIL, 'btlinrd-hr@btlnet.com')

  const jobs = btl.extractPublicListings(CAREERS_HTML)

  assert.equal(jobs.length, 4)
  assert.deepEqual(jobs[0], {
    title: 'Firmware Design engineer - 4 to 6 years',
    company: 'BTL India Pvt. Ltd.',
    department: null,
    location: null,
    city: null,
    country: 'India',
    jobId: 'btlindia-firmware-design-engineer-4-to-6-years',
    requisitionId: 'btlindia-firmware-design-engineer-4-to-6-years',
    sourceUrl: 'https://www.btlnet.co.in/admin/image/career/Job%20Description%20-%20Firmware%20developer%20%205%20yrs.pdf',
    applyUrl: 'mailto:btlinrd-hr@btlnet.com',
    employmentType: null,
    experienceRequired: '4 to 6 years',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: null,
    remoteStatus: 'On-site',
  })

  assert.equal(jobs[1].experienceRequired, '6 to 8 years')
  assert.match(jobs[2].title, /R&D Improvement & Support/i)
  assert.match(jobs[3].sourceUrl, /I%26S%20Hardware%20Engineer/i)
})

test('run fetches the BTL India careers page and decorates runner fields', async () => {
  const btl = await loadBtlModule()
  const requestedUrls = []

  const jobs = await btl.createBTLIndiaScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return CAREERS_HTML
    },
    now: () => '2026-07-09T12:30:00.000Z',
  })

  assert.deepEqual(requestedUrls, ['https://www.btlnet.co.in/careers.php'])
  assert.equal(jobs.length, 4)
  assert.equal(jobs[0].source, 'btlindia')
  assert.equal(jobs[0].link, 'mailto:btlinrd-hr@btlnet.com')
  assert.equal(jobs[0].scrapedAt, '2026-07-09T12:30:00.000Z')
})

test('run fails closed when the BTL India careers surface changes', async () => {
  const btl = await loadBtlModule()

  await assert.rejects(
    btl.createBTLIndiaScraper().run({
      fetchText: async () => '<html><body>No BTL openings</body></html>',
    }),
    /verified BTL India careers surface/i,
  )
})

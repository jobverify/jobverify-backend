import assert from 'node:assert/strict'
import test from 'node:test'

const VERIFIED_SURFACE_HTML = `
  <html>
    <head>
      <title>Career | Crownit</title>
    </head>
    <body>
      <main>
        <div class="about-title">careers</div>
        <p>
          <span class="lookingfor">Looking for career opportunities with us?</span>
          Ours is a team honed by hard work, dedication and sheer will to become a champion.
          We do not shy away from work tirelessly to inch closer to the future that we have envisioned for ourselves.
          We are always on the lookout for like-minded individuals with strong work ethics and a passion to create something.
          If our vision moves you too, come and join our awe-inspiring team.
        </p>
        <app-contactus career="2" source="career">
          <div class="button-container button- contactus-hide">
            <button class="contact-btn">Apply for job</button>
          </div>
        </app-contactus>
        <p class="life-at-caption">
          Now you can earn Crowns when you refer your friends for our open positions!
          Send us your friend's resume at
          <a href="mailto:hr@crownit.in" target="_blank">hr@crownit.in</a>
          and earn 5,000 Crowns* (worth Rs 2,500) on their successful appointment!
        </p>
        <a href="/en/about-us">About Us</a>
        <a href="/en/contact-us">Contact Us</a>
        <a href="https://blog.crownit.in/">Blog</a>
      </main>
    </body>
  </html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/crownit/script.js')
  } catch {
    assert.fail('Expected Crownit scraper module at ../../scraper/crownit/script.js')
  }
}

test('Crownit validates the verified first-party careers surface and returns [] while no public jobs contract is verified', async () => {
  const crownit = await loadModule()
  let requestedUrl = null

  const jobs = await crownit.run({
    fetchHtml: async (url) => {
      requestedUrl = url
      return VERIFIED_SURFACE_HTML
    },
  })

  assert.equal(requestedUrl, crownit.CAREERS_URL)
  assert.deepEqual(jobs, [])
  assert.equal(crownit.SOURCE, 'crownit')
  assert.equal(crownit.COMPANY, 'Crownit')
  assert.equal(crownit.OFFICIAL_BRAND, 'Crownit')
  assert.equal(crownit.VERIFIED_ON, '2026-07-25')
  assert.equal(crownit.CAREERS_URL, 'https://crownit.in/en/careers')
  assert.equal(crownit.RESUME_EMAIL, 'hr@crownit.in')
  assert.equal(
    crownit.DISPOSITION,
    'verified-first-party-careers-surface-with-non-enumerable-apply-flow-and-resume-email',
  )
  assert.match(
    crownit.VERIFIED_SURFACE_SUMMARY,
    /Verified on Saturday, July 25, 2026 that https:\/\/crownit\.in\/en\/careers was the live first-party Crownit careers surface/i,
  )
  assert.match(crownit.VERIFIED_SURFACE_SUMMARY, /Apply for job/i)
  assert.match(crownit.VERIFIED_SURFACE_SUMMARY, /hr@crownit\.in/i)
  assert.match(
    crownit.VERIFIED_SURFACE_SUMMARY,
    /no trustworthy enumerable public jobs contract/i,
  )
})

test('Crownit rejects when the verified public careers surface markers disappear', async () => {
  const crownit = await loadModule()

  await assert.rejects(
    crownit.run({
      fetchHtml: async () => `
        <html>
          <body>
            <main>
              <h1>Careers</h1>
              <p>Join our team today.</p>
            </main>
          </body>
        </html>
      `,
    }),
    /verified public careers surface changed/i,
  )
})

test('Crownit rejects when the verified non-enumerable apply flow changes', async () => {
  const crownit = await loadModule()

  await assert.rejects(
    crownit.run({
      fetchHtml: async () => `
        <html>
          <body>
            <main>
              <p>
                Looking for career opportunities with us?
                Ours is a team honed by hard work, dedication and sheer will to become a champion.
                We do not shy away from work tirelessly to inch closer to the future that we have envisioned for ourselves.
                We are always on the lookout for like-minded individuals with strong work ethics and a passion to create something.
                If our vision moves you too, come and join our awe-inspiring team.
              </p>
              <app-contactus career="2" source="contact-us">
                <button class="contact-btn">Apply for job</button>
              </app-contactus>
              <p>Now you can earn Crowns when you refer your friends for our open positions!</p>
              <p>hr@crownit.in</p>
            </main>
          </body>
        </html>
      `,
    }),
    /non-enumerable apply flow changed/i,
  )
})

test('Crownit rejects when a trusted ATS or public LinkedIn jobs surface appears', async () => {
  const crownit = await loadModule()

  await assert.rejects(
    crownit.run({
      fetchHtml: async () => `
        ${VERIFIED_SURFACE_HTML}
        <a href="https://jobs.lever.co/crownit/backend-engineer">Backend Engineer</a>
      `,
    }),
    /public jobs surface/i,
  )

  await assert.rejects(
    crownit.run({
      fetchHtml: async () => `
        ${VERIFIED_SURFACE_HTML}
        <a href="https://www.linkedin.com/company/crownit/jobs/">LinkedIn Jobs</a>
      `,
    }),
    /public jobs surface/i,
  )
})

test('Crownit rejects when a same-origin jobs path appears on the verified careers surface', async () => {
  const crownit = await loadModule()

  await assert.rejects(
    crownit.run({
      fetchHtml: async () => `
        ${VERIFIED_SURFACE_HTML}
        <a href="/en/careers/backend-engineer">Backend Engineer</a>
      `,
    }),
    /public jobs surface/i,
  )
})

test('Crownit rejects when JobPosting markup appears on the verified careers surface', async () => {
  const crownit = await loadModule()

  await assert.rejects(
    crownit.run({
      fetchHtml: async () => `
        ${VERIFIED_SURFACE_HTML}
        <script type="application/ld+json">
          {"@context":"https://schema.org","@type":"JobPosting","title":"Backend Engineer"}
        </script>
      `,
    }),
    /JobPosting markup/i,
  )
})

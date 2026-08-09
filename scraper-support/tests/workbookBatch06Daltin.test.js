import assert from 'node:assert/strict'
import test from 'node:test'

const VERIFIED_SURFACE_HTML = `
  <html>
    <body>
      <main>
        <a href="https://www.linkedin.com/company/daltinedugroup/">Linkedin</a>
        <h3>Who we are.</h3>
        <p>
          Daltin Edu Group is on a mission to empower global education. This means
          simplifying study abroad journeys, fostering international collaboration,
          and creating opportunities for students, universities, and partners worldwide.
        </p>
        <h3>Our values.</h3>
        <p>Finding simple solutions for complex problems.</p>
        <p>Growing with pace. Grow Daltin Group, grow yourself.</p>
        <p>Being a team of champions, keep it fun.</p>
        <h3>Benefits &amp; Perks</h3>
        <p>Health &amp; Retirement</p>
        <p>Flexible Time-off &amp; Company Closures</p>
        <p>Learning &amp; Development</p>
        <h3>Our ride so far.</h3>
        <p>100 + Members</p>
        <p>500 + Colleges</p>
        <h3>Ready for a ride on the wild side?</h3>
        <p>Join our movement!</p>
        <h2>Looking to participate in Global Education revolution? Connect with us!</h2>
        <p>Ready to take the next step in your global education journey?</p>
        <p>info@daltinedugroup.com</p>
      </main>
    </body>
  </html>
`

const CURRENT_OFFICIAL_SURFACE_HTML = `
  <html>
    <body>
      <main>
        <a href="https://www.linkedin.com/company/daltinedugroup/">Linkedin</a>
        <h1>Who We Are</h1>
        <p>
          Daltin Edu Group is on a mission to empower global education. This means
          simplifying study abroad journeys, fostering international collaboration,
          and creating opportunities for students, universities, and partners worldwide.
        </p>
        <h3>Our values.</h3>
        <p>Finding simple solutions for complex problems.</p>
        <p>Growing with pace. Grow Daltin Group, grow yourself.</p>
        <p>Being a team of champions, keep it fun.</p>
        <p>Taking responsibility with our purpose driven mission in mind.</p>
        <h3>Benefits &#038; Perks</h3>
        <p>Health &#038; Retirement</p>
        <p>Flexible Time-off &#038; Company Closures</p>
        <p>Learning &#038; Development</p>
        <h3>Our ride so far</h3>
        <p>100 + Members</p>
        <p>500 + Colleges</p>
        <p>Join our movement!</p>
        <h2>Looking to participate in Global Education revolution? Connect with us!</h2>
        <p>info@daltinedugroup.com</p>
      </main>
      <script>
        t.src=e,t.defer=!0,s.head.appendChild(t)
      </script>
    </body>
  </html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/daltin/script.js')
  } catch {
    assert.fail('Expected Daltin scraper module at ../../scraper/daltin/script.js')
  }
}

test('Daltin validates the verified official careers surface and returns [] while no public jobs contract is verified', async () => {
  const daltin = await loadModule()
  let requestedUrl = null

  const jobs = await daltin.run({
    fetchHtml: async (url) => {
      requestedUrl = url
      return VERIFIED_SURFACE_HTML
    },
  })

  assert.equal(requestedUrl, daltin.CAREERS_URL)
  assert.deepEqual(jobs, [])
  assert.equal(daltin.SOURCE, 'daltin')
  assert.equal(daltin.COMPANY, 'Daltin')
  assert.equal(daltin.OFFICIAL_BRAND, 'Daltin Edu Group')
  assert.equal(daltin.VERIFIED_ON, '2026-07-25')
  assert.equal(daltin.CAREERS_URL, 'https://daltinedugroup.com/careers/')
  assert.equal(daltin.CONTACT_EMAIL, 'info@daltinedugroup.com')
  assert.equal(
    daltin.DISPOSITION,
    'verified-official-careers-page-with-no-trustworthy-enumerable-public-jobs-contract',
  )
  assert.match(
    daltin.VERIFIED_SURFACE_SUMMARY,
    /Verified on Saturday, July 25, 2026 that https:\/\/daltinedugroup\.com\/careers\/ was the live official Daltin Edu Group careers surface reviewed for workbook source Daltin/i,
  )
  assert.match(daltin.VERIFIED_SURFACE_SUMMARY, /Benefits & Perks/i)
  assert.match(daltin.VERIFIED_SURFACE_SUMMARY, /Global Education revolution/i)
  assert.match(daltin.VERIFIED_SURFACE_SUMMARY, /no trustworthy enumerable public jobs contract/i)
})

test('Daltin accepts the current official no-jobs careers surface despite updated copy and inline script noise', async () => {
  const daltin = await loadModule()

  const jobs = await daltin.run({
    fetchHtml: async () => CURRENT_OFFICIAL_SURFACE_HTML,
  })

  assert.deepEqual(jobs, [])
})

test('Daltin ignores same-page contact hash fragments on the official careers surface', async () => {
  const daltin = await loadModule()

  const jobs = await daltin.run({
    fetchHtml: async () => `
      ${CURRENT_OFFICIAL_SURFACE_HTML}
      <a href="#wpcf7-f1155-o1">Contact form</a>
    `,
  })

  assert.deepEqual(jobs, [])
})

test('Daltin rejects when the verified official careers surface markers disappear', async () => {
  const daltin = await loadModule()

  await assert.rejects(
    daltin.run({
      fetchHtml: async () => `
        <html>
          <body>
            <main>
              <h1>Careers</h1>
              <p>Join our team.</p>
            </main>
          </body>
        </html>
      `,
    }),
    /verified official careers surface changed/i,
  )
})

test('Daltin rejects when JobPosting markup appears on the verified careers surface', async () => {
  const daltin = await loadModule()

  await assert.rejects(
    daltin.run({
      fetchHtml: async () => `
        ${VERIFIED_SURFACE_HTML}
        <script type="application/ld+json">
          {"@context":"https://schema.org","@type":"JobPosting","title":"Senior Backend Developer"}
        </script>
      `,
    }),
    /JobPosting markup/i,
  )
})

test('Daltin rejects when a trusted ATS or public LinkedIn jobs surface appears', async () => {
  const daltin = await loadModule()

  await assert.rejects(
    daltin.run({
      fetchHtml: async () => `
        ${VERIFIED_SURFACE_HTML}
        <a href="https://jobs.lever.co/daltin/senior-backend-developer">Senior Backend Developer</a>
      `,
    }),
    /public jobs surface/i,
  )

  await assert.rejects(
    daltin.run({
      fetchHtml: async () => `
        ${VERIFIED_SURFACE_HTML}
        <a href="https://www.linkedin.com/company/daltinedugroup/jobs/">LinkedIn Jobs</a>
      `,
    }),
    /public jobs surface/i,
  )
})

test('Daltin rejects when a same-origin jobs path appears on the verified careers surface', async () => {
  const daltin = await loadModule()

  await assert.rejects(
    daltin.run({
      fetchHtml: async () => `
        ${VERIFIED_SURFACE_HTML}
        <a href="/careers/senior-backend-developer">Senior Backend Developer</a>
      `,
    }),
    /public jobs surface/i,
  )
})

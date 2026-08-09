import assert from 'node:assert/strict'
import test from 'node:test'

const VERIFIED_SURFACE_HTML = `
  <html>
    <body>
      <main>
        <section>
          <h1>Careers at Cloudphysician</h1>
          <h4>You can't care about people without caring about your own.</h4>
          <p>
            Patient care is at the center of what we do, and we take our job very seriously.
          </p>
          <p>
            We push boundaries with our cutting-edge technology and we push the limits of what
            cannot be done.
          </p>
          Open positions
          <a href="mailto:careers@cloudphysician.net">
            <div class="curved-button">Apply now</div>
          </a>
          <app-accordian>
            <div class="item"><a target="_blank" href="assets/jds/20220331_Clinical-Intensivist.pdf">Clinical Intensivist</a></div>
            <div class="item"><a target="_blank" href="assets/jds/20220331_Specialist-Physician.pdf">Specialist</a></div>
            <div class="item"><a target="_blank" href="assets/jds/20220331_Critical-Care-Registered-Nurse.pdf">Critical Care Registered Nurse</a></div>
            <div class="item"><a target="_blank" href="assets/jds/Nicu-Nurse.pdf">Neonatal Pediatric Care Registered Nurse</a></div>
            <div class="item"><a target="_blank" href="assets/jds/20220331_Registered-Nurse.pdf">Registered Nurse</a></div>
            <div class="item"><a target="_blank" href="assets/jds/20220331_Clinical-Dietitian.pdf">Clinical Dietitian</a></div>
            <div class="item"><a target="_blank" href="assets/jds/20220331_Clinical-Pharmacist.pdf">Clinical Pharmacist</a></div>
          </app-accordian>
          <app-accordian>
            <div class="title">Clinical</div>
            <div class="title">Technology</div>
            <div class="item"><a target="_blank" href="assets/jds/Product_Designer_JD.pdf">Product Designer</a></div>
            <div class="item"><a target="_blank" href="assets/jds/20250606_HeadofComplaince_JD.pdf ">Head of Complaince</a></div>
            <div class="item"><a target="_blank" href="assets/jds/20250606_EngineeringManager_JD.pdf">Engineering Manager</a></div>
            <div class="item"><a target="_blank" href="assets/jds/20220331_Data-Engineer.pdf">Data Engineer</a></div>
            <div class="item"><a target="_blank" href="assets/jds/20240912_DevOpsEngineer_JD.pdf">DevOps Engineer</a></div>
            <div class="item"><a target="_blank" href="assets/jds/20220919_QAEngineer-Automation-Selenium_JD.pdf">QA Engineer</a></div>
            <div class="item"><a target="_blank" href="assets/jds/20250507_MLEngineeJD.pdf">ML Engineer</a></div>
          </app-accordian>
          <app-accordian>
            <div class="title">Business</div>
          </app-accordian>
          <app-accordian>
            <div class="title">Business Enablers</div>
            <div class="item"><a target="_blank" href="assets/jds/20220331_Accounts-Executive.pdf">Accounts Executive</a></div>
            <div class="item"><a target="_blank" href="assets/jds/20220331_Executive-assistant-to-CEO.pdf">Executive Assistant to CEO</a></div>
            <div class="item"><a target="_blank" href="assets/jds/20250613_Marketing_Associate_JD.pdf">Marketing Associate</a></div>
          </app-accordian>
        </section>
        <app-footer>
          <footer>
            <strong>Bengaluru</strong>
            <strong>Singapore</strong>
            <p>info@cloudphysician.net</p>
          </footer>
        </app-footer>
      </main>
    </body>
  </html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/cloudphysician/script.js')
  } catch {
    assert.fail('Expected Cloudphysician scraper module at ../../scraper/cloudphysician/script.js')
  }
}

test('Cloudphysician validates the verified careers surface and returns [] while the JD handoffs remain dead', async () => {
  const cloudphysician = await loadModule()
  const requestedStatuses = []
  let requestedUrl = null

  const jobs = await cloudphysician.run({
    fetchHtml: async (url) => {
      requestedUrl = url
      return VERIFIED_SURFACE_HTML
    },
    fetchStatus: async (url) => {
      requestedStatuses.push(url)
      return 404
    },
  })

  assert.equal(requestedUrl, cloudphysician.CAREERS_URL)
  assert.deepEqual(requestedStatuses, cloudphysician.EXPECTED_OPENINGS.map(({ jdUrl }) => jdUrl))
  assert.deepEqual(jobs, [])
  assert.equal(cloudphysician.SOURCE, 'cloudphysician')
  assert.equal(cloudphysician.COMPANY, 'Cloudphysician')
  assert.equal(cloudphysician.OFFICIAL_BRAND, 'Cloudphysician')
  assert.equal(cloudphysician.CAREERS_URL, 'https://www.cloudphysician.net/careers/')
  assert.equal(cloudphysician.APPLY_NOW_URL, 'mailto:careers@cloudphysician.net')
  assert.equal(
    cloudphysician.DISPOSITION,
    'verified-first-party-careers-surface-with-dead-same-origin-jd-handoffs',
  )
  assert.match(cloudphysician.VERIFIED_SURFACE_SUMMARY, /Sunday, July 26, 2026/)
  assert.match(cloudphysician.VERIFIED_SURFACE_SUMMARY, /17 role titles/i)
  assert.match(cloudphysician.VERIFIED_SURFACE_SUMMARY, /returned 404/i)
  assert.match(
    cloudphysician.VERIFIED_SURFACE_SUMMARY,
    /no trustworthy enumerable public jobs contract/i,
  )
  assert.equal(
    cloudphysician.extractVerifiedApplyNowUrl(VERIFIED_SURFACE_HTML),
    cloudphysician.APPLY_NOW_URL,
  )
  assert.equal(cloudphysician.extractVerifiedOpeningLinks(VERIFIED_SURFACE_HTML).length, 17)
  assert.deepEqual(
    cloudphysician.extractVerifiedOpeningLinks(VERIFIED_SURFACE_HTML).slice(0, 3),
    cloudphysician.EXPECTED_OPENINGS.slice(0, 3),
  )
})

test('Cloudphysician rejects when the verified official careers surface markers disappear', async () => {
  const cloudphysician = await loadModule()

  await assert.rejects(
    cloudphysician.run({
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

test('Cloudphysician rejects when the verified apply-now handoff or opening catalog drifts', async () => {
  const cloudphysician = await loadModule()

  await assert.rejects(
    cloudphysician.run({
      fetchHtml: async () => VERIFIED_SURFACE_HTML.replace(
        'mailto:careers@cloudphysician.net',
        'https://forms.gle/cloudphysician-apply',
      ),
      fetchStatus: async () => 404,
    }),
    /apply-now handoff changed/i,
  )

  await assert.rejects(
    cloudphysician.run({
      fetchHtml: async () => VERIFIED_SURFACE_HTML.replace(
        'Marketing Associate',
        'Field Marketing Manager',
      ),
      fetchStatus: async () => 404,
    }),
    /opening catalog changed/i,
  )
})

test('Cloudphysician rejects when any verified dead JD handoff becomes live', async () => {
  const cloudphysician = await loadModule()

  await assert.rejects(
    cloudphysician.run({
      fetchHtml: async () => VERIFIED_SURFACE_HTML,
      fetchStatus: async (url) =>
        url.endsWith('/Product_Designer_JD.pdf') ? 200 : 404,
    }),
    /JD handoff is no longer dead/i,
  )
})

test('Cloudphysician rejects when JobPosting markup, a trusted ATS, or a new same-origin jobs path appears', async () => {
  const cloudphysician = await loadModule()

  await assert.rejects(
    cloudphysician.run({
      fetchHtml: async () => `
        ${VERIFIED_SURFACE_HTML}
        <script type="application/ld+json">
          {"@context":"https://schema.org","@type":"JobPosting","title":"Product Designer"}
        </script>
      `,
      fetchStatus: async () => 404,
    }),
    /JobPosting markup/i,
  )

  await assert.rejects(
    cloudphysician.run({
      fetchHtml: async () => `
        ${VERIFIED_SURFACE_HTML}
        <a href="https://jobs.lever.co/cloudphysician/product-designer">Product Designer</a>
      `,
      fetchStatus: async () => 404,
    }),
    /public jobs surface/i,
  )

  await assert.rejects(
    cloudphysician.run({
      fetchHtml: async () => `
        ${VERIFIED_SURFACE_HTML}
        <a href="/careers/product-designer">Product Designer</a>
      `,
      fetchStatus: async () => 404,
    }),
    /public jobs surface/i,
  )
})

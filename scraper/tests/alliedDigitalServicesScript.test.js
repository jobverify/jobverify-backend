import assert from 'node:assert/strict'
import test from 'node:test'

const ROOT_HTML = `
<!doctype html>
<html>
  <head>
    <title>Allied Digital Root</title>
  </head>
  <body>
    <script>
      jQuery.ajax({
        url: 'https://www.allieddigital.net/AlliedWebGeoLoc/GeoHandler.ashx?ipadd=1.2.3.4',
        success: function () {
          location.href = "https://www.allieddigital.net/us/";
          location.href = "https://www.allieddigital.net/in/";
          location.href = "https://www.allieddigital.net/row/";
        }
      });
    </script>
  </body>
</html>
`

const CAREERS_HTML = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>IT Jobs in India | Career at Allied Digital Services Ltd</title>
    <link rel="canonical" href="https://www.allieddigital.net/in/careers/" />
  </head>
  <body>
    <main>
      <h1>Careers</h1>
      <a href="https://www.allieddigital.net/in/careers/hiring-now/">Hiring Now</a>
      <a class="join-btn" href="https://www.allieddigital.net/in/careers#opening">Join our team</a>
      <p>A career at ADSL is more than just a job.</p>
    </main>
  </body>
</html>
`

const HIRING_NOW_HTML = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Hiring Now</title>
    <link rel="canonical" href="https://www.allieddigital.net/in/careers/hiring-now/" />
  </head>
  <body>
    <main>
      <table>
        <thead>
          <tr>
            <th>Department</th>
            <th>Designation</th>
            <th>Experience</th>
            <th>Location</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td bgcolor="white" style="text-align:center;padding:8px">Talent Acquisition</td>
            <td bgcolor="white" style="text-align:center;padding:8px">Senior Talent Acquisition Specialist (Global)</td>
            <td bgcolor="white" style="text-align:center;padding:8px">Minimum of 2-5 years</td>
            <td bgcolor="white" style="text-align:center;padding:8px">Mumbai</td>
            <td bgcolor="white" style="text-align:center;padding:8px;line-height:20px;">
              <a href="https://www.allieddigital.net/in/careers/senior-talent-acquisition-specialist-global/">Click here to view more</a>
            </td>
          </tr>
        </tbody>
      </table>
      <table>
        <thead>
          <tr>
            <th>Request ID</th>
            <th>Department</th>
            <th>Designation</th>
            <th>Experience</th>
            <th>Location</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td bgcolor="white" style="text-align:center;padding:8px"><a href="../../jobdetails?requestid=8154">8154</a></td>
            <td bgcolor="white" style="text-align:center;padding:8px">RMS NOC</td>
            <td bgcolor="white" style="text-align:center;padding:8px">Account Manager</td>
            <td bgcolor="white" style="text-align:center;padding:8px">15-20</td>
            <td bgcolor="white" style="text-align:center;padding:8px">Mumbai</td>
          </tr>
          <tr>
            <td bgcolor="white" style="text-align:center;padding:8px"><a href="../../jobdetails?requestid=8178">8178</a></td>
            <td bgcolor="white" style="text-align:center;padding:8px">SOFTWARE</td>
            <td bgcolor="white" style="text-align:center;padding:8px">TECHNICAL LEAD</td>
            <td bgcolor="white" style="text-align:center;padding:8px">5-9</td>
            <td bgcolor="white" style="text-align:center;padding:8px">Pune</td>
          </tr>
        </tbody>
      </table>
      <p>Please also reach out to us at <a href="mailto:careers@allieddigital.net">careers@allieddigital.net</a>.</p>
    </main>
  </body>
</html>
`

const loadAlliedModule = async () => {
  try {
    return await import('../allieddigitalservices/script.js')
  } catch {
    assert.fail('Expected Allied Digital Services scraper module at ../allieddigitalservices/script.js')
  }
}

test('Allied Digital Services verifies the official first-party root, careers, and Hiring Now surfaces and parses the live table contract', async () => {
  const allied = await loadAlliedModule()

  assert.equal(allied.ROOT_URL, 'https://www.allieddigital.net/')
  assert.equal(allied.INDIA_HOME_URL, 'https://www.allieddigital.net/in/')
  assert.equal(allied.CAREERS_URL, 'https://www.allieddigital.net/in/careers/')
  assert.equal(allied.HIRING_NOW_URL, 'https://www.allieddigital.net/in/careers/hiring-now/')
  assert.equal(
    allied.VERIFIED_FRIENDLY_DETAIL_URL,
    'https://www.allieddigital.net/in/careers/senior-talent-acquisition-specialist-global/',
  )

  assert.equal(allied.hasOfficialRootSignal(ROOT_HTML), true)
  assert.equal(allied.hasOfficialCareersSignal(CAREERS_HTML), true)
  assert.equal(allied.hasHiringNowSignal(HIRING_NOW_HTML), true)

  const jobs = allied.extractHiringNowListings(HIRING_NOW_HTML)

  assert.deepEqual(jobs, [
    {
      title: 'Senior Talent Acquisition Specialist (Global)',
      company: 'Allied Digital Services',
      department: 'Talent Acquisition',
      location: 'Mumbai, India',
      city: 'Mumbai',
      country: 'India',
      jobId: 'senior-talent-acquisition-specialist-global',
      requisitionId: 'senior-talent-acquisition-specialist-global',
      sourceUrl: 'https://www.allieddigital.net/in/careers/senior-talent-acquisition-specialist-global/',
      applyUrl: 'https://www.allieddigital.net/in/careers/senior-talent-acquisition-specialist-global/',
      employmentType: null,
      experienceRequired: 'Minimum of 2-5 years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Department: Talent Acquisition',
      remoteStatus: 'On-site',
    },
    {
      title: 'Account Manager',
      company: 'Allied Digital Services',
      department: 'RMS NOC',
      location: 'Mumbai, India',
      city: 'Mumbai',
      country: 'India',
      jobId: '8154',
      requisitionId: '8154',
      sourceUrl: 'https://www.allieddigital.net/in/careers/hiring-now/',
      applyUrl: 'https://www.allieddigital.net/in/careers/hiring-now/',
      employmentType: null,
      experienceRequired: '15-20 years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Request ID: 8154\nDepartment: RMS NOC',
      remoteStatus: 'On-site',
    },
    {
      title: 'TECHNICAL LEAD',
      company: 'Allied Digital Services',
      department: 'SOFTWARE',
      location: 'Pune, India',
      city: 'Pune',
      country: 'India',
      jobId: '8178',
      requisitionId: '8178',
      sourceUrl: 'https://www.allieddigital.net/in/careers/hiring-now/',
      applyUrl: 'https://www.allieddigital.net/in/careers/hiring-now/',
      employmentType: null,
      experienceRequired: '5-9 years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Request ID: 8178\nDepartment: SOFTWARE',
      remoteStatus: 'On-site',
    },
  ])
})

test('Allied Digital Services run validates the first-party surfaces and decorates Hiring Now listings into Jobify jobs', async () => {
  const allied = await loadAlliedModule()
  const requestedUrls = []

  const jobs = await allied.createAlliedDigitalServicesScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === allied.ROOT_URL) return ROOT_HTML
      if (url === allied.CAREERS_URL) return CAREERS_HTML
      if (url === allied.HIRING_NOW_URL) return HIRING_NOW_HTML

      throw new Error(`Unexpected URL: ${url}`)
    },
    now: () => '2026-07-15T12:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [
    'https://www.allieddigital.net/',
    'https://www.allieddigital.net/in/careers/',
    'https://www.allieddigital.net/in/careers/hiring-now/',
  ])
  assert.equal(jobs.length, 3)
  assert.equal(jobs[0].source, 'allieddigitalservices')
  assert.equal(jobs[0].scrapedAt, '2026-07-15T12:00:00.000Z')
  assert.equal(
    jobs[0].link,
    'https://www.allieddigital.net/in/careers/senior-talent-acquisition-specialist-global/',
  )
  assert.equal(jobs[1].link, 'https://www.allieddigital.net/in/careers/hiring-now/')
  assert.equal(jobs[2].city, 'Pune')
})

test('Allied Digital Services run fails closed when the verified root or Hiring Now surfaces drift', async () => {
  const allied = await loadAlliedModule()

  await assert.rejects(
    allied.createAlliedDigitalServicesScraper().run({
      fetchText: async (url) => {
        if (url === allied.ROOT_URL) return '<html><body><h1>Allied Digital</h1></body></html>'
        if (url === allied.CAREERS_URL) return CAREERS_HTML
        if (url === allied.HIRING_NOW_URL) return HIRING_NOW_HTML
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /allied digital services verified root surface/i,
  )

  await assert.rejects(
    allied.createAlliedDigitalServicesScraper().run({
      fetchText: async (url) => {
        if (url === allied.ROOT_URL) return ROOT_HTML
        if (url === allied.CAREERS_URL) return CAREERS_HTML
        if (url === allied.HIRING_NOW_URL) {
          return '<html><head><title>Hiring Now</title></head><body><p>No public openings right now.</p></body></html>'
        }
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /allied digital services verified hiring now surface/i,
  )
})

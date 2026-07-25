import assert from 'node:assert/strict'
import test from 'node:test'

const loadPayatuModule = async () => {
  try {
    return await import('../payatu/script.js')
  } catch (error) {
    assert.fail(`Expected Payatu scraper module at ../payatu/script.js (${error.code || error.message})`)
  }
}

const officialCareersHtml = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <h1>Career - Payatu</h1>
      <p>Join a world-class cybersecurity team. Open roles in pentesting, IoT security, vulnerability research & more.</p>
      <a class="elementor-button" href="#career-iframe">View Open Positions</a>
      <iframe class="scroll-pane" id="career-iframe" src="https://payatu.freshteam.com/jobs"></iframe>
    </main>
  </body>
</html>
`

const listingHtml = `
<!doctype html>
<html>
  <body>
    <div class="job-role-list" data-portal-id="job-role-list">
      <ul>
        <li data-portal-role="_role_1000153740">
          <div class="role-title">
            <h5>
              Consulting
              <span class="mobile-role-count">- 2 Open Roles</span>
            </h5>
          </div>
          <div>
            <div class="job-list">
              <a href="/jobs/_nYY6ixlfncj/security-consultant-red-team-and-network" class="heading" data-portal-title="securityconsultant-redteamandnetwork" data-portal-location="Bengaluru, India" data-portal-job-type="2" data-portal-remote-location="false">
                <div class="row">
                  <div class="job-list-info">
                    <div class="job-title">Security Consultant - Red Team and Network</div>
                    <div class="job-desc text">Join the Bandit family to assess applications, networks, and cloud environments.</div>
                  </div>
                  <div class="job-location">
                    <div class="location-info">
                      Bengaluru, Karnataka
                      <br/>
                      Full Time
                    </div>
                  </div>
                </div>
              </a>
              <a href="/jobs/kQkqUxp8-J7s/cloud-security-consultant-aws" class="heading" data-portal-title="cloudsecurityconsultantaws" data-portal-location="Pune, India" data-portal-job-type="2" data-portal-remote-location="false">
                <div class="row">
                  <div class="job-list-info">
                    <div class="job-title">Cloud Security Consultant (AWS)</div>
                    <div class="job-desc text">Help customers secure cloud-native systems and infrastructure.</div>
                  </div>
                  <div class="job-location">
                    <div class="location-info">
                      Pune, Maharashtra
                      <br/>
                      Full Time
                    </div>
                  </div>
                </div>
              </a>
            </div>
          </div>
        </li>
        <li data-portal-role="_role_1000153759">
          <div class="role-title">
            <h5>
              Project Management
              <span class="mobile-role-count">- 1 Open Role</span>
            </h5>
          </div>
          <div>
            <div class="job-list">
              <a href="/jobs/zRMDGOc2RApl/project-manager" class="heading" data-portal-title="projectmanager" data-portal-location="Pune, India" data-portal-job-type="2" data-portal-remote-location="false">
                <div class="row">
                  <div class="job-list-info">
                    <div class="job-title">Project Manager</div>
                    <div class="job-desc text">Coordinate delivery for complex customer security engagements.</div>
                  </div>
                  <div class="job-location">
                    <div class="location-info">
                      Pune, Maharashtra
                      <br/>
                      Full Time
                    </div>
                  </div>
                </div>
              </a>
            </div>
          </div>
        </li>
      </ul>
    </div>
  </body>
</html>
`

const redTeamDetailHtml = `
<!doctype html>
<html>
  <body>
    <h1 class="brand-color">Security Consultant - Red Team and Network</h1>
    <a class="apply-button" href="#job-application">Apply Now</a>
    <div>
      <div>Are you interested in automating the build and deployment process of the application with ensuring the application security?</div>
      <div><strong>You are a perfect technical fit if:</strong></div>
      <ul>
        <li>Minimum of 3 years in penetration testing or red teaming roles.</li>
        <li>Strong hold on web application security concepts and penetration testing skills.</li>
        <li>Good command of at least one programming language.</li>
      </ul>
      <div><strong>NOTE: This position is open for Pune and Bangalore location.</strong></div>
    </div>
    <h3>Submit Your Application</h3>
  </body>
</html>
`

const cloudSecurityDetailHtml = `
<!doctype html>
<html>
  <body>
    <h1 class="brand-color">Cloud Security Consultant (AWS)</h1>
    <a class="apply-button" href="#job-application">Apply Now</a>
    <div>
      <div>Work with advanced cloud platforms to improve the security posture of modern applications.</div>
      <div><strong>You are a perfect technical fit if:</strong></div>
      <ul>
        <li>5+ years of experience in AWS, Kubernetes, and cloud-native security reviews.</li>
        <li>Strong communication and consulting skills.</li>
      </ul>
      <div><strong>NOTE: This position is open for Pune location.</strong></div>
    </div>
    <h3>Submit Your Application</h3>
  </body>
</html>
`

test('Payatu constants stay pinned to the verified official careers page, embedded Freshteam board, and public detail URL pattern', async () => {
  const payatu = await loadPayatuModule()

  assert.equal(payatu.COMPANY_NAME, 'Payatu')
  assert.equal(payatu.COUNTRY_FILTER, 'India')
  assert.equal(payatu.OFFICIAL_CAREERS_URL, 'https://payatu.com/career/')
  assert.equal(payatu.LISTING_URL, 'https://payatu.freshteam.com/jobs')
  assert.equal(payatu.DETAIL_URL_PATTERN, 'https://payatu.freshteam.com/jobs/{opaque_id}/{slug}')
  assert.equal(payatu.hasOfficialCareersSignal(officialCareersHtml), true)
  assert.equal(
    payatu.extractFreshteamJobsUrl(officialCareersHtml),
    'https://payatu.freshteam.com/jobs',
  )
  assert.equal(
    payatu.buildDetailUrl('_nYY6ixlfncj', 'security-consultant-red-team-and-network'),
    'https://payatu.freshteam.com/jobs/_nYY6ixlfncj/security-consultant-red-team-and-network',
  )
})

test('extractSearchResults parses Payatu Freshteam listings and keeps each public detail page as the apply surface', async () => {
  const payatu = await loadPayatuModule()

  const jobs = payatu.extractSearchResults({
    listingHtml,
    detailHtmlByUrl: {
      'https://payatu.freshteam.com/jobs/_nYY6ixlfncj/security-consultant-red-team-and-network': redTeamDetailHtml,
      'https://payatu.freshteam.com/jobs/kQkqUxp8-J7s/cloud-security-consultant-aws': cloudSecurityDetailHtml,
    },
  })

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'Security Consultant - Red Team and Network',
    company: 'Payatu',
    department: 'Consulting',
    location: 'Bengaluru, Karnataka, India',
    city: 'Bengaluru',
    country: 'India',
    jobId: '_nYY6ixlfncj',
    requisitionId: '_nYY6ixlfncj',
    sourceUrl: 'https://payatu.freshteam.com/jobs/_nYY6ixlfncj/security-consultant-red-team-and-network',
    applyUrl: 'https://payatu.freshteam.com/jobs/_nYY6ixlfncj/security-consultant-red-team-and-network',
    employmentType: 'Full-time',
    experienceRequired: '3 years',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: [
      'Are you interested in automating the build and deployment process of the application with ensuring the application security?',
      'You are a perfect technical fit if:',
      'Minimum of 3 years in penetration testing or red teaming roles.',
      'Strong hold on web application security concepts and penetration testing skills.',
      'Good command of at least one programming language.',
      'NOTE: This position is open for Pune and Bangalore location.',
    ].join(' '),
    remoteStatus: 'On-site',
  })
  assert.deepEqual(jobs[1], {
    title: 'Cloud Security Consultant (AWS)',
    company: 'Payatu',
    department: 'Consulting',
    location: 'Pune, Maharashtra, India',
    city: 'Pune',
    country: 'India',
    jobId: 'kQkqUxp8-J7s',
    requisitionId: 'kQkqUxp8-J7s',
    sourceUrl: 'https://payatu.freshteam.com/jobs/kQkqUxp8-J7s/cloud-security-consultant-aws',
    applyUrl: 'https://payatu.freshteam.com/jobs/kQkqUxp8-J7s/cloud-security-consultant-aws',
    employmentType: 'Full-time',
    experienceRequired: '5+ years',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: [
      'Work with advanced cloud platforms to improve the security posture of modern applications.',
      'You are a perfect technical fit if:',
      '5+ years of experience in AWS, Kubernetes, and cloud-native security reviews.',
      'Strong communication and consulting skills.',
      'NOTE: This position is open for Pune location.',
    ].join(' '),
    remoteStatus: 'On-site',
  })
})

test('run validates the official Payatu careers handoff, fetches the linked Freshteam board, and decorates jobs', async () => {
  const payatu = await loadPayatuModule()
  const requestedUrls = []

  const jobs = await payatu.createPayatuScraper({ maxJobs: 2 }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === payatu.OFFICIAL_CAREERS_URL) return officialCareersHtml
      if (url === payatu.LISTING_URL) return listingHtml
      if (url === 'https://payatu.freshteam.com/jobs/_nYY6ixlfncj/security-consultant-red-team-and-network') {
        return redTeamDetailHtml
      }
      if (url === 'https://payatu.freshteam.com/jobs/kQkqUxp8-J7s/cloud-security-consultant-aws') {
        return cloudSecurityDetailHtml
      }

      throw new Error(`Unexpected Payatu fixture URL: ${url}`)
    },
    now: () => '2026-07-10T00:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [
    payatu.OFFICIAL_CAREERS_URL,
    payatu.LISTING_URL,
    'https://payatu.freshteam.com/jobs/_nYY6ixlfncj/security-consultant-red-team-and-network',
    'https://payatu.freshteam.com/jobs/kQkqUxp8-J7s/cloud-security-consultant-aws',
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'payatu')
  assert.equal(jobs[0].company, 'Payatu')
  assert.equal(jobs[0].link, 'https://payatu.freshteam.com/jobs/_nYY6ixlfncj/security-consultant-red-team-and-network')
  assert.equal(jobs[0].scrapedAt, '2026-07-10T00:00:00.000Z')
  assert.equal(jobs[1].jobId, 'kQkqUxp8-J7s')
  assert.equal(jobs[1].applyUrl, 'https://payatu.freshteam.com/jobs/kQkqUxp8-J7s/cloud-security-consultant-aws')
  assert.equal(jobs[1].remoteStatus, 'On-site')
})

test('Payatu scraper fails closed when the official careers page stops linking to the verified Freshteam board', async () => {
  const payatu = await loadPayatuModule()

  await assert.rejects(
    payatu.createPayatuScraper().run({
      fetchText: async (url) => {
        if (url === payatu.OFFICIAL_CAREERS_URL) {
          return officialCareersHtml.replace(
            'https://payatu.freshteam.com/jobs',
            'https://jobs.example.com/payatu',
          )
        }

        throw new Error(`Unexpected Payatu fixture URL: ${url}`)
      },
    }),
    /verified official payatu careers handoff/i,
  )
})

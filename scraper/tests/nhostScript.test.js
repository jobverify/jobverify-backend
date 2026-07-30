import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-25T00:00:00.000Z'
const BACKEND_URL = 'https://nhost.io/careers/senior-software-engineer-backend-operations'
const FRONTEND_URL = 'https://nhost.io/careers/senior-software-engineer-frontend-product'
const DEVREL_URL = 'https://nhost.io/careers/developer-relations-engineer'

const CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers and Open Positions | Nhost</title>
  </head>
  <body>
    <main>
      <h1>Build the future of application development with us</h1>
      <p>Remote, global, async</p>
      <p>Work on products developers love with a team spread around the world.</p>
      <h2>Open positions</h2>
      <p>3 open roles</p>
      <a href="${BACKEND_URL}">Senior Software Engineer Backend / Operations</a>
      <a href="${FRONTEND_URL}">Senior Software Engineer Frontend / Product</a>
      <a href="${DEVREL_URL}">Developer Relations Engineer</a>
      <p>Questions? Email <a href="mailto:careers@nhost.io">careers@nhost.io</a>.</p>
    </main>
  </body>
</html>
`

const BACKEND_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Senior Software Engineer Backend / Operations | Nhost</title>
  </head>
  <body>
    <a href="/careers">All open positions</a>
    <p>Engineering</p>
    <h1>Senior Software Engineer Backend / Operations</h1>
    <p>Remote</p>
    <p>Full-time</p>
    <p>25-30 days vacation</p>
    <a href="mailto:careers@nhost.io?subject=Senior%20Software%20Engineer%20Backend%20%2F%20Operations">Apply for this role</a>
    <h2>About the role</h2>
    <p>Help design, operate, and improve the backend systems powering Nhost's developer platform.</p>
    <h2>What will you do?</h2>
    <ul>
      <li>Own backend and infrastructure improvements across our platform.</li>
      <li>Improve observability, reliability, and deployment automation.</li>
    </ul>
    <h2>What are we looking for?</h2>
    <ul>
      <li>5+ years of backend engineering experience in production systems.</li>
      <li>Strong experience with TypeScript, Node.js, PostgreSQL, and cloud infrastructure.</li>
      <li>Comfort working in a remote, async environment with high ownership.</li>
    </ul>
    <h2>Nice to haves</h2>
    <ul>
      <li>Experience with Elixir, Kubernetes, or developer tooling.</li>
    </ul>
    <h2>What we offer</h2>
    <ul>
      <li>Remote, global, async collaboration.</li>
    </ul>
    <h2>How to apply</h2>
    <p>Email us at careers@nhost.io with a short note and links to your work.</p>
  </body>
</html>
`

const FRONTEND_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Senior Software Engineer Frontend / Product | Nhost</title>
  </head>
  <body>
    <a href="/careers">All open positions</a>
    <p>Engineering</p>
    <h1>Senior Software Engineer Frontend / Product</h1>
    <p>Remote</p>
    <p>Full-time</p>
    <p>25-30 days vacation</p>
    <a href="mailto:careers@nhost.io?subject=Senior%20Software%20Engineer%20Frontend%20%2F%20Product">Apply for this role</a>
    <h2>About the role</h2>
    <p>Build thoughtful product experiences for developers using Nhost.</p>
    <h2>What will you do?</h2>
    <ul>
      <li>Ship frontend product features from idea to production.</li>
      <li>Collaborate closely with design and product to refine the user experience.</li>
    </ul>
    <h2>What are we looking for?</h2>
    <ul>
      <li>5+ years building user-facing web applications in React and TypeScript.</li>
      <li>Strong product taste and attention to UX details.</li>
      <li>Comfort working in a remote, async environment with high ownership.</li>
    </ul>
    <h2>Nice to haves</h2>
    <ul>
      <li>Experience with developer tools, design systems, or GraphQL clients.</li>
    </ul>
    <h2>What we offer</h2>
    <ul>
      <li>Remote, global, async collaboration.</li>
    </ul>
    <h2>How to apply</h2>
    <p>Email us at careers@nhost.io with a short note and links to your work.</p>
  </body>
</html>
`

const DEVREL_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Developer Relations Engineer | Nhost</title>
  </head>
  <body>
    <a href="/careers">All open positions</a>
    <p>Developer Relations</p>
    <h1>Developer Relations Engineer</h1>
    <p>Remote</p>
    <p>Full-time</p>
    <p>25-30 days vacation</p>
    <a href="mailto:careers@nhost.io?subject=Developer%20Relations%20Engineer">Apply for this role</a>
    <h2>About the role</h2>
    <p>Help developers succeed with Nhost by teaching, documenting, and building examples.</p>
    <h2>What will you do?</h2>
    <ul>
      <li>Create technical content, demos, and example apps.</li>
      <li>Partner with engineering and product to improve developer experience.</li>
    </ul>
    <h2>What are we looking for?</h2>
    <ul>
      <li>3+ years in developer advocacy, DevRel, technical writing, or community engineering.</li>
      <li>Strong written communication and public-facing technical storytelling.</li>
      <li>Comfort working in a remote, async environment with high ownership.</li>
    </ul>
    <h2>Nice to haves</h2>
    <ul>
      <li>Experience speaking at conferences or leading developer communities.</li>
    </ul>
    <h2>What we offer</h2>
    <ul>
      <li>Remote, global, async collaboration.</li>
    </ul>
    <h2>How to apply</h2>
    <p>Email us at careers@nhost.io with a short note and links to your work.</p>
  </body>
</html>
`

const LIVE_SHAPED_BACKEND_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Senior Software Engineer, Backend & Operations | Nhost</title>
  </head>
  <body>
    <a href="/careers">All open positions</a>
    <div>Engineering</div>
    <h1>Senior Software Engineer, Backend & Operations</h1>
    <div>Design highly available, cloud-native systems and ship product features at the intersection of backend and infrastructure operations.</div>
    <div>Remote Full-time 25-30 days vacation</div>
    <a href="mailto:careers@nhost.io?subject=Senior%20Software%20Engineer%2C%20Backend%20%26%20Operations">Apply for this role</a>
    <h2>About the role</h2>
    <div>Nhost is a remote-first company. While prior experience working remotely isn't required, we are looking for polyglot engineers who perform well given a high level of independence and autonomy. This role is at the intersection of product features, focusing on the backend, and infrastructure operations. This is an incredible opportunity to make a meaningful impact on the future of application development.</div>
    <h2>What will you do?</h2>
    <ul>
      <li>Design highly available, scalable, cloud-native systems that are easily observed and managed</li>
      <li>Provide ongoing maintenance and support of internal tools, improve system health and reliability</li>
    </ul>
    <h2>What are we looking for?</h2>
    <ul>
      <li>4+ years of relevant experience developing, testing, and shipping well-engineered code (preferably with Go)</li>
      <li>Experience with testing, automating, operating, and troubleshooting production systems</li>
      <li>Excellent communication skills</li>
    </ul>
    <h2>Nice to haves</h2>
    <ul>
      <li>BSc or MSc in Computer Engineering, Computer Science or relevant field</li>
    </ul>
    <h2>What we offer</h2>
    <ul>
      <li>Remote</li>
    </ul>
    <h2>How to apply</h2>
    <div>Does this role sound like a good fit? Email us at careers@nhost.io.</div>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../nhost/script.js')
  } catch {
    assert.fail('Expected Nhost scraper module at ../nhost/script.js')
  }
}

test('Nhost helpers stay pinned to the verified first-party careers page and role details', async () => {
  const nhost = await loadModule()

  assert.equal(nhost.SOURCE, 'nhost')
  assert.equal(nhost.COMPANY, 'Nhost')
  assert.equal(nhost.CAREERS_URL, 'https://nhost.io/careers')
  assert.equal(nhost.APPLICATION_EMAIL, 'careers@nhost.io')
  assert.equal(nhost.APPLICATION_URL, 'mailto:careers@nhost.io')
  assert.deepEqual(nhost.VERIFIED_ROLE_URLS, [BACKEND_URL, FRONTEND_URL, DEVREL_URL])
  assert.equal(nhost.hasOfficialCareersPageSignal(CAREERS_HTML), true)
  assert.deepEqual(nhost.extractCareerRoleUrls(CAREERS_HTML), [BACKEND_URL, FRONTEND_URL, DEVREL_URL])
  assert.equal(nhost.hasOfficialRoleDetailSignal(BACKEND_HTML, BACKEND_URL), true)
  assert.equal(nhost.hasOfficialRoleDetailSignal(FRONTEND_HTML, FRONTEND_URL), true)
  assert.equal(nhost.hasOfficialRoleDetailSignal(DEVREL_HTML, DEVREL_URL), true)

  assert.deepEqual(nhost.extractRoleDetail(BACKEND_HTML, BACKEND_URL), {
    title: 'Senior Software Engineer Backend / Operations',
    company: 'Nhost',
    department: 'Engineering',
    location: 'Remote',
    city: null,
    state: null,
    country: 'Global',
    jobId: 'senior-software-engineer-backend-operations',
    requisitionId: 'senior-software-engineer-backend-operations',
    sourceUrl: BACKEND_URL,
    applyUrl: 'mailto:careers@nhost.io',
    employmentType: 'Full-time',
    workplaceType: 'Remote',
    experienceRequired: '5+ years of backend engineering experience in production systems.',
    minimumQualification: null,
    preferredQualification: 'Experience with Elixir, Kubernetes, or developer tooling.',
    requiredSkills: [
      'Strong experience with TypeScript, Node.js, PostgreSQL, and cloud infrastructure.',
      'Comfort working in a remote, async environment with high ownership.',
    ],
    postingDate: null,
    closingDate: null,
    remoteStatus: 'Remote',
    jobDescription: [
      "Help design, operate, and improve the backend systems powering Nhost's developer platform.",
      '',
      'What will you do?',
      '- Own backend and infrastructure improvements across our platform.',
      '- Improve observability, reliability, and deployment automation.',
      '',
      'What are we looking for?',
      '- 5+ years of backend engineering experience in production systems.',
      '- Strong experience with TypeScript, Node.js, PostgreSQL, and cloud infrastructure.',
      '- Comfort working in a remote, async environment with high ownership.',
      '',
      'Nice to haves',
      '- Experience with Elixir, Kubernetes, or developer tooling.',
      '',
      'What we offer',
      '- Remote, global, async collaboration.',
      '',
      'How to apply',
      '- Email us at careers@nhost.io with a short note and links to your work.',
    ].join('\n'),
  })
})

test('Nhost detail parsing handles the live combined metadata line and non-paragraph wrappers', async () => {
  const nhost = await loadModule()

  assert.equal(nhost.hasOfficialRoleDetailSignal(LIVE_SHAPED_BACKEND_HTML, BACKEND_URL), true)

  const detail = nhost.extractRoleDetail(LIVE_SHAPED_BACKEND_HTML, BACKEND_URL)

  assert.equal(detail.title, 'Senior Software Engineer, Backend & Operations')
  assert.equal(detail.department, 'Engineering')
  assert.equal(detail.workplaceType, 'Remote')
  assert.equal(detail.employmentType, 'Full-time')
  assert.equal(
    detail.experienceRequired,
    '4+ years of relevant experience developing, testing, and shipping well-engineered code (preferably with Go)',
  )
  assert.equal(
    detail.preferredQualification,
    'BSc or MSc in Computer Engineering, Computer Science or relevant field',
  )
  assert.deepEqual(detail.requiredSkills, [
    'Experience with testing, automating, operating, and troubleshooting production systems',
    'Excellent communication skills',
  ])
})

test('Nhost run validates the verified first-party careers flow and returns normalized remote jobs', async () => {
  const nhost = await loadModule()
  const requestedUrls = []

  const jobs = await nhost.createNhostScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === nhost.CAREERS_URL) return CAREERS_HTML
      if (url === BACKEND_URL) return BACKEND_HTML
      if (url === FRONTEND_URL) return FRONTEND_HTML
      if (url === DEVREL_URL) return DEVREL_HTML

      throw new Error(`Unexpected Nhost fixture URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    nhost.CAREERS_URL,
    BACKEND_URL,
    FRONTEND_URL,
    DEVREL_URL,
  ])

  assert.deepEqual(jobs, [
    {
      title: 'Senior Software Engineer Backend / Operations',
      company: 'Nhost',
      department: 'Engineering',
      location: 'Remote',
      city: null,
      state: null,
      country: 'Global',
      jobId: 'senior-software-engineer-backend-operations',
      requisitionId: 'senior-software-engineer-backend-operations',
      sourceUrl: BACKEND_URL,
      applyUrl: 'mailto:careers@nhost.io',
      employmentType: 'Full-time',
      workplaceType: 'Remote',
      experienceRequired: '5+ years of backend engineering experience in production systems.',
      minimumQualification: null,
      preferredQualification: 'Experience with Elixir, Kubernetes, or developer tooling.',
      requiredSkills: [
        'Strong experience with TypeScript, Node.js, PostgreSQL, and cloud infrastructure.',
        'Comfort working in a remote, async environment with high ownership.',
      ],
      postingDate: null,
      closingDate: null,
      remoteStatus: 'Remote',
      jobDescription: [
        "Help design, operate, and improve the backend systems powering Nhost's developer platform.",
        '',
        'What will you do?',
        '- Own backend and infrastructure improvements across our platform.',
        '- Improve observability, reliability, and deployment automation.',
        '',
        'What are we looking for?',
        '- 5+ years of backend engineering experience in production systems.',
        '- Strong experience with TypeScript, Node.js, PostgreSQL, and cloud infrastructure.',
        '- Comfort working in a remote, async environment with high ownership.',
        '',
        'Nice to haves',
        '- Experience with Elixir, Kubernetes, or developer tooling.',
        '',
        'What we offer',
        '- Remote, global, async collaboration.',
        '',
        'How to apply',
        '- Email us at careers@nhost.io with a short note and links to your work.',
      ].join('\n'),
      source: 'nhost',
      companyCareerPage: 'https://nhost.io/careers',
      companyDomain: 'nhost.io',
      atsPlatform: 'official-first-party-careers-page',
      link: 'mailto:careers@nhost.io',
      scrapedAt: FIXED_SCRAPED_AT,
    },
    {
      title: 'Senior Software Engineer Frontend / Product',
      company: 'Nhost',
      department: 'Engineering',
      location: 'Remote',
      city: null,
      state: null,
      country: 'Global',
      jobId: 'senior-software-engineer-frontend-product',
      requisitionId: 'senior-software-engineer-frontend-product',
      sourceUrl: FRONTEND_URL,
      applyUrl: 'mailto:careers@nhost.io',
      employmentType: 'Full-time',
      workplaceType: 'Remote',
      experienceRequired: '5+ years building user-facing web applications in React and TypeScript.',
      minimumQualification: null,
      preferredQualification: 'Experience with developer tools, design systems, or GraphQL clients.',
      requiredSkills: [
        'Strong product taste and attention to UX details.',
        'Comfort working in a remote, async environment with high ownership.',
      ],
      postingDate: null,
      closingDate: null,
      remoteStatus: 'Remote',
      jobDescription: [
        'Build thoughtful product experiences for developers using Nhost.',
        '',
        'What will you do?',
        '- Ship frontend product features from idea to production.',
        '- Collaborate closely with design and product to refine the user experience.',
        '',
        'What are we looking for?',
        '- 5+ years building user-facing web applications in React and TypeScript.',
        '- Strong product taste and attention to UX details.',
        '- Comfort working in a remote, async environment with high ownership.',
        '',
        'Nice to haves',
        '- Experience with developer tools, design systems, or GraphQL clients.',
        '',
        'What we offer',
        '- Remote, global, async collaboration.',
        '',
        'How to apply',
        '- Email us at careers@nhost.io with a short note and links to your work.',
      ].join('\n'),
      source: 'nhost',
      companyCareerPage: 'https://nhost.io/careers',
      companyDomain: 'nhost.io',
      atsPlatform: 'official-first-party-careers-page',
      link: 'mailto:careers@nhost.io',
      scrapedAt: FIXED_SCRAPED_AT,
    },
    {
      title: 'Developer Relations Engineer',
      company: 'Nhost',
      department: 'Developer Relations',
      location: 'Remote',
      city: null,
      state: null,
      country: 'Global',
      jobId: 'developer-relations-engineer',
      requisitionId: 'developer-relations-engineer',
      sourceUrl: DEVREL_URL,
      applyUrl: 'mailto:careers@nhost.io',
      employmentType: 'Full-time',
      workplaceType: 'Remote',
      experienceRequired: '3+ years in developer advocacy, DevRel, technical writing, or community engineering.',
      minimumQualification: null,
      preferredQualification: 'Experience speaking at conferences or leading developer communities.',
      requiredSkills: [
        'Strong written communication and public-facing technical storytelling.',
        'Comfort working in a remote, async environment with high ownership.',
      ],
      postingDate: null,
      closingDate: null,
      remoteStatus: 'Remote',
      jobDescription: [
        'Help developers succeed with Nhost by teaching, documenting, and building examples.',
        '',
        'What will you do?',
        '- Create technical content, demos, and example apps.',
        '- Partner with engineering and product to improve developer experience.',
        '',
        'What are we looking for?',
        '- 3+ years in developer advocacy, DevRel, technical writing, or community engineering.',
        '- Strong written communication and public-facing technical storytelling.',
        '- Comfort working in a remote, async environment with high ownership.',
        '',
        'Nice to haves',
        '- Experience speaking at conferences or leading developer communities.',
        '',
        'What we offer',
        '- Remote, global, async collaboration.',
        '',
        'How to apply',
        '- Email us at careers@nhost.io with a short note and links to your work.',
      ].join('\n'),
      source: 'nhost',
      companyCareerPage: 'https://nhost.io/careers',
      companyDomain: 'nhost.io',
      atsPlatform: 'official-first-party-careers-page',
      link: 'mailto:careers@nhost.io',
      scrapedAt: FIXED_SCRAPED_AT,
    },
  ])
})

test('Nhost fails closed when the verified careers list or role detail surface drifts', async () => {
  const nhost = await loadModule()

  await assert.rejects(
    nhost.createNhostScraper().run({
      fetchText: async (url) => {
        if (url === nhost.CAREERS_URL) {
          return CAREERS_HTML.replace('3 open roles', '4 open roles')
        }

        throw new Error(`Unexpected Nhost fixture URL: ${url}`)
      },
    }),
    /verified careers page/i,
  )

  await assert.rejects(
    nhost.createNhostScraper().run({
      fetchText: async (url) => {
        if (url === nhost.CAREERS_URL) {
          return CAREERS_HTML.replace(DEVREL_URL, 'https://nhost.io/careers/site-reliability-engineer')
        }

        throw new Error(`Unexpected Nhost fixture URL: ${url}`)
      },
    }),
    /verified careers page/i,
  )

  await assert.rejects(
    nhost.createNhostScraper({
      roleUrlsToFetch: [BACKEND_URL],
    }).run({
      fetchText: async (url) => {
        if (url === nhost.CAREERS_URL) return CAREERS_HTML
        if (url === BACKEND_URL) {
          return BACKEND_HTML.replace('careers@nhost.io', 'jobs@example.com')
        }

        throw new Error(`Unexpected Nhost fixture URL: ${url}`)
      },
    }),
    /verified role detail/i,
  )
})

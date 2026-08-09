import assert from 'node:assert/strict'
import test from 'node:test'

const loadNeurogliaHealthModule = async () => {
  try {
    return await import('../../scraper/neurogliahealth/script.js')
  } catch {
    assert.fail('Expected Neuroglia Health scraper module at ../../scraper/neurogliahealth/script.js')
  }
}

const verifiedHomepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Neuroglia Health Private Limited</title>
    <meta
      name="description"
      content="Neuroglia Health Pvt Ltd includes Marrow App. Marrow is the Gold Standard of new pattern NEET PG with a QBank consisting of over 18,500+ MCQs, 850+ hours of videos & 390+ tests."
    />
  </head>
  <body>
    <main>
      <h2>Neuroglia Health Private Limited</h2>
      <p>
        Marrow is an online learning platform for MBBS students with curated learning modules,
        high-quality video classes by India's top faculty, all India Tests, and performance analytics
        on critical areas.
      </p>
      <p>Visit: <a href="https://www.marrow.com">www.marrow.com</a></p>
      <p>393, Second Cross, Dollars Colony JP Nagar 4th Phase, Bangalore, Pin 560078</p>
      <p>Call: +917071274274</p>
      <p>Email us: support@marrowmed.com</p>
    </main>
  </body>
</html>
`

const verifiedCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers - DailyRounds</title>
  </head>
  <body>
    <header>
      <img alt="Neuroglia Logo" src="/logo.svg" />
      <a href="/careers">Careers</a>
    </header>
    <main>
      <h1>Explore a career with Marrow, DailyRounds or DBMCI One</h1>
      <p>Open Positions</p>
      <p>Marrow</p>
      <p>DailyRounds</p>
      <p>DBMCI One</p>
    </main>
    <footer>Neuroglia Health Pvt Limited &copy; 2026</footer>
    <script type="module">
      document.addEventListener("astro:page-load", async () => {
        const response = await fetch("/api/careers");
        window.dispatchEvent(new CustomEvent("careers-data-ready", { detail: await response.json() }));
      });
    </script>
  </body>
</html>
`

const verifiedDoctorCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Doctor Careers - DailyRounds</title>
  </head>
  <body>
    <header>
      <img alt="Neuroglia Logo" src="/logo.svg" />
      <a href="/careers">All open positions</a>
    </header>
    <main>
      <h1>An academic career option for Doctors at Marrow, DailyRounds &amp; DBMCI One</h1>
      <p>Open positions</p>
    </main>
    <footer>Neuroglia Health Pvt Limited &copy; 2026</footer>
    <script type="module">
      document.addEventListener("astro:page-load", async () => {
        const response = await fetch("/api/careers/doctor");
        window.dispatchEvent(new CustomEvent("doctor-data-ready", { detail: await response.json() }));
      });
    </script>
  </body>
</html>
`

const verifiedCareersApiPayload = {
  job_openings: [
    {
      id: 1,
      roleNames: 'Academic roles for MBBS/MD Doctors',
      team: 'Doctors',
      type: 'doctors',
      url: '/careers/doctor',
    },
    {
      roleNames: 'Software Development Engineer I - Backend',
      team: 'Tech',
      updatedOn: '23 Mar 2026',
      url: 'SDEI',
    },
    {
      roleNames: 'QA Engineer - I',
      team: 'Tech',
      updatedOn: '24 Mar 2026',
      url: 'QA_Engineer_I',
    },
  ],
  updated_on: '07 July 2026',
}

const verifiedDoctorCareersApiPayload = {
  job_openings: [
    {
      roleNames: 'Medical Editor (Only MBBS Candidates)',
      team: 'Marrow',
      updatedOn: '7th Nov 2023',
      url: 'medical_writer',
    },
    {
      roleNames: 'Category Manager (Only MBBS Candidates)',
      team: 'DailyRounds',
      updatedOn: '11th Feb 2026',
      url: 'category_manager',
    },
  ],
  updated_on: '05 March 2026',
}

const verifiedGeneralDetailsBySlug = {
  SDEI: {
    job_details: {
      applyNowLink: 'https://short.mynexthire.io/1156-CjxBJnbo5nwm2bRF1sbm',
      do: [
        'Build and secure systems used by 300k+ doctors daily',
        'Work on large-scale streaming infrastructure',
      ],
      exists: true,
      have: [
        '1-2 years of hands-on experience in Python or Go',
        'Experience building and securing REST APIs',
      ],
      location: 'Bengaluru ',
      role: 'Software Development Engineer I - Backend',
      team: 'Tech',
    },
  },
  QA_Engineer_I: {
    job_details: {
      applyNowLink: 'https://short.mynexthire.io/1156-qa-engineer-i',
      do: [
        'Own product quality for web and mobile releases',
      ],
      exists: true,
      have: [
        '1-2 years of QA experience',
      ],
      location: 'Bangalore',
      role: 'QA Engineer - I',
      team: 'Tech',
    },
  },
}

const verifiedDoctorDetailsBySlug = {
  medical_writer: {
    job_details: {
      applyNowLink: 'https://short.mynexthire.io/1156-lqDZZhZ28t1RON0bcnJ7',
      do: [
        'Develop, review and edit academic medical content in the form of MCQs, articles, and notes.',
      ],
      exists: true,
      have: [
        'MBBS graduates preferred.',
      ],
      location: 'Bangalore',
      role: 'Medical Editor (Only MBBS Candidates)',
      team: 'Marrow',
    },
  },
  category_manager: {
    job_details: {
      applyNowLink: 'https://short.mynexthire.io/1156-category-manager',
      do: [
        'Own category growth for doctor-facing products.',
      ],
      exists: true,
      have: [
        'Strong academic and analytical ability.',
      ],
      location: 'Bangalore',
      role: 'Category Manager (Only MBBS Candidates)',
      team: 'DailyRounds',
    },
  },
}

test('Neuroglia Health validates the verified homepage, careers pages, and first-party listing APIs', async () => {
  const neurogliaHealth = await loadNeurogliaHealthModule()

  assert.equal(neurogliaHealth.SOURCE, 'neurogliahealth')
  assert.equal(neurogliaHealth.COMPANY, 'Neuroglia Health Pvt Ltd')
  assert.equal(neurogliaHealth.COMPANY_DOMAIN, 'neurogliahealth.com')
  assert.equal(neurogliaHealth.HOMEPAGE_URL, 'https://neurogliahealth.com/')
  assert.equal(neurogliaHealth.CAREERS_URL, 'https://dailyrounds.org/careers')
  assert.equal(neurogliaHealth.DOCTOR_CAREERS_URL, 'https://dailyrounds.org/careers/doctor')
  assert.equal(neurogliaHealth.CAREERS_API_URL, 'https://dailyrounds.org/api/careers')
  assert.equal(neurogliaHealth.DOCTOR_CAREERS_API_URL, 'https://dailyrounds.org/api/careers/doctor')
  assert.equal(neurogliaHealth.hasOfficialHomepageSignal(verifiedHomepageHtml), true)
  assert.equal(neurogliaHealth.hasOfficialCareersSignal(verifiedCareersHtml), true)
  assert.equal(neurogliaHealth.hasOfficialDoctorCareersSignal(verifiedDoctorCareersHtml), true)
  assert.equal(neurogliaHealth.hasValidCareersListingPayload(verifiedCareersApiPayload), true)
  assert.equal(neurogliaHealth.hasValidDoctorListingPayload(verifiedDoctorCareersApiPayload), true)
})

test('Neuroglia Health run validates the first-party flow, excludes the generic doctor landing card, and returns normalized jobs', async () => {
  const neurogliaHealth = await loadNeurogliaHealthModule()
  const requestedTextUrls = []
  const requestedJsonUrls = []

  const jobs = await neurogliaHealth.createNeurogliaHealthScraper({
    now: () => '2026-07-11T10:00:00.000Z',
  }).run({
    fetchText: async (url) => {
      requestedTextUrls.push(url)

      if (url === neurogliaHealth.HOMEPAGE_URL) return verifiedHomepageHtml
      if (url === neurogliaHealth.CAREERS_URL) return verifiedCareersHtml
      if (url === neurogliaHealth.DOCTOR_CAREERS_URL) return verifiedDoctorCareersHtml

      throw new Error(`Unexpected text URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedJsonUrls.push(url)

      if (url === neurogliaHealth.CAREERS_API_URL) return verifiedCareersApiPayload
      if (url === neurogliaHealth.DOCTOR_CAREERS_API_URL) return verifiedDoctorCareersApiPayload
      if (url === 'https://dailyrounds.org/api/careers/profile/SDEI') return verifiedGeneralDetailsBySlug.SDEI
      if (url === 'https://dailyrounds.org/api/careers/profile/QA_Engineer_I') {
        return verifiedGeneralDetailsBySlug.QA_Engineer_I
      }
      if (url === 'https://dailyrounds.org/api/careers/doctor_profile/medical_writer') {
        return verifiedDoctorDetailsBySlug.medical_writer
      }
      if (url === 'https://dailyrounds.org/api/careers/doctor_profile/category_manager') {
        return verifiedDoctorDetailsBySlug.category_manager
      }

      throw new Error(`Unexpected JSON URL: ${url}`)
    },
  })

  assert.deepEqual(requestedTextUrls, [
    neurogliaHealth.HOMEPAGE_URL,
    neurogliaHealth.CAREERS_URL,
    neurogliaHealth.DOCTOR_CAREERS_URL,
  ])
  assert.deepEqual(requestedJsonUrls, [
    neurogliaHealth.CAREERS_API_URL,
    neurogliaHealth.DOCTOR_CAREERS_API_URL,
    'https://dailyrounds.org/api/careers/profile/SDEI',
    'https://dailyrounds.org/api/careers/profile/QA_Engineer_I',
    'https://dailyrounds.org/api/careers/doctor_profile/medical_writer',
    'https://dailyrounds.org/api/careers/doctor_profile/category_manager',
  ])

  assert.deepEqual(
    jobs.map((job) => job.title),
    [
      'Category Manager (Only MBBS Candidates)',
      'Medical Editor (Only MBBS Candidates)',
      'QA Engineer - I',
      'Software Development Engineer I - Backend',
    ],
  )

  const backendRole = jobs.find((job) => job.jobId === 'neurogliahealth-sdei')
  const medicalEditorRole = jobs.find((job) => job.jobId === 'neurogliahealth-medical-writer')

  assert.deepEqual(backendRole, {
    title: 'Software Development Engineer I - Backend',
    company: 'Neuroglia Health Pvt Ltd',
    department: 'Tech',
    location: 'Bangalore, India',
    city: 'Bangalore',
    country: 'India',
    jobId: 'neurogliahealth-sdei',
    requisitionId: 'neurogliahealth-sdei',
    sourceUrl: 'https://dailyrounds.org/careers/profile/SDEI',
    applyUrl: 'https://short.mynexthire.io/1156-CjxBJnbo5nwm2bRF1sbm',
    employmentType: null,
    workplaceType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [
      '1-2 years of hands-on experience in Python or Go',
      'Experience building and securing REST APIs',
    ],
    compensation: null,
    postingDate: null,
    closingDate: null,
    jobDescription: [
      'What would you be doing here?',
      '- Build and secure systems used by 300k+ doctors daily',
      '- Work on large-scale streaming infrastructure',
      'The best-fit candidate would have:',
      '- 1-2 years of hands-on experience in Python or Go',
      '- Experience building and securing REST APIs',
    ].join('\n'),
    publicExperienceChecked: true,
    source: 'neurogliahealth',
    companyCareerPage: 'https://dailyrounds.org/careers',
    companyDomain: 'neurogliahealth.com',
    atsPlatform: 'official-company-careers',
    link: 'https://short.mynexthire.io/1156-CjxBJnbo5nwm2bRF1sbm',
    scrapedAt: '2026-07-11T10:00:00.000Z',
  })

  assert.deepEqual(medicalEditorRole, {
    title: 'Medical Editor (Only MBBS Candidates)',
    company: 'Neuroglia Health Pvt Ltd',
    department: 'Marrow',
    location: 'Bangalore, India',
    city: 'Bangalore',
    country: 'India',
    jobId: 'neurogliahealth-medical-writer',
    requisitionId: 'neurogliahealth-medical-writer',
    sourceUrl: 'https://dailyrounds.org/careers/doctor_profile/medical_writer',
    applyUrl: 'https://short.mynexthire.io/1156-lqDZZhZ28t1RON0bcnJ7',
    employmentType: null,
    workplaceType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [
      'MBBS graduates preferred.',
    ],
    compensation: null,
    postingDate: null,
    closingDate: null,
    jobDescription: [
      'What would you be doing here?',
      '- Develop, review and edit academic medical content in the form of MCQs, articles, and notes.',
      'The best-fit candidate would have:',
      '- MBBS graduates preferred.',
    ].join('\n'),
    publicExperienceChecked: true,
    source: 'neurogliahealth',
    companyCareerPage: 'https://dailyrounds.org/careers/doctor',
    companyDomain: 'neurogliahealth.com',
    atsPlatform: 'official-company-careers',
    link: 'https://short.mynexthire.io/1156-lqDZZhZ28t1RON0bcnJ7',
    scrapedAt: '2026-07-11T10:00:00.000Z',
  })

  assert.ok(jobs.every((job) => job.publicExperienceChecked === true))
})

test('Neuroglia Health fails closed when the verified homepage, careers shell, or detail payload drifts', async () => {
  const neurogliaHealth = await loadNeurogliaHealthModule()

  await assert.rejects(
    neurogliaHealth.createNeurogliaHealthScraper().run({
      fetchText: async (url) => {
        if (url === neurogliaHealth.HOMEPAGE_URL) return '<html><title>Unexpected</title></html>'
        if (url === neurogliaHealth.CAREERS_URL) return verifiedCareersHtml
        if (url === neurogliaHealth.DOCTOR_CAREERS_URL) return verifiedDoctorCareersHtml
        throw new Error(`Unexpected text URL: ${url}`)
      },
      fetchJson: async (url) => {
        if (url === neurogliaHealth.CAREERS_API_URL) return verifiedCareersApiPayload
        if (url === neurogliaHealth.DOCTOR_CAREERS_API_URL) return verifiedDoctorCareersApiPayload
        throw new Error(`Unexpected JSON URL: ${url}`)
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    neurogliaHealth.createNeurogliaHealthScraper().run({
      fetchText: async (url) => {
        if (url === neurogliaHealth.HOMEPAGE_URL) return verifiedHomepageHtml
        if (url === neurogliaHealth.CAREERS_URL) {
          return verifiedCareersHtml.replace('/api/careers', '/api/roles')
        }
        if (url === neurogliaHealth.DOCTOR_CAREERS_URL) return verifiedDoctorCareersHtml
        throw new Error(`Unexpected text URL: ${url}`)
      },
      fetchJson: async (url) => {
        if (url === neurogliaHealth.CAREERS_API_URL) return verifiedCareersApiPayload
        if (url === neurogliaHealth.DOCTOR_CAREERS_API_URL) return verifiedDoctorCareersApiPayload
        throw new Error(`Unexpected JSON URL: ${url}`)
      },
    }),
    /verified careers page/i,
  )

  await assert.rejects(
    neurogliaHealth.createNeurogliaHealthScraper().run({
      fetchText: async (url) => {
        if (url === neurogliaHealth.HOMEPAGE_URL) return verifiedHomepageHtml
        if (url === neurogliaHealth.CAREERS_URL) return verifiedCareersHtml
        if (url === neurogliaHealth.DOCTOR_CAREERS_URL) return verifiedDoctorCareersHtml
        throw new Error(`Unexpected text URL: ${url}`)
      },
      fetchJson: async (url) => {
        if (url === neurogliaHealth.CAREERS_API_URL) return verifiedCareersApiPayload
        if (url === neurogliaHealth.DOCTOR_CAREERS_API_URL) return verifiedDoctorCareersApiPayload
        if (url === 'https://dailyrounds.org/api/careers/profile/SDEI') {
          return { job_details: { exists: false } }
        }
        if (url === 'https://dailyrounds.org/api/careers/profile/QA_Engineer_I') {
          return verifiedGeneralDetailsBySlug.QA_Engineer_I
        }
        if (url === 'https://dailyrounds.org/api/careers/doctor_profile/medical_writer') {
          return verifiedDoctorDetailsBySlug.medical_writer
        }
        if (url === 'https://dailyrounds.org/api/careers/doctor_profile/category_manager') {
          return verifiedDoctorDetailsBySlug.category_manager
        }
        throw new Error(`Unexpected JSON URL: ${url}`)
      },
    }),
    /detail payload/i,
  )
})

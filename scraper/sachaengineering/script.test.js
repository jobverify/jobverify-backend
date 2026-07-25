import assert from 'node:assert/strict'
import test from 'node:test'

const loadSachaEngineeringModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    return null
  }
}

const FIXED_NOW = '2026-07-11T12:00:00.000Z'

const homepageHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>SACHA Group | Innovative Engineering &amp; Digital Solutions</title>
    <meta
      name="description"
      content="Discover SACHA Group's expertise in delivering advanced engineering, IT, and digital innovation services tailored for diverse industries."
    />
    <link rel="canonical" href="https://sacha.group/" />
    <meta property="og:site_name" content="SACHA" />
  </head>
  <body>
    <main>
      <h1>Engineering + IT, Solved Together</h1>
      <p>Discover SACHA Group's expertise in delivering advanced engineering, IT, and digital innovation services.</p>
      <a href="/careers/">Careers</a>
    </main>
  </body>
</html>
`

const careersHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Careers - SACHA</title>
    <link rel="canonical" href="https://sacha.group/careers/" />
    <meta property="og:site_name" content="SACHA" />
  </head>
  <body>
    <main>
      <h1>Careers</h1>
      <a href="https://bell.careers/company/sacha?tab=jobs">Career Search</a>
      <a href="https://bell.careers/upload-cv">Send your CV</a>
      <a href="https://bell.careers/company/sacha?tab=jobs">Current openings</a>
    </main>
  </body>
</html>
`

const bellJobsHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>SACHA Engineering - Bell Careers</title>
    <link rel="canonical" href="https://bell.careers/company/sacha" />
    <meta property="og:title" content="SACHA Engineering - Bell Careers" />
    <meta property="og:image:alt" content="SACHA Engineering Logo" />
  </head>
  <body>
    <script>
      self.__next_f.push([1,"{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"Organization\\",\\"name\\":\\"SACHA Engineering\\",\\"url\\":\\"https://bell.careers/company/sacha\\",\\"email\\":\\"info@sacha.engineering\\",\\"job_posts\\":[{\\"job_post_title\\":\\"CAD Automation Engineer_Fresher\\",\\"post_id\\":181,\\"published_date\\":\\"2026-06-25T06:24:16.378777Z\\",\\"description\\":\\"$1e\\",\\"job_type\\":\\"full_time\\",\\"currency\\":\\"INR\\",\\"experience_level\\":\\"0-1\\",\\"skills\\":\\"CAD, NX, CATIA, Creo, SolidWorks, AutoCAD, C#, Python, VB.NET, C++, Java, Analytical Skills, Problem-Solving Skills, Engineering Software Development, Automation, CAD Customization, Design Workflow Automation, AI, Communication, Basic programming\\",\\"location\\":\\"None\\",\\"qualifications\\":\\"B.E./B.Tech in Mechanical Engineering, Automobile Engineering, or Computer Science Engineering\\",\\"slug\\":\\"sacha-engineering-cad-automation-engineer-with-0-1-181\\"},{\\"job_post_title\\":\\"Java Jakarta Expert\\",\\"post_id\\":180,\\"published_date\\":\\"2026-06-24T10:48:44.738358Z\\",\\"description\\":\\"$1f\\",\\"job_type\\":\\"full_time\\",\\"currency\\":\\"INR\\",\\"experience_level\\":\\"7-15\\",\\"skills\\":\\"Java, Jakarta EE, Domain-Driven Design, DDD, Cloud-Native Systems, Architecture, Java SE, JPA, CDI, EJB, JAX-RS, Microservices Architecture, Distributed Systems, AWS, Azure, GCP, Docker, Kubernetes, Event-Driven Architectures, Messaging Systems, Kafka, RabbitMQ, API Design, RESTful, CI/CD Pipelines, Git, Jenkins, Problem-Solving Skills, Leadership Skills, Reactive Frameworks, NoSQL Databases, MongoDB, Hazelcast, Security Frameworks, OAuth2, Prometheus, Grafana, DSA\\",\\"location\\":\\"None\\",\\"qualifications\\":\\"Any Degree\\",\\"slug\\":\\"sacha-engineering-java-jakarta-expert-with-7-15-180\\"}]}"])
    </script>
    <script>self.__next_f.push([1,"1e:T732,"])</script>
    <script>self.__next_f.push([1,"Job Summary We are seeking a highly motivated and detail-oriented CAD Automation Engineer to join our team. This role will focus on developing and implementing automation solutions for our CAD processes."])</script>
    <script>self.__next_f.push([1,"1f:T733,"])</script>
    <script>self.__next_f.push([1,"Job Summary We are seeking a highly skilled and experienced Java Jakarta Expert to join our team. This is a hybrid role within the IT / Technology industry."])</script>
  </body>
</html>
`

test('SACHA Engineering validates the official homepage, careers handoff, and Bell payload extraction', async () => {
  const sachaengineering = await loadSachaEngineeringModule()
  assert.ok(sachaengineering, 'Expected SACHA Engineering scraper module at ./script.js')

  const {
    SOURCE,
    COMPANY,
    HOMEPAGE_URL,
    CAREERS_URL,
    BELL_JOBS_URL,
    hasOfficialHomepageSignal,
    hasOfficialCareersSignal,
    extractBellJobPosts,
  } = sachaengineering

  assert.equal(SOURCE, 'sachaengineering')
  assert.equal(COMPANY, 'SACHA Engineering')
  assert.equal(HOMEPAGE_URL, 'https://sacha.group/')
  assert.equal(CAREERS_URL, 'https://sacha.group/careers/')
  assert.equal(BELL_JOBS_URL, 'https://bell.careers/company/sacha?tab=jobs')
  assert.equal(hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(hasOfficialCareersSignal(careersHtml), true)

  assert.deepEqual(extractBellJobPosts(bellJobsHtml), [
    {
      jobId: 'sachaengineering-181',
      requisitionId: '181',
      title: 'CAD Automation Engineer_Fresher',
      company: 'SACHA Engineering',
      department: null,
      location: null,
      city: null,
      country: 'India',
      sourceUrl: 'https://bell.careers/company/sacha?tab=jobs',
      applyUrl: 'https://bell.careers/company/sacha?tab=jobs',
      employmentType: 'Full-time',
      experienceRequired: '0-1 Years',
      minimumQualification: 'B.E./B.Tech in Mechanical Engineering, Automobile Engineering, or Computer Science Engineering',
      preferredQualification: null,
      requiredSkills: [
        'CAD',
        'NX',
        'CATIA',
        'Creo',
        'SolidWorks',
        'AutoCAD',
        'C#',
        'Python',
        'VB.NET',
        'C++',
        'Java',
        'Analytical Skills',
        'Problem-Solving Skills',
        'Engineering Software Development',
        'Automation',
        'CAD Customization',
        'Design Workflow Automation',
        'AI',
        'Communication',
        'Basic programming',
      ],
      postingDate: '2026-06-25',
      closingDate: null,
      jobDescription: 'Job Summary We are seeking a highly motivated and detail-oriented CAD Automation Engineer to join our team. This role will focus on developing and implementing automation solutions for our CAD processes.',
      remoteStatus: null,
    },
    {
      jobId: 'sachaengineering-180',
      requisitionId: '180',
      title: 'Java Jakarta Expert',
      company: 'SACHA Engineering',
      department: null,
      location: null,
      city: null,
      country: 'India',
      sourceUrl: 'https://bell.careers/company/sacha?tab=jobs',
      applyUrl: 'https://bell.careers/company/sacha?tab=jobs',
      employmentType: 'Full-time',
      experienceRequired: '7-15 Years',
      minimumQualification: 'Any Degree',
      preferredQualification: null,
      requiredSkills: [
        'Java',
        'Jakarta EE',
        'Domain-Driven Design',
        'DDD',
        'Cloud-Native Systems',
        'Architecture',
        'Java SE',
        'JPA',
        'CDI',
        'EJB',
        'JAX-RS',
        'Microservices Architecture',
        'Distributed Systems',
        'AWS',
        'Azure',
        'GCP',
        'Docker',
        'Kubernetes',
        'Event-Driven Architectures',
        'Messaging Systems',
        'Kafka',
        'RabbitMQ',
        'API Design',
        'RESTful',
        'CI/CD Pipelines',
        'Git',
        'Jenkins',
        'Problem-Solving Skills',
        'Leadership Skills',
        'Reactive Frameworks',
        'NoSQL Databases',
        'MongoDB',
        'Hazelcast',
        'Security Frameworks',
        'OAuth2',
        'Prometheus',
        'Grafana',
        'DSA',
      ],
      postingDate: '2026-06-24',
      closingDate: null,
      jobDescription: 'Job Summary We are seeking a highly skilled and experienced Java Jakarta Expert to join our team. This is a hybrid role within the IT / Technology industry.',
      remoteStatus: 'Hybrid',
    },
  ])
})

test('SACHA Engineering run fetches the official homepage, careers handoff page, and Bell jobs tab', async () => {
  const sachaengineering = await loadSachaEngineeringModule()
  assert.ok(sachaengineering, 'Expected SACHA Engineering scraper module at ./script.js')

  const requestedUrls = []
  const jobs = await sachaengineering.createSachaEngineeringScraper({
    now: () => FIXED_NOW,
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === sachaengineering.HOMEPAGE_URL) return homepageHtml
      if (url === sachaengineering.CAREERS_URL) return careersHtml
      if (url === sachaengineering.BELL_JOBS_URL) return bellJobsHtml

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    'https://sacha.group/',
    'https://sacha.group/careers/',
    'https://bell.careers/company/sacha?tab=jobs',
  ])
  assert.equal(jobs.length, 2)
  assert.deepEqual(
    jobs.map((job) => ({
      title: job.title,
      jobId: job.jobId,
      sourceUrl: job.sourceUrl,
      applyUrl: job.applyUrl,
      link: job.link,
      source: job.source,
      companyCareerPage: job.companyCareerPage,
      companyDomain: job.companyDomain,
      atsPlatform: job.atsPlatform,
      scrapedAt: job.scrapedAt,
    })),
    [
      {
        title: 'CAD Automation Engineer_Fresher',
        jobId: 'sachaengineering-181',
        sourceUrl: 'https://bell.careers/company/sacha?tab=jobs',
        applyUrl: 'https://bell.careers/company/sacha?tab=jobs',
        link: 'https://bell.careers/company/sacha?tab=jobs',
        source: 'sachaengineering',
        companyCareerPage: 'https://sacha.group/careers/',
        companyDomain: 'sacha.group',
        atsPlatform: 'bell-careers-via-first-party-company-handoff',
        scrapedAt: FIXED_NOW,
      },
      {
        title: 'Java Jakarta Expert',
        jobId: 'sachaengineering-180',
        sourceUrl: 'https://bell.careers/company/sacha?tab=jobs',
        applyUrl: 'https://bell.careers/company/sacha?tab=jobs',
        link: 'https://bell.careers/company/sacha?tab=jobs',
        source: 'sachaengineering',
        companyCareerPage: 'https://sacha.group/careers/',
        companyDomain: 'sacha.group',
        atsPlatform: 'bell-careers-via-first-party-company-handoff',
        scrapedAt: FIXED_NOW,
      },
    ],
  )
})

test('SACHA Engineering fails closed when the verified homepage, careers handoff, or Bell payload drifts', async () => {
  const sachaengineering = await loadSachaEngineeringModule()
  assert.ok(sachaengineering, 'Expected SACHA Engineering scraper module at ./script.js')

  await assert.rejects(
    sachaengineering.createSachaEngineeringScraper().run({
      fetchText: async (url) => {
        if (url === sachaengineering.HOMEPAGE_URL) {
          return '<html><head><title>Home</title></head><body><h1>Welcome</h1></body></html>'
        }

        return careersHtml
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    sachaengineering.createSachaEngineeringScraper().run({
      fetchText: async (url) => {
        if (url === sachaengineering.HOMEPAGE_URL) return homepageHtml
        if (url === sachaengineering.CAREERS_URL) {
          return `
            <html>
              <head><title>Careers - SACHA</title></head>
              <body><main><h1>Careers</h1><p>No first-party Bell handoff here anymore.</p></main></body>
            </html>
          `
        }

        return bellJobsHtml
      },
    }),
    /verified official careers handoff/i,
  )

  await assert.rejects(
    sachaengineering.createSachaEngineeringScraper().run({
      fetchText: async (url) => {
        if (url === sachaengineering.HOMEPAGE_URL) return homepageHtml
        if (url === sachaengineering.CAREERS_URL) return careersHtml
        return `
          <html>
            <head><title>SACHA Engineering - Bell Careers</title></head>
            <body>
              <script>self.__next_f.push([1,"{\\"name\\":\\"SACHA Engineering\\",\\"url\\":\\"https://bell.careers/company/sacha\\"}"])</script>
            </body>
          </html>
        `
      },
    }),
    /verified Bell company jobs payload/i,
  )
})

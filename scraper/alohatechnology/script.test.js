import assert from 'node:assert/strict'
import test from 'node:test'

import {
  APPLICATION_EMAIL,
  CAREERS_PAGE_URL,
  COMPANY_HOME_URL,
  createAlohaTechnologyScraper,
  extractCareerJobs,
  pageIndicatesAlohaTechnologyCareers,
} from './script.js'

const careersHtml = `
  <html>
    <body>
      <section>
        <h2>JOIN OUR TEAM</h2>
        <h1>We are always looking out for great talent to join our family</h1>
        <p>
          If you would like to work with us, please send your resume at
          <a href="mailto:hr@alohatechnology.com">hr@alohatechnology.com</a>.
          Our team will get back to you. Also below are the current openings at Aloha.
        </p>

        <div class="opening">
          <h3>Business Development Executive</h3>
          <p>Experience:- 1-7 yrs.</p>
          <h6>Profile</h6>
          <ul>
            <li>Lead generation, cold calling.</li>
            <li>Prepare and analyze sales pipeline reports and dashboards.</li>
            <li>Excellent communication.</li>
          </ul>
        </div>

        <div class="opening">
          <h3>Content Writer(Technical/Non-Technical)</h3>
          <p>Experience:- 2-5 yrs.</p>
          <h6>Profile</h6>
          <ul>
            <li>Writing high quality marketing and thought leadership collateral.</li>
            <li>Responsible for writing and editing Case Studies / Brochures / Flyers / Blogs / Articles etc.</li>
            <li>Knowledge of SEO, online marketing, wordpress, google stock screener would be plus.</li>
          </ul>
        </div>

        <div class="opening">
          <h3>Business Analyst</h3>
          <p>Experience:- 0-5 yrs.</p>
          <h6>Profile</h6>
          <ul>
            <li>Ability to provide strategic vision and thorough product and business case analysis.</li>
            <li>Ability to handle multiples tasks effectively and on tight deadlines.</li>
            <li>Technical expertise, should have a clear and concise understanding of basic concepts and technologies and the ability continuously acquire new technological competencies.</li>
          </ul>
        </div>

        <div class="opening">
          <h3>Software Developer/Engineer(PHP)</h3>
          <p>Experience:- 0-3 yrs.</p>
          <h6>Profile</h6>
          <ul>
            <li>Required Good knowledge of PHP, java script and SQL.</li>
            <li>Required knowledge MVC / CakePHP / Zend / CodeIgniter / Custom / jQuery / AJAX.</li>
          </ul>
        </div>

        <div class="opening">
          <h3>Software Developer/Engineer(.Net)</h3>
          <p>Experience:- 0-3 yrs.</p>
          <h6>Profile</h6>
          <ul>
            <li>Knowledge of Asp.net and VB.Net with C#.net using AJAX and MVC and SQL.</li>
            <li>Strong Knowledge of OOPS Concepts, Bootstrap, Javascript, jQuery.</li>
          </ul>
        </div>
      </section>
    </body>
  </html>
`

test('extractCareerJobs parses the public Aloha Technology openings from the official careers page shape', () => {
  assert.equal(COMPANY_HOME_URL, 'https://www.alohatechnology.com/')
  assert.equal(CAREERS_PAGE_URL, 'https://www.alohatechnology.com/careers.html')
  assert.equal(APPLICATION_EMAIL, 'hr@alohatechnology.com')
  assert.equal(pageIndicatesAlohaTechnologyCareers(careersHtml), true)

  assert.deepEqual(extractCareerJobs(careersHtml), [
    {
      title: 'Business Development Executive',
      company: 'Aloha Technology',
      department: null,
      location: null,
      city: null,
      country: null,
      jobId: 'alohatechnology-business-development-executive',
      requisitionId: 'alohatechnology-business-development-executive',
      sourceUrl: CAREERS_PAGE_URL,
      applyUrl: 'mailto:hr@alohatechnology.com',
      employmentType: null,
      experienceRequired: '1-7 yrs.',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [
        'Lead generation, cold calling.',
        'Prepare and analyze sales pipeline reports and dashboards.',
        'Excellent communication.',
      ],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Experience: 1-7 yrs. Profile: Lead generation, cold calling. Prepare and analyze sales pipeline reports and dashboards. Excellent communication. Apply by emailing hr@alohatechnology.com.',
    },
    {
      title: 'Content Writer(Technical/Non-Technical)',
      company: 'Aloha Technology',
      department: null,
      location: null,
      city: null,
      country: null,
      jobId: 'alohatechnology-content-writer-technical-non-technical',
      requisitionId: 'alohatechnology-content-writer-technical-non-technical',
      sourceUrl: CAREERS_PAGE_URL,
      applyUrl: 'mailto:hr@alohatechnology.com',
      employmentType: null,
      experienceRequired: '2-5 yrs.',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [
        'Writing high quality marketing and thought leadership collateral.',
        'Responsible for writing and editing Case Studies / Brochures / Flyers / Blogs / Articles etc.',
        'Knowledge of SEO, online marketing, wordpress, google stock screener would be plus.',
      ],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Experience: 2-5 yrs. Profile: Writing high quality marketing and thought leadership collateral. Responsible for writing and editing Case Studies / Brochures / Flyers / Blogs / Articles etc. Knowledge of SEO, online marketing, wordpress, google stock screener would be plus. Apply by emailing hr@alohatechnology.com.',
    },
    {
      title: 'Business Analyst',
      company: 'Aloha Technology',
      department: null,
      location: null,
      city: null,
      country: null,
      jobId: 'alohatechnology-business-analyst',
      requisitionId: 'alohatechnology-business-analyst',
      sourceUrl: CAREERS_PAGE_URL,
      applyUrl: 'mailto:hr@alohatechnology.com',
      employmentType: null,
      experienceRequired: '0-5 yrs.',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [
        'Ability to provide strategic vision and thorough product and business case analysis.',
        'Ability to handle multiples tasks effectively and on tight deadlines.',
        'Technical expertise, should have a clear and concise understanding of basic concepts and technologies and the ability continuously acquire new technological competencies.',
      ],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Experience: 0-5 yrs. Profile: Ability to provide strategic vision and thorough product and business case analysis. Ability to handle multiples tasks effectively and on tight deadlines. Technical expertise, should have a clear and concise understanding of basic concepts and technologies and the ability continuously acquire new technological competencies. Apply by emailing hr@alohatechnology.com.',
    },
    {
      title: 'Software Developer/Engineer(PHP)',
      company: 'Aloha Technology',
      department: null,
      location: null,
      city: null,
      country: null,
      jobId: 'alohatechnology-software-developer-engineer-php',
      requisitionId: 'alohatechnology-software-developer-engineer-php',
      sourceUrl: CAREERS_PAGE_URL,
      applyUrl: 'mailto:hr@alohatechnology.com',
      employmentType: null,
      experienceRequired: '0-3 yrs.',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [
        'Required Good knowledge of PHP, java script and SQL.',
        'Required knowledge MVC / CakePHP / Zend / CodeIgniter / Custom / jQuery / AJAX.',
      ],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Experience: 0-3 yrs. Profile: Required Good knowledge of PHP, java script and SQL. Required knowledge MVC / CakePHP / Zend / CodeIgniter / Custom / jQuery / AJAX. Apply by emailing hr@alohatechnology.com.',
    },
    {
      title: 'Software Developer/Engineer(.Net)',
      company: 'Aloha Technology',
      department: null,
      location: null,
      city: null,
      country: null,
      jobId: 'alohatechnology-software-developer-engineer-net',
      requisitionId: 'alohatechnology-software-developer-engineer-net',
      sourceUrl: CAREERS_PAGE_URL,
      applyUrl: 'mailto:hr@alohatechnology.com',
      employmentType: null,
      experienceRequired: '0-3 yrs.',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [
        'Knowledge of Asp.net and VB.Net with C#.net using AJAX and MVC and SQL.',
        'Strong Knowledge of OOPS Concepts, Bootstrap, Javascript, jQuery.',
      ],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Experience: 0-3 yrs. Profile: Knowledge of Asp.net and VB.Net with C#.net using AJAX and MVC and SQL. Strong Knowledge of OOPS Concepts, Bootstrap, Javascript, jQuery. Apply by emailing hr@alohatechnology.com.',
    },
  ])
})

test('run fetches the official Aloha Technology careers page and decorates jobs for persistence', async () => {
  const requestedUrls = []
  const jobs = await createAlohaTechnologyScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return careersHtml
    },
  })

  assert.deepEqual(requestedUrls, [CAREERS_PAGE_URL])
  assert.equal(jobs.length, 5)
  assert.equal(jobs[0].source, 'alohatechnology')
  assert.equal(jobs[0].link, 'mailto:hr@alohatechnology.com')
  assert.match(jobs[0].scrapedAt, /^\d{4}-\d{2}-\d{2}T/)
})

test('extractCareerJobs rejects an unexpected Aloha Technology careers page shape', () => {
  assert.equal(pageIndicatesAlohaTechnologyCareers('<main><h1>Careers</h1></main>'), false)
  assert.throws(
    () => extractCareerJobs('<main><h1>Careers</h1></main>'),
    /expected public openings/,
  )
})

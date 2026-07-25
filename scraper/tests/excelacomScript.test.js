import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const loadExcelacomModule = async () => {
  try {
    return await import('../excelacom/script.js')
  } catch {
    assert.fail('Expected Excelacom scraper module at ../excelacom/script.js')
  }
}

const testDir = path.dirname(fileURLToPath(import.meta.url))
const rssFixturePath = path.join(testDir, 'fixtures', 'excelacom', 'rss-live.xml')
const rssXml = readFileSync(rssFixturePath, 'utf8')

const indiaItem = `
<item>
<title>Senior Engineer</title>
<link>https://phg.tbe.taleo.net/phg02/ats/careers/requisition.jsp?org=EXCELACOM&amp;cws=38&amp;rid=9999</link>
<guid>https://phg.tbe.taleo.net/phg02/ats/careers/requisition.jsp?org=EXCELACOM&amp;cws=38&amp;rid=9999</guid>
<description>Senior Engineer Bengaluru, India Build telecom systems and ship reliable software.</description>
<pubDate>Wed, 09 Jul 2026 08:00:00 GMT</pubDate>
<taleo:reqId>9999</taleo:reqId>
<taleo:location>Karnataka</taleo:location>
<taleo:locationCountry>IN</taleo:locationCountry>
<taleo:locationState>IN-KA</taleo:locationState>
<taleo:locationCity>Bengaluru</taleo:locationCity>
<taleo:department>Engineering</taleo:department>
<taleo:html-description>&lt;p&gt;Build telecom systems and ship reliable software.&lt;/p&gt;</taleo:html-description>
</item>
`

const rssWithIndiaItem = rssXml.replace('</channel>', `${indiaItem}\n</channel>`)

test('extractJobsFromFeed parses the official Excelacom Taleo RSS fixture and normalizes links, descriptions, and inferred locations', async () => {
  const excelacom = await loadExcelacomModule()

  assert.equal(
    excelacom.RSS_FEED_URL,
    'https://phg.tbe.taleo.net/phg02/ats/servlet/Rss?org=EXCELACOM&cws=38&WebPage=SRCHR_V2&WebVersion=0&_rss_version=2',
  )

  const jobs = excelacom.extractJobsFromFeed(rssXml)

  assert.equal(jobs.length, 9)
  assert.deepEqual(jobs[0], {
    title: 'Data Scientist',
    company: 'Excelacom',
    department: 'Corporate',
    location: 'Virginia, United States',
    city: null,
    state: 'Virginia',
    country: 'United States',
    jobId: '3371',
    requisitionId: '3371',
    sourceUrl: 'https://phg.tbe.taleo.net/phg02/ats/careers/requisition.jsp?org=EXCELACOM&cws=38&rid=3371',
    applyUrl: 'https://phg.tbe.taleo.net/phg02/ats/careers/requisition.jsp?org=EXCELACOM&cws=38&rid=3371',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-07-07T13:26:08.000Z',
    closingDate: null,
    jobDescription: 'Data Scientist Reston, VA Who We Are: Excelacom is a global consulting and technology solutions firm solving client\'s complex business and technology challenges through a mix of consulting expertise, telecom-focused software, and managed services within the communications and media industries. Who You Are: At the Consultant-level, you will be expected to independently contribute ideas, recommendations, and solutions toward solving business challenges, construct key components of deliverables/presentations, and contribute to the development of Intellectual Capital (IC) and Marketing Collateral. You will serve as a team leader for individual work streams and acquire a comprehensive understanding of the firm\'s expertise, product set, and capabilities. Most importantly, you will embrace our firm\'s brand and core values. Role and Responsibilities: You may work on various projects throughout your career with Excelacom. The roles and responsibilities noted below pertain to the specific role listed above. Specialize in data driven, advanced analytics approaches to solving client problems Build everything from basic reports to advanced machine learning models, generative AI applications, and AI agent workflows and algorithms to drive improvements to our client\'s operations Deliver advisory services to Excelacom Senior Management on how AI/ML, generative AI, and AI agents can be leveraged to enable business improvements Build solutions from understanding business problems, to collecting datasets, to analyzing data, to modeling, to validating, to delivering models, and producing insights for our clients Ability to quantify the business value of ML projects Design and orchestrate AI agent workflows and multi-agent systems, integrating large language models (LLMs) into client operational processes Map AI/ML and agentic solutions to industry frameworks (e.g., TM Forum eTOM/ODA) to align delivery with telecom client lifecycle domains Prepare solutions and proposals and present to clients Responsible for individual projects in order to determine, define, and deploy machine learning and data analytics technologies to meet business objectives Proactively research data and identify opportunities to drive the product roadmap Leveraging Excelacom\'s domestic and international assets and expertise to bring new ideas to clients Required Qualifications: Master\'s degree or equivalent in Machine learning or Data Science Project experience using Supervised and Unsupervised ML algorithms, NLP and Text Mining, Anomaly Detection 3+ years of experience developing ML solutions using Python, TensorFlow, Scikit-learn, Pandas, and experience integrating Large Language Models (LLMs) via APIs (e.g., OpenAI, Anthropic) and building agentic AI workflows (e.g., LangChain, LangGraph) Prior consulting experience with a leading strategy firm, consulting practice, or consulting technology firm Experience with prompt engineering, retrieval-augmented generation (RAG), and LLM evaluation/observability techniques Familiarity with TM Forum frameworks (eTOM, ODA) or telecom operational processes, and responsible AI/governance considerations for client-facing deployments, is a plus Excellent writing, presentation and communications skills Strong verbal and written communication skills with the ability to interact with technical and non-technical personnel Ability to communicate and build relationships with Directors, VPs, etc. Ability to work in a highly intensive timeline environment with minimal guidance. Demonstrate experience eliciting requirements using interviews, document analysis, business process reviews, and task and workflow analysis. Analyze and de-conflict requirements, data and information from multiple data sources and decompose them into detailed requirements. **Excelacom is currently unable to provide visa sponsorship for this position. All applicants must be authorized to work in the United States on a permanent and ongoing basis without the need for current or future employer sponsorship.** Compensation and Benefits: For individuals assigned to work in Virginia, Excelacom is required to include a reasonable estimated compensation range for this role. However, final salaries will vary based on several factors, such as candidate\'s level, qualifications, skills, competencies and proficiency for the role. An individual may be hired at the Analyst, Consultant, or Manager level for this role with each level requiring an increasing set of responsibilities. For regular full-time employees, the estimated salary range is from $100,000 to $140,000. Our competitive salaries are just one component of Excelacom\'s total compensation package for our regular full-time employees. Other rewards and benefits include: health, vision, and dental insurance, ancillary benefits, Life and AD&D insurance, 401k, and generous paid time off policies. EEO Statement: Excelacom, Inc. is an equal opportunity employer. Any decision affecting employment, compensation, promotion, or transfer will be based solely on personal qualifications and merit, regardless of sex, race, color, religion, gender identity, sexual orientation, marital status, national origin, disability, age, results of genetic testing, service in the military, pregnancy, childbirth or other related medical conditions or any other factor protected under applicable law. #LI-JH1',
  })

  const texasRole = jobs.find((job) => job.jobId === '3359')
  assert.ok(texasRole)
  assert.equal(texasRole.country, 'United States')
  assert.equal(texasRole.location, 'Texas, United States')
  assert.equal(jobs.every((job) => !job.applyUrl.includes('&amp;')), true)
})

test('run filters the verified Excelacom feed down to India roles and keeps India jobs when the Taleo RSS contains them', async () => {
  const excelacom = await loadExcelacomModule()
  const requestedUrls = []
  const scrapedAt = new Date('2026-07-09T12:34:56.000Z')

  const scraper = excelacom.createExcelacomScraper({
    now: () => scrapedAt,
  })

  const noIndiaJobs = await scraper.run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return rssXml
    },
  })

  assert.deepEqual(requestedUrls, [excelacom.RSS_FEED_URL])
  assert.deepEqual(noIndiaJobs, [])

  const indiaJobs = await scraper.run({
    fetchText: async () => rssWithIndiaItem,
  })

  assert.deepEqual(indiaJobs, [{
    title: 'Senior Engineer',
    company: 'Excelacom',
    department: 'Engineering',
    location: 'Bengaluru, Karnataka, India',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    jobId: '9999',
    requisitionId: '9999',
    sourceUrl: 'https://phg.tbe.taleo.net/phg02/ats/careers/requisition.jsp?org=EXCELACOM&cws=38&rid=9999',
    applyUrl: 'https://phg.tbe.taleo.net/phg02/ats/careers/requisition.jsp?org=EXCELACOM&cws=38&rid=9999',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-07-09T08:00:00.000Z',
    closingDate: null,
    jobDescription: 'Build telecom systems and ship reliable software.',
    source: 'excelacom',
    link: 'https://phg.tbe.taleo.net/phg02/ats/careers/requisition.jsp?org=EXCELACOM&cws=38&rid=9999',
    scrapedAt: '2026-07-09T12:34:56.000Z',
  }])
})

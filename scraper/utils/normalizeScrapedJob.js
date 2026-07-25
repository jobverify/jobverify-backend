import { extractJobFilterSignals } from '../../src/utils/jobFilterSignals.js'

const normalizeString = (value) => {
  if (value == null) return null
  const normalized = String(value).replace(/\s+/g, ' ').trim()
  return normalized || null
}

const DESCRIPTION_SECTION_LABELS = [
  'Network & Links',
  'Overall Purpose Of The Role',
  'Responsibilities',
  'Behavioral Competencies',
  'Technical Competencies & Experience',
  'Technical Competencies',
  'Software Skills',
  'IT Skills',
  'Language & Skills',
  'Preferred Qualifications',
  'Minimum Qualifications',
  'Qualifications',
  'Education',
  'Role',
]

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const buildFlexibleLabelPattern = (label) => label
  .split(/(\s+|&)/)
  .filter(Boolean)
  .map((part) => {
    if (part === '&') return '\\s*&\\s*'
    if (/^\s+$/.test(part)) return '\\s+'
    return escapeRegex(part)
  })
  .join('')

const normalizeDescription = (value) => {
  if (value == null) return null

  let normalized = String(value)
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()

  if (!normalized) return null

  normalized = normalized
    .replace(/^about\s+(?:this|the)\s+role\s*:?\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim()

  for (const label of DESCRIPTION_SECTION_LABELS) {
    const labelPattern = new RegExp(`\\s*${buildFlexibleLabelPattern(label)}\\s*:`, 'gi')
    normalized = normalized.replace(labelPattern, (match, offset) => {
      const labelText = match.replace(/\s*:\s*$/u, '').replace(/\s+/g, ' ').trim().toUpperCase()
      return `${offset === 0 ? '' : '\n\n'}${labelText}:\n`
    })
  }

  normalized = normalized
    .replace(/(ROLE:\n[^\n]{1,80})\s+(?=(?:As|The|Candidate|You|We|This|Our)\b)/g, '$1\n')
    .replace(/\s+(?=\d+\.\s)/g, '\n')
    .replace(/\s+(?=-\s+)/g, '\n')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return normalized || null
}

const normalizeUrl = (value) => {
  const normalized = normalizeString(value)
  if (!normalized) return null

  try {
    const parsed = new URL(normalized)
    if (!['http:', 'https:'].includes(parsed.protocol)) return null
    if (parsed.pathname === '/' && !parsed.search && !parsed.hash) {
      return parsed.origin
    }
    return parsed.toString()
  } catch {
    return null
  }
}

const normalizeStringArray = (value) => {
  if (Array.isArray(value)) {
    return [...new Set(value.map(normalizeString).filter(Boolean))]
  }

  if (typeof value === 'string') {
    return [...new Set(
      value
        .split(/[,\n|/]/)
        .map(normalizeString)
        .filter(Boolean),
    )]
  }

  return []
}

const SKILL_NAME_FILTER_SOURCES = new Set([
  '7edgesolutions',
  'acciojob',
  'americanchase',
  'arisinfra',
  'banyancloud',
  'bhanzu',
  'c3ihub',
  'cloudthat',
  'cognida',
  'epaylater',
  'gocomet',
  'hiveminds',
  'impactanalytics',
  'infocuspinnovations',
  'isocrates',
  'kapture',
  'openfinancialtechnologies',
  'rapteehv',
  'relanto',
  'sisainformationsecurity',
  'solarsquare',
  'surveysparrow',
  'unboxrobotics',
])

const LIKELY_TECHNICAL_ACRONYMS = new Set([
  'AWS',
  'GCP',
  'SQL',
  'CAD',
  'ROS',
  'SAP',
  'ERP',
  'ETL',
  'API',
  'SDK',
  'CI/CD',
])

const TECHNICAL_SKILL_PATTERNS = [
  { pattern: /\bnode\.?js\b/i, value: 'Node.js' },
  { pattern: /\breact(?:\.js)?\b/i, value: 'React' },
  { pattern: /\btypescript\b/i, value: 'TypeScript' },
  { pattern: /\bjavascript\b/i, value: 'JavaScript' },
  { pattern: /\bpython\b/i, value: 'Python' },
  { pattern: /\bjava\b/i, value: 'Java' },
  { pattern: /\bkotlin\b/i, value: 'Kotlin' },
  { pattern: /\bandroid\b/i, value: 'Android' },
  { pattern: /\bc\+\+\b/i, value: 'C++' },
  { pattern: /\bc#\b/i, value: 'C#' },
  { pattern: /(?:^|[^a-z])\.net\b/i, value: '.NET' },
  { pattern: /\bphp\b/i, value: 'PHP' },
  { pattern: /\bgolang\b/i, value: 'Golang' },
  { pattern: /\baws\b/i, value: 'AWS' },
  { pattern: /\bazure\b/i, value: 'Azure' },
  { pattern: /\bgcp\b|google cloud/i, value: 'GCP' },
  { pattern: /\bdatabricks\b/i, value: 'Databricks' },
  { pattern: /\bspark\b/i, value: 'Spark' },
  { pattern: /\bmongodb\b/i, value: 'MongoDB' },
  { pattern: /\bpostgres(?:ql)?\b/i, value: 'PostgreSQL' },
  { pattern: /\bmysql\b/i, value: 'MySQL' },
  { pattern: /\bsql\b/i, value: 'SQL' },
  { pattern: /\bfigma\b/i, value: 'Figma' },
  { pattern: /\bhubspot\b/i, value: 'HubSpot' },
  { pattern: /\bsalesforce\b/i, value: 'Salesforce' },
  { pattern: /\bsolidworks\b/i, value: 'SolidWorks' },
  { pattern: /\bcad\b/i, value: 'CAD' },
  { pattern: /\bros\b/i, value: 'ROS' },
  { pattern: /\bdocker\b/i, value: 'Docker' },
  { pattern: /\bkubernetes\b/i, value: 'Kubernetes' },
  { pattern: /\bterraform\b/i, value: 'Terraform' },
  { pattern: /\bjenkins\b/i, value: 'Jenkins' },
  { pattern: /\blinux\b/i, value: 'Linux' },
  { pattern: /\bredis\b/i, value: 'Redis' },
  { pattern: /\bkafka\b/i, value: 'Kafka' },
  { pattern: /\bairflow\b/i, value: 'Airflow' },
  { pattern: /\bsnowflake\b/i, value: 'Snowflake' },
  { pattern: /\btableau\b/i, value: 'Tableau' },
  { pattern: /\bpower\s*bi\b/i, value: 'Power BI' },
  { pattern: /\bsap\b/i, value: 'SAP' },
  { pattern: /\boracle\b/i, value: 'Oracle' },
  { pattern: /\bokta\b/i, value: 'Okta' },
  { pattern: /\bjamf\b/i, value: 'Jamf' },
  { pattern: /\bgoogle workspace\b/i, value: 'Google Workspace' },
  { pattern: /\btensorflow\b/i, value: 'TensorFlow' },
  { pattern: /\bpytorch\b/i, value: 'PyTorch' },
  { pattern: /\bopenai\b/i, value: 'OpenAI' },
]

const EXPERIENCE_RANGE_PATTERN = /(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s+years?/i
const EXPERIENCE_VALUE_PATTERN = /(\d+(?:\.\d+)?)\s*(\+|plus)?\s+years?/i

const normalizeSourceId = (value) => normalizeString(value)?.toLowerCase() || null

const looksLikeTechnicalSkillToken = (value) => {
  const normalized = normalizeString(value)
  if (!normalized) return false

  if (LIKELY_TECHNICAL_ACRONYMS.has(normalized.toUpperCase())) return true
  if (/[.+#]/.test(normalized)) return true
  if (/[a-z][A-Z]/.test(normalized)) return true

  return false
}

const extractTechnicalSkillNames = (skill) => {
  const normalized = normalizeString(skill)
  if (!normalized) return []

  const matches = TECHNICAL_SKILL_PATTERNS
    .filter(({ pattern }) => pattern.test(normalized))
    .map(({ value }) => value)

  if (matches.length > 0) return [...new Set(matches)]
  if (looksLikeTechnicalSkillToken(normalized)) return [normalized]

  return []
}

const filterSkillNamesTagsForSource = (skills = [], source) => {
  if (!SKILL_NAME_FILTER_SOURCES.has(normalizeSourceId(source))) {
    return skills
  }

  return [...new Set(skills.flatMap((skill) => extractTechnicalSkillNames(skill)))]
}

const isPartTimeLabel = (value) => /part[\s_-]?time/i.test(String(value ?? ''))

const inferEmploymentType = (job = {}) => {
  const explicitType = normalizeString(job.employmentType)
  if (explicitType) return isPartTimeLabel(explicitType) ? null : explicitType
  if (job.jobType === 'Full-time Fresher' || job.jobType === 'Full-time Experienced') {
    return 'Full-time'
  }
  if (job.jobType === 'Internship' || job.jobType === 'Contract') {
    return job.jobType
  }
  if (isPartTimeLabel(job.jobType)) return null

  const title = (job.title || '').toLowerCase()
  if (/intern|internship|trainee|apprentice/i.test(title)) return 'Internship'
  if (/contract|contractor|freelance/i.test(title)) return 'Contract'
  if (/part.?time/i.test(title)) return null
  return 'Full-time'
}

const hasFresherCue = (job = {}) => {
  const haystack = [
    job.title,
    job.department,
    job.description,
    job.jobDescription,
    job.minimumQualification,
    job.preferredQualification,
    job.experienceRequired,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return [
    /\bfresher\b/,
    /\bgraduate\b/,
    /\bcampus\b/,
    /\bentry level\b/,
    /\bnew grad\b/,
    /\btrainee\b/,
    /\bapprentice\b/,
    /\b0\s*-\s*1\s+years?\b/,
    /\b0\s+to\s+1\s+years?\b/,
    /\b0\s+years?\b/,
  ].some((pattern) => pattern.test(haystack))
}

const getExperienceBounds = (job = {}) => {
  const profileMinimumYears = Number.parseFloat(job?.experienceProfile?.minimumYears)
  const profileMaximumSource = job?.experienceProfile?.maximumYears
  const profileMaximumYears = profileMaximumSource == null
    ? null
    : Number.parseFloat(profileMaximumSource)

  if (Number.isFinite(profileMinimumYears) || Number.isFinite(profileMaximumYears)) {
    return {
      minimumYears: Number.isFinite(profileMinimumYears) ? Math.floor(profileMinimumYears) : null,
      maximumYears: Number.isFinite(profileMaximumYears) ? Math.ceil(profileMaximumYears) : null,
    }
  }

  const experienceText = normalizeString(job.experienceRequired)?.toLowerCase() || ''
  if (!experienceText) {
    return {
      minimumYears: null,
      maximumYears: null,
    }
  }

  const rangeMatch = experienceText.match(EXPERIENCE_RANGE_PATTERN)
  if (rangeMatch) {
    return {
      minimumYears: Math.floor(Number.parseFloat(rangeMatch[1])),
      maximumYears: Math.ceil(Number.parseFloat(rangeMatch[2])),
    }
  }

  const valueMatch = experienceText.match(EXPERIENCE_VALUE_PATTERN)
  if (valueMatch) {
    const years = Math.floor(Number.parseFloat(valueMatch[1]))
    return {
      minimumYears: years,
      maximumYears: valueMatch[2] ? null : years,
    }
  }

  return {
    minimumYears: null,
    maximumYears: null,
  }
}

const hasNonEntryExperienceRequirement = ({ minimumYears, maximumYears } = {}) =>
  (Number.isFinite(minimumYears) && minimumYears > 1)
  || (Number.isFinite(maximumYears) && maximumYears > 1)

const inferExperienceLevel = (job = {}) => {
  const explicitLevel = normalizeString(job.experienceLevel)
  const { minimumYears, maximumYears } = getExperienceBounds(job)
  const hasExperiencedYears = hasNonEntryExperienceRequirement({ minimumYears, maximumYears })

  if (explicitLevel && !(explicitLevel === 'Entry Level' && hasExperiencedYears)) {
    return explicitLevel
  }

  if (job.jobType === 'Full-time Fresher' && !hasExperiencedYears) return 'Entry Level'
  if (job.jobType === 'Full-time Experienced') return 'Mid Level'

  if (!hasExperiencedYears && hasFresherCue(job)) return 'Entry Level'

  const title = (job.title || '').toLowerCase()
  if (/\b(senior|sr\.?|staff|lead|principal|architect|manager|director|head|vp|vice president)\b/.test(title)) {
    return 'Senior Level'
  }

  if (Number.isFinite(minimumYears) || Number.isFinite(maximumYears)) {
    if (Number.isFinite(minimumYears) && minimumYears <= 1) {
      if (
        minimumYears === 0
        && Number.isFinite(maximumYears)
        && maximumYears >= 2
        && /\b(junior|jr\.?|associate)\b/.test(title)
      ) {
        return 'Junior Level'
      }
      if (Number.isFinite(maximumYears) && maximumYears > 3) {
        return 'Mid Level'
      }
      return 'Entry Level'
    }

    const anchorYears = Number.isFinite(minimumYears) ? minimumYears : maximumYears
    if (anchorYears === 2) return 'Junior Level'
    if (anchorYears >= 3) return 'Mid Level'
  }

  if (/\b(junior|jr\.?|associate)\b/.test(title)) return 'Junior Level'
  if (/\b(ii|iii|iv|2|3|4)\b/.test(title)) return 'Mid Level'
  return 'Mid Level'
}

const composeJobType = ({ employmentType, experienceLevel }) => {
  if (!employmentType) return null
  if (employmentType !== 'Full-time') return employmentType
  return experienceLevel === 'Entry Level'
    ? 'Full-time Fresher'
    : 'Full-time Experienced'
}

export const resolveJobType = (job = {}) => {
  const employmentType = inferEmploymentType(job)
  const experienceLevel = inferExperienceLevel(job)
  return composeJobType({ employmentType, experienceLevel })
}

const TITLE_NORMALIZATION_RULES = [
  { pattern: /\b(sde|software developer|software engineer|backend engineer|back-end engineer|frontend engineer|front-end engineer|full stack engineer|fullstack engineer|application developer|web developer)\b/i, value: 'Software Engineer' },
  { pattern: /\b(data engineer)\b/i, value: 'Data Engineer' },
  { pattern: /\b(machine learning engineer|ml engineer)\b/i, value: 'Machine Learning Engineer' },
  { pattern: /\b(devops engineer|site reliability engineer|sre)\b/i, value: 'DevOps Engineer' },
  { pattern: /\b(security engineer|cybersecurity engineer)\b/i, value: 'Security Engineer' },
  { pattern: /\b(network engineer)\b/i, value: 'Network Engineer' },
  { pattern: /\b(firmware developer|firmware engineer)\b/i, value: 'Firmware Engineer' },
  { pattern: /\b(embedded software engineer|embedded engineer)\b/i, value: 'Embedded Engineer' },
  { pattern: /\b(rtl design engineer|rtl engineer)\b/i, value: 'RTL Engineer' },
  { pattern: /\b(asic verification engineer|verification engineer)\b/i, value: 'Verification Engineer' },
  { pattern: /\b(mechanical design engineer|mechanical engineer)\b/i, value: 'Mechanical Engineer' },
  { pattern: /\b(electrical engineer)\b/i, value: 'Electrical Engineer' },
  { pattern: /\b(civil engineer)\b/i, value: 'Civil Engineer' },
  { pattern: /\b(automation engineer)\b/i, value: 'Automation Engineer' },
  { pattern: /\b(robotics engineer)\b/i, value: 'Robotics Engineer' },
]

const normalizeTitle = (title) => {
  const normalizedTitle = normalizeString(title)
  if (!normalizedTitle) return null

  const matchedRule = TITLE_NORMALIZATION_RULES.find((rule) => rule.pattern.test(normalizedTitle))
  return matchedRule ? matchedRule.value : normalizedTitle
}

const ENGINEERING_DOMAIN_RULES = [
  { pattern: /\b(machine learning|ml engineer|artificial intelligence|ai engineer)\b/i, value: 'Machine Learning' },
  { pattern: /\b(data engineer|etl|data pipeline)\b/i, value: 'Data Engineering' },
  { pattern: /\b(devops|site reliability|sre|kubernetes|terraform)\b/i, value: 'DevOps' },
  { pattern: /\b(cloud|aws|azure|gcp)\b/i, value: 'Cloud' },
  { pattern: /\b(cybersecurity|security engineer|application security)\b/i, value: 'Security' },
  { pattern: /\b(network engineer|routing|switching|network security)\b/i, value: 'Networking' },
  { pattern: /\b(firmware)\b/i, value: 'Firmware' },
  { pattern: /\b(embedded)\b/i, value: 'Embedded Systems' },
  { pattern: /\b(rtl)\b/i, value: 'RTL' },
  { pattern: /\b(verification)\b/i, value: 'Verification' },
  { pattern: /\b(dft)\b/i, value: 'DFT' },
  { pattern: /\b(analog)\b/i, value: 'Analog Design' },
  { pattern: /\b(\brf\b|radio frequency)\b/i, value: 'RF' },
  { pattern: /\b(asic|vlsi|physical design|semiconductor)\b/i, value: 'Semiconductor' },
  { pattern: /\b(software|developer|backend|frontend|full stack|platform engineering)\b/i, value: 'Software Engineering' },
  { pattern: /\b(electrical)\b/i, value: 'Electrical' },
  { pattern: /\b(mechanical)\b/i, value: 'Mechanical' },
  { pattern: /\b(civil)\b/i, value: 'Civil' },
  { pattern: /\b(construction)\b/i, value: 'Construction' },
  { pattern: /\b(chemical)\b/i, value: 'Chemical' },
  { pattern: /\b(process)\b/i, value: 'Process' },
  { pattern: /\b(manufacturing)\b/i, value: 'Manufacturing' },
  { pattern: /\b(industrial)\b/i, value: 'Industrial' },
  { pattern: /\b(automation)\b/i, value: 'Automation' },
  { pattern: /\b(robotics)\b/i, value: 'Robotics' },
  { pattern: /\b(telecom|telecommunications)\b/i, value: 'Telecommunications' },
  { pattern: /\b(power systems|power engineer)\b/i, value: 'Power Systems' },
  { pattern: /\b(renewable energy|solar|wind)\b/i, value: 'Renewable Energy' },
  { pattern: /\b(oil|gas|petroleum)\b/i, value: 'Oil & Gas' },
  { pattern: /\b(automotive)\b/i, value: 'Automotive' },
  { pattern: /\b(ev|electric vehicle|battery)\b/i, value: 'EV' },
  { pattern: /\b(aerospace|avionics)\b/i, value: 'Aerospace' },
  { pattern: /\b(biomedical|medical device)\b/i, value: 'Biomedical' },
  { pattern: /\b(mining)\b/i, value: 'Mining' },
  { pattern: /\b(materials)\b/i, value: 'Materials' },
  { pattern: /\b(research|r&d)\b/i, value: 'Research' },
]

const inferEngineeringDomain = (job = {}, normalizedTitle) => {
  const explicitDomain = normalizeString(job.engineeringDomain)
  if (explicitDomain) return explicitDomain

  const titleBasedDomain = {
    'Software Engineer': 'Software Engineering',
    'Data Engineer': 'Data Engineering',
    'Machine Learning Engineer': 'Machine Learning',
    'DevOps Engineer': 'DevOps',
    'Security Engineer': 'Security',
    'Network Engineer': 'Networking',
    'Firmware Engineer': 'Firmware',
    'Embedded Engineer': 'Embedded Systems',
    'RTL Engineer': 'RTL',
    'Verification Engineer': 'Verification',
    'Mechanical Engineer': 'Mechanical',
    'Electrical Engineer': 'Electrical',
    'Civil Engineer': 'Civil',
    'Automation Engineer': 'Automation',
    'Robotics Engineer': 'Robotics',
  }
  if (normalizedTitle && titleBasedDomain[normalizedTitle]) {
    return titleBasedDomain[normalizedTitle]
  }

  const haystack = [
    job.title,
    normalizedTitle,
    job.department,
    job.description,
    job.jobDescription,
  ]
    .filter(Boolean)
    .join(' ')

  const matchedRule = ENGINEERING_DOMAIN_RULES.find((rule) => rule.pattern.test(haystack))
  return matchedRule ? matchedRule.value : 'Unknown'
}

const inferRemoteStatus = (job = {}) => {
  const explicitStatus = normalizeString(job.remoteStatus)
  if (explicitStatus) return explicitStatus

  const values = [
    job.location,
    ...(Array.isArray(job.locations) ? job.locations : []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  if (!values) return null
  if (values.includes('remote') && (values.includes('hybrid') || values.includes('office') || values.includes('on-site') || values.includes('onsite'))) {
    return 'Hybrid'
  }
  if (values.includes('hybrid')) return 'Hybrid'
  if (values.includes('remote')) return 'Remote'
  return 'On-site'
}

const inferCountry = (job = {}, provider = {}) => {
  const explicitCountry = normalizeString(job.country || provider.countryFilter)
  if (explicitCountry) return explicitCountry

  const location = normalizeString(job.location)
  if (/india/i.test(location || '')) return 'India'
  return null
}

const extractCompanyDomain = (job = {}, provider = {}) => {
  const explicitDomain = normalizeString(job.companyDomain || provider.companyDomain)
  if (explicitDomain) return explicitDomain.toLowerCase()

  for (const candidate of [
    job.companyCareerPage,
    provider.companyCareerPage,
    job.applyUrl,
    job.link,
    job.sourceUrl,
  ]) {
    const url = normalizeUrl(candidate)
    if (!url) continue
    return new URL(url).hostname.replace(/^www\./i, '').toLowerCase()
  }

  return null
}

const normalizeDate = (value) => {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export const normalizeScrapedJob = (job = {}, provider = {}) => {
  const originalTitle = normalizeString(job.originalTitle || job.title)
  const normalizedTitle = normalizeTitle(originalTitle)
  const applyUrl = normalizeUrl(job.applyUrl || job.link || job.sourceUrl)
  const sourceUrl = normalizeUrl(job.sourceUrl || job.link || job.applyUrl)
  const requiredSkills = filterSkillNamesTagsForSource(
    normalizeStringArray(job.requiredSkills),
    job.source || provider.source,
  )
  const employmentType = inferEmploymentType(job)
  const experienceLevel = inferExperienceLevel(job)
  const normalizedJob = {
    ...job,
    title: originalTitle,
    company: normalizeString(job.company || provider.companyName),
    originalTitle,
    normalizedTitle,
    jobCategory: normalizeString(job.jobCategory) || normalizedTitle,
    engineeringDomain: inferEngineeringDomain(job, normalizedTitle),
    employmentType,
    experienceLevel,
    jobType: resolveJobType({ ...job, employmentType, experienceLevel }),
    location: normalizeString(job.location),
    city: normalizeString(job.city),
    state: normalizeString(job.state),
    country: inferCountry(job, provider),
    remoteStatus: inferRemoteStatus(job),
    department: normalizeString(job.department),
    jobDescription: normalizeDescription(job.jobDescription || job.description),
    minimumQualification: normalizeString(job.minimumQualification),
    preferredQualification: normalizeString(job.preferredQualification),
    requiredSkills,
    experienceRequired: normalizeString(job.experienceRequired),
    salary: normalizeString(job.salary),
    jobId: normalizeString(job.jobId),
    requisitionId: normalizeString(job.requisitionId || job.reqId),
    postingDate: normalizeDate(job.postingDate || job.postedAt),
    closingDate: normalizeDate(job.closingDate),
    applyUrl,
    sourceUrl: sourceUrl || applyUrl,
    companyCareerPage: normalizeUrl(job.companyCareerPage || provider.companyCareerPage),
    companyDomain: extractCompanyDomain(job, provider),
    atsPlatform: normalizeString(job.atsPlatform || provider.atsPlatform),
    scrapedTimestamp: normalizeDate(job.scrapedTimestamp || job.scrapedAt) || new Date(),
  }

  return {
    ...normalizedJob,
    ...extractJobFilterSignals(normalizedJob),
  }
}

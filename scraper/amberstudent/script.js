import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchJsonWithRetry, fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
export const SOURCE = 'amberstudent'
export const COMPANY = 'Amberstudent'
export const VERIFIED_ON = '2026-10-03'
export const CAREERS_URL = 'https://amberstudent.com/career'
export const JOB_OPENING_URL = 'https://amberstudent.com/job-opening'
export const KEKA_BOARD_URL = 'https://amberstudent.keka.com/careers/'
export const KEKA_IDENTIFIER = '228f83f5-48b3-474a-b753-4fce2be7524f'
export const KEKA_INFO_URL = `${KEKA_BOARD_URL}api/organization/default/careerportalinfo`
export const KEKA_JOBS_URL = `${KEKA_BOARD_URL}api/embedjobs/default/active/${KEKA_IDENTIFIER}`
const ASSET_ROOT = 'https://cdn-static-assets.amberstudent.com/amber-user-website/build/assets/'
const USER_AGENT = 'Mozilla/5.0 (compatible; Jobverify scraper)'
const clean = value => String(value ?? '').replace(/<[^>]+>/g, ' ')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;/gi, "'").replace(/\s+/g, ' ').trim()
const escaped = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const defaultFetchText = (url, { signal } = {}) => fetchTextWithRetry(url, {
  signal, headers: { 'User-Agent': USER_AGENT }, label: SOURCE, timeoutMs: 15000,
})
const defaultFetchJson = (url, { signal } = {}) => fetchJsonWithRetry(url, {
  signal, headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }, label: SOURCE, timeoutMs: 15000,
})

export const hasOfficialCareersSignal = html => /<title[^>]*>\s*Careers \| Amber\s*<\/title>/i.test(html)
  && /href=["'](?:https:\/\/amberstudent\.com)?\/job-opening["']/i.test(html)
  && /Explore Open Roles/i.test(html)

// Read the public webpack route/chunk mapping as text; never evaluate downloaded code.
export const resolveJobsChunkUrl = main => {
  const variable = main.match(/path:"\/job-opening",exact:!0,component:([\w$]+)\.A/)?.[1]
  const moduleId = variable && main.match(new RegExp(escaped(variable) + '=[\\w$]+\\((\\d+)\\)'))?.[1]
  const start = moduleId ? main.indexOf(`${moduleId}:function`) : -1
  if (start < 0) throw new Error('Amber current jobs route module handoff is missing')
  const block = main.slice(start, start + 8000)
  const imports = block.match(/chunkName:\(\)=>"Jobs"[\s\S]*?importAsync:\(\)=>Promise\.all\(\[([^\]]+)\]/)?.[1]
  const ids = [...String(imports || '').matchAll(/\.e\("(\d+)"\)/g)].map(match => match[1])
  const chunkId = ids.at(-1)
  const runtime = main.slice(main.indexOf('.u=function(e){return"js/"'))
  const hash = chunkId && runtime.match(new RegExp('(?:\\{|,)' + chunkId + ':"([a-f0-9]+)"'))?.[1]
  if (!hash || !runtime.includes('[e]+".desktop.js"')) throw new Error('Amber current jobs chunk handoff is missing')
  return `${ASSET_ROOT}js/${chunkId}.${hash}.desktop.js`
}

export const hasVerifiedKekaJobsChunk = chunk => (
  (chunk.includes(`identifier:"${KEKA_IDENTIFIER}"`) && chunk.includes(`domain:"${KEKA_BOARD_URL}"`))
  || (chunk.includes(`u="${KEKA_BOARD_URL.replace(/\/$/, '')}"`)
    && chunk.includes('m=`${u}/api/embedjobs/default/active/' + KEKA_IDENTIFIER + '`'))
)

export const extractKekaJobs = payload => {
  if (!Array.isArray(payload)) throw new Error('Amber invalid Keka inventory: expected a complete jobs array')
  const jobs = [], seen = new Set()
  let unknownGeography = false
  for (const row of payload) {
    const id = clean(row?.id), title = clean(row?.title), description = clean(row?.description)
    if (!/^\d+$/.test(id) || !title || !description || !Array.isArray(row.jobLocations)) throw new Error('Amber incomplete Keka inventory: invalid job')
    if (seen.has(id)) throw new Error('Amber incomplete Keka inventory: duplicate job ID')
    seen.add(id)
    if (!row.jobLocations.length || row.jobLocations.some(location => !clean(location?.countryCode) && !clean(location?.countryName))) unknownGeography = true
    const locations = row.jobLocations.filter(location => /^(?:IN|India)$/i.test(clean(location.countryCode || location.countryName)))
    if (!locations.length) continue
    const cities = [...new Set(locations.map(location => clean(location.city || location.name)).filter(Boolean))]
    const sourceUrl = `${KEKA_BOARD_URL}jobdetails/${id}`
    const posted = row.publishedOn ? new Date(row.publishedOn) : null
    if (posted && !Number.isFinite(posted.getTime())) throw new Error('Amber invalid Keka posting date')
    jobs.push({
      title, company: COMPANY, source: SOURCE, jobId: id, requisitionId: id,
      location: [...cities, 'India'].join(', '), city: cities[0] || null, country: 'India',
      department: clean(row.departmentName) || null,
      sourceUrl, applyUrl: `${KEKA_BOARD_URL}applyjob/${id}`, link: sourceUrl,
      postingDate: posted?.toISOString().slice(0, 10) || null,
      employmentType: row.jobType === 2 ? 'Full-time' : null,
      experienceRequired: clean(row.experience) || null,
      requiredSkills: Array.isArray(row.skillNames) ? row.skillNames.map(clean).filter(Boolean) : [],
      jobDescription: description, companyCareerPage: CAREERS_URL, companyDomain: 'amberstudent.com', atsPlatform: 'keka',
    })
  }
  if (unknownGeography && jobs.length === 0) throw new Error('Amber incomplete country scope: no verified India positives')
  return jobs.map(job => ({ ...job, ...(unknownGeography ? { sourceListingComplete: false } : {}) }))
}

export const createAmberstudentScraper = ({ maxJobs = null } = {}) => ({
  async run({ fetchText = defaultFetchText, fetchJson = defaultFetchJson, signal, now = () => new Date().toISOString() } = {}) {
    signal?.throwIfAborted()
    const read = async url => { const value = await fetchText(url, { signal }); signal?.throwIfAborted(); return value }
    const careers = await read(CAREERS_URL)
    if (!hasOfficialCareersSignal(careers)) throw new Error('Amber current first-party careers handoff is unverified')
    const opening = await read(JOB_OPENING_URL)
    const mainUrl = opening.match(/src=["'](https:\/\/cdn-static-assets\.amberstudent\.com\/amber-user-website\/build\/assets\/js\/main\.[a-f0-9]+\.desktop\.js)["']/)?.[1]
    if (!mainUrl) throw new Error('Amber current jobs route has no verified first-party asset handoff')
    const chunk = await read(resolveJobsChunkUrl(await read(mainUrl)))
    if (!hasVerifiedKekaJobsChunk(chunk)) throw new Error('Amber current jobs module no longer binds the verified Keka tenant')
    const info = await fetchJson(KEKA_INFO_URL, { signal })
    signal?.throwIfAborted()
    if (info?.name !== 'amber' || info?.shortName !== 'amber' || info?.careersPortalDomain !== 'amberstudent.keka.com') throw new Error('Amber Keka tenant identity is unverified')
    const jobs = extractKekaJobs(await fetchJson(KEKA_JOBS_URL, { signal }))
    signal?.throwIfAborted()
    const selected = Number.isInteger(maxJobs) && maxJobs > 0 ? jobs.slice(0, maxJobs) : jobs
    return selected.map(job => ({ ...job, ...(selected.length < jobs.length ? { sourceListingComplete: false } : {}), scrapedAt: now() }))
  },
})
export const run = options => createAmberstudentScraper(options).run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const jobs = await run()
  if (process.argv.includes('--dry-run')) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}

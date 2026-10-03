import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { attachInventoryEvidence, readInventoryEvidence } from '../../scraper-support/utils/inventoryEvidence.js'
import { extractClientRoles, contractFailure } from './clientRoles.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'persevex'
export const COMPANY = 'Persevex'
export const HOMEPAGE_URL = 'https://www.persevex.com/'
export const CAREERS_URL = 'https://www.persevex.com/careers'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const INDIA_LOCATION_PATTERN = /^(?:Remote \(India\)|Hybrid \((?:Bangalore|Bengaluru|Pune) \/ (?:Remote|India)\)|India)$/i
const CARD_PATTERN = /<div class="bg-card border border-border rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"[\s\S]*?<button class="w-full text-left[^"]*"[^>]*>([\s\S]*?)<\/button>/gi

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 16)))
  .replace(/&#(\d+);/g, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 10)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
  .replace(/\u00a0/g, ' ')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtmlEntities(String(value))
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' '),
)

const extractOpenRolesSection = (html) =>
  String(html ?? '').match(/<section[^>]+id=["']open-roles["'][^>]*>[\s\S]*?<\/section>/i)?.[0] || ''

const extractDisplayedRoleCount = (sectionHtml) => {
  const count = sectionHtml.match(/Showing\s*<span[^>]*>(\d+)<\/span>\s*role/i)?.[1]
  return count ? Number.parseInt(count, 10) : null
}

const extractTextValues = (html) =>
  [...String(html ?? '').matchAll(/<span\b[^>]*>([\s\S]*?)<\/span>/gi)]
    .map((match) => stripTags(match[1]))
    .filter(Boolean)

const extractBadges = (cardHtml) =>
  extractTextValues(
    cardHtml.match(/<div class="flex flex-wrap items-center gap-2 mb-2">([\s\S]*?)<\/div>/i)?.[1] ?? '',
  )

const extractMetadataValues = (cardHtml) =>
  extractTextValues(
    cardHtml.match(
      /<div class="flex flex-wrap items-center gap-4 mt-2 text-xs text-muted-foreground">([\s\S]*?)<\/div>/i,
    )?.[1] ?? '',
  )

const normalizeIndiaLocation = (value) => {
  const location = normalizeWhitespace(value)
  if (!location) return null
  return location
}

const normalizeCompensation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  return normalized.replace(/^💰\s*/u, '')
}

const extractCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return null

  const hybridCity = normalized.match(/\b(Bangalore|Bengaluru|Pune)\b/i)?.[1]
  if (!hybridCity) return null

  return /^bengaluru$/i.test(hybridCity) ? 'Bangalore' : hybridCity
}

const normalizeWorkplaceType = (location) => {
  const normalized = normalizeWhitespace(location)?.toLowerCase()
  if (!normalized) return null
  if (normalized.startsWith('remote')) return 'Remote'
  if (normalized.startsWith('hybrid')) return 'Hybrid'
  return 'On-site'
}

const isIndiaLocation = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return false
  return INDIA_LOCATION_PATTERN.test(normalized)
}

export const hasVerifiedCareersLink = (html) =>
  /href=["']\/careers["']/i.test(String(html ?? ''))

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page)?.toLowerCase() || ''

  return /<title>\s*Persevex\s*\|\s*Persevex\s*<\/title>/i.test(page)
    && text.includes('campus ambassador')
    && (text.includes('job clox')
      || (text.includes('learn. build. launch your career')
        && /mailto:support@persevex\.com/i.test(page)
        && /property=["']og:site_name["']\s+content=["']Persevex["']/i.test(page)))
    && text.includes('persevex lms')
    && hasVerifiedCareersLink(page)
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page)?.toLowerCase() || ''
  const rolesSection = stripTags(extractOpenRolesSection(page))?.toLowerCase() || ''

  return /<title>\s*Persevex\s*\|\s*Persevex\s*<\/title>/i.test(page)
    && text.includes('join the team')
    && text.includes('help students launch careers')
    && text.includes('build yours here')
    && rolesSection.includes('open positions')
    && rolesSection.includes('apply in under a minute')
    && rolesSection.includes("don't see your role")
}

export const extractPublishedClientUrl = html => {
  const candidates = [...String(html ?? '').matchAll(/<script\b[^>]*src=["']([^"']+)["']/gi)]
    .map(match => decodeHtmlEntities(match[1])).filter(value => value.includes('/careers/page-'))
  if (candidates.length !== 1) throw contractFailure('Persevex requires exactly one published careers client URL')
  let url
  try { url = new URL(candidates[0], CAREERS_URL) } catch { throw contractFailure('Persevex invalid published client URL identity') }
  if (url.origin !== new URL(CAREERS_URL).origin
    || !/^\/_next\/static\/chunks\/app\/\(main\)\/careers\/page-[a-f0-9]+\.js$/.test(url.pathname)
    || url.username || url.password || url.hash
    || [...url.searchParams.keys()].some(key => key !== 'dpl')
    || url.searchParams.getAll('dpl').length > 1) throw contractFailure('Persevex published client URL must retain the verified same-origin path')
  return url.href
}

const assertPageIdentity = (page, expected) => {
  if (Number(page?.status) !== 200 || page.url !== expected) throw contractFailure('Persevex response URL/status identity changed for ' + expected)
}

export const extractPublicJobs = (html, client, { pagesFetched = 2 } = {}) => {
  if (!hasOfficialCareersSignal(html)) throw contractFailure('Persevex careers page no longer matches the verified public careers page')
  if (!client) throw contractFailure('Persevex published careers client is required; HTML card metadata is not a description')
  const section = extractOpenRolesSection(html), count = extractDisplayedRoleCount(section)
  if (!Number.isInteger(count) || count <= 0) throw contractFailure('Persevex role count does not verify an explicit empty inventory')
  const cards = [...section.matchAll(CARD_PATTERN)].map(match => {
    const card = match[1], badges = extractBadges(card), metadata = extractMetadataValues(card)
    const title = stripTags(card.match(/<h3 class="text-lg font-bold text-foreground">([\s\S]*?)<\/h3>/i)?.[1])
    if (!title || badges.length !== 2 || metadata.length < 2 || badges[0] !== metadata[1]) throw contractFailure('Persevex malformed visible role cards')
    return { title, department: badges[1], type: badges[0], location: metadata[0], stipend: normalizeCompensation(metadata[2]) }
  })
  const roles = extractClientRoles(client)
  if (cards.length !== count || roles.length !== count) throw contractFailure('Persevex published role count and visible card count mismatch')
  const seen = new Set()
  for (const role of roles) {
    const card = cards.find(card => card.title === role.title)
    if (!card || seen.has(card.title) || card.department !== role.department || card.type !== role.type
      || card.location !== role.location || (card.stipend || null) !== (role.stipend || null)) throw contractFailure('Persevex published client role does not match visible card binding: ' + role.id)
    seen.add(card.title)
  }
  const unknown = roles.filter(role => !isIndiaLocation(role.location)).map(({ id, title, location }) => ({ id, title, location }))
  const india = roles.filter(role => isIndiaLocation(role.location))
  const reason = unknown.length
    ? String(unknown.length) + ' roles have unverified India geography: ' + JSON.stringify(unknown)
    : 'All published roles match visible cards and explicit India locations'
  if (!india.length) throw Object.assign(contractFailure('Persevex has no verified India inventory: ' + reason), { code: 'PERSEVEX_GEOGRAPHY_UNVERIFIED', failureKind: 'upstream_geography_unverified', abortRetries: true, unresolvedRoles: unknown })
  const jobs = india.map(role => {
    const workplaceType = normalizeWorkplaceType(role.location)
    return {
      title: role.title, company: COMPANY, department: role.department,
      location: role.location, city: extractCity(role.location), state: null, country: 'India',
      jobId: role.id, requisitionId: role.id, sourceUrl: CAREERS_URL, applyUrl: CAREERS_URL,
      employmentType: role.type, workplaceType, experienceRequired: null, minimumQualification: null,
      preferredQualification: null, requiredSkills: [], requirements: [...role.requirements],
      postingDate: null, closingDate: null,
      jobDescription: role.description + '\n\nRequirements:\n' + role.requirements.map(text => '- ' + text).join('\n'),
      publicExperienceChecked: true, remoteStatus: workplaceType, sourceListingComplete: unknown.length === 0,
    }
  })
  attachInventoryEvidence(jobs, {
    status: unknown.length ? 'coverage-gap' : 'complete-inventory', surface: CAREERS_URL, firstParty: true,
    listingComplete: unknown.length === 0, pagesFetched, reportedTotal: roles.length, indiaFacetCount: india.length,
    verifiedAt: new Date().toISOString(), reason,
  })
  const evidence = readInventoryEvidence(jobs)
  evidence.unverifiedGeographyCount = unknown.length
  evidence.unresolvedRoles = unknown
  return jobs
}

export const fetchPersevexPage = async url => {
  let current = new URL(url)
  const origin = new URL(HOMEPAGE_URL).origin
  for (let redirects = 0; redirects <= 3; redirects++) {
    if (current.origin !== origin || current.username || current.password) throw contractFailure('Persevex untrusted request URL identity')
    const response = await fetch(current.href, {
      redirect: 'manual', headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/javascript;q=0.9,*/*;q=0.8' },
      signal: AbortSignal.timeout(15000),
    })
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location) throw contractFailure('Persevex redirect location missing')
      let next
      try { next = new URL(location, current) } catch { throw contractFailure('Persevex invalid redirect URL identity') }
      if (next.origin !== origin || next.username || next.password) throw contractFailure('Persevex untrusted redirect URL identity')
      await response.body?.cancel?.()
      current = next
      continue
    }
    return { status: response.status, url: response.url, html: await response.text() }
  }
  throw contractFailure('Persevex redirect limit exceeded')
}

export const createPersevexScraper = () => ({
  async run({ fetchPage = fetchPersevexPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)
    assertPageIdentity(homepage, HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepage.html) || !hasVerifiedCareersLink(homepage.html)) throw contractFailure('Persevex official homepage no longer matches the verified first-party surface')
    const careers = await fetchPage(CAREERS_URL)
    assertPageIdentity(careers, CAREERS_URL)
    if (!hasOfficialCareersSignal(careers.html)) throw contractFailure('Persevex careers page no longer matches the verified public careers page')
    const clientUrl = extractPublishedClientUrl(careers.html)
    const client = await fetchPage(clientUrl)
    assertPageIdentity(client, clientUrl)
    const jobs = extractPublicJobs(careers.html, client.html, { pagesFetched: 3 })
    for (const job of jobs) Object.assign(job, {
      source: SOURCE, link: CAREERS_URL, scrapedAt: new Date().toISOString(),
      companyCareerPage: CAREERS_URL, companyDomain: 'persevex.com', atsPlatform: 'official-company-careers',
    })
    return jobs
  },
})

export const run = async (options = {}) => createPersevexScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()
  if (isDryRun) saveToFile(readInventoryEvidence(jobs), path.join(currentDir, 'jobs.evidence.json'))

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'acorn'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'cloudambassadors'
export const CAREERS_URL = 'https://cloudambassadors.com/careers'
export const APPLICATION_URL = 'https://cloudambassadors.com/careers/apply'

const normalizeWhitespace = (value) => {
  const normalized = String(value ?? '')
    .replace(/<!--[^]*?-->/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const toJobId = (title) => normalizeWhitespace(title)
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')

const extractOpenRolesSection = (html) => {
  const text = String(html ?? '')
  const openRolesIndex = text.search(/>\s*Open Roles\s*</i)
  if (openRolesIndex < 0) return ''

  const sectionEnd = text.indexOf('</section>', openRolesIndex)
  return text.slice(openRolesIndex, sectionEnd < 0 ? undefined : sectionEnd)
}

export const hasSharedApplicationSignal = (html) => {
  const text = normalizeWhitespace(html) || ''

  return /<title>\s*Cloud Ambassadors[^<]*Maximizing Cloud Impact\s*<\/title>/i.test(String(html ?? ''))
    && /Role &amp; Experience/i.test(String(html ?? ''))
    && /\bLocation\b/i.test(text)
    && /\bEmail\b/i.test(text)
}

export const extractCareerListings = (html) => {
  const roleSection = extractOpenRolesSection(html)
  const titles = [...roleSection.matchAll(
    /<button\b[^>]*class=["'][^"']*\bcursor-pointer\b[^"']*["'][^>]*>([\s\S]*?)<\/button>/gi,
  )]
    .map((match) => normalizeWhitespace(match[1]))
    .filter(Boolean)

  return titles.map((title) => {
    const jobId = toJobId(title)

    return {
      title,
      company: 'Cloud Ambassadors',
      department: null,
      location: null,
      city: null,
      state: null,
      country: 'India',
      jobId,
      requisitionId: jobId,
      sourceUrl: CAREERS_URL,
      applyUrl: APPLICATION_URL,
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      publicExperienceChecked: true,
      remoteStatus: null,
    }
  })
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'cloudambassadors',
  timeoutMs: 15000,
})

// Read literal employer data, never evaluate a downloaded application bundle.
export const extractStaticRoleDescriptions = (javascript, jobs) => {
  if (typeof javascript !== 'string' || javascript.length > 1500000 || !jobs.length) return null
  let ast
  try { ast = parse(javascript, { ecmaVersion: 'latest', sourceType: 'script' }) } catch { return null }
  const expected = new Set(jobs.map(job => job.title)), matches = [], pending = [ast]
  const string = node => node?.type === 'Literal' && typeof node.value === 'string' ? node.value : null
  while (pending.length) {
    const node = pending.pop()
    if (node.type === 'ArrayExpression' && node.elements.length === expected.size) {
      const roles = node.elements.map(element => {
        if (element?.type !== 'ObjectExpression' || element.properties.length !== 4) return null
        const values = new Map()
        for (const property of element.properties) {
          if (property.type !== 'Property' || property.computed || property.method || property.kind !== 'init') return null
          const key = property.key.type === 'Identifier' ? property.key.name : string(property.key)
          if (!['name', 'title', 'bio', 'arr'].includes(key) || values.has(key)) return null
          values.set(key, property.value)
        }
        const name = string(values.get('name')), title = string(values.get('title')), bio = string(values.get('bio'))
        const requirements = values.get('arr')
        if (!expected.has(name) || !title || !bio || bio.length < 80 || requirements?.type !== 'ArrayExpression'
          || !requirements.elements.length || requirements.elements.length > 50) return null
        const items = requirements.elements.map(string)
        if (items.some(item => !item?.trim())) return null
        return { title: name, description: [title, bio, ...items].join('\n\n') }
      })
      if (roles.every(Boolean) && new Set(roles.map(role => role.title)).size === expected.size) matches.push(roles)
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        for (const child of value) if (child?.type) pending.push(child)
      } else if (value?.type) pending.push(value)
    }
  }
  return matches.length === 1 ? matches[0] : null
}

export const linkedCareerAssets = (html) => [...new Set(Array.from(String(html).matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi), match => {
  try {
    const url = new URL(match[1], CAREERS_URL)
    return url.origin === 'https://cloudambassadors.com' && !url.username && !url.password && !url.search && !url.hash
      && /^\/_next\/static\/chunks\/[a-z0-9._-]+\.js$/i.test(url.pathname) ? url.href : null
  } catch { return null }
}).filter(Boolean))].slice(0, 16)

const defaultFetchAsset = (url, { signal }) => fetchTextWithRetry(url, {
  signal, attempts: 1, timeoutMs: 10000, includeResponseMetadata: true,
})

export const createCloudAmbassadorsScraper = () => ({
  async run({ fetchText = defaultFetchText, fetchAsset = defaultFetchAsset, signal,
    detailEnrichmentBudgetMs = 45000, now = () => new Date().toISOString() } = {}) {
    signal?.throwIfAborted()
    const careersHtml = await fetchText(CAREERS_URL)
    const applicationHtml = await fetchText(APPLICATION_URL)

    if (!hasSharedApplicationSignal(applicationHtml)) {
      throw new Error('Cloud Ambassadors shared apply page no longer matches the verified public application surface')
    }

    const jobs = extractCareerListings(careersHtml)
    const assets = linkedCareerAssets(careersHtml), candidates = []
    const requested = Number(detailEnrichmentBudgetMs)
    const budget = Number.isFinite(requested) ? Math.min(120000, Math.max(0, requested)) : 45000
    if (assets.length && jobs.length && budget > 0) {
      const controller = new AbortController()
      const assetSignal = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal
      const timer = setTimeout(() => controller.abort(), budget)
      let cursor = 0
      try {
        await Promise.all(Array.from({ length: Math.min(4, assets.length) }, async () => {
          while (!assetSignal.aborted && cursor < assets.length) {
            const url = assets[cursor++]
            try {
              const response = await fetchAsset(url, { signal: assetSignal })
              assetSignal.throwIfAborted()
              if (response?.status !== 200 || response?.url !== url) continue
              const roles = extractStaticRoleDescriptions(response.html, jobs)
              if (roles) candidates.push(roles)
            } catch { signal?.throwIfAborted() }
          }
        }))
      } finally { clearTimeout(timer) }
    }
    signal?.throwIfAborted()
    const roles = candidates.length === 1 ? new Map(candidates[0].map(role => [role.title, role.description])) : new Map()
    return jobs.map((job) => ({
      ...job,
      jobDescription: roles.get(job.title) || null,
      sourceDescription: roles.get(job.title) || null,
      sourceDetailComplete: roles.has(job.title),
      ...(roles.has(job.title) ? { sourceDetailVerifiedAt: now() }
        : { sourceDetailFailureKind: 'missing-authoritative-jobposting' }),
      source: 'cloudambassadors',
      link: job.applyUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createCloudAmbassadorsScraper().run(options)

export const runStandalone = async ({
  argv = process.argv,
  fetchText,
  saveToFile,
  saveToDB,
} = {}) => {
  const jobs = await createCloudAmbassadorsScraper().run({
    fetchText: fetchText ?? defaultFetchText,
  })

  if (argv.includes('--dry-run')) {
    const writeJobsToFile = saveToFile
      ?? (await import('../../scraper-support/utils/saveToDB.js')).saveToFile
    writeJobsToFile(jobs, path.join(currentDir, 'jobs.json'))
    return jobs
  }

  const persistJobsToDb = saveToDB
    ?? (await import('../../scraper-support/utils/saveToDB.js')).saveToDB
  await persistJobsToDb(jobs, SOURCE)
  return jobs
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await runStandalone()
}

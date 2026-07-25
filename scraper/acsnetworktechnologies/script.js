import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../utils/loadConfig.js'
import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const CAREER_PAGE_URL = 'https://www.placementindia.com/job-recruiters/acs-networks-technologies-dehradun-1140592-ffid/'

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&ndash;|&#8211;/gi, '-')
    .replace(/&mdash;|&#8212;/gi, '-')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripHtml = (value) => normalizeWhitespace(value)

const buildAbsoluteUrl = (href) => {
  const normalized = normalizeWhitespace(href)
  if (!normalized) return CAREER_PAGE_URL

  try {
    return new URL(normalized, CAREER_PAGE_URL).toString()
  } catch {
    return CAREER_PAGE_URL
  }
}

const extractJobIdFromUrl = (url) => {
  const normalized = normalizeWhitespace(url)
  const match = normalized?.match(/-(\d+)\.htm(?:$|\?)/i)
  return match?.[1] || null
}

const extractSkills = (skillsHtml) => {
  const normalized = String(skillsHtml ?? '')
    .replace(/<img[^>]*>/gi, '')

  return normalized
    .split(/<span[^>]*>|<\/span>/i)
    .map((segment) => stripHtml(segment))
    .filter(Boolean)
}

const buildLocation = (...parts) => {
  const values = parts
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean)

  if (!values.length) return null

  const uniqueValues = []
  for (const value of values) {
    if (!uniqueValues.some((existing) => existing.toLowerCase() === value.toLowerCase())) {
      uniqueValues.push(value)
    }
  }

  if (!uniqueValues.some((value) => /india/i.test(value))) uniqueValues.push('India')
  return uniqueValues.join(', ')
}

const extractCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return null
  return normalized.split(',')[0]?.trim() || null
}

const classifyRemoteStatus = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return 'On-site'
  if (/hybrid/i.test(normalized)) return 'Hybrid'
  if (/remote/i.test(normalized)) return 'Remote'
  return 'On-site'
}

const extractMetaMap = (html) => {
  const entries = [...String(html ?? '').matchAll(
    /<li>\s*<p class="lbl">([\s\S]*?)<\/p>\s*<p class="val">([\s\S]*?)<\/p>\s*<\/li>/gi,
  )]

  return Object.fromEntries(
    entries
      .map((match) => [stripHtml(match[1]), stripHtml(match[2])])
      .filter(([label, value]) => label && value),
  )
}

export const extractSearchResults = (html) => {
  const blocks = String(html ?? '')
    .split(/<div class="sjc-iteam pr_list"/i)
    .slice(1)

  return blocks
    .map((block) => {
      const url = buildAbsoluteUrl(block.match(/data-url="([^"]+)"/i)?.[1])
      const title = stripHtml(block.match(/<a[^>]+class="job-name"[^>]*>([\s\S]*?)<\/a>/i)?.[1])
      const company = stripHtml(block.match(/<p class="job-cname">([\s\S]*?)<\/p>/i)?.[1])
      const metadataHtml = block.match(/<ul class="sjci-need">([\s\S]*?)<\/ul>/i)?.[1] || ''
      const metadataItems = [...metadataHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
        .map((match) => stripHtml(match[1]))
        .filter(Boolean)
      const baseLocation = stripHtml(metadataHtml.match(/<span>([\s\S]*?)<\/span>/i)?.[1])
      const extraLocation = stripHtml(metadataHtml.match(/<span class="tooltiptext">([\s\S]*?)<\/span>/i)?.[1])
      const skills = extractSkills(
        block.match(/<div class="sk_list">([\s\S]*?)<\/div>/i)?.[1] || '',
      )
      const jobId = extractJobIdFromUrl(url)
      const location = buildLocation(baseLocation, extraLocation)

      if (!title || !company || !jobId || !location) return null

      return {
        title,
        company,
        department: null,
        location,
        city: extractCity(location),
        country: 'India',
        jobId,
        requisitionId: jobId,
        sourceUrl: url,
        applyUrl: url,
        employmentType: null,
        experienceRequired: metadataItems[0] || null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: skills,
        postingDate: null,
        closingDate: null,
        jobDescription: null,
        remoteStatus: 'On-site',
        salary: metadataItems[1] || null,
      }
    })
    .filter(Boolean)
}

export const extractJobDetails = (html) => {
  const normalizedHtml = String(html ?? '')
  const meta = extractMetaMap(normalizedHtml)
  const description = stripHtml(
    normalizedHtml.match(
      /<h2 class="jdlb-t1">Job Description<\/h2>\s*<div class="dyn_text_sec">([\s\S]*?)<ul class="jr">/i,
    )?.[1],
  )
  const company = stripHtml(
    normalizedHtml.match(/<div class="jd-cname">[\s\S]*?<span>([\s\S]*?)<\/span>/i)?.[1],
  )
  const title = stripHtml(normalizedHtml.match(/<h1 class="jd-title">([\s\S]*?)<\/h1>/i)?.[1])
  const headlineItems = [...normalizedHtml.matchAll(/<ul class="jd-mfl">([\s\S]*?)<\/ul>/gi)]
    .flatMap((match) => [...match[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)])
    .map((match) => stripHtml(match[1]))
    .filter(Boolean)
  const skills = [...normalizedHtml.matchAll(/<span class="ks">\s*<a[^>]*>([\s\S]*?)<\/a>\s*<\/span>/gi)]
    .map((match) => stripHtml(match[1]))
    .filter(Boolean)
  const city = stripHtml(
    normalizedHtml.match(/<li class="location">[\s\S]*?<a[^>]*class="gray"[^>]*>([\s\S]*?)<\/a>/i)?.[1],
  )
  const country = meta['Job Country'] || 'India'
  const experience = meta.Experience
    || headlineItems.find((item) => /\b\d+\s*-\s*\d+\s*Years\b/i.test(item))
    || null
  const salary = headlineItems.find((item) => /lac\s*\/\s*yr/i.test(item)) || null
  const interviewType = headlineItems.find((item) => /interview/i.test(item)) || null

  return {
    title,
    company,
    location: buildLocation(city, country),
    city: extractCity(city),
    country,
    experienceRequired: experience,
    employmentType: meta['Type of Job'] || null,
    minimumQualification: meta.Education || null,
    preferredQualification: null,
    requiredSkills: skills,
    jobDescription: description,
    remoteStatus: classifyRemoteStatus(meta['Work Location Type']),
    openings: meta['No. of Openings'] || null,
    industry: normalizeWhitespace(meta['Industry Type']?.replace(/\s{2,}/g, ' ')) || null,
    interviewType,
    interviewLocation: meta['Face Interview Location'] || null,
    salary,
  }
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'acsnetworktechnologies',
  timeoutMs: 15000,
})

export const createAcsNetworkTechnologiesScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run(options = {}) {
    const fetchText = options.fetchText || defaultFetchText
    const listingHtml = await fetchText(CAREER_PAGE_URL)
    const jobs = extractSearchResults(listingHtml)
    const selectedJobs = maxJobs ? jobs.slice(0, maxJobs) : jobs

    const enrichedJobs = await Promise.all(
      selectedJobs.map(async (job) => {
        try {
          const detailHtml = await fetchText(job.sourceUrl)
          const detail = extractJobDetails(detailHtml)
          return {
            ...job,
            ...detail,
            requiredSkills: detail.requiredSkills?.length ? detail.requiredSkills : job.requiredSkills,
            company: detail.company || job.company,
            title: detail.title || job.title,
            location: detail.location || job.location,
            city: detail.city || job.city,
            country: detail.country || job.country,
          }
        } catch {
          return job
        }
      }),
    )

    return enrichedJobs.map((job) => ({
      ...job,
      source: 'acsnetworktechnologies',
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async () => createAcsNetworkTechnologiesScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running ACS Network & Technologies scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'acsnetworktechnologies')
    console.log('DB result:', result)
    process.exit(0)
  }
}

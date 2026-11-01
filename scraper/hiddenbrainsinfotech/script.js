import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { attachInventoryEvidence } from '../../scraper-support/utils/inventoryEvidence.js'
import { readHiddenBrainsCards, readHiddenBrainsDeclaredRoles } from './native.js'

import { HIDDEN_BRAINS_INFOTECH_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = HIDDEN_BRAINS_INFOTECH_CATALOG.source
export const COMPANY = HIDDEN_BRAINS_INFOTECH_CATALOG.companyName
export const CAREERS_URL = HIDDEN_BRAINS_INFOTECH_CATALOG.companyCareerPage

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&quot;|&#34;/gi, '"')

const normalizeWhitespace = (value) => decodeHtmlEntities(value)
  .replace(/\s+/g, ' ')
  .trim()

const normalizeText = (value) => normalizeWhitespace(value) || null

const stripTags = (value) => normalizeWhitespace(String(value ?? '').replace(/<[^>]+>/g, ' '))

const slugify = (value) => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const parseInteger = (value) => {
  const match = String(value ?? '').match(/\d+/)
  return match ? Number.parseInt(match[0], 10) : null
}

const isIndiaScopedTitle = (title) => !/\babu dhabi\b/i.test(title)

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')

  return /ALL POSITIONS/i.test(page)
    && /Join a People-first Environment/i.test(page)
    && /APPLY NOW!/i.test(page)
    && /#InquiryJob/i.test(page)
}

export const extractVisibleJobCards = (html = '') => readHiddenBrainsCards(html).cards

const defaultFetchText = (url, {signal} = {}) => fetchTextWithRetry(url, {
  signal,
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createHiddenBrainsInfotechScraper = ({ now = () => new Date().toISOString() } = {}) => ({
  async run({ fetchText = defaultFetchText, now: overrideNow, signal } = {}) {
    signal?.throwIfAborted()
    const careersHtml = await fetchText(CAREERS_URL,{signal})
    signal?.throwIfAborted()
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('The verified Hidden Brains careers page no longer matches the trusted first-party surface')
    }

    const cards=readHiddenBrainsCards(careersHtml),declared=readHiddenBrainsDeclaredRoles(careersHtml,cards.cards)
    const jobs = cards.cards
      .filter((job) => isIndiaScopedTitle(job.title))

    if (jobs.length === 0) {
      throw new Error('Hidden Brains careers page no longer exposes the visible ALL POSITIONS cards')
    }

    const scrapedAt=(overrideNow||now)()
    const result = jobs
      .sort((left, right) => left.title.localeCompare(right.title) || left.applyUrl.localeCompare(right.applyUrl))
      .map((job) => ({
        ...job,
        jobId: `${SOURCE}-${slugify(job.title)}`,
        requisitionId: null,
        sourceUrl: CAREERS_URL,
        location: null,
        city: null,
        workplaceType: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        compensation: null,
        postingDate: null,
        closingDate: null,
        jobDescription: declared.roles.get(job.title)?.job_description||null,
        sourceDescription: declared.roles.get(job.title)?.job_description||null,
        nativeDescriptionHTML: declared.roles.get(job.title)?.nativeDescriptionHTML||null,
        sourceDetailComplete: declared.roles.has(job.title),
        sourceDetailStatus: declared.roles.has(job.title)?'complete':'partial',
        sourceListingComplete:false,sourceScopeComplete:false,lifecycleCleanupAllowed:false,
        nativeDescriptionVisibilityQualified:false,
        nativeLocationEvidence:{countryQualified:false,workplaceLabel:null,reason:'Native role model and visible card do not provide a workplace; corporate addresses are not role geography.'},
        companyCareerPage: CAREERS_URL,
        company: COMPANY,
        source: SOURCE,
        companyDomain: HIDDEN_BRAINS_INFOTECH_CATALOG.companyDomain,
        atsPlatform: HIDDEN_BRAINS_INFOTECH_CATALOG.atsPlatform,
        country: null,
        link: job.applyUrl,
        scrapedAt,
      }))
    const audit={source:SOURCE,observedListingCount:cards.cards.length,reportedTotal:null,indiaFacetCount:null,
      candidateDetails:cards.cards.length,extractedDetailJobs:result.filter(job=>job.sourceDetailComplete).length,excludedDetailJobs:cards.cards.length-result.length,
      failures:result.filter(job=>!job.sourceDetailComplete).map(job=>({stage:'native-detail',nativeRoleId:job.jobId,kind:'missing-content'})),
      listingPaginationComplete:null,closingInventoryMatches:null,sourceScopeComplete:false,nativeAllPositionsCount:declared.nativeAllPositionsCount,
      nativeModelPresent:declared.nativeModelPresent,displayCardOccurrences:cards.displayCardOccurrences,uniqueDisplayRoleCount:cards.cards.length,
      desktopCardOccurrences:cards.desktopCardOccurrences,mobileCardOccurrences:cards.mobileCardOccurrences,
      sourceSubsetExcludedTitles:cards.cards.filter(job=>!isIndiaScopedTitle(job.title)).map(job=>job.title),
      sourceSubsetExclusionIsCountryProof:false,nativeExplicitCountryCount:0,authoritativeIndiaTotalUnknown:true,
      descriptionVisibilityQualified:false,closingCohortValidated:false}
    if(result.length)result[0].nativeCollectionEvidence=audit
    Object.defineProperty(result,'nativeCollectionEvidence',{value:audit})
    signal?.throwIfAborted()
    return attachInventoryEvidence(result,{status:'coverage-gap',surface:CAREERS_URL,firstParty:true,listingComplete:false,pagesFetched:1,
      reportedTotal:null,indiaFacetCount:null,verifiedAt:scrapedAt,
      reason:'Exact visible cards and declared native descriptions reconciled without category duplicates or invented requisitions. All emitted role workplaces/countries remain unknown. Existing title-subset exclusion is not native foreign-country proof; complete India scope, interactive description visibility, application criteria and closing proof remain unqualified.'})
  },
})

export const run = async (options = {}) => createHiddenBrainsInfotechScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}

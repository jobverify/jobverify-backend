import {readHighlights,readCategories,categoryObservations,bindApplication,finish,nativeFetch} from './native.js'
import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const CAREER_PAGE_URL = 'https://bluestock.in/careers/'
export const JOBS_PAGE_URL = 'https://bluestock.in/careers/jobs/'
export const COMPANY_DOMAIN = 'bluestock.in'
export const ATS_PLATFORM = 'custom-careers-pages'

const normalizeWhitespace = (value) =>
  String(value ?? '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim()

const extractFirst = (pattern, value) => normalizeWhitespace(pattern.exec(value || '')?.[1])

const slugify = (value) =>
  normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const buildJob = ({
  title,
  sourceUrl,
  applyUrl,
  description,
}) => ({
  title,
  company: 'Bluestock Fintech',
  department: null,
  location: null,
  city: null,
  jobId: slugify(title),
  requisitionId: null,
  sourceUrl,
  applyUrl,
  employmentType: null,
  experienceRequired: null,
  minimumQualification: null,
  preferredQualification: null,
  requiredSkills: [],
  postingDate: null,
  closingDate: null,
  jobDescription: description,
  publicExperienceChecked: true,
  companyCareerPage: CAREER_PAGE_URL,
  companyDomain: COMPANY_DOMAIN,
  atsPlatform: ATS_PLATFORM,
})

export const extractHighlightedRoles = readHighlights
export const extractJobCategories = categoryObservations

export const run = async ({fetchText=nativeFetch,now=()=>new Date().toISOString(),signal}={}) => {
 signal?.throwIfAborted();const careersHtml=await fetchText(CAREER_PAGE_URL,{signal}),jobsHtml=await fetchText(JOBS_PAGE_URL,{signal}),highlights=readHighlights(careersHtml),categories=readCategories(jobsHtml),jobs=[]
 for(const job of highlights){const landing=await fetchText(job.applyUrl,{signal}),proved=bindApplication(job,landing);jobs.push({...proved,source:'bluestock',link:proved.applyUrl||job.sourceUrl,scrapedAt:now()})}
 const maxJobs=Number.isInteger(config.maxJobs)&&config.maxJobs>0?config.maxJobs:null,result=maxJobs?jobs.slice(0,maxJobs):jobs
 return finish(result,{recordKind:categories.length&&jobs.length?'mixed':jobs.length?'vacancy-rows':'categories',observedRecordCount:highlights.length+categories.length,observedVacancyCount:highlights.length,observedCategories:categories,observedCategoryCount:categories.length,actualVacancyCount:null,pagesFetched:2+highlights.length,now})
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Bluestock scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'bluestock')
    console.log('DB result:', result)
    process.exit(0)
  }
}

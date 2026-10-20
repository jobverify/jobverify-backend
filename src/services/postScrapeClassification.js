import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { buildClassificationInput, hashClassificationInput, resolveClassification, RUNTIME_HASH, CLASSIFICATION_FIELDS } from './jobClassificationPolicy.js'
import { recoverClassificationSourceTitle } from './classificationSourceTitle.js'
import { normalizePublicJobType } from '../utils/publicJobTypeLabel.js'

export const GLICLASS_CONFIG = JSON.parse(readFileSync(new URL('../../classification/gliclass/model.json', import.meta.url)))
const runtimeHash = createHash('sha256').update(RUNTIME_HASH).update([
  '../../classification/gliclass/model.json', '../../classification/gliclass/requirements.txt',
  '../../classification/gliclass/worker.py', './postScrapeClassification.js', './classificationSourceTitle.js',
  '../../scripts/gliclassWorker.js',
].map(file => readFileSync(new URL(file, import.meta.url)).toString().replace(/\r\n/g, '\n')).join('\n')).digest('hex')
export const GLICLASS_IDENTITY = {
  modelRevision: GLICLASS_CONFIG.revision, runtimeVersion: GLICLASS_CONFIG.runtimeVersion,
  runtimeHash, calibrationHash: 'uncalibrated',
}

export const postScrapeInput = (job, { now = new Date() } = {}) => {
  const input = buildClassificationInput(job, { now, identity: GLICLASS_IDENTITY })
  const sourceTitleRecovery = recoverClassificationSourceTitle(job)
  if (!sourceTitleRecovery) return input
  const recovered = { ...input, title: sourceTitleRecovery.recoveredTitle, sourceTitleRecovery }
  return { ...recovered, inputHash: hashClassificationInput(recovered) }
}

export function classificationShard(key, count) {
  if (!Number.isSafeInteger(count) || count < 1) throw new Error('Invalid shard count')
  return parseInt(createHash('sha256').update(String(key)).digest('hex').slice(0, 8), 16) % count
}

// Include every source input in the Mongo compare-and-set: a concurrent scrape
// or rewrite cannot publish a decision made from a different description.
export const SOURCE_INPUT_FIELDS = ['title', 'originalTitle', 'sourceDescription', 'description', 'jobDescription', 'sourceContentHash',
  'descriptionRewrite.status', 'descriptionRewrite.inputHash', 'descriptionRewrite.policyVersion',
  'descriptionRewrite.modelRevision', 'descriptionRewrite.runtimeTag', 'descriptionRewrite.publishedAt',
  'sourceUrl', 'applyUrl', 'link',
  'sourceEmploymentType', 'atsEmploymentType', 'rawEmploymentType', 'employmentTypeProvenance', 'employmentType',
  'minimumQualification', 'preferredQualification', 'qualifications', 'responsibilities', 'requirements',
  'sourceExperienceRequired', 'experienceRequired', 'experienceRequiredProvenance',
  'postedAt', 'postingDate', 'scrapedAt', 'scrapedTimestamp', 'eligibleBatches', 'eligibleBatchesProvenance', 'status']
export const sourceSnapshotFilter = job => ({ _id: job._id, $and: SOURCE_INPUT_FIELDS.map(field => {
  // Mongoose casts whole embedded documents into schema order, while MongoDB's
  // object equality depends on stored order. Guard the relevant leaf values.
  let value = job
  for (const key of field.split('.')) {
    if (value === null || typeof value !== 'object' || !Object.hasOwn(value, key)) return { [field]: { $exists: false } }
    value = value[key]
  }
  return { [field]: { $eq: value } }
}) })

export const alreadyClassified = (job, input, mode) => job.postClassification?.inputHash === input.inputHash
  && job.postClassification?.status === 'completed' && job.postClassification?.mode === mode

export function postScrapePersistencePatch(job, previous, { now = new Date(), mode = 'shadow' } = {}) {
  const input = postScrapeInput(job, { now })
  const prior = previous?.postClassification
  if (alreadyClassified(previous || {}, input, mode)) {
    const classification = prior.result?.classification
    return { set: { postClassification: prior,
      ...(mode === 'policy' && classification?.complete === true ? {
        classification, ...Object.fromEntries(CLASSIFICATION_FIELDS.map(field => [field, classification.resolved[field] ?? null])),
        jobType: normalizePublicJobType(classification.resolved.jobType),
      } : {}),
    }, unset: mode === 'shadow' ? { classification: '' } : {} }
  }
  return { set: { postClassification: { inputHash: input.inputHash, mode, status: 'pending',
    attemptedAt: now, reason: input.incomplete ? 'missing_or_oversized_description' : 'source_requires_classification',
  } }, unset: { classification: '' } }
}

export function sourceGuardedClassification(job, { now = new Date(), mode = 'shadow' } = {}) {
  const input = postScrapeInput(job, { now })
  const guards = []
  if (input.sourceTitleRecovery) guards.push('overcaptured_title_recovered_from_ats_url')
  const description = input.sourceFields.description
  const roleFields = ['minimumQualification', 'qualifications', 'responsibilities', 'requirements']
    .some(field => input.sourceFields[field].length > 20)
  const roleSection = /\b(?:(?:roles?\s+and\s+|key\s+)?responsibilities|(?:minimum|basic|required)\s+qualifications|requirements)\s*:\s*(?!zoom\s+in\b)[a-z][^.\n]{20,}/i.test(description)
  const sourceQualityIssues = []
  if (!roleFields && !roleSection) {
    if (/\b(?:how did you know about this opportunity|choose how you'd like to (?:proceed|share your resume)|personal education skills others)\b/i.test(description)) {
      sourceQualityIssues.push('application_form_without_role_description')
    }
    const notices = new Set(description.match(/\bADVT\.\/\d{4}-\d{2}\/\d+\b/gi) || [])
    if (notices.size >= 3 && (description.match(/\bprint application\b/gi) || []).length >= 3) {
      sourceQualityIssues.push('multiple_recruitment_notices_without_role_description')
    }
    if (/\bzoom\s+in\s+zoom\s+out\s+short\s+info\b/i.test(description)
      && /\bexperience\s*:\s*0\s+years\s*-?\s*0\s+months\s+to\s+0\s+years\s*-?\s*0\s+months\b/i.test(description)) {
      sourceQualityIssues.push('empty_responsibilities_zero_experience_default')
    }
  }
  const title = input.title.replace(/_/g, ' ')
  const employerType = input.sourceEmploymentType || input.body.match(
    /(?:^|\n)(?:employment\s+type|schedule|position\s+type)\s*[:\-]?\s*(internship|full[- ]time|part[- ]time|fixed[- ]term|contract|temporary|permanent)\b/i,
  )?.[1]
  let policyJob = { ...job, title, originalTitle: title }
  if (title !== input.title) guards.push('title_word_separators')
  const policyDescription = input.sourceFields.description.replace(
    /\bexp\s*[-:]\s*(\d+(?:\.\d+)?\s*(?:(?:-|to)\s*\d+(?:\.\d+)?)?\s*(?:\+\s*)?(?:years?|yrs?|months?))\b/gi,
    'Experience: $1\n',
  )
  if (policyDescription !== input.sourceFields.description) {
    policyJob.sourceDescription = policyDescription
    guards.push('abbreviated_experience_field')
  }
  if (employerType && !input.sourceEmploymentType) {
    policyJob.sourceEmploymentType = employerType
    guards.push('employer_employment_field')
  }
  const occupationalContract = /\b(?:service contracts?|contract accounting|contractual operations?|contract admin(?:istration|istrator)?)\b/i.test(title)
  const explicitContract = /\b(?:contractor|temporary|fixed[- ]term|freelance)\b|\(\s*contract\s*\)/i.test(title)
    || /\b(?:contract|temporary|fixed[- ]term)\b/i.test(employerType || '')
    || /\b(?:this (?:role|position|job) is (?:an? )?(?:contract|temporary)|(?:contract|temporary|fixed[- ]term) (?:role|position|employment))\b/i.test(input.body)
  if (occupationalContract && !explicitContract) {
    const occupationTitle = title.replace(/\bcontracts?|contractual\b/ig, 'agreement')
    policyJob = { ...policyJob, title: occupationTitle, originalTitle: occupationTitle }
    guards.push('contract_occupation')
  }
  let result = resolveClassification(policyJob, null, { now, mode, identity: GLICLASS_IDENTITY })
  // Some employers phrase explicit fresher recruitment as an opportunity for
  // freshers. Do not let that wording override a prior experience requirement.
  const fresherOpportunity = /\bwe\s+(?:have|offer)\b[^.\n]{0,100}\bopportunit(?:y|ies)\s+for\s+(?:[a-z]+\s+){0,5}freshers?\b/i.test(input.body)
  const fresherRecruitment = /\b(?:we\s+are\s+(?:currently\s+)?hiring\s+fresh\s+graduates?|freshers?\s+(?:can|may)\s+(?:also\s+)?apply)\b/i.test(description)
  if (!sourceQualityIssues.length && result.resolved.jobType === 'Unspecified' && !input.sourceExperienceRequired
    && (fresherOpportunity || fresherRecruitment)) {
    policyJob.sourceExperienceRequired = 'Fresher'
    result = resolveClassification(policyJob, null, { now, mode, identity: GLICLASS_IDENTITY })
    guards.push(fresherOpportunity ? 'employer_fresher_opportunity' : 'employer_fresher_recruitment')
  }
  if (fresherRecruitment && result.resolved.jobType === 'Full-time Fresher'
    && result.resolved.employerExperienceProfile?.minimumYears > 0) {
    sourceQualityIssues.push('conflicting_role_eligibility')
  }
  if (sourceQualityIssues.length) {
    const reason = sourceQualityIssues.includes('conflicting_role_eligibility')
      ? 'conflicting_role_eligibility' : 'insufficient_role_description'
    result = { ...result, status: 'uncertain', reason,
      resolved: { ...result.resolved, jobType: 'Unspecified', employmentType: null,
        seniority: 'Unknown', experienceLevel: null, experiencePolicy: 'not_stated',
        experienceYears: [], experienceBucket: 'unspecified', experienceBasis: 'unspecified',
        experienceRequired: null, policyEvidence: null,
        experienceProfile: { minimumYears: null, maximumYears: null, isOpenEnded: false,
          preferredMinimumYears: null, hasExplicitExperience: false, confidence: 'low', evidence: null, rawText: null },
      } }
    guards.push(reason)
  }
  // Provenance refers to the untouched employer input, including the original title.
  return { ...result, inputHash: input.inputHash, evidenceContext: input.body.slice(0, 160),
    ...(input.sourceTitleRecovery ? { sourceTitleRecovery: input.sourceTitleRecovery } : {}),
    sourceGuards: guards, sourceQualityIssues }
}

export function resolvePostScrapeClassification(job, prediction, { now = new Date(), mode = 'shadow' } = {}) {
  if (!['shadow', 'policy'].includes(mode)) throw new Error('Post-scrape mode must be shadow or policy')
  if (!prediction?.fullDescriptionCovered || !Number.isInteger(prediction.windows) || prediction.windows < 1) {
    throw new Error('Complete source coverage is required')
  }
  const entries = Object.entries(prediction.scores || {})
  if (entries.length !== 4 || GLICLASS_CONFIG.labels.some(label => !Number.isFinite(prediction.scores[label])
    || prediction.scores[label] < 0 || prediction.scores[label] > 1)
    || Math.abs(entries.reduce((sum, [, score]) => sum + score, 0) - 1) > .002) throw new Error('Invalid model scores')
  const ranked = entries.sort((a, b) => b[1] - a[1])
  if (prediction.modelLabel !== ranked[0][0]) throw new Error('Invalid model label')
  const base = sourceGuardedClassification(job, { now, mode })
  const input = postScrapeInput(job, { now })
  if (input.incomplete) throw new Error('Missing or oversized source description')
  const resolved = { ...base.resolved }
  // Source-backed rules guard numeric eligibility, contract roles, and internships.
  // A zero-shot score is recorded as a comparison, not a calibrated probability.
  return { ...base, resolved, complete: true, windows: prediction.windows,
    decisionSource: 'source_policy', reason: base.sourceQualityIssues.length ? base.reason : 'zero_shot_uncalibrated',
    comparison: { modelJobType: prediction.modelLabel, logicJobType: resolved.jobType,
      agreement: prediction.modelLabel === resolved.jobType },
    decisions: { jobType: { label: prediction.modelLabel, probability: ranked[0][1],
      probabilities: prediction.scores, margin: ranked[0][1] - ranked[1][1] } },
  }
}

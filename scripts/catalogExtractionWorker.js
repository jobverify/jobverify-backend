import { readInventoryEvidence, isFreshCompleteInventoryEvidence } from '../scraper-support/utils/inventoryEvidence.js'
import { analyzePublishableJobs } from '../scraper-support/utils/publishableJobMetrics.js'
import { classifyScraperError } from '../scraper-support/utils/failureClassification.js'

// Called only by the restricted child process. Block database connections before
// importing company code, including scripts with obsolete import-time runners.
export async function auditExtraction(provider) {
  const mongoose = (await import('mongoose')).default
  const blocked = () => { const error = new Error('Database access disabled during extraction audit'); error.code = 'AUDIT_DATABASE_BLOCKED'; throw error }
  mongoose.connect = blocked
  mongoose.createConnection = blocked
  mongoose.Connection.prototype.openUri = blocked
  const { MongoClient } = await import('mongodb')
  MongoClient.connect = blocked
  MongoClient.prototype.connect = blocked
  const attemptedAt = new Date().toISOString()
  try {
    const { createCatalogScraper } = await import('../scraper-support/providers/index.js')
    const jobs = await createCatalogScraper(provider).run({ dryRun: true, persist: false, enqueueAlerts: false })
    if (!Array.isArray(jobs)) throw new Error('Invalid extraction response')
    const inventoryEvidence = readInventoryEvidence(jobs)
    const complete = isFreshCompleteInventoryEvidence(inventoryEvidence)
    const analysis = analyzePublishableJobs(jobs)
    return { source: provider.source, attemptedAt, completedAt: new Date().toISOString(),
      outcome: complete ? analysis.eligibleJobs.length ? 'complete-positive-extraction' : 'complete-no-eligible-jobs'
        : jobs.length ? 'positive-extraction-incomplete-evidence' : 'unverified-zero',
      rawJobs: inventoryEvidence?.reportedTotal ?? jobs.length, extractedJobs: jobs.length,
      indiaJobs: analysis.indiaJobs.length, eligibleJobs: analysis.eligibleJobs.length,
      inventoryEvidence, filterCounts: analysis.filterCounts, jobs,
    }
  } catch (error) {
    return { source: provider.source, attemptedAt, completedAt: new Date().toISOString(),
      outcome: ['ERR_ACCESS_DENIED', 'ERR_DLOPEN_DISABLED'].includes(error?.code) ? 'audit-permission-blocked' : 'extraction-failed',
      failureKind: error?.code === 'AUDIT_DATABASE_BLOCKED' ? 'audit_database_blocked' : classifyScraperError(error).failureKind,
      failureCode: /^[A-Z_0-9]{1,80}$/.test(error?.code || '') ? error.code : 'EXTRACTION_OR_UPSTREAM_ERROR',
      rawJobs: null, indiaJobs: null, eligibleJobs: null, inventoryEvidence: null,
    }
  }
}

if (process.send) {
  process.once('message', async ({ provider }) => {
    const result = await auditExtraction(provider)
    process.send(result, () => process.exit(0))
  })
}

import { readInventoryEvidence, isFreshCompleteInventoryEvidence } from '../scraper-support/utils/inventoryEvidence.js'
import { analyzePublishableJobs } from '../scraper-support/utils/publishableJobMetrics.js'
import { extractionFailureDetails } from './catalogExtractionFailureEvidence.js'
import { extractionDetailHealth } from '../scraper-support/utils/extractionDetailHealth.js'

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
    const detailHealth = extractionDetailHealth(analysis.indiaJobs)
    return { source: provider.source, mode: 'isolated-direct-live-extraction-no-database', productionWrites: false,
      attemptedAt, completedAt: new Date().toISOString(),
      outcome: complete && detailHealth.complete ? analysis.eligibleJobs.length ? 'complete-positive-extraction' : 'complete-no-eligible-jobs'
        : jobs.length ? 'positive-extraction-incomplete-evidence' : 'unverified-zero',
      rawJobs: inventoryEvidence?.reportedTotal ?? jobs.length, extractedJobs: jobs.length,
      indiaJobs: analysis.indiaJobs.length, eligibleJobs: analysis.eligibleJobs.length,
      inventoryEvidence, detailHealth, filterCounts: analysis.filterCounts, jobs,
    }
  } catch (error) {
    return { source: provider.source, mode: 'isolated-direct-live-extraction-no-database', productionWrites: false,
      attemptedAt, completedAt: new Date().toISOString(),
      outcome: ['ERR_ACCESS_DENIED', 'ERR_DLOPEN_DISABLED'].includes(error?.code) ? 'audit-permission-blocked' : 'extraction-failed',
      ...extractionFailureDetails(error),
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

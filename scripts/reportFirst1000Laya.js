import fs from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { once } from 'node:events'
import { finished } from 'node:stream/promises'
import { randomUUID, createHash } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'
import { LABELS, readJsonl } from './localJobFifo.js'

const json = async file => {
  try { return JSON.parse(await fs.readFile(file, 'utf8')) } catch (error) { if (error.code === 'ENOENT') return null; throw error }
}
const csv = value => `"${String(value ?? '').replace(/^[=+@-]/, "'$&").replaceAll('"', '""')}"`

export const wilsonInterval = (correct, total) => {
  if (!total) return null
  const z = 1.959963984540054, p = correct / total, denominator = 1 + z * z / total
  const centre = (p + z * z / (2 * total)) / denominator
  const half = z * Math.sqrt(p * (1 - p) / total + z * z / (4 * total * total)) / denominator
  return [100 * (centre - half), 100 * (centre + half)]
}

export async function generateReport(directory) {
  const lockFile = path.join(directory, 'analysis.lock')
  const token = randomUUID()
  for (let attempt = 0; ; attempt++) {
    try {
      await fs.writeFile(lockFile, JSON.stringify({ pid: process.pid, token }), { flag: 'wx' })
      break
    } catch (error) {
      if (error.code !== 'EEXIST') throw error
      const owner = await json(lockFile).catch(error => {
        if (error instanceof SyntaxError) return null // Another caller may still be writing its lock.
        throw error
      })
      if (Number.isInteger(owner?.pid)) {
        try { process.kill(owner.pid, 0) }
        catch (error) {
          if (error.code !== 'ESRCH') throw error
          // Check the token again before reclaiming a dead process's lock.
          const current = await json(lockFile)
          if (current?.token === owner.token) await fs.rm(lockFile, { force: true })
        }
      }
      if (attempt >= 599) throw new Error('Another report publisher still owns this run')
      await delay(100)
    }
  }
  try { return await generateUnlockedReport(directory) }
  finally {
    const current = await json(lockFile)
    if (current?.token === token) await fs.rm(lockFile, { force: true })
  }
}

async function generateUnlockedReport(directory) {
  const manifest = await json(path.join(directory, 'manifest.json'))
  let exit = await json(path.join(directory, 'run-exit.json'))
  let status = await json(path.join(directory, 'status.json'))
  let checkpoint = await json(path.join(directory, 'scrape/run-state.json'))
  if (!manifest) throw new Error('A frozen first-company manifest is required')
  const reviewFiles = (await fs.readdir(directory)).filter(name => /(?:early-.*source-review|independent-source-review).*\.json$/.test(name))
  const reviews = new Map()
  const reviewAssumptions = []
  for (const file of reviewFiles) {
    const packet = await json(path.join(directory, file))
    if (packet.taxonomy?.arrangementAssumption) reviewAssumptions.push({ file, assumption: packet.taxonomy.arrangementAssumption })
    for (const row of packet.jobs || packet.reviews || packet.rows || packet.labels || []) {
      if (!row.id) throw new Error('Review label lacks exact queue identity')
      const label = row.label ?? row.jobType ?? row.goldLabel ?? null
      if (label !== null && !LABELS.includes(label)) throw new Error('Unknown independently reviewed label')
      if (Object.hasOwn(row, 'strictLabel') && row.strictLabel !== null && !LABELS.includes(row.strictLabel)) throw new Error('Unknown strict source-evidence label')
      if (reviews.has(row.id) && reviews.get(row.id).label !== label) throw new Error('Conflicting review labels')
      reviews.set(row.id, { ...row, label, reviewFile: file, supplemental: file.startsWith('early-') })
    }
  }
  const samplePacket = await json(path.join(directory, 'independent-review-packet.json'))
  const reviewSampleCoverage = { packetSize: null, primaryComplete: false, strictComplete: false }
  if (samplePacket) {
    if (samplePacket.samplingScopeComplete !== true || samplePacket.catalogCompanies !== manifest.count
      || samplePacket.orderedSourcesHash !== manifest.orderedSourcesHash || !Array.isArray(samplePacket.jobs)) throw new Error('Independent sample does not match the frozen complete company scope')
    const sampleIds = new Set(samplePacket.jobs.map(row => row.id))
    if (sampleIds.size !== samplePacket.jobs.length) throw new Error('Independent sample contains duplicate job identities')
    const sampleById = new Map(samplePacket.jobs.map(row => [row.id, row]))
    const primaryIds = new Set(), strictIds = new Set()
    for (const review of reviews.values()) {
      if (review.supplemental) continue
      const expected = sampleById.get(review.id)
      if (!expected) throw new Error('Independent review identity is outside the frozen sample')
      const archiveHash = review.sourceArchive?.sha256 || review.sourceArchive?.hash
      const expectedBodyHash = createHash('sha256').update(expected.input.body, 'utf8').digest('hex')
      if (archiveHash !== expected.sourceArchive.hash || review.sourceArchive?.jobIndex !== expected.sourceArchive.jobIndex
        || review.sourceArchive?.file !== expected.sourceArchive.file || review.sourceBodySha256 !== expectedBodyHash) throw new Error('Independent review provenance differs from the frozen sample source')
      primaryIds.add(review.id)
      if (Object.hasOwn(review, 'strictLabel')) strictIds.add(review.id)
    }
    Object.assign(reviewSampleCoverage, { packetSize: sampleIds.size, primaryReviewedIds: [...primaryIds], strictReviewedIds: [...strictIds],
      primaryComplete: primaryIds.size === sampleIds.size, strictComplete: strictIds.size === sampleIds.size })
  }
  const columns = ['sequence','source','title','jobType',...LABELS.map(label => `${label} percent`),'logicJobType','rulesAgreement','independentLabel','independentCorrect','strictIndependentLabel','strictIndependentCorrect','arrangementAssumptionUsed','reviewKind','status','reason','windows','inferenceSeconds','queueWaitSeconds','applyUrl','sourceArchive']
  const temporaryCsv = path.join(directory, `classification-comparison.${randomUUID()}.csv.tmp`)
  const stream = createWriteStream(temporaryCsv)
  const writing = finished(stream)
  writing.catch(() => {})
  stream.write(`${columns.map(csv).join(',')}\n`)
  const counts = { classified: 0, unusable_input: 0, native_error: 0, rulesCompared: 0, rulesAgreed: 0 }
  const distribution = Object.fromEntries(LABELS.map(label => [label, 0]))
  const confusion = Object.fromEntries(LABELS.map(label => [label, Object.fromEntries(LABELS.map(other => [other, 0]))]))
  const mainReview = { labelled: 0, scored: 0, correct: 0, ambiguous: 0, awaitingClassification: 0, unavailablePredictions: 0 }
  const earlyReview = { labelled: 0, scored: 0, correct: 0, ambiguous: 0, awaitingClassification: 0, unavailablePredictions: 0 }
  const strictReview = { reviewed: 0, labelled: 0, scored: 0, correct: 0, ambiguous: 0, awaitingClassification: 0, unavailablePredictions: 0 }
  const confidenceDiagnostics = { policyThreshold: .95, thresholdApplied: false, belowPolicyThreshold: 0, windowDisagreements: 0, isAccuracy: false }
  for (const review of reviews.values()) {
    const tally = review.supplemental ? earlyReview : mainReview
    if (review.label === null) tally.ambiguous++
    else { tally.labelled++; tally.awaitingClassification++ }
    if (!review.supplemental && Object.hasOwn(review, 'strictLabel')) {
      strictReview.reviewed++
      if (review.strictLabel === null) strictReview.ambiguous++
      else { strictReview.labelled++; strictReview.awaitingClassification++ }
    }
  }
  let rows = 0, expectedSequence = 1, previousCompletedAt = null, fifoViolations = 0, totalInferenceSeconds = 0, windows = 0
  let peakResidentBytes = status?.peakModelResidentBytes || 0
  const latencies = [], sourcesScored = new Set()
  const probabilityWarnings = []
  try {
  for await (const row of readJsonl(path.join(directory, 'classified-jobs.jsonl'))) {
    rows++
    if (row.sequence !== expectedSequence++) throw new Error('Result sequence violates FIFO')
    if (!Object.hasOwn(counts, row.status)) throw new Error('Unknown classification status')
    counts[row.status]++
    if (previousCompletedAt && new Date(row.startedAt) < new Date(previousCompletedAt)) fifoViolations++
    previousCompletedAt = row.completedAt
    if (row.status === 'classified') {
      sourcesScored.add(row.source); distribution[row.jobType]++
      totalInferenceSeconds += row.inferenceSeconds; latencies.push(row.inferenceSeconds); windows += row.view?.windows || 0
      if (typeof row.rulesComparison?.agreement === 'boolean') { counts.rulesCompared++; counts.rulesAgreed += Number(row.rulesComparison.agreement) }
      const values = row.probabilities || {}
      if (LABELS.some(label => !Number.isFinite(values[label])) || Math.abs(LABELS.reduce((sum, label) => sum + values[label], 0) - 1) > .0001) probabilityWarnings.push(row.sequence)
      confidenceDiagnostics.belowPolicyThreshold += Number(Math.max(...Object.values(values)) < confidenceDiagnostics.policyThreshold)
      confidenceDiagnostics.windowDisagreements += Number(row.prediction?.disagreement === true)
    }
    peakResidentBytes = Math.max(peakResidentBytes, row.memory?.peakWorkingSetBytes || row.memory?.peakResidentBytes || 0)
    const review = reviews.get(row.id)
    let independentlyCorrect = null
    let strictlyCorrect = null
    if (review && ((review.sourceArchive?.sha256 || review.sourceArchive?.hash) && (review.sourceArchive.sha256 || review.sourceArchive.hash) !== row.sourceArchive?.hash
      || review.sourceArchive?.jobIndex !== undefined && review.sourceArchive.jobIndex !== row.sourceArchive?.jobIndex
      || review.sourceBodySha256 && review.sourceBodySha256 !== row.view?.sourceBodySha256)) throw new Error('Independent review does not match the exact classified source input')
    if (review?.label && row.status === 'classified') {
      const tally = review.supplemental ? earlyReview : mainReview
      tally.scored++; tally.awaitingClassification--; independentlyCorrect = row.jobType === review.label; tally.correct += Number(independentlyCorrect)
      if (!review.supplemental) confusion[review.label][row.jobType]++
    } else if (review?.label) {
      const tally = review.supplemental ? earlyReview : mainReview
      tally.awaitingClassification--; tally.unavailablePredictions++
    }
    if (review && !review.supplemental && review.strictLabel) {
      strictReview.awaitingClassification--
      if (row.status === 'classified') {
        strictlyCorrect = row.jobType === review.strictLabel
        strictReview.scored++; strictReview.correct += Number(strictlyCorrect)
      } else strictReview.unavailablePredictions++
    }
    const values = [row.sequence,row.source,row.job?.originalTitle || row.job?.title,row.jobType,
      ...LABELS.map(label => row.status === 'classified' ? (100 * row.probabilities[label]).toFixed(4) : ''),
      row.rulesComparison?.logicJobType,row.rulesComparison?.agreement,review?.label,independentlyCorrect,
      review?.strictLabel,strictlyCorrect,review?.arrangementAssumptionUsed,
      review ? review.supplemental ? 'early single-company diagnostic' : 'independent sample' : '',row.status,row.reason || row.error,row.view?.windows,
      row.inferenceSeconds,row.queueWaitSeconds,row.job?.applyUrl || row.job?.link,row.sourceArchive?.file]
    if (!stream.write(`${values.map(csv).join(',')}\n`)) await once(stream, 'drain')
  }
  stream.end(); await writing
  await fs.rename(temporaryCsv, path.join(directory, 'classification-comparison.csv'))
  } catch (error) {
    stream.destroy()
    await writing.catch(() => {})
    await fs.rm(temporaryCsv, { force: true })
    throw error
  }
  latencies.sort((a, b) => a - b)
  // Refresh live progress after streaming, so newly appended rows do not exceed stale totals.
  ;[status, exit, checkpoint] = await Promise.all([
    json(path.join(directory, 'status.json')), json(path.join(directory, 'run-exit.json')),
    json(path.join(directory, 'scrape/run-state.json')),
  ])
  const fullScope = checkpoint?.status === 'complete' && checkpoint?.completedCount === manifest.count
    && checkpoint?.totalSources === manifest.count && JSON.stringify(checkpoint?.catalogSources) === JSON.stringify(manifest.sources)
  const complete = exit?.complete === true && fullScope && rows === status?.queuedJobs && status?.pendingJobs === 0
  const sourceFailures = Object.entries(checkpoint?.completed || {}).filter(([, row]) => row.result?.success === false)
    .map(([source, row]) => ({ source, completedAt: row.completedAt || null, ...row.result }))
  const sourceFailureCounts = sourceFailures.reduce((counts, row) => {
    const kind = row.failureKind || 'unknown'
    counts[kind] = (counts[kind] || 0) + 1
    return counts
  }, {})
  const result = { generatedAt: new Date().toISOString(), complete, phase: status?.phase || 'unknown', catalogCompanies: manifest.count,
    companiesAttempted: checkpoint?.completedCount || 0, sourceFailures: sourceFailures.length, sourceFailureCounts,
    queuedJobs: status?.queuedJobs || 0, scoredSources: sourcesScored.size, completedRows: rows, counts, categoryCounts: distribution,
    rulesAgreementPercent: counts.rulesCompared ? 100 * counts.rulesAgreed / counts.rulesCompared : null,
    rulesAgreementIsAccuracy: false, reviewAssumptions, reviewSampleCoverage, independentReview: { ...mainReview, accuracyPercent: mainReview.scored ? 100 * mainReview.correct / mainReview.scored : null,
      wilson95Percent: wilsonInterval(mainReview.correct, mainReview.scored), source: 'agent_reviewed', humanReviewed: false },
    strictIndependentReview: { ...strictReview, accuracyPercent: strictReview.scored ? 100 * strictReview.correct / strictReview.scored : null,
      wilson95Percent: wilsonInterval(strictReview.correct, strictReview.scored), source: 'agent_reviewed', humanReviewed: false }, confidenceDiagnostics,
    earlySingleCompanyReview: { ...earlyReview, accuracyPercent: earlyReview.scored ? 100 * earlyReview.correct / earlyReview.scored : null,
      isFullCatalogAccuracy: false, source: 'agent_reviewed', humanReviewed: false }, confusion,
    fifoViolations, probabilityWarnings, meanInferenceSeconds: counts.classified ? totalInferenceSeconds / counts.classified : null,
    medianInferenceSeconds: latencies.length ? latencies[Math.floor(latencies.length / 2)] : null,
    p95InferenceSeconds: latencies.length ? latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * .95))] : null,
    windows, peakModelResidentBytes: peakResidentBytes, modelVariant: 'pretrained_baseline', maxConcurrentJobs: 1, modelCpuThreads: 1 }
  await fs.writeFile(path.join(directory, 'analysis-summary.json'), `${JSON.stringify(result, null, 2)}\n`)
  await fs.writeFile(path.join(directory, 'source-failures.json'), `${JSON.stringify({ generatedAt: result.generatedAt,
    sourceScopeComplete: fullScope, pipelineComplete: complete, catalogCompanies: manifest.count,
    companiesAttempted: result.companiesAttempted, orderedSourcesHash: manifest.orderedSourcesHash,
    sourceFailureCounts, failures: sourceFailures }, null, 2)}\n`)
  const percent = value => value === null ? 'not yet available' : `${value.toFixed(2)}%`
  const assumptions = reviewAssumptions.length
    ? `\n\nReview assumptions: ${reviewAssumptions.map(row => `${row.assumption} (Source: ${row.file})`).join(' ')}` : ''
  const report = `# First ${manifest.count} companies: local Laya dry run\n\nStatus: **${complete ? 'finished' : 'still running or incomplete'}**. ${result.companiesAttempted}/${manifest.count} companies attempted; ${rows}/${result.queuedJobs} queued jobs have terminal results. ${result.sourceFailures} company scrapes failed.\n\nThe run uses one pretrained CPU model, one CPU inference thread, and one job at a time. All captured employer text is preserved and processed through overlapping source windows. Some providers return only summaries; processing all captured text does not establish that a description is complete. Older tuned-scorer artifacts were absent, so no trained scorer is claimed.\n\n## Classification results\n\n${counts.classified} classified; ${counts.unusable_input} descriptions unavailable or unusable; ${counts.native_error} native inference errors.\n\n| Category | Jobs | Share of classified jobs |\n|---|---:|---:|\n${LABELS.map(label => `| ${label} | ${distribution[label]} | ${percent(counts.classified ? 100 * distribution[label] / counts.classified : null)} |`).join('\n')}\n\nRules agreement: **${percent(result.rulesAgreementPercent)}** across ${counts.rulesCompared} classified jobs. This is agreement between two methods, not accuracy.\n\nIndependent sample: **${percent(result.independentReview.accuracyPercent)}** (${mainReview.correct}/${mainReview.scored} scored clear labels); ${mainReview.ambiguous} ambiguous labels excluded, ${mainReview.awaitingClassification} clear labels awaiting classification. These are agent-reviewed source labels, not human-verified ground truth.\n\nStrict employer-evidence review: **${percent(result.strictIndependentReview.accuracyPercent)}** (${strictReview.correct}/${strictReview.scored} scored clear labels), across ${strictReview.reviewed} source-reviewed jobs; ${strictReview.ambiguous} ambiguous because strict source evidence is insufficient. This excludes full-time arrangement assumptions.\n\n${confidenceDiagnostics.belowPolicyThreshold}/${counts.classified} answers are below the policy score threshold of 95%; ${confidenceDiagnostics.windowDisagreements} jobs have window disagreement. The local trial records every valid four-way answer without threshold acceptance. These are confidence diagnostics, not accuracy.\n\nEarly ABB diagnostic: ${earlyReview.correct}/${earlyReview.scored} clear reviewed jobs correct, ${earlyReview.ambiguous} ambiguous source descriptions. This single-company sample does not estimate all-company accuracy.${assumptions}\n\n## Execution checks\n\n${fifoViolations} timestamp overlap violations; ${probabilityWarnings.length} invalid four-percentage distributions. Model peak resident memory ${(peakResidentBytes / 1024 ** 3).toFixed(2)} GiB. Mean native inference time ${result.meanInferenceSeconds?.toFixed(2) || 'not available'} seconds/job; p95 ${result.p95InferenceSeconds?.toFixed(2) || 'not available'} seconds/job. Queue waiting time is stored separately in each result and the CSV.\n\nLocal data: [classification-comparison.csv](classification-comparison.csv), [classified-jobs.jsonl](classified-jobs.jsonl), [analysis-summary.json](analysis-summary.json), [status.json](status.json), and immutable outbox/raw archives. Confidence percentages are not calibrated probabilities of correctness.\n`
  const failureDetails = `\n## Company scrape failures\n\n${sourceFailures.length} provider failures, separate from native inference errors. ${fullScope ? 'All selected company attempts have finished.' : 'Company capture is still incomplete; these failure counts are provisional.'}\n\n${Object.entries(sourceFailureCounts).map(([kind, count]) => `- ${kind}: ${count}`).join('\n') || 'No provider failures recorded.'}\n\nExact source names, errors and exhausted retry records: [source-failures.json](source-failures.json).\n`
  await fs.writeFile(path.join(directory, 'analysis.md'), report + failureDetails)
  return result
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const directory = path.resolve(process.argv[2] || '')
  generateReport(directory).then(report => console.log(JSON.stringify({ complete: report.complete, completedRows: report.completedRows, rulesAgreementPercent: report.rulesAgreementPercent, independentReview: report.independentReview, earlyReview: report.earlySingleCompanyReview }))).catch(error => { console.error(error.stack); process.exitCode = 1 })
}

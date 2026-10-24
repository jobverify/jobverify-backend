import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeScraperRun } from '../scraper-support/utils/scraperRunSummary.js';

test('source task outcomes partition the run independently of overlapping legacy warnings', () => {
  const summary = summarizeScraperRun([
    { success: true, inserted: 2, updated: 3, detailHealth: { complete: true },
      inventoryEvidence: { firstParty: true, listingComplete: true, status: 'complete-inventory' } },
    { success: true, skipped: true },
    { success: false, softFailure: true },
    { success: false, softFailure: false },
  ]);
  assert.deepEqual(summary.taskOutcomes, { succeeded: 1, skipped: 1, softFailed: 1, hardFailed: 1 });
  assert.equal(Object.values(summary.taskOutcomes).reduce((a, b) => a + b), summary.scanned);
  assert.equal(summary.warnings, 2);
  assert.equal(summary.completed, 2);
  assert.equal(summary.inventoryChecks.complete, 1);
  assert.equal(summary.inventoryChecks.withoutCompleteEvidence, 3);
  assert.equal(summary.inserted, 2);
});

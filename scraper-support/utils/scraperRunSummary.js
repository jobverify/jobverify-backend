/** Task completion and verified inventory are independent measurements. */
export const summarizeScraperRun = (rows = [], { interrupted = false } = {}) => {
  const taskOutcomes = { succeeded: 0, skipped: 0, softFailed: 0, hardFailed: 0 };
  let complete = 0;
  for (const row of rows) {
    if (row.skipped === true) taskOutcomes.skipped++;
    else if (row.success === true) taskOutcomes.succeeded++;
    else if (row.softFailure === true) taskOutcomes.softFailed++;
    else taskOutcomes.hardFailed++;
    const evidence = row.inventoryEvidence;
    if (evidence?.firstParty === true && evidence.listingComplete === true
      && ['complete-inventory', 'verified-empty'].includes(evidence.status)) complete++;
  }
  return {
    scanned: rows.length, completed: rows.filter(row => row.success).length,
    skipped: taskOutcomes.skipped, failed: taskOutcomes.hardFailed,
    warnings: rows.filter(row => row.success === false && !row.skipped).length,
    taskOutcomes, inventoryChecks: { complete, withoutCompleteEvidence: rows.length - complete },
    inserted: rows.reduce((sum, row) => sum + (row.inserted || 0), 0),
    updated: rows.reduce((sum, row) => sum + (row.updated || 0), 0),
    interrupted, pendingEstimate: rows.filter(row => row.classificationPending).length,
  };
};

/**
 * Remove job records and linked MongoDB data for retired company providers.
 *
 * Himalayas and Wellfound bulk-directory identities are retired as a family.
 * Their source suffix is stable even when an individual provider was migrated
 * to a first-party scraper implementation.
 *
 * Usage:
 *   node scripts/purgeRetiredCompanyJobs.js
 *   node scripts/purgeRetiredCompanyJobs.js --confirm
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(currentDir, "../.env") });

const retiredSources = [
  "1mg", "dishtv", "dpworld", "cars24", "ashokleyland", "ador",
  "fortishealthcare", "adityabirlacapital", "legrand", "tatamotors",
  "godrejconsumerproducts", "godrejenterprisesgroup", "godrejproperties",
  "indiamart", "tvsmotorcompany", "johnsoncontrolsindia",
  "drreddyslaboratories", "arcelormittalnipponsteelindia", "delhivery",
  "karurvysyabank", "bajajallianz", "bajajauto", "bajajelectricals",
  "bajajfinserv", "bajajfinservhealth", "bajajhousingfinance", "bajajmarkets",
  "aakash", "dixontechnologies", "heromotocorp", "leapfinance", "mygate",
  "narayanahealth", "redbus", "redingtonindia", "sahyadriindustries",
  "theindianpublicschool",
];
const retiredCompanyNames = [
  "1mg", "Tata 1mg", "Tata1mg", "DishTV", "Dish TV", "DP World", "Stryker",
  "Cars24", "Ashok Leyland", "ADOR", "Fortis Healthcare", "Aditya Birla Capital",
  "Legrand", "Tata Motors", "Godrej Consumer Products", "Godrej Enterprises Group",
  "Godrej Properties", "IndiaMART", "TVS Motor Company", "Johnson Controls India",
  "Johnson Controls", "Dr. Reddy's Laboratories", "ArcelorMittal Nippon Steel India",
  "AM/NS India", "Delhivery", "Karur Vysya Bank", "Bajaj Allianz", "Bajaj Auto",
  "Bajaj Electricals", "Bajaj Finserv", "Bajaj Finserv Health", "Bajaj Housing Finance",
  "Bajaj Markets",
  "Aakash", "Aakash Byju's", "Aakash Educational Services", "Aakash Institute",
  "Akash Institute", "Dixon Technologies", "Hero MotoCorp", "Leap Finance",
  "MyGate", "Narayana Health", "RedBus", "redBus India Pvt Ltd.",
  "Redington India", "Sahyadri Industries", "The Indian Public School (TIPS)",
];

const DISCOVERY_SOURCE_PATTERN = /(?:\.wellfoundDirectory|\.himalayas(?:Directory|\.app))$/i;
const confirmed = process.argv.includes("--confirm");
const onlySource = process.argv
  .find((argument) => argument.startsWith("--only-source="))
  ?.slice("--only-source=".length)
  .trim();
const sourcesToPurge = onlySource ? [onlySource] : retiredSources;
const companyNamesToPurge = onlySource ? [] : retiredCompanyNames;
const discoverySourcePattern = onlySource ? /^$/ : DISCOVERY_SOURCE_PATTERN;
const sourceSet = new Set(sourcesToPurge);
const decodeMongoMapKey = (value) => String(value || "")
  .replaceAll("\uFF04", "$")
  .replaceAll("\uFF0E", ".");
const isRetiredSource = (source) => {
  const decodedSource = decodeMongoMapKey(source);
  return sourceSet.has(decodedSource) || discoverySourcePattern.test(decodedSource);
};
const uniqueStrings = (values) => [...new Set(
  values.map((value) => String(value || "").trim()).filter(Boolean),
)];

const { default: connectDB } = await import("../db/db.js");
const mongoose = (await import("mongoose")).default;

try {
  await connectDB();

  const [
    { default: AdminAudit },
    { default: Click },
    { default: Job },
    { default: JobAlertDelivery },
    { default: JobDatasetSummary },
    { default: ScraperRun },
    { default: ScraperStatus },
    { default: User },
    { refreshJobDatasetSummary },
  ] = await Promise.all([
    import("../src/models/AdminAudit.js"),
    import("../src/models/Click.js"),
    import("../src/models/Job.js"),
    import("../src/models/JobAlertDelivery.js"),
    import("../src/models/JobDatasetSummary.js"),
    import("../src/models/ScraperRun.js"),
    import("../src/models/ScraperStatus.js"),
    import("../src/models/User.js"),
    import("../src/services/jobDatasetSummaryService.js"),
  ]);

  const initialCompanyNames = uniqueStrings(companyNamesToPurge);
  const scraperStatusFilter = {
    $or: [
      { source: { $in: sourcesToPurge } },
      { source: discoverySourcePattern },
      { companyName: { $in: initialCompanyNames } },
    ],
  };
  const matchedStatuses = await ScraperStatus.find(scraperStatusFilter)
    .select("_id source companyName")
    .lean();
  const companyNames = uniqueStrings([
    ...initialCompanyNames,
    ...matchedStatuses.map(({ companyName }) => companyName),
  ]);
  const retiredCompanyFilter = {
    $or: [
      { source: { $in: sourcesToPurge } },
      { source: discoverySourcePattern },
      { company: { $in: companyNames } },
    ],
  };
  const matchedJobs = await Job.find(retiredCompanyFilter)
    .select("_id company source")
    .lean();
  const allCompanyNames = uniqueStrings([
    ...companyNames,
    ...matchedJobs.map(({ company }) => company),
  ]);
  const jobIds = matchedJobs.map(({ _id }) => _id);
  const statusIds = matchedStatuses.map(({ _id }) => _id);
  const userFilter = {
    $or: [
      { savedJobs: { $in: jobIds } },
      { "profile.profilePreferenceFilters.company": { $in: allCompanyNames } },
      { "profile.telegramAlertFilters.company": { $in: allCompanyNames } },
    ],
  };
  const deliveryFilter = {
    $or: [
      { job: { $in: jobIds } },
      { "jobSnapshot.company": { $in: allCompanyNames } },
    ],
  };
  const auditFilter = {
    $or: [
      { targetType: "Job", targetId: { $in: jobIds } },
      { targetType: "ScraperStatus", targetId: { $in: statusIds } },
    ],
  };
  const scraperRuns = await ScraperRun.collection.find({}).toArray();
  const scraperRunUpdates = scraperRuns.flatMap((run) => {
    const entries = Object.entries(run.sources || {});
    const remainingEntries = entries.filter(([source]) => !isRetiredSource(source));
    if (remainingEntries.length === entries.length) return [];

    const remainingSources = Object.fromEntries(remainingEntries);
    const sourceResults = Object.values(remainingSources);
    return [{
      updateOne: {
        filter: { _id: run._id },
        update: {
          $set: {
            sources: remainingSources,
            overall: {
              totalJobs: sourceResults.reduce(
                (sum, result) => sum + Number(result?.jobsFound || 0),
                0,
              ),
              sourcesSucceeded: sourceResults.filter(
                ({ success }) => success === true,
              ).length,
              sourcesFailed: sourceResults.filter(
                ({ success }) => success === false,
              ).length,
            },
          },
        },
      },
    }];
  });

  const preview = {
    jobs: matchedJobs.length,
    scraperStatuses: matchedStatuses.length,
    users: await User.countDocuments(userFilter),
    clicks: await Click.countDocuments({ job: { $in: jobIds } }),
    jobAlertDeliveries: await JobAlertDelivery.countDocuments(deliveryFilter),
    jobDatasetSummaries: await JobDatasetSummary.countDocuments({
      companies: { $in: allCompanyNames },
    }),
    scraperRuns: scraperRunUpdates.length,
    adminAudits: await AdminAudit.countDocuments(auditFilter),
  };
  console.log("Retired-company purge preview:", JSON.stringify(preview));

  if (!confirmed) {
    console.log("Preview only. Re-run with --confirm to delete these records.");
  } else {
    const results = {};

    results.users = await User.updateMany(userFilter, {
      $pull: {
        savedJobs: { $in: jobIds },
        "profile.profilePreferenceFilters.company": { $in: allCompanyNames },
        "profile.telegramAlertFilters.company": { $in: allCompanyNames },
      },
    });
    results.clicks = await Click.deleteMany({ job: { $in: jobIds } });
    results.jobAlertDeliveries = await JobAlertDelivery.deleteMany(deliveryFilter);
    results.adminAudits = await AdminAudit.deleteMany(auditFilter);
    if (scraperRunUpdates.length > 0) {
      results.scraperRuns = await ScraperRun.collection.bulkWrite(scraperRunUpdates);
    }
    results.jobs = await Job.deleteMany(retiredCompanyFilter);
    results.scraperStatuses = await ScraperStatus.deleteMany(scraperStatusFilter);
    await refreshJobDatasetSummary();

    console.log("Retired-company purge applied:", JSON.stringify({
      jobs: results.jobs.deletedCount,
      scraperStatuses: results.scraperStatuses.deletedCount,
      users: results.users.modifiedCount,
      clicks: results.clicks.deletedCount,
      jobAlertDeliveries: results.jobAlertDeliveries.deletedCount,
      scraperRuns: results.scraperRuns?.modifiedCount || 0,
      adminAudits: results.adminAudits.deletedCount,
    }));
  }
} catch (error) {
  process.exitCode = 1;
  console.error("Retired-company purge failed:", error.message);
} finally {
  await mongoose.disconnect();
}

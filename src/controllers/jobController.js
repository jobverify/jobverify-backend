/**
 * @file Controllers for job listing searches, metadata extraction, and analytics tracking.
 * @module controllers/jobController
 */

import mongoose from "mongoose";
import Job from "../models/Job.js";
import Click from "../models/Click.js";
import { getPreferredJobTypeMatches } from "../constants/preferredJobTypes.js";
import {
  DATE_POSTED_OPTIONS,
  EXPERIENCE_BUCKET_OPTIONS,
  EXPERIENCE_BUCKET_VALUES,
  ROLE_DOMAIN_OPTIONS,
  SENIORITY_LEVELS,
  SKILL_MATCH_MODE_OPTIONS,
  SKILL_OPTIONS,
  SKILL_SCOPE_OPTIONS,
  WORK_ARRANGEMENT_OPTIONS,
  resolveSkillTokens,
} from "../constants/jobFilterTaxonomy.js";
import { resolveJobType } from "../../scraper/utils/normalizeScrapedJob.js";

import { applyPublicJobLocationScope } from "../utils/publicJobLocationScope.js";
import { canUsePremiumFilters } from "../utils/accessControl.js";
import {
  formatStoredLocationLabel,
  mergeLocationOptions,
} from "../utils/jobLocations.js";
import { normalizeJobSearchKey } from "../utils/jobSearchKeys.js";
import { getValidIndiaCityForJob } from "../utils/publicJobLocationScope.js";
import { hasWorkdayOutageSignal } from "../../scraper/myworkday/engine.js";

const MAX_REGEX_FILTER_LENGTH = 80;
const MAX_TEXT_QUERY_LENGTH = 200;
const MAX_RECOMMENDATION_TERMS = 20;
const MAX_PAGE = 500;
const CLICK_DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_REASONABLE_EXPERIENCE_YEARS = 40;
const PUBLIC_CACHE_HEADER =
  "public, max-age=120, s-maxage=300, stale-while-revalidate=300";
const PRIVATE_CACHE_HEADER = "private, max-age=120, must-revalidate";
const FALLBACK_JOB_SLUG = "job";
const JOB_CARD_PAGE_LIMIT = 12;
const MAX_JOB_CARD_PAGE_LIMIT = 100;
const MAX_EXPERIENCE_FILTER_YEAR = 15;
const EXPERIENCE_UNSPECIFIED_VALUE = "unspecified";
const WORKDAY_APPLICATION_PROBE_TIMEOUT_MS = 5000;
const APPLICATION_UNAVAILABLE_MESSAGE =
  "The original application link is unavailable for this listing.";
const WORKDAY_APPLICATION_UNAVAILABLE_MESSAGE =
  "Applications on this Workday portal are temporarily unavailable because Workday is showing a maintenance page. Please try again later.";
const PREMIUM_FILTER_KEYS = [
  "query",
  "company",
  "city",
  "location",
  "jobType",
  "batch",
  "branch",
  "skills",
  "experienceYear",
  "skillMatchMode",
  "skillScope",
  "experienceBucket",
  "roleDomain",
  "seniority",
  "workArrangement",
  "datePostedDays",
];
const JOB_LIST_CARD_FIELDS = Object.freeze([
  "title",
  "company",
  "location",
  "city",
  "locations",
  "jobType",
  "experienceRequired",
  "primaryRoleDomain",
  "seniority",
  "workArrangement",
  "eligibleBatches",
  "branches",
  "postedAt",
  "jobSkills",
]);
const JOB_LIST_CARD_PROJECTION = JOB_LIST_CARD_FIELDS.join(" ");
const JOB_LIST_CARD_TEXT_PROJECTION = Object.freeze(
  Object.fromEntries(JOB_LIST_CARD_FIELDS.map((field) => [field, 1])),
);
const JOB_LIST_CARD_AGGREGATE_PROJECT = JOB_LIST_CARD_TEXT_PROJECTION;

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const slugifyJob = (...parts) => {
  const slug = parts
    .filter(Boolean)
    .join(" ")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s_-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90)
    .replace(/-$/g, "");

  return slug || FALLBACK_JOB_SLUG;
};

const normalizeFilterText = (value, maxLength = MAX_REGEX_FILTER_LENGTH) =>
  String(value || "").trim().slice(0, maxLength);

const normalizeCompanyOption = (value) =>
  String(value || "").replace(/\s+/g, " ").trim();

const normalizePublicCityOptions = (values = []) => mergeLocationOptions(
  values
    .map((value) => getValidIndiaCityForJob({ city: value, location: value }))
    .filter(Boolean),
);

const mergeCompanyOptions = (...lists) => {
  const seen = new Set();
  const companies = [];

  for (const value of lists.flat()) {
    const normalized = normalizeCompanyOption(value);
    if (!normalized) continue;

    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    companies.push(normalized);
  }

  return companies.sort((left, right) => left.localeCompare(right, "en", { sensitivity: "base" }));
};

let _scraperCatalogCompanies = null;
const getScraperCatalogCompanies = async () => {
  if (_scraperCatalogCompanies === null) {
    const { getScraperCatalog } = await import("../../scraper/providers/index.js");
    _scraperCatalogCompanies = getScraperCatalog()
      .map((provider) => normalizeCompanyOption(provider.companyName))
      .filter(Boolean);
  }
  return _scraperCatalogCompanies;
};

const normalizeList = (value, { maxItems = 20, maxLength = MAX_REGEX_FILTER_LENGTH } = {}) => {
  const list = Array.isArray(value) ? value : String(value || "").split(",");
  return list
    .map((item) => normalizeFilterText(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
};

const normalizeExactList = (value, { maxItems = 20, maxLength = MAX_REGEX_FILTER_LENGTH } = {}) => {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  return [...new Set(
    list
      .map((item) => normalizeFilterText(item, maxLength))
      .filter(Boolean)
  )].slice(0, maxItems);
};

const normalizeOptionValue = (value, options = []) => {
  const normalized = normalizeFilterText(value, MAX_TEXT_QUERY_LENGTH).toLowerCase();
  if (!normalized) return null;

  return options.find((optionValue) => String(optionValue).toLowerCase() === normalized) || null;
};

const normalizeOptionValues = (value, options = []) => [...new Set(
  normalizeList(value, { maxItems: options.length || 20, maxLength: MAX_TEXT_QUERY_LENGTH })
    .map((item) => normalizeOptionValue(item, options))
    .filter(Boolean)
)];

const normalizeDatePostedDays = (value) => {
  const normalized = Number.parseInt(String(value ?? "").trim(), 10);
  return DATE_POSTED_OPTIONS.includes(normalized) ? normalized : null;
};

const normalizeDatePostedDaysValues = (value) => [...new Set(
  normalizeList(value, { maxItems: DATE_POSTED_OPTIONS.length, maxLength: 8 })
    .map((item) => normalizeDatePostedDays(item))
    .filter((item) => item != null)
)];

const buildDatePostedCutoff = (days) => {
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - days);
  return cutoff;
};

const normalizeSkillMatchMode = (value) => (
  normalizeOptionValue(
    value,
    SKILL_MATCH_MODE_OPTIONS.map(({ value: modeValue }) => modeValue),
  ) || "any"
);

const normalizeSkillScope = (value) => (
  normalizeOptionValue(
    value,
    SKILL_SCOPE_OPTIONS.map(({ value: scopeValue }) => scopeValue),
  ) || "all"
);

const buildSafeRegex = (value, { exact = false } = {}) => {
  const normalized = normalizeFilterText(value);
  if (!normalized) return null;
  const escaped = escapeRegex(normalized);
  return new RegExp(exact ? `^${escaped}$` : escaped, "i");
};

const resolveFrontendOrigin = () =>
  String(process.env.FRONTEND_ORIGIN || process.env.CORS_ORIGIN || "")
    .split(",")[0]
    .trim()
    .replace(/\/+$/, "");

const isPartTimeJobType = (value) => /part[\s_-]?time/i.test(String(value || ""));

const normalizeJobTypeLabel = (value) => {
  const normalized = String(value || "").trim().toLowerCase();

  if (!normalized) return null;
  if (normalized === "intern" || normalized === "internship") return "Intern";
  if (normalized === "contract") return "Contract";
  if (normalized === "full-time fresher") return "Full-time Fresher";
  if (normalized === "full-time experienced") return "Full-time Experienced";
  if (normalized === "full-time") return "Full-time";
  return null;
};

const deriveExperienceLevelFromYears = (minimumYears) => {
  if (!Number.isFinite(minimumYears) || minimumYears < 0) return null;
  if (minimumYears <= 1) return "Entry Level";
  if (minimumYears === 2) return "Junior Level";
  if (minimumYears >= 8) return "Senior Level";
  return "Mid Level";
};

const getStructuredExperienceMinimumYears = (job = {}) => {
  const minimumYears = Number(job?.experienceProfile?.minimumYears);

  return Number.isFinite(minimumYears)
    && minimumYears >= 0
    && minimumYears <= MAX_REASONABLE_EXPERIENCE_YEARS
    ? minimumYears
    : null;
};

const normalizeResponseExperienceLevel = (job = {}) => {
  const derivedFromProfile = deriveExperienceLevelFromYears(
    getStructuredExperienceMinimumYears(job),
  );
  const derivedFromText = deriveExperienceLevelFromYears(
    extractExperienceYears(job?.experienceRequired)[0],
  );
  const derivedExperienceLevel = derivedFromProfile || derivedFromText;
  const storedExperienceLevel = String(job?.experienceLevel || "").trim();

  if (!derivedExperienceLevel) {
    return storedExperienceLevel || null;
  }

  if (
    !storedExperienceLevel
    || (
      ["Entry Level", "Junior Level"].includes(storedExperienceLevel)
      && ["Mid Level", "Senior Level"].includes(derivedExperienceLevel)
    )
  ) {
    return derivedExperienceLevel;
  }

  return storedExperienceLevel;
};

const normalizeResponseJobType = (job = {}) => {
  const normalizedLabel = normalizeJobTypeLabel(job.jobType);
  const normalizedExperienceLevel = normalizeResponseExperienceLevel(job);
  const resolved = resolveJobType({
    ...job,
    experienceLevel: normalizedExperienceLevel,
  });
  const normalizedResolved = resolved
    ? normalizeJobTypeLabel(resolved) || resolved
    : null;

  if (
    normalizedLabel
    && normalizedResolved
    && normalizedLabel !== "Full-time"
    && normalizedResolved !== "Full-time"
    && normalizedLabel !== normalizedResolved
    && (
      normalizedLabel === "Full-time Fresher"
      || normalizedLabel === "Full-time Experienced"
    )
  ) {
    return isPartTimeJobType(normalizedResolved) ? null : normalizedResolved;
  }

  if (normalizedLabel && normalizedLabel !== "Full-time") {
    return isPartTimeJobType(normalizedLabel) ? null : normalizedLabel;
  }

  if (normalizedResolved) {
    return isPartTimeJobType(normalizedResolved) ? null : normalizedResolved;
  }

  return isPartTimeJobType(job.jobType) ? null : job.jobType || null;
};

const getSafeExternalApplicationUrl = (value) => {
  try {
    const url = new URL(String(value || "").trim());
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
};

const buildApplicationState = (job = {}) => {
  const applicationUrl = getSafeExternalApplicationUrl(job.applyUrl)
    || getSafeExternalApplicationUrl(job.sourceUrl);

  if (!applicationUrl) {
    return {
      applicationUrl: null,
      applicationStatus: "unavailable",
      applicationStatusReason: APPLICATION_UNAVAILABLE_MESSAGE,
    };
  }

  return {
    applicationUrl,
    applicationStatus: "available",
    applicationStatusReason: null,
  };
};

const isWorkdayApplication = (job = {}, applicationUrl = "") => {
  if (String(job?.atsPlatform || "").toLowerCase() === "workday") return true;

  try {
    const hostname = new URL(applicationUrl).hostname.toLowerCase();
    return hostname.includes("myworkdayjobs.com") || hostname.includes("workdayjobs.com");
  } catch {
    return false;
  }
};

const withAbortTimeout = (timeoutMs) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    clear() {
      clearTimeout(timeoutId);
    },
  };
};

const annotateWorkdayApplicationAvailability = async (job = {}) => {
  if (
    !job
    || job.applicationStatus !== "available"
    || !job.applicationUrl
    || !isWorkdayApplication(job, job.applicationUrl)
  ) {
    return job;
  }

  const { signal, clear } = withAbortTimeout(WORKDAY_APPLICATION_PROBE_TIMEOUT_MS);

  try {
    const response = await fetch(job.applicationUrl, {
      redirect: "follow",
      signal,
    });
    const html = await response.text().catch(() => "");

    if (hasWorkdayOutageSignal({ html, url: response.url })) {
      return {
        ...job,
        applicationStatus: "temporarily_unavailable",
        applicationStatusReason: WORKDAY_APPLICATION_UNAVAILABLE_MESSAGE,
      };
    }
  } catch {
    return job;
  } finally {
    clear();
  }

  return job;
};

const normalizeResponseJob = (job) => (
  job
    ? {
      ...job,
      experienceLevel: normalizeResponseExperienceLevel(job),
      jobType: normalizeResponseJobType(job),
      ...buildApplicationState(job),
    }
    : job
);

const normalizeJobTypeFilters = (value) => {
  const jobTypes = normalizeList(value);
  return [...new Set(
    jobTypes.flatMap((jobTypeValue) => {
      const normalized = normalizeResponseJobType({ jobType: jobTypeValue });
      if (!normalized) return [];

      const storedMatches = getPreferredJobTypeMatches(normalized);
      return storedMatches.length > 0 ? storedMatches : [normalized];
    })
  )];
};

const EXPERIENCE_FILTER_OPTIONS = Object.freeze(
  Array.from({ length: MAX_EXPERIENCE_FILTER_YEAR + 1 }, (_, index) => index),
);
const EXPERIENCE_RANGE_PATTERN = /(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*(?:years?|yrs?)\b/i;
const EXPERIENCE_PLUS_PATTERN = /(\d+(?:\.\d+)?)\s*(?:\+|plus)\s*(?:years?|yrs?)\b/i;
const EXPERIENCE_ABOVE_PATTERN = /(\d+(?:\.\d+)?)\s*(?:years?|yrs?)\s*(?:and above|or above)\b/i;
const EXPERIENCE_MINIMUM_PATTERN = /(?:at least|min(?:imum)?(?: of)?|minimum|required|preferred)\s*(\d+(?:\.\d+)?)\s*(?:years?|yrs?)\b/i;
const EXPERIENCE_VALUE_PATTERN = /(\d+(?:\.\d+)?)\s*(?:years?|yrs?)\b/i;
const EXPERIENCE_YEAR_UNIT_REGEX_SOURCE = "(?:years?|yrs?)";
const EXPERIENCE_TEXT_HINT_PATTERN = /(^|[^0-9.])(?:\d+(?:\.\d+)?\s*(?:(?:-|to)\s*\d+(?:\.\d+)?\s*)?(?:(?:\+|plus)\s*)?(?:years?|yrs?)\b|\d+(?:\.\d+)?\s*(?:years?|yrs?)\s*(?:and above|or above)\b|(?:at least|min(?:imum)?(?: of)?|minimum|required|preferred)\s*\d+(?:\.\d+)?\s*(?:years?|yrs?)\b|no prior experience required|no experience required|freshers? can apply|freshers?|entry[- ]level applicants are encouraged)/i;

const clampExperienceYear = (value) => {
  const normalized = Number.parseFloat(value);
  if (!Number.isFinite(normalized)) return null;
  return Math.min(MAX_EXPERIENCE_FILTER_YEAR, Math.max(0, normalized));
};

const extractExperienceYears = (value) => {
  const normalized = String(value || "")
    .replace(/[–—−]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return [];

  if (/\b(no prior experience required|no experience required|freshers? can apply|freshers?|entry[- ]level applicants are encouraged)\b/i.test(normalized)) {
    return [0];
  }

  const rangeMatch = normalized.match(EXPERIENCE_RANGE_PATTERN);
  if (rangeMatch) {
    const start = clampExperienceYear(Math.ceil(Number.parseFloat(rangeMatch[1])));
    const end = clampExperienceYear(Math.floor(Number.parseFloat(rangeMatch[2])));
    if (start == null || end == null || end < start) return [];
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }

  const plusMatch = (
    normalized.match(EXPERIENCE_PLUS_PATTERN)
    || normalized.match(EXPERIENCE_ABOVE_PATTERN)
    || normalized.match(EXPERIENCE_MINIMUM_PATTERN)
  );
  if (plusMatch) {
    const start = clampExperienceYear(Math.ceil(Number.parseFloat(plusMatch[1])));
    if (start == null) return [];
    return Array.from(
      { length: MAX_EXPERIENCE_FILTER_YEAR - start + 1 },
      (_, index) => start + index,
    );
  }

  const valueMatch = normalized.match(EXPERIENCE_VALUE_PATTERN);
  if (valueMatch) {
    const year = clampExperienceYear(Math.round(Number.parseFloat(valueMatch[1])));
    return year == null ? [] : [year];
  }

  return [];
};

const normalizeExperienceFilterValues = (value) => normalizeList(value, {
  maxItems: MAX_EXPERIENCE_FILTER_YEAR + 2,
  maxLength: 16,
});

const normalizeExperienceYearFilters = (value) => [...new Set(
  normalizeExperienceFilterValues(value)
    .map((item) => Number.parseInt(String(item).trim(), 10))
    .filter((year) => (
      Number.isFinite(year)
      && year >= 0
      && year <= MAX_EXPERIENCE_FILTER_YEAR
    )),
)];

const hasUnspecifiedExperienceFilter = (value) => (
  normalizeExperienceFilterValues(value)
    .some((item) => item.toLowerCase() === EXPERIENCE_UNSPECIFIED_VALUE)
);

const experienceNumberRegexSource = (year) => `${year}(?:\\.0+)?`;

const buildExperienceRequiredRegex = (years = []) => {
  const alternatives = new Set();

  for (const year of years) {
    const selectedYear = Number.parseInt(String(year), 10);
    if (!Number.isFinite(selectedYear)) continue;

    const selectedYearPattern = experienceNumberRegexSource(selectedYear);
    alternatives.add(`${selectedYearPattern}\\s*${EXPERIENCE_YEAR_UNIT_REGEX_SOURCE}\\b`);

    for (let start = 0; start <= selectedYear; start += 1) {
      const startPattern = experienceNumberRegexSource(start);
      alternatives.add(`${startPattern}\\s*(?:\\+|plus)\\s*${EXPERIENCE_YEAR_UNIT_REGEX_SOURCE}\\b`);
      alternatives.add(`${startPattern}\\s*${EXPERIENCE_YEAR_UNIT_REGEX_SOURCE}\\s*(?:and above|or above)\\b`);
      alternatives.add(`(?:at least|min(?:imum)?(?: of)?|minimum|required|preferred)\\s*${startPattern}\\s*${EXPERIENCE_YEAR_UNIT_REGEX_SOURCE}\\b`);

      for (let end = selectedYear; end <= MAX_EXPERIENCE_FILTER_YEAR; end += 1) {
        alternatives.add(`${startPattern}\\s*(?:-|to)\\s*${experienceNumberRegexSource(end)}\\s*${EXPERIENCE_YEAR_UNIT_REGEX_SOURCE}\\b`);
      }
    }

    if (selectedYear === 0) {
      alternatives.add("no prior experience required");
      alternatives.add("no experience required");
      alternatives.add("freshers? can apply");
      alternatives.add("freshers?");
      alternatives.add("entry[- ]level applicants are encouraged");
    }
  }

  if (alternatives.size === 0) return null;

  return new RegExp(`(^|[^0-9.])(?:${[...alternatives].join("|")})`, "i");
};

const buildExperienceRequiredTextGuard = (years = []) => {
  const matchRegex = buildExperienceRequiredRegex(years);
  if (!matchRegex) return null;

  return {
    $or: [
      { experienceRequired: { $exists: false } },
      { experienceRequired: null },
      { experienceRequired: "" },
      { experienceRequired: { $not: EXPERIENCE_TEXT_HINT_PATTERN } },
      { experienceRequired: { $regex: matchRegex } },
    ],
  };
};

const buildMissingExperienceYearsCondition = () => ({
  $or: [
    { experienceYears: { $exists: false } },
    { experienceYears: null },
    { experienceYears: { $size: 0 } },
  ],
});

const buildFresherJobTypeConstraint = () => {
  const fresherJobTypes = getPreferredJobTypeMatches("Full-time Fresher");

  if (fresherJobTypes.length === 1) {
    return { jobType: fresherJobTypes[0] };
  }

  if (fresherJobTypes.length > 1) {
    return { jobType: { $in: fresherJobTypes } };
  }

  return null;
};

const buildExperienceYearMatchConstraint = (years = []) => {
  const matchRegex = buildExperienceRequiredRegex(years);
  if (!matchRegex) return null;

  const storedYearsCondition = { experienceYears: { $in: years } };
  const storedYearsTextGuard = buildExperienceRequiredTextGuard(years);
  const storedYearsBranch = storedYearsTextGuard
    ? { $and: [storedYearsCondition, storedYearsTextGuard] }
    : storedYearsCondition;

  return {
    $or: [
      storedYearsBranch,
      {
        $and: [
          buildMissingExperienceYearsCondition(),
          { experienceRequired: { $regex: matchRegex } },
        ],
      },
    ],
  };
};

const buildExperienceYearConstraint = (years = []) => {
  const normalizedYears = [...new Set(
    years
      .map((year) => Number.parseInt(String(year), 10))
      .filter((year) => Number.isFinite(year)),
  )];
  const constraints = [];

  if (normalizedYears.includes(0)) {
    const zeroYearConstraint = buildExperienceYearMatchConstraint([0]);
    const fresherJobTypeConstraint = buildFresherJobTypeConstraint();
    if (zeroYearConstraint && fresherJobTypeConstraint) {
      constraints.push({ $and: [zeroYearConstraint, fresherJobTypeConstraint] });
    }
  }

  const nonZeroYears = normalizedYears.filter((year) => year !== 0);
  if (nonZeroYears.length > 0) {
    constraints.push(buildExperienceYearMatchConstraint(nonZeroYears));
  }

  const activeConstraints = constraints.filter(Boolean);
  if (activeConstraints.length === 1) return activeConstraints[0];
  if (activeConstraints.length > 1) return { $or: activeConstraints };
  return null;
};

const buildUnspecifiedExperienceConstraint = () => ({
  $and: [
    {
      $or: [
        { experienceBucket: EXPERIENCE_UNSPECIFIED_VALUE },
        { experienceYears: { $exists: false } },
        { experienceYears: null },
        { experienceYears: { $size: 0 } },
        { experienceRequired: { $exists: false } },
        { experienceRequired: null },
        { experienceRequired: "" },
      ],
    },
    {
      $or: [
        { experienceRequired: { $exists: false } },
        { experienceRequired: null },
        { experienceRequired: "" },
        { experienceRequired: { $not: EXPERIENCE_TEXT_HINT_PATTERN } },
      ],
    },
  ],
});

const appendFilterConstraint = (filters, condition) => {
  if (!condition) return;

  if (!Array.isArray(filters.$and)) {
    filters.$and = [];
  }

  filters.$and.push(condition);
};

const sendJobsResponse = (res, jobs, pageNum, limitNum, total, totalCompanies) => {
  const totalPages = Math.ceil(total / limitNum) || 1;

  return res.status(200).json({
    code: 200,
    success: true,
    message: "Jobs retrieved successfully",
    data: jobs.map(normalizeResponseJob),
    pagination: {
      total,
      totalCompanies,
      page: pageNum,
      limit: limitNum,
      totalPages,
    },
  });
};

const applyJobListProjection = (query, { includeTextScore = false } = {}) => (
  query.select(
    includeTextScore
      ? { ...JOB_LIST_CARD_TEXT_PROJECTION, score: { $meta: "textScore" } }
      : JOB_LIST_CARD_PROJECTION,
  )
);

const resolveJobListSortOption = ({ sort, hasTextSearch = false } = {}) => {
  if (sort === "popularity") {
    return { clickCount: -1, postedAt: -1, _id: -1 };
  }

  if (sort === "latest") {
    return { postedAt: -1, createdAt: -1, _id: -1 };
  }

  if (sort === "oldest") {
    return { postedAt: 1, createdAt: 1, _id: 1 };
  }

  if (hasTextSearch) {
    return { score: { $meta: "textScore" }, postedAt: -1, _id: -1 };
  }

  return { postedAt: -1, createdAt: -1, _id: -1 };
};

// Generates database query filters based on query parameters.
const buildJobFilterConditions = (queryParams = {}, { includeExperienceYear = true } = {}) => {
  const {
    query,
    location,
    company,
    city,
    jobType,
    batch,
    branch,
    skills,
    skillMatchMode,
    skillScope,
    experienceYear,
    experienceBucket,
    roleDomain,
    seniority,
    workArrangement,
    datePostedDays,
  } = queryParams;
  const filters = { status: "active" };

  if (company) {
    const companyList = normalizeExactList(company);
    const companyKeys = companyList
      .map((value) => normalizeJobSearchKey(value))
      .filter(Boolean);

    if (companyKeys.length === 1) {
      filters.companyKey = companyKeys[0];
    } else if (companyKeys.length > 1) {
      filters.companyKey = { $in: companyKeys };
    }
  }

  if (city) {
    const cityList = normalizeList(city);
    const hasNone = cityList.some((c) => c.toLowerCase() === 'none');
    if (!hasNone) {
      const cityKeys = cityList
        .map((value) => normalizeJobSearchKey(value))
        .filter(Boolean);

      if (cityKeys.length === 1) {
        filters.locationKeys = cityKeys[0];
      } else if (cityKeys.length > 1) {
        filters.locationKeys = { $in: cityKeys };
      }
    }
  }

  if (location) {
    const locationKeys = normalizeList(location)
      .map((value) => normalizeJobSearchKey(value))
      .filter(Boolean);
    if (locationKeys.length > 0 && !filters.locationKeys) {
      filters.locationKeys = { $in: locationKeys };
    }
  }

  if (jobType) {
    const jobTypes = normalizeJobTypeFilters(jobType);
    if (jobTypes.length > 0) {
      filters.jobType = { $in: jobTypes };
    }
  }

  if (batch) {
    const batchValues = normalizeList(batch)
      .map((b) => Number(b))
      .filter(Number.isFinite);

    if (batchValues.length > 0) {
      filters.eligibleBatches = { $in: batchValues };
    }
  }

  if (branch) {
    const branches = normalizeList(branch);

    if (branches.length > 0) {
      filters.branches = { $in: branches };
    }
  }

  if (skills) {
    const skillsArray = resolveSkillTokens(
      normalizeList(skills, { maxItems: 8, maxLength: MAX_REGEX_FILTER_LENGTH }),
    );

    if (skillsArray.length > 0) {
      const matchMode = normalizeSkillMatchMode(skillMatchMode);
      const scope = normalizeSkillScope(skillScope);
      const fieldName = scope === "required" ? "requiredSkillIds" : "skillIds";
      filters[fieldName] = matchMode === "all"
        ? { $all: skillsArray }
        : { $in: skillsArray };
    }
  }

  if (includeExperienceYear) {
    const normalizedExperienceYears = normalizeExperienceYearFilters(experienceYear);
    const experienceConstraints = [];

    if (normalizedExperienceYears.length > 0) {
      experienceConstraints.push(buildExperienceYearConstraint(normalizedExperienceYears));
    }

    if (hasUnspecifiedExperienceFilter(experienceYear)) {
      experienceConstraints.push(buildUnspecifiedExperienceConstraint());
    }

    const activeExperienceConstraints = experienceConstraints.filter(Boolean);
    if (activeExperienceConstraints.length === 1) {
      appendFilterConstraint(filters, activeExperienceConstraints[0]);
    } else if (activeExperienceConstraints.length > 1) {
      appendFilterConstraint(filters, { $or: activeExperienceConstraints });
    }
  }

  if (experienceBucket) {
    const normalizedExperienceBuckets = normalizeOptionValues(experienceBucket, EXPERIENCE_BUCKET_VALUES);
    if (normalizedExperienceBuckets.length === 1) {
      filters.experienceBucket = normalizedExperienceBuckets[0];
    } else if (normalizedExperienceBuckets.length > 1) {
      filters.experienceBucket = { $in: normalizedExperienceBuckets };
    }
  }

  if (roleDomain) {
    const normalizedRoleDomains = normalizeOptionValues(roleDomain, ROLE_DOMAIN_OPTIONS);
    if (normalizedRoleDomains.length === 1) {
      filters.primaryRoleDomain = normalizedRoleDomains[0];
    } else if (normalizedRoleDomains.length > 1) {
      filters.primaryRoleDomain = { $in: normalizedRoleDomains };
    }
  }

  if (seniority) {
    const normalizedSeniority = normalizeOptionValue(seniority, SENIORITY_LEVELS);
    if (normalizedSeniority) {
      filters.seniority = normalizedSeniority;
    }
  }

  if (workArrangement) {
    const normalizedWorkArrangements = normalizeOptionValues(workArrangement, WORK_ARRANGEMENT_OPTIONS);
    if (normalizedWorkArrangements.length === 1) {
      filters.workArrangement = normalizedWorkArrangements[0];
    } else if (normalizedWorkArrangements.length > 1) {
      filters.workArrangement = { $in: normalizedWorkArrangements };
    }
  }

  if (datePostedDays) {
    const normalizedDatePostedDays = normalizeDatePostedDaysValues(datePostedDays);
    if (normalizedDatePostedDays.length > 0) {
      filters.postedAt = { $gte: buildDatePostedCutoff(Math.max(...normalizedDatePostedDays)) };
    }
  }

  if (query) {
    const cleanQuery = normalizeFilterText(query, MAX_TEXT_QUERY_LENGTH);
    if (cleanQuery) {
      filters.$text = { $search: cleanQuery };
    }
  }

  return filters;
};

const jobFilters = (queryParams, options) => applyPublicJobLocationScope(
  buildJobFilterConditions(queryParams, options),
);

const normalizeTerms = (
  values,
  { maxItems = MAX_RECOMMENDATION_TERMS, maxLength = MAX_REGEX_FILTER_LENGTH } = {},
) => {
  const list = Array.isArray(values) ? values : values ? [values] : [];
  return [...new Set(
    list
      .map((value) => normalizeFilterText(value, maxLength).toLowerCase())
      .filter(Boolean)
  )].slice(0, maxItems);
};

const hasPremiumJobFilters = (queryParams = {}) => (
  PREMIUM_FILTER_KEYS.some((key) => normalizeFilterText(queryParams[key]).length > 0)
  || (
    queryParams.sort !== undefined
    && queryParams.sort !== null
    && queryParams.sort !== ""
    && queryParams.sort !== "all"
  )
);

const hasScopedJobMetaFilters = (queryParams = {}) => (
  PREMIUM_FILTER_KEYS.some((key) => normalizeFilterText(queryParams[key]).length > 0)
);

const withoutQueryKeys = (queryParams = {}, excludedKeys = []) => {
  const excluded = new Set(excludedKeys);
  return Object.fromEntries(
    Object.entries(queryParams).filter(([key]) => !excluded.has(key)),
  );
};

const buildJobMetaFilter = (queryParams = {}, excludedKeys = [], extraFilters = {}) => (
  applyPublicJobLocationScope({
    ...buildJobFilterConditions(withoutQueryKeys(queryParams, excludedKeys)),
    ...extraFilters,
  })
);

const normalizeExperienceYearOptions = (values = []) => [...new Set(
  values
    .map((value) => Number.parseInt(String(value), 10))
    .filter((value) => (
      Number.isFinite(value)
      && value >= 0
      && value <= MAX_EXPERIENCE_FILTER_YEAR
    )),
)].sort((left, right) => left - right);

const resolveScopedDistinctValues = async (
  queryParams = {},
  field,
  excludedKeys = [],
  extraFilters = {},
) => Job.distinct(field, buildJobMetaFilter(queryParams, excludedKeys, extraFilters));

const resolveScopedExperienceYearOptions = async (queryParams = {}) => {
  const experienceYears = await Job.distinct(
    "experienceYears",
    buildJobMetaFilter(queryParams, ["experienceYear", "experienceBucket"]),
  );

  return normalizeExperienceYearOptions(experienceYears);
};

const filterSupportedOptions = (values = [], supportedOptions = []) => {
  const valueSet = new Set(values.map((value) => String(value || "").trim()).filter(Boolean));
  return supportedOptions.filter((option) => valueSet.has(option));
};

const resolveScopedDatePostedOptions = async (queryParams = {}) => {
  const baseConditions = buildJobFilterConditions(withoutQueryKeys(queryParams, ["datePostedDays"]));

  const matchesByWindow = await Promise.all(
    DATE_POSTED_OPTIONS.map(async (days) => {
      const count = await Job.countDocuments(
        applyPublicJobLocationScope({
          ...baseConditions,
          postedAt: { $gte: buildDatePostedCutoff(days) },
        }),
      );

      return count > 0 ? days : null;
    }),
  );

  return matchesByWindow.filter((days) => days != null);
};

const getBranchKeywords = (branch) => {
  const value = String(branch || "").trim().toLowerCase();

  if (!value) return [];

  if (
    value.includes("cse") ||
    value.includes("computer") ||
    value === "it" ||
    value.includes("information technology")
  ) {
    return [
      "software",
      "software engineer",
      "developer",
      "backend",
      "frontend",
      "full stack",
      "data",
      "cloud",
      "platform",
      "devops",
      "automation",
      "java",
      "python",
      "react",
      "node.js",
      "machine learning",
      "ai",
      "web",
    ];
  }

  if (value.includes("ece") || value.includes("electronics")) {
    return [
      "embedded",
      "electronics",
      "firmware",
      "hardware",
      "vlsi",
      "fpga",
      "pcb",
      "avionics",
      "network",
      "telecom",
      "semiconductor",
    ];
  }

  if (value.includes("eee") || value.includes("electrical")) {
    return [
      "electrical",
      "electronics",
      "power",
      "embedded",
      "control",
      "automation",
      "plc",
      "energy",
      "grid",
      "hardware",
    ];
  }

  if (value.includes("mechanical")) {
    return [
      "mechanical",
      "design",
      "cad",
      "manufacturing",
      "production",
      "aircraft",
      "airframe",
      "propulsion",
      "thermal",
      "fluid",
      "simulation",
      "quality",
    ];
  }

  if (value.includes("civil")) {
    return [
      "civil",
      "construction",
      "structural",
      "infrastructure",
      "site",
      "geotechnical",
    ];
  }

  if (value.includes("chemical")) {
    return [
      "chemical",
      "process",
      "materials",
      "production",
      "quality",
      "safety",
      "polymer",
    ];
  }

  return [];
};

const buildTokenMatchExpression = (input, term) => ({
  $regexMatch: {
    input,
    regex: `(^|[^a-z0-9+#.])${escapeRegex(term)}([^a-z0-9+#.]|$)`,
  },
});

const buildRecommendationTextExpression = () => ({
  $toLower: {
    $concat: [
      { $ifNull: ["$title", ""] },
      " ",
      { $ifNull: ["$company", ""] },
      " ",
      { $ifNull: ["$department", ""] },
      " ",
      { $ifNull: ["$description", ""] },
      " ",
      {
        $reduce: {
          input: { $ifNull: ["$requiredSkills", []] },
          initialValue: "",
          in: { $concat: ["$$value", " ", { $ifNull: ["$$this", ""] }] },
        },
      },
      " ",
      {
        $reduce: {
          input: { $ifNull: ["$branches", []] },
          initialValue: "",
          in: { $concat: ["$$value", " ", { $ifNull: ["$$this", ""] }] },
        },
      },
    ],
  },
});

const buildRecommendationScoreExpression = (profile = {}) => {
  const preferredJobTypes = normalizeTerms(profile.preferredJobTypes, {
    maxItems: 4,
    maxLength: MAX_REGEX_FILTER_LENGTH,
  });
  const branchKeywords = normalizeTerms(getBranchKeywords(profile.branch))
    .filter((term) => !preferredJobTypes.includes(term));
  const preferredCities = normalizeTerms(profile.locationPreference)
    .filter((city) => city !== "none");
  const branch = profile.branch ? String(profile.branch).trim().toLowerCase() : "";
  const passingYear = Number(profile.passingYear);

  const scoreParts = [
    ...preferredJobTypes.map((jobType) => ({
      $cond: [
        {
          $in: [
            "$_jobTypeText",
            getPreferredJobTypeMatches(jobType).map((value) => value.toLowerCase()),
          ],
        },
        14,
        0,
      ],
    })),
    ...branchKeywords.map((keyword) => ({
      $cond: [buildTokenMatchExpression("$_recommendationText", keyword), 4, 0],
    })),
    ...preferredCities.map((city) => ({
      $cond: [
        {
          $or: [
            { $eq: ["$_cityText", city] },
            buildTokenMatchExpression("$_locationText", city),
          ],
        },
        5,
        0,
      ],
    })),
  ];

  if (branch) {
    scoreParts.push({
      $cond: [buildTokenMatchExpression("$_recommendationText", branch), 7, 0],
    });
  }

  if (Number.isFinite(passingYear)) {
    scoreParts.push({
      $cond: [
        { $in: [passingYear, { $ifNull: ["$eligibleBatches", []] }] },
        7,
        0,
      ],
    });
  }

  return scoreParts.length ? { $add: scoreParts } : 0;
};

const buildRecommendationPipeline = (filters, profile = {}, { skip = 0, limit = 0 } = {}) => {
  const pipeline = [
    { $match: filters },
    {
      $addFields: {
        _recommendationText: buildRecommendationTextExpression(),
        _jobTypeText: { $toLower: { $ifNull: ["$jobType", ""] } },
        _cityText: { $toLower: { $ifNull: ["$city", ""] } },
        _locationText: { $toLower: { $ifNull: ["$location", ""] } },
      },
    },
    {
      $addFields: {
        recommendationScore: buildRecommendationScoreExpression(profile),
      },
    },
    {
      $sort: {
        recommendationScore: -1,
        postedAt: -1,
        clickCount: -1,
        createdAt: -1,
        _id: -1,
      },
    },
  ];

  if (skip > 0) {
    pipeline.push({ $skip: skip });
  }

  if (limit > 0) {
    pipeline.push({ $limit: limit });
  }

  pipeline.push({
    $project: JOB_LIST_CARD_AGGREGATE_PROJECT,
  });

  return pipeline;
};

// Retrieves a paginated, filtered, and sorted list of active job listings.
export const getAllJobs = async (req, res) => {
  try {
    res.set("Cache-Control", req.user ? PRIVATE_CACHE_HEADER : PUBLIC_CACHE_HEADER);
    const { page, limit, sort } = req.query;
    const hasPremiumAccess = canUsePremiumFilters(req.user);

    if (!hasPremiumAccess && hasPremiumJobFilters(req.query)) {
      return res.status(403).json({
        success: false,
        premiumRequired: true,
        feature: "job_filters",
        message: "Filters are available on Jobify Premium.",
      });
    }

    const filters = jobFilters(req.query);
    const hasTextSearch = Boolean(filters.$text);

    const DEFAULT_PAGE = 1;
    const DEFAULT_LIMIT = JOB_CARD_PAGE_LIMIT;
    const MAX_LIMIT = MAX_JOB_CARD_PAGE_LIMIT;

    let pageNum = Math.min(MAX_PAGE, Math.max(1, parseInt(page) || DEFAULT_PAGE));
    let limitNum = Math.min(MAX_LIMIT, Math.max(1, parseInt(limit) || DEFAULT_LIMIT));
    const skip = (pageNum - 1) * limitNum;

    const sortOption = resolveJobListSortOption({ sort, hasTextSearch });

    if (sort === "recommended") {
      const recommendationPipeline = buildRecommendationPipeline(
        filters,
        req.user?.profile,
        { skip, limit: limitNum },
      );

      const [total, companies, jobs] = await Promise.all([
        Job.countDocuments(filters),
        Job.distinct("company", filters),
        Job.aggregate(recommendationPipeline).exec(),
      ]);

      return sendJobsResponse(
        res,
        jobs,
        pageNum,
        limitNum,
        total,
        new Set(companies.filter(Boolean)).size,
      );
    }

    const findQuery = applyJobListProjection(
      Job.find(filters),
      { includeTextScore: hasTextSearch && !sort },
    );

    const jobsPromise = findQuery
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum)
      .lean()
      .exec();

    const [total, companies, jobs] = await Promise.all([
      Job.countDocuments(filters),
      Job.distinct("company", filters),
      jobsPromise,
    ]);

    return sendJobsResponse(
      res,
      jobs,
      pageNum,
      limitNum,
      total,
      new Set(companies.filter(Boolean)).size,
    );
  } catch (error) {
    console.error("Error in getAllJobs:", error);
    return res.status(500).json({
      code: 500,
      success: false,
      message: "Server error while fetching jobs",
    });
  }
};

// Retrieves a single job document by its unique ID.
export const getJobById = async (req, res) => {
  try {
    res.set("Cache-Control", PUBLIC_CACHE_HEADER);
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        code: 400,
        success: false,
        message: "Invalid job ID",
      });
    }

    const job = await Job.findOne(
      applyPublicJobLocationScope({ _id: id, status: "active" }),
    );

    if (!job) {
      return res.status(404).json({
        code: 404,
        success: false,
        message: "Job not found",
      });
    }

    const normalizedJob = normalizeResponseJob(job.toObject ? job.toObject() : job);
    const responseJob = await annotateWorkdayApplicationAvailability(normalizedJob);

    return res.status(200).json({
      code: 200,
      success: true,
      message: "Job retrieved successfully",
      data: responseJob,
    });
  } catch (error) {
    console.error("Error in getJobById:", error);
    return res.status(500).json({
      code: 500,
      success: false,
      message: "Server error while fetching job",
    });
  }
};

// Atomically increments click count and logs analytical click events.
export const trackJobClick = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        code: 400,
        success: false,
        message: "Invalid job ID",
      });
    }

    const recentClickCutoff = new Date(Date.now() - CLICK_DEDUPE_WINDOW_MS);
    const userAgent = String(req.headers["user-agent"] || "").slice(0, 500);
    const clickQuery = req.user
      ? { job: id, user: req.user._id, clickedAt: { $gte: recentClickCutoff } }
      : { job: id, user: null, ip: req.ip, userAgent, clickedAt: { $gte: recentClickCutoff } };

    const existingClick = await Click.findOne(clickQuery).lean().exec();
    if (existingClick) {
      const existingJob = await Job.findOne({ _id: id, status: "active" }).select("clickCount").lean().exec();
      if (!existingJob) {
        return res.status(404).json({
          code: 404,
          success: false,
          message: "Job not found",
        });
      }

      return res.status(200).json({
        code: 200,
        success: true,
        message: "Job click already tracked",
        data: {
          jobId: existingJob._id,
          clickCount: existingJob.clickCount || 0,
        },
      });
    }

    const job = await Job.findOneAndUpdate(
      { _id: id, status: "active" },
      { $inc: { clickCount: 1 } },
      { new: true }
    );

    if (!job) {
      return res.status(404).json({
        code: 404,
        success: false,
        message: "Job not found",
      });
    }

    // cretes an anayltics record
    try {
      await Click.create({
        user: req.user ? req.user._id : null,
        job: job._id,
        ip: req.ip,
        userAgent,
      });
    } catch (clickErr) {
      console.error("Error creating Click record:", clickErr);
    }

    return res.status(200).json({
      code: 200,
      success: true,
      message: "Job click tracked",
      data: {
        jobId: job._id,
        clickCount: job.clickCount || 0,
      },
    });
  } catch (error) {
    console.error("Error in trackJobClick:", error);
    return res.status(500).json({
      code: 500,
      success: false,
      message: "Server error while tracking job click",
    });
  }
};

// Returns distinct active option groups to populate interdependent frontend filters.
export const getJobMeta = async (req, res) => {
  try {
    const queryParams = req.query ?? {};
    const hasScopedFilters = hasScopedJobMetaFilters(queryParams);

    res.set("Cache-Control", hasScopedFilters ? PRIVATE_CACHE_HEADER : PUBLIC_CACHE_HEADER);

    if (hasScopedFilters && !canUsePremiumFilters(req.user)) {
      return res.status(403).json({
        success: false,
        premiumRequired: true,
        feature: "job_filters",
        message: "Filters are available on Jobify Premium.",
      });
    }

    const [companies, cities, jobTypes, experienceYears, roleDomains, workArrangements, datePostedOptions] = await Promise.all([
      hasScopedFilters
        ? resolveScopedDistinctValues(queryParams, "company", ["company"])
        : Job.distinct("company", applyPublicJobLocationScope({ status: "active" })),
      hasScopedFilters
        ? resolveScopedDistinctValues(queryParams, "city", ["city", "location"], { city: { $ne: null } })
        : Job.distinct("city", applyPublicJobLocationScope({ status: "active", city: { $ne: null } })),
      hasScopedFilters
        ? resolveScopedDistinctValues(queryParams, "jobType", ["jobType"], { jobType: { $ne: null } })
        : Job.distinct("jobType", applyPublicJobLocationScope({ status: "active", jobType: { $ne: null } })),
      hasScopedFilters
        ? resolveScopedExperienceYearOptions(queryParams)
        : Promise.resolve(EXPERIENCE_FILTER_OPTIONS),
      hasScopedFilters
        ? resolveScopedDistinctValues(
          queryParams,
          "primaryRoleDomain",
          ["roleDomain"],
          { primaryRoleDomain: { $ne: null } },
        )
        : Promise.resolve(ROLE_DOMAIN_OPTIONS),
      hasScopedFilters
        ? resolveScopedDistinctValues(
          queryParams,
          "workArrangement",
          ["workArrangement"],
          { workArrangement: { $ne: null } },
        )
        : Promise.resolve(WORK_ARRANGEMENT_OPTIONS),
      hasScopedFilters
        ? resolveScopedDatePostedOptions(queryParams)
        : Promise.resolve(DATE_POSTED_OPTIONS),
    ]);

    return res.status(200).json({
      code: 200,
      success: true,
      message: "Job metadata retrieved successfully",
      data: {
        companies: hasScopedFilters
          ? mergeCompanyOptions(companies)
          : mergeCompanyOptions(companies, await getScraperCatalogCompanies()),
        cities: normalizePublicCityOptions(cities),
        jobTypes: [...new Set(
          jobTypes
            .map((jobTypeValue) => normalizeResponseJobType({ jobType: jobTypeValue }))
            .filter(Boolean)
        )].sort(),
        experienceYears: hasScopedFilters ? experienceYears : [...EXPERIENCE_FILTER_OPTIONS],
        experienceBuckets: EXPERIENCE_BUCKET_OPTIONS,
        skillMatchModes: SKILL_MATCH_MODE_OPTIONS,
        skillScopes: SKILL_SCOPE_OPTIONS,
        skills: SKILL_OPTIONS,
        roleDomains: hasScopedFilters
          ? filterSupportedOptions(roleDomains, ROLE_DOMAIN_OPTIONS)
          : ROLE_DOMAIN_OPTIONS,
        seniorityLevels: SENIORITY_LEVELS,
        workArrangements: hasScopedFilters
          ? filterSupportedOptions(workArrangements, WORK_ARRANGEMENT_OPTIONS)
          : WORK_ARRANGEMENT_OPTIONS,
        datePostedOptions,
      },
    });
  } catch (error) {
    console.error('Error in getJobMeta:', error);
    return res.status(500).json({
      code: 500,
      success: false,
      message: 'Server error while fetching job meta',
    });
  }
};

// Returns public summary counts for the landing page stats bar.
export const getJobStats = async (req, res) => {
  try {
    res.set("Cache-Control", PUBLIC_CACHE_HEADER);
    const [totalJobs, companies] = await Promise.all([
      Job.countDocuments(applyPublicJobLocationScope({ status: "active" })),
      Job.distinct("company", applyPublicJobLocationScope({ status: "active" })),
    ]);

    return res.status(200).json({
      code: 200,
      success: true,
      data: {
        totalJobs,
        totalCompanies: companies.filter(Boolean).length,
      },
    });
  } catch (error) {
    console.error('Error in getJobStats:', error);
    return res.status(500).json({
      code: 500,
      success: false,
      message: 'Server error while fetching job stats',
    });
  }
};

export const getJobSeoFeed = async (_req, res) => {
  try {
    const frontendOrigin = resolveFrontendOrigin();
    res.set("Cache-Control", PUBLIC_CACHE_HEADER);

    const jobs = await Job.find(
      applyPublicJobLocationScope({
        status: "active",
        sourceUrl: { $exists: true, $ne: null },
      }),
    )
      .sort({ postedAt: -1, createdAt: -1 })
      .select("title company postedAt updatedAt closingDate city location locations jobType")
      .lean()
      .exec();

    const data = jobs.map((job) => {
      const path = `/jobs/${job._id}/${slugifyJob(job.title, job.company)}`;

      return {
        id: job._id,
        path,
        url: frontendOrigin ? `${frontendOrigin}${path}` : null,
        lastModified: job.updatedAt || job.postedAt || null,
        validThrough: job.closingDate || null,
        title: job.title,
        company: job.company,
        city: formatStoredLocationLabel(job) || null,
        jobType: normalizeResponseJobType(job),
      };
    });

    return res.status(200).json({
      code: 200,
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error in getJobSeoFeed:", error);
    return res.status(500).json({
      code: 500,
      success: false,
      message: "Server error while fetching job SEO feed",
    });
  }
};

export {
  JOB_CARD_PAGE_LIMIT,
  MAX_JOB_CARD_PAGE_LIMIT,
  JOB_LIST_CARD_PROJECTION,
  buildJobFilterConditions,
  buildJobMetaFilter,
  buildRecommendationPipeline,
  jobFilters as buildJobListFilters,
  resolveJobListSortOption,
};

import { getPreferredJobTypeMatches } from "../constants/preferredJobTypes.js";
import {
  DATE_POSTED_NA_VALUE,
  DATE_POSTED_OPTIONS,
  EXPERIENCE_BUCKET_VALUES,
  ROLE_DOMAIN_OPTIONS,
  SENIORITY_LEVELS,
  SKILL_MATCH_MODE_OPTIONS,
  SKILL_SCOPE_OPTIONS,
  WORK_ARRANGEMENT_OPTIONS,
  resolveSkillTokens,
} from "../constants/jobFilterTaxonomy.js";
import { normalizeJobSearchKey } from "../utils/jobSearchKeys.js";
import { normalizeProfilePreferenceFilters } from "../utils/profilePreferenceFilters.js";

const MAX_REGEX_FILTER_LENGTH = 80;
const MAX_TEXT_QUERY_LENGTH = 200;
const MAX_EXPERIENCE_FILTER_YEAR = 15;
const EXPERIENCE_UNSPECIFIED_VALUE = "unspecified";
const EXPERIENCE_TEXT_HINT_PATTERN = /(^|[^0-9.])(?:\d+(?:\.\d+)?\s*(?:(?:-|to)\s*\d+(?:\.\d+)?\s*)?(?:(?:\+|plus)\s*)?(?:years?|yrs?)\b|\d+(?:\.\d+)?\s*(?:years?|yrs?)\s*(?:and above|or above)\b|(?:at least|min(?:imum)?(?: of)?|minimum|required|preferred)\s*\d+(?:\.\d+)?\s*(?:years?|yrs?)\b|no prior experience required|no experience required|freshers? can apply|freshers?|entry[- ]level applicants are encouraged|experienced(?: professionals?)?|entry[- ]level|junior level|mid(?:-| )level|senior(?:-| )level|associate(?: level)?)/i;

const normalizeFilterText = (value, maxLength = MAX_TEXT_QUERY_LENGTH) => String(value ?? "")
  .trim()
  .replace(/\s+/g, " ")
  .slice(0, maxLength);

const normalizeList = (value, { maxItems = 20, maxLength = MAX_REGEX_FILTER_LENGTH } = {}) => (
  (Array.isArray(value) ? value : String(value || "").split(","))
    .map((item) => normalizeFilterText(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems)
);

const normalizeExactList = (value, { maxItems = 20, maxLength = MAX_REGEX_FILTER_LENGTH } = {}) => {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  return [...new Set(list.map((item) => normalizeFilterText(item, maxLength)).filter(Boolean))]
    .slice(0, maxItems);
};

const normalizeOptionValue = (value, options = []) => {
  const normalized = normalizeFilterText(value).toLowerCase();
  return options.find((option) => String(option).toLowerCase() === normalized) || null;
};

const normalizeOptionValues = (value, options = []) => [...new Set(
  normalizeList(value, { maxItems: options.length || 20, maxLength: MAX_TEXT_QUERY_LENGTH })
    .map((item) => normalizeOptionValue(item, options))
    .filter(Boolean),
)];

const buildDatePostedFilter = (values) => {
  const clauses = values.map((value) => {
    if (value === DATE_POSTED_NA_VALUE) return { postedAt: null };
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - value);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { postedAt: { $gte: start, $lt: end } };
  });
  return clauses.length === 1 ? clauses[0] : { $or: clauses };
};

const appendFilterConstraint = (filters, condition) => {
  if (!condition) return;
  if (!Array.isArray(filters.$and)) filters.$and = [];
  filters.$and.push(condition);
};

const buildExperienceYearConstraint = (years) => {
  const normalizedYears = [...new Set(years.map(Number).filter(Number.isFinite))];
  const constraints = [];
  if (normalizedYears.includes(0)) {
    constraints.push({ $and: [{ experienceYears: { $in: [0] } }, { jobType: { $in: getPreferredJobTypeMatches("Full-time Fresher") } }] });
  }
  const nonZeroYears = normalizedYears.filter((year) => year !== 0);
  if (nonZeroYears.length) constraints.push({ experienceYears: { $in: nonZeroYears } });
  return constraints.length === 1 ? constraints[0] : constraints.length > 1 ? { $or: constraints } : null;
};

const buildUnspecifiedExperienceConstraint = () => ({
  $and: [{
    $or: [
      { experienceBucket: EXPERIENCE_UNSPECIFIED_VALUE },
      { experienceYears: { $exists: false } }, { experienceYears: null }, { experienceYears: { $size: 0 } },
      { experienceRequired: { $exists: false } }, { experienceRequired: null }, { experienceRequired: "" },
    ],
  }, {
    $or: [
      { "experienceProfile.hasExplicitExperience": { $exists: false } },
      { "experienceProfile.hasExplicitExperience": false },
      { experienceRequired: { $exists: false } }, { experienceRequired: null }, { experienceRequired: "" },
      { experienceRequired: { $not: EXPERIENCE_TEXT_HINT_PATTERN } },
    ],
  }],
});

const isPostedInCalendarDayWindow = (postedAt, days, now) => {
  const postedDate = new Date(postedAt);
  if (Number.isNaN(postedDate.getTime())) return false;

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - Number(days));
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return postedDate >= start && postedDate < end;
};

export const buildJobFilterConditions = (queryParams = {}, { includeExperienceYear = true } = {}) => {
  const { query, location, company, city, jobType, batch, branch, skills, skillMatchMode, skillScope, experienceYear, experienceBucket, roleDomain, seniority, workArrangement, datePostedDays } = queryParams;
  const filters = { status: "active" };
  const companyKeys = normalizeExactList(company).map(normalizeJobSearchKey).filter(Boolean);
  if (companyKeys.length === 1) filters.companyKey = companyKeys[0];
  if (companyKeys.length > 1) filters.companyKey = { $in: companyKeys };
  const cityKeys = normalizeList(city).filter((value) => value.toLowerCase() !== "none").map(normalizeJobSearchKey).filter(Boolean);
  if (cityKeys.length === 1) filters.locationKeys = cityKeys[0];
  if (cityKeys.length > 1) filters.locationKeys = { $in: cityKeys };
  const locationKeys = normalizeList(location).map(normalizeJobSearchKey).filter(Boolean);
  if (locationKeys.length && !filters.locationKeys) filters.locationKeys = { $in: locationKeys };
  const jobTypes = [...new Set(normalizeList(jobType).flatMap(getPreferredJobTypeMatches))];
  if (jobTypes.length) filters.jobType = { $in: jobTypes };
  const batchValues = normalizeList(batch).map(Number).filter(Number.isFinite);
  if (batchValues.length) filters.eligibleBatches = { $in: batchValues };
  const branches = normalizeList(branch);
  if (branches.length) filters.branches = { $in: branches };
  const skillValues = resolveSkillTokens(normalizeList(skills, { maxItems: 8, maxLength: MAX_REGEX_FILTER_LENGTH }));
  if (skillValues.length) {
    const matchMode = normalizeOptionValue(skillMatchMode, SKILL_MATCH_MODE_OPTIONS.map(({ value }) => value)) || "any";
    const scope = normalizeOptionValue(skillScope, SKILL_SCOPE_OPTIONS.map(({ value }) => value)) || "all";
    filters[scope === "required" ? "requiredSkillIds" : "skillIds"] = matchMode === "all" ? { $all: skillValues } : { $in: skillValues };
  }
  if (includeExperienceYear) {
    const experienceValues = normalizeList(experienceYear, { maxItems: MAX_EXPERIENCE_FILTER_YEAR + 2, maxLength: 16 });
    const years = [...new Set(experienceValues.map(Number).filter((year) => Number.isInteger(year) && year >= 0 && year <= MAX_EXPERIENCE_FILTER_YEAR))];
    const constraints = [buildExperienceYearConstraint(years)];
    if (experienceValues.some((value) => value.toLowerCase() === EXPERIENCE_UNSPECIFIED_VALUE)) constraints.push(buildUnspecifiedExperienceConstraint());
    const active = constraints.filter(Boolean);
    if (active.length === 1) appendFilterConstraint(filters, active[0]);
    if (active.length > 1) appendFilterConstraint(filters, { $or: active });
  }
  for (const [value, field, options] of [[experienceBucket, "experienceBucket", EXPERIENCE_BUCKET_VALUES], [roleDomain, "primaryRoleDomain", ROLE_DOMAIN_OPTIONS], [workArrangement, "workArrangement", WORK_ARRANGEMENT_OPTIONS]]) {
    const values = normalizeOptionValues(value, options);
    if (values.length === 1) filters[field] = values[0];
    if (values.length > 1) filters[field] = { $in: values };
  }
  const seniorityValue = normalizeOptionValue(seniority, SENIORITY_LEVELS);
  if (seniorityValue) filters.seniority = seniorityValue;
  const postedValues = [...new Set(normalizeList(datePostedDays, { maxItems: DATE_POSTED_OPTIONS.length, maxLength: 8 }).map((value) => {
    const normalized = value.toLowerCase();
    return normalized === DATE_POSTED_NA_VALUE ? normalized : /^\d+$/u.test(normalized) && DATE_POSTED_OPTIONS.includes(Number(normalized)) ? Number(normalized) : null;
  }).filter((value) => value != null))];
  if (postedValues.length) Object.assign(filters, buildDatePostedFilter(postedValues));
  const cleanQuery = normalizeFilterText(query);
  if (cleanQuery) filters.$text = { $search: cleanQuery };
  return filters;
};

export const hasSavedFilters = (filters = {}) => {
  const normalized = normalizeProfilePreferenceFilters(filters);
  return [normalized.company, normalized.jobType, normalized.location, normalized.roleDomain, normalized.workArrangement, normalized.datePostedDays]
    .some((items) => items.length > 0) || normalized.experienceYear !== "";
};

export const jobMatchesSavedFilters = ({ job, filters, userProfile = {}, now = new Date() }) => {
  const normalized = normalizeProfilePreferenceFilters(filters);
  if (!hasSavedFilters(normalized)) return false;
  const branch = String(userProfile.branch || "").trim().toLowerCase();
  const passingYear = Number(userProfile.passingYear);
  const branches = (job.branches || []).map((value) => String(value).trim().toLowerCase());
  const batches = (job.eligibleBatches || []).map(Number);
  if (branches.length && !branches.includes(branch)) return false;
  if (batches.length && !batches.includes(passingYear)) return false;
  const jobTypes = getPreferredJobTypeMatches(job.jobType || "");
  const location = [job.city, job.location].filter(Boolean).join(" ").toLowerCase();
  const experienceYear = normalized.experienceYear === ""
    ? null
    : Number(normalized.experienceYear);
  const experienceMatches = experienceYear === null
    || (
      (job.experienceYears || []).includes(experienceYear)
      && (
        experienceYear !== 0
        || getPreferredJobTypeMatches("Full-time Fresher").includes(job.jobType)
      )
    );

  return (
    (normalized.company.length === 0 || normalized.company.some((value) => String(job.company || "").toLowerCase() === value.toLowerCase()))
    && (normalized.jobType.length === 0 || normalized.jobType.some((value) => getPreferredJobTypeMatches(value).some((match) => jobTypes.includes(match))))
    && (normalized.location.length === 0 || normalized.location.some((value) => location.includes(String(value).toLowerCase())))
    && experienceMatches
    && (normalized.roleDomain.length === 0 || normalized.roleDomain.includes(job.primaryRoleDomain))
    && (normalized.workArrangement.length === 0 || normalized.workArrangement.includes(job.workArrangement))
    && (normalized.datePostedDays.length === 0 || normalized.datePostedDays.some((value) => (
      value === DATE_POSTED_NA_VALUE
        ? !job.postedAt
        : job.postedAt && isPostedInCalendarDayWindow(job.postedAt, value, now)
    )))
  );
};

import {
  EXPERIENCE_BUCKET_VALUES,
  EXTRACTION_VERSION,
  ROLE_DOMAIN_OPTIONS,
  SENIORITY_LEVELS,
  SKILL_REGISTRY,
  TAXONOMY_VERSION,
  WORK_ARRANGEMENT_OPTIONS,
} from "../constants/jobFilterTaxonomy.js";

const NUMBER_WORDS = new Map([
  ["zero", 0],
  ["one", 1],
  ["two", 2],
  ["three", 3],
  ["four", 4],
  ["five", 5],
  ["six", 6],
  ["seven", 7],
  ["eight", 8],
  ["nine", 9],
  ["ten", 10],
  ["eleven", 11],
  ["twelve", 12],
]);

const EXPERIENCE_UI_MIN = 0;
const EXPERIENCE_UI_MAX = 15;

const ENGINEERING_DOMAIN_TO_ROLE_DOMAIN = Object.freeze({
  "Software Engineering": "Software Engineering",
  "Machine Learning": "Data Science & AI",
  "Data Engineering": "Data Engineering",
  "DevOps": "DevOps & SRE",
  "Cloud": "Cloud & Infrastructure",
  "Security": "Cybersecurity",
  "Networking": "Cloud & Infrastructure",
  "Firmware": "Other",
  "Embedded Systems": "Other",
  "RTL": "Other",
  "Verification": "Quality Engineering",
  "Mechanical": "Other",
  "Electrical": "Other",
  "Civil": "Other",
  "Automation": "Other",
  "Robotics": "Other",
  "Research": "Data Science & AI",
});

const ROLE_DOMAIN_RULES = [
  {
    label: "Backend Engineering",
    title: [/\bbackend\b/i, /\bapi\b/i, /\bmicroservices?\b/i],
    text: [/\bbackend\b/i, /\bserver[- ]side\b/i, /\bmicroservices?\b/i, /\bapis?\b/i],
    skills: ["java", "node-js", "postgresql", "kafka"],
  },
  {
    label: "Frontend Engineering",
    title: [/\bfrontend\b/i, /\bfront[- ]end\b/i, /\bui engineer\b/i],
    text: [/\bfrontend\b/i, /\bfront[- ]end\b/i, /\bdesign systems?\b/i],
    skills: ["react", "next-js", "angular", "vue", "javascript", "typescript"],
  },
  {
    label: "Full-Stack Engineering",
    title: [/\bfull[- ]?stack\b/i],
    text: [/\bfull[- ]?stack\b/i],
    skills: ["react", "node-js", "typescript"],
  },
  {
    label: "Mobile Development",
    title: [/\bmobile\b/i, /\bandroid\b/i, /\bios\b/i],
    text: [/\bmobile\b/i, /\bandroid\b/i, /\bios\b/i],
    skills: [],
  },
  {
    label: "Quality Engineering",
    title: [/\bqa\b/i, /\bquality\b/i, /\bsdet\b/i, /\btest automation\b/i],
    text: [/\bquality assurance\b/i, /\btest automation\b/i, /\bsdet\b/i],
    skills: [],
  },
  {
    label: "DevOps & SRE",
    title: [/\bdevops\b/i, /\bsre\b/i, /\bsite reliability\b/i],
    text: [/\bdevops\b/i, /\bsite reliability\b/i, /\bplatform reliability\b/i],
    skills: ["docker", "kubernetes", "terraform", "jenkins", "github-actions"],
  },
  {
    label: "Cloud & Infrastructure",
    title: [/\bcloud\b/i, /\binfrastructure\b/i, /\bplatform\b/i],
    text: [/\bcloud\b/i, /\binfrastructure\b/i, /\bplatform engineering\b/i],
    skills: ["aws", "azure", "gcp", "docker", "kubernetes", "terraform"],
  },
  {
    label: "Data Engineering",
    title: [/\bdata engineer\b/i, /\betl\b/i],
    text: [/\bdata pipelines?\b/i, /\betl\b/i, /\bwarehouse\b/i],
    skills: ["spark", "airflow", "databricks", "snowflake", "kafka", "sql"],
  },
  {
    label: "Data Science & AI",
    title: [/\bdata scientist\b/i, /\bmachine learning\b/i, /\bml engineer\b/i, /\bai engineer\b/i],
    text: [/\bmachine learning\b/i, /\bgenerative ai\b/i, /\bnlp\b/i, /\bcomputer vision\b/i],
    skills: ["machine-learning", "generative-ai", "tensorflow", "pytorch", "mlops"],
  },
  {
    label: "Cybersecurity",
    title: [/\bsecurity\b/i, /\biam\b/i, /\bsoc\b/i],
    text: [/\bsecurity\b/i, /\bthreat\b/i, /\biam\b/i, /\bcompliance\b/i],
    skills: ["cybersecurity"],
  },
  {
    label: "Product & Program Management",
    title: [/\bproduct manager\b/i, /\bprogram manager\b/i, /\bproject manager\b/i],
    text: [/\bproduct roadmap\b/i, /\bprogram management\b/i, /\bproject management\b/i],
    skills: ["salesforce"],
  },
  {
    label: "Design & UX",
    title: [/\bux\b/i, /\bui\b/i, /\bproduct designer\b/i, /\bux researcher\b/i],
    text: [/\buser research\b/i, /\bdesign systems?\b/i, /\bwireframes?\b/i],
    skills: ["figma"],
  },
  {
    label: "Sales & Customer Success",
    title: [/\bsales\b/i, /\bcustomer success\b/i, /\bsupport\b/i, /\baccount executive\b/i],
    text: [/\bcustomer onboarding\b/i, /\bcustomer success\b/i, /\bsales pipeline\b/i, /\bsupport metrics\b/i],
    skills: ["salesforce", "hubspot"],
  },
  {
    label: "Finance & Operations",
    title: [/\bfinance\b/i, /\baccounting\b/i, /\boperations\b/i],
    text: [/\bfinancial analysis\b/i, /\boperations\b/i],
    skills: ["tableau", "power-bi"],
  },
  {
    label: "Legal & Compliance",
    title: [/\blegal\b/i, /\bcompliance\b/i, /\bcounsel\b/i],
    text: [/\blegal\b/i, /\bregulatory\b/i, /\bcompliance\b/i],
    skills: [],
  },
  {
    label: "Human Resources",
    title: [/\bhuman resources\b/i, /\brecruiter\b/i, /\btalent acquisition\b/i, /\bhr\b/i],
    text: [/\bhr\b/i, /\brecruiting\b/i, /\btalent acquisition\b/i],
    skills: [],
  },
  {
    label: "Marketing & Communications",
    title: [/\bmarketing\b/i, /\bcommunications\b/i, /\bcontent\b/i],
    text: [/\bdemand generation\b/i, /\bbrand\b/i, /\bcampaigns?\b/i],
    skills: ["hubspot"],
  },
  {
    label: "Software Engineering",
    title: [/\bsoftware engineer\b/i, /\bdeveloper\b/i, /\bsde\b/i],
    text: [/\bsoftware engineer\b/i, /\bdeveloper\b/i, /\bdistributed systems?\b/i],
    skills: ["java", "python", "node-js", "react", "typescript"],
  },
];

const normalizeText = (value) =>
  String(value || "")
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[–—−]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

const unique = (values = []) => [...new Set(values.filter(Boolean))];
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const ENTRY_LEVEL_CUE_PATTERN = /\b(?:entry[- ]level|new grad(?:uate)?s?|freshers?|fresh graduates?|recent graduates?|campus (?:hiring|recruitment)|graduate(?:\s+(?:engineer|trainee|associate|developer|programme?|program|hiring|role|scheme|opportunity))|trainee|apprentice)\b/i;

export const hasEntryLevelCue = (value = "") => ENTRY_LEVEL_CUE_PATTERN.test(String(value || ""));
export const extractEntryLevelCue = (value = "") => String(value || "").match(ENTRY_LEVEL_CUE_PATTERN)?.[0] ?? null;

const clampWorkArrangement = (value) =>
  WORK_ARRANGEMENT_OPTIONS.includes(value) ? value : "Not specified";

const normalizeNumberWords = (value) => value.replace(
  /\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/gi,
  (match) => String(NUMBER_WORDS.get(match.toLowerCase())),
);

const formatExperienceYears = (value, { openEnded = false } = {}) => {
  const numericValue = Number.parseFloat(value);
  if (!Number.isFinite(numericValue)) return null;

  const normalizedValue = Number.isInteger(numericValue)
    ? String(numericValue)
    : String(numericValue).replace(/(?:\.0+|(\.\d*?)0+)$/, "$1");
  const unit = numericValue === 1 && !openEnded ? "year" : "years";

  return `${normalizedValue}${openEnded ? "+" : ""} ${unit}`;
};

const normalizeExperienceUnit = (value) => {
  const normalized = String(value || "").toLowerCase();
  if (/^yrs?$/.test(normalized) || /^years?$/.test(normalized)) return "years";
  if (/^months?$/.test(normalized)) return "months";
  return normalized;
};

const formatExperienceBoundary = (value, unit) => {
  const numericValue = Number.parseFloat(value);
  if (!Number.isFinite(numericValue)) return null;

  const normalizedValue = Number.isInteger(numericValue)
    ? String(numericValue)
    : String(numericValue).replace(/(?:\.0+|(\.\d*?)0+)$/, "$1");
  const normalizedUnit = normalizeExperienceUnit(unit);
  const singularUnit = normalizedUnit === "months" ? "month" : "year";
  const pluralUnit = normalizedUnit === "months" ? "months" : "years";

  return `${normalizedValue} ${numericValue === 1 ? singularUnit : pluralUnit}`;
};

const formatMixedExperienceRange = (minimumValue, minimumUnit, maximumValue, maximumUnit) => {
  const start = formatExperienceBoundary(minimumValue, minimumUnit);
  const end = formatExperienceBoundary(maximumValue, maximumUnit);
  if (!start || !end) return null;
  return `${start} - ${end}`;
};

const convertExperienceValueToYears = (value, unit) => {
  const numericValue = Number.parseFloat(value);
  if (!Number.isFinite(numericValue)) return null;

  return normalizeExperienceUnit(unit) === "months"
    ? numericValue / 12
    : numericValue;
};

const bucketFromYears = (minimumYears, maximumYears) => {
  if (minimumYears == null && maximumYears == null) return "unspecified";
  const anchor = minimumYears ?? maximumYears ?? 0;
  if (anchor <= 1) return "0-1";
  if (anchor < 3) return "1-3";
  if (anchor <= 5) return "3-5";
  if (anchor <= 8) return "5-8";
  if (anchor <= 12) return "8-12";
  return "12-plus";
};

const clampExperienceYear = (value) => {
  if (!Number.isFinite(value)) return null;
  return Math.min(EXPERIENCE_UI_MAX, Math.max(EXPERIENCE_UI_MIN, value));
};

const buildExperienceYears = ({ minimumYears, maximumYears, isOpenEnded }) => {
  if (!Number.isFinite(minimumYears) && !Number.isFinite(maximumYears)) {
    return [];
  }

  if (isOpenEnded) {
    const start = clampExperienceYear(Math.ceil(minimumYears));
    if (start == null) return [];

    return Array.from(
      { length: EXPERIENCE_UI_MAX - start + 1 },
      (_, index) => start + index,
    );
  }

  const start = clampExperienceYear(Math.ceil(minimumYears));
  const end = clampExperienceYear(Math.floor(maximumYears));

  if (start == null && end == null) return [];

  if (start != null && end != null && end >= start) {
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }

  const singleYear = clampExperienceYear(
    Math.round(Number.isFinite(minimumYears) ? minimumYears : maximumYears),
  );
  return singleYear == null ? [] : [singleYear];
};

const collectSectionText = (description, labels) => labels
  .flatMap((label) => {
    const pattern = new RegExp(
      `${escapeRegex(label)}:\\n([\\s\\S]*?)(?=\\n[A-Z][A-Z &/+-]{2,}:\\n|$)`,
      "gi",
    );
    return [...String(description || "").matchAll(pattern)].map((match) => match[1].trim());
  })
  .filter(Boolean)
  .join("\n\n");

const findSkillMatches = (text, { source, confidence, required = false, preferred = false } = {}) => {
  const normalized = normalizeText(text);
  if (!normalized) return [];

  const matches = [];

  for (const skillEntry of SKILL_REGISTRY) {
    let earliestMatch = null;

    for (const pattern of skillEntry.patterns) {
      const candidate = new RegExp(pattern.source, pattern.flags);
      const result = candidate.exec(normalized);
      if (!result) continue;

      const matchData = {
        index: result.index,
        matchedPhrase: result[0],
      };

      if (!earliestMatch || matchData.index < earliestMatch.index) {
        earliestMatch = matchData;
      }
    }

    if (!earliestMatch) continue;

    matches.push({
      skillId: skillEntry.id,
      canonicalName: skillEntry.label,
      category: skillEntry.category,
      required,
      preferred,
      confidence,
      extractionSource: source,
      matchedPhrase: earliestMatch.matchedPhrase,
      index: earliestMatch.index,
    });
  }

  return matches.sort((left, right) => (
    left.index - right.index || left.canonicalName.localeCompare(right.canonicalName)
  ));
};

const mergeSkillMatches = (...groups) => {
  const merged = new Map();

  for (const group of groups.flat()) {
    if (!merged.has(group.skillId)) {
      merged.set(group.skillId, {
        skillId: group.skillId,
        canonicalName: group.canonicalName,
        category: group.category,
        required: Boolean(group.required),
        preferred: Boolean(group.preferred),
        confidence: group.confidence,
        extractionSource: group.extractionSource,
        matchedPhrase: group.matchedPhrase,
      });
      continue;
    }

    const existing = merged.get(group.skillId);
    existing.required = existing.required || Boolean(group.required);
    existing.preferred = existing.preferred || Boolean(group.preferred);
    if (existing.confidence !== "high" && group.confidence === "high") {
      existing.confidence = "high";
    }
    if (!existing.matchedPhrase) {
      existing.matchedPhrase = group.matchedPhrase;
    }
    if (existing.extractionSource !== "structured" && group.extractionSource === "structured") {
      existing.extractionSource = "structured";
    }
  }

  return [...merged.values()];
};

const collectStructuredSkillMatches = (values, options) => {
  const matches = [];
  for (const value of Array.isArray(values) ? values : []) {
    matches.push(...findSkillMatches(value, options));
  }
  return matches;
};

const parseExperienceProfile = (job = {}) => {
  const titleText = normalizeText(job.title);
  const explicitText = normalizeText(
    [job.experienceRequired, job.minimumQualification, job.preferredQualification]
      .filter(Boolean)
      .join(" "),
  );
  const descriptiveText = normalizeText(
    [job.description, job.jobDescription]
      .filter(Boolean)
      .join(" "),
  );
  const titleAndExplicitText = normalizeNumberWords(
    [titleText, explicitText]
      .filter(Boolean)
      .join(" "),
  );
  const combinedText = normalizeNumberWords(
    [titleText, explicitText, descriptiveText]
      .filter(Boolean)
      .join(" "),
  );

  const baseProfile = {
    rawText: explicitText || descriptiveText || titleText || null,
    minimumYears: null,
    maximumYears: null,
    isOpenEnded: false,
    preferredMinimumYears: null,
    hasExplicitExperience: false,
    confidence: "low",
    evidence: null,
  };

  if (!combinedText) {
    return {
      ...baseProfile,
      experienceBucket: "unspecified",
    };
  }

  const noExperienceMatch = combinedText.match(
    /\b(no prior experience required|no experience required|freshers? can apply|entry-level applicants are encouraged)\b/i,
  );
  if (noExperienceMatch) {
    return {
      ...baseProfile,
      minimumYears: 0,
      maximumYears: 0,
      hasExplicitExperience: true,
      confidence: "high",
      evidence: noExperienceMatch[0],
      experienceBucket: "0-1",
    };
  }

  const mixedUnitRangeMatch = combinedText.match(
    /(\d+(?:\.\d+)?)\s*(months?|years?|yrs?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*(months?|years?|yrs?)\b[^.]{0,80}?\bexperience\b/i,
  );
  if (mixedUnitRangeMatch) {
    const startUnit = normalizeExperienceUnit(mixedUnitRangeMatch[2]);
    const endUnit = normalizeExperienceUnit(mixedUnitRangeMatch[4]);

    if (startUnit !== endUnit) {
      const minimumYears = convertExperienceValueToYears(mixedUnitRangeMatch[1], startUnit);
      const maximumYears = convertExperienceValueToYears(mixedUnitRangeMatch[3], endUnit);
      const evidence = formatMixedExperienceRange(
        mixedUnitRangeMatch[1],
        startUnit,
        mixedUnitRangeMatch[3],
        endUnit,
      );

      return {
        ...baseProfile,
        minimumYears,
        maximumYears,
        hasExplicitExperience: true,
        confidence: "high",
        evidence,
        experienceBucket: bucketFromYears(minimumYears, maximumYears),
      };
    }
  }

  const rangeMatch = combinedText.match(
    /(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*(?:years?|yrs?)\b/i,
  );
  if (rangeMatch) {
    const minimumYears = Number.parseFloat(rangeMatch[1]);
    const maximumYears = Number.parseFloat(rangeMatch[2]);
    return {
      ...baseProfile,
      minimumYears,
      maximumYears,
      hasExplicitExperience: true,
      confidence: "high",
      evidence: rangeMatch[0],
      experienceBucket: bucketFromYears(Math.floor(minimumYears), Math.ceil(maximumYears)),
    };
  }

  const plusMatch = (
    combinedText.match(
      /(\d+(?:\.\d+)?)\s*(?:\+|plus)\s*(?:years?|yrs?)\b/i,
    )
    || combinedText.match(
      /(\d+(?:\.\d+)?)\s*(?:years?|yrs?)\s*(?:and above|or above)\b/i,
    )
    || combinedText.match(
      /(?:at least|min(?:imum)?(?: of)?|minimum|required|preferred)\s*(\d+(?:\.\d+)?)\s*(?:years?|yrs?)\b/i,
    )
  );
  if (plusMatch) {
    const minimumYears = Number.parseFloat(plusMatch[1]);
    return {
      ...baseProfile,
      minimumYears,
      maximumYears: null,
      isOpenEnded: true,
      hasExplicitExperience: true,
      confidence: "high",
      evidence: plusMatch[0],
      experienceBucket: bucketFromYears(Math.floor(minimumYears), null),
    };
  }

  const contextualSingleValueMatch = (
    combinedText.match(
      /(\d+(?:\.\d+)?)\s*(?:years?|yrs?)\s+(?:of\s+)?(?:overall\s+|relevant\s+|professional\s+|hands[- ]on\s+)?(?:experience|exp\.?)\b/i,
    )
    || combinedText.match(
      /\b(?:experience|exp\.?)\s*(?::|of|required:?|-)?\s*(\d+(?:\.\d+)?)\s*(?:years?|yrs?)\b/i,
    )
  );
  if (contextualSingleValueMatch) {
    const exactYears = Number.parseFloat(contextualSingleValueMatch[1]);
    const evidence = formatExperienceYears(exactYears);
    return {
      ...baseProfile,
      minimumYears: exactYears,
      maximumYears: exactYears,
      hasExplicitExperience: true,
      confidence: "high",
      evidence,
      experienceBucket: bucketFromYears(Math.floor(exactYears), Math.ceil(exactYears)),
    };
  }

  const explicitSingleValueMatch = titleAndExplicitText.match(
    /(\d+(?:\.\d+)?)\s*(?:years?|yrs?)\b/i,
  );
  if (explicitSingleValueMatch) {
    const exactYears = Number.parseFloat(explicitSingleValueMatch[1]);
    const evidence = formatExperienceYears(exactYears);
    return {
      ...baseProfile,
      minimumYears: exactYears,
      maximumYears: exactYears,
      hasExplicitExperience: true,
      confidence: "medium",
      evidence,
      experienceBucket: bucketFromYears(Math.floor(exactYears), Math.ceil(exactYears)),
    };
  }

  const entryLevelCue = extractEntryLevelCue(`${titleText} ${combinedText}`);
  if (entryLevelCue) {
    return {
      ...baseProfile,
      minimumYears: 0,
      maximumYears: 0,
      hasExplicitExperience: hasEntryLevelCue(combinedText),
      confidence: explicitText ? "medium" : "low",
      evidence: entryLevelCue,
      experienceBucket: "0-1",
    };
  }

  return {
    ...baseProfile,
    experienceBucket: "unspecified",
  };
};

const classifySeniority = (job = {}, experienceProfile = {}) => {
  const titleText = normalizeText(job.title).toLowerCase();
  const explicitExperienceLevel = normalizeText(job.experienceLevel);
  const combinedText = normalizeText([job.title, job.description, job.jobDescription].join(" ")).toLowerCase();

  if (/\bintern(ship)?\b/.test(titleText)) return { value: "Internship", confidence: "high" };
  if (/\bapprentice\b/.test(titleText)) return { value: "Apprentice", confidence: "high" };
  if (hasEntryLevelCue(combinedText)) {
    return { value: "Entry Level", confidence: "high" };
  }
  if (/\bvice president\b|\bvp\b/.test(titleText)) return { value: "Vice President", confidence: "high" };
  if (/\bchief\b|\bexecutive\b/.test(titleText)) return { value: "Executive", confidence: "high" };
  if (/\bdirector\b/.test(titleText)) return { value: "Director", confidence: "high" };
  if (/\bsenior manager\b/.test(titleText)) return { value: "Senior Manager", confidence: "high" };
  if (/\bmanager\b/.test(titleText)) return { value: "Manager", confidence: "high" };
  if (/\bprincipal\b/.test(titleText)) return { value: "Principal", confidence: "high" };
  if (/\bstaff\b/.test(titleText)) return { value: "Staff", confidence: "high" };
  if (/\blead\b/.test(titleText)) return { value: "Lead", confidence: "high" };
  if (/\bsenior\b|\bsr\.?\b/.test(titleText)) return { value: "Senior", confidence: "high" };

  if (explicitExperienceLevel === "Entry Level") return { value: "Entry Level", confidence: "medium" };
  if (explicitExperienceLevel === "Junior Level") return { value: "Associate", confidence: "medium" };
  if (explicitExperienceLevel === "Mid Level") return { value: "Mid Level", confidence: "medium" };
  if (explicitExperienceLevel === "Senior Level") return { value: "Senior", confidence: "medium" };

  if (experienceProfile.minimumYears != null) {
    if (experienceProfile.minimumYears <= 1) return { value: "Entry Level", confidence: "medium" };
    if (experienceProfile.minimumYears <= 3) return { value: "Associate", confidence: "medium" };
    if (experienceProfile.minimumYears <= 5) return { value: "Mid Level", confidence: "medium" };
    return { value: "Senior", confidence: "medium" };
  }

  return { value: "Unknown", confidence: "low" };
};

const scoreRulePatterns = (text, patterns = [], weight) => patterns.reduce(
  (total, pattern) => total + (pattern.test(text) ? weight : 0),
  0,
);

const classifyRoleDomain = (job = {}, skillIds = []) => {
  const titleText = normalizeText(job.title);
  const departmentText = normalizeText(job.department);
  const descriptionText = normalizeText([job.description, job.jobDescription].join(" "));
  const skillSet = new Set(skillIds);
  const mappedEngineeringDomain = ENGINEERING_DOMAIN_TO_ROLE_DOMAIN[normalizeText(job.engineeringDomain)] || null;
  const scores = new Map();

  for (const domainLabel of ROLE_DOMAIN_OPTIONS) {
    scores.set(domainLabel, 0);
  }

  for (const rule of ROLE_DOMAIN_RULES) {
    let score = 0;
    score += scoreRulePatterns(titleText, rule.title, 5);
    score += scoreRulePatterns(departmentText, rule.title, 4);
    score += scoreRulePatterns(descriptionText, rule.text, 2);
    score += rule.skills.reduce((total, skillId) => total + (skillSet.has(skillId) ? 3 : 0), 0);

    scores.set(rule.label, (scores.get(rule.label) || 0) + score);
  }

  if (mappedEngineeringDomain) {
    scores.set(mappedEngineeringDomain, (scores.get(mappedEngineeringDomain) || 0) + 3);
  }

  const sorted = [...scores.entries()]
    .filter(([, score]) => score > 0)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));

  if (sorted.length === 0) {
    return {
      primaryRoleDomain: "Other",
      secondaryRoleDomains: [],
      confidence: "low",
    };
  }

  let [primaryRoleDomain, primaryScore] = sorted[0];

  if (primaryRoleDomain === "Software Engineering") {
    const moreSpecificDomain = sorted.find(([label, score]) => (
      label !== "Software Engineering"
      && label !== "Other"
      && score >= primaryScore - 2
    ));

    if (moreSpecificDomain) {
      [primaryRoleDomain, primaryScore] = moreSpecificDomain;
    }
  }

  const secondaryRoleDomains = sorted
    .slice(1)
    .filter(([label, score]) => (
      label !== primaryRoleDomain
      && score >= primaryScore - 2
      && score >= 3
    ))
    .map(([label]) => label)
    .slice(0, 3);

  return {
    primaryRoleDomain,
    secondaryRoleDomains,
    confidence: primaryScore >= 8 ? "high" : "medium",
  };
};

const detectWorkArrangement = (job = {}) => {
  const explicit = normalizeText(job.workArrangement || job.remoteStatus);
  if (explicit) {
    if (/hybrid/i.test(explicit)) return "Hybrid";
    if (/remote/i.test(explicit)) return "Remote";
    if (/on[- ]site/i.test(explicit)) return "On-site";
    if (/flexible/i.test(explicit)) return "Not specified";
  }

  const locationText = normalizeText(
    [job.location, ...(Array.isArray(job.locations) ? job.locations : [])]
      .filter(Boolean)
      .join(" "),
  );
  const descriptionText = normalizeText([job.description, job.jobDescription].join(" "));
  const combined = `${locationText} ${descriptionText}`.toLowerCase();

  if (/\bhybrid\b/.test(combined)) return "Hybrid";
  if (/\bremote\b/.test(locationText.toLowerCase()) || /\bremote\b/.test(combined)) return "Remote";
  if (/\bon[- ]site\b|\bonsite\b|\bin[- ]office\b/.test(combined)) return "On-site";
  if (locationText) return "On-site";
  return "Not specified";
};

export const extractJobFilterSignals = (job = {}) => {
  const normalizedDescription = normalizeText(job.jobDescription || job.description);
  const requiredSectionText = collectSectionText(normalizedDescription, [
    "MINIMUM QUALIFICATIONS",
    "QUALIFICATIONS",
    "TECHNICAL COMPETENCIES & EXPERIENCE",
    "TECHNICAL COMPETENCIES",
    "SOFTWARE SKILLS",
    "IT SKILLS",
    "LANGUAGE & SKILLS",
  ]);
  const preferredSectionText = collectSectionText(normalizedDescription, ["PREFERRED QUALIFICATIONS"]);

  const requiredMatches = mergeSkillMatches(
    collectStructuredSkillMatches(job.requiredSkills, {
      source: "structured",
      confidence: "high",
      required: true,
    }),
    findSkillMatches(job.minimumQualification, {
      source: "minimumQualification",
      confidence: "high",
      required: true,
    }),
    findSkillMatches(requiredSectionText, {
      source: "description-required-section",
      confidence: "medium",
      required: true,
    }),
  );

  const preferredMatches = mergeSkillMatches(
    findSkillMatches(job.preferredQualification, {
      source: "preferredQualification",
      confidence: "high",
      preferred: true,
    }),
    findSkillMatches(preferredSectionText, {
      source: "description-preferred-section",
      confidence: "medium",
      preferred: true,
    }),
  );

  const generalMatches = mergeSkillMatches(
    findSkillMatches(job.title, {
      source: "title",
      confidence: "medium",
    }),
    findSkillMatches(job.department, {
      source: "department",
      confidence: "medium",
    }),
    findSkillMatches(normalizedDescription, {
      source: "description",
      confidence: "medium",
    }),
  );

  const jobSkills = mergeSkillMatches(requiredMatches, preferredMatches, generalMatches);
  const requiredSkillIds = requiredMatches.map((match) => match.skillId);
  const preferredSkillIds = preferredMatches
    .map((match) => match.skillId)
    .filter((skillId) => !requiredSkillIds.includes(skillId));
  const skillIds = jobSkills.map((match) => match.skillId);
  const experienceProfile = parseExperienceProfile(job);
  const experienceYears = buildExperienceYears(experienceProfile);
  const seniority = classifySeniority(job, experienceProfile);
  const roleDomain = classifyRoleDomain(job, skillIds);
  const workArrangement = detectWorkArrangement(job);

  return {
    skillIds,
    requiredSkillIds,
    preferredSkillIds,
    jobSkills,
    experienceBucket: EXPERIENCE_BUCKET_VALUES.includes(experienceProfile.experienceBucket)
      ? experienceProfile.experienceBucket
      : "unspecified",
    experienceProfile,
    experienceYears,
    seniority: SENIORITY_LEVELS.includes(seniority.value) ? seniority.value : "Unknown",
    primaryRoleDomain: ROLE_DOMAIN_OPTIONS.includes(roleDomain.primaryRoleDomain)
      ? roleDomain.primaryRoleDomain
      : "Other",
    secondaryRoleDomains: unique(
      roleDomain.secondaryRoleDomains.filter((value) => ROLE_DOMAIN_OPTIONS.includes(value)),
    ),
    workArrangement: clampWorkArrangement(workArrangement),
    filterSignals: {
      confidence: {
        experience: experienceProfile.confidence,
        seniority: seniority.confidence,
        roleDomain: roleDomain.confidence,
        workArrangement: workArrangement === "Not specified" ? "low" : "high",
      },
    },
    taxonomyVersion: TAXONOMY_VERSION,
    extractionVersion: EXTRACTION_VERSION,
    extractedAt: new Date(),
  };
};

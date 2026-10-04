import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { extractJobFilterSignals } from '../utils/jobFilterSignals.js';
import { getSourceDescription } from '../utils/jobSourceContent.js';
import { JOB_CLASSIFICATION_POLICY_VERSION } from '../utils/jobClassificationVersion.js';
import { resolveRecruitmentPolicy } from './jobRecruitmentPolicy.js';

const normalizedBytes = relative => readFileSync(new URL(`../../${relative}`, import.meta.url)).toString('utf8').replace(/\r\n/g, '\n');
const policyBytes = normalizedBytes('classification/policy.json');
export const CLASSIFICATION_POLICY = JSON.parse(policyBytes);
if (CLASSIFICATION_POLICY.version !== JOB_CLASSIFICATION_POLICY_VERSION) throw new Error('Classification policy version mismatch');
export const CLASSIFICATION_MODEL = JSON.parse(readFileSync(new URL('../../classification/model.json', import.meta.url)));
export const POLICY_HASH = createHash('sha256').update(policyBytes).digest('hex');
// Recruitment-rule changes need a new derived decision, but unchanged model
// code can reuse its actual response for the exact same canonical source input.
export const NATIVE_RUNTIME_HASH = createHash('sha256').update(JSON.stringify([
  'classification/model.json', 'classification/requirements.txt', 'classification/runtime.py', 'classification/training.py',
].map(relative => [relative, createHash('sha256').update(normalizedBytes(relative)).digest('hex')]))).digest('hex');
export const RUNTIME_HASH = createHash('sha256').update(JSON.stringify([
  'classification/model.json', 'classification/requirements.txt', 'classification/runtime.py', 'classification/training.py',
  'src/services/jobClassificationPolicy.js', 'src/services/jobRecruitmentPolicy.js', 'src/utils/jobClassificationVersion.js', 'src/utils/jobFilterSignals.js', 'src/utils/jobSourceContent.js',
].map(relative => [relative, createHash('sha256').update(normalizedBytes(relative)).digest('hex')]))).digest('hex');
const PUBLIC_TYPES = ['Intern', 'Full-time Fresher', 'Full-time Experienced', 'Contract', 'Others', 'Unspecified'];
export const CLASSIFICATION_FIELDS = ['jobType', 'employmentType', 'experienceLevel', 'seniority', 'experienceYears', 'experienceBucket', 'experienceProfile', 'experienceRequired', 'experienceBasis'];
const SENIORITY = { entry: 'Entry Level', junior: 'Associate', mid: 'Mid Level', senior: 'Senior', internship: 'Internship', unknown: 'Unknown' };
const LEADERSHIP = { manager: 'Manager', senior_manager: 'Senior Manager', director: 'Director', vice_president: 'Vice President', executive: 'Executive', lead: 'Lead', unknown: 'Unknown' };
const EMPLOYMENT = { full_time: 'Full-time', internship: 'Internship', contract: 'Contract', other: 'Other', unspecified: null };

export const cleanSourceText = (value) => {
  let text = Array.isArray(value) ? value.join('\n') : String(value ?? '');
  // Some ATS APIs return escaped (occasionally twice escaped) HTML. Decode
  // before recognizing tags so markup does not become model input or join sections.
  for (let pass = 0; pass < 3; pass++) {
    const decoded = text.replace(/&#(x[0-9a-f]+|\d+);/gi, (match, code) => {
      const point = code.toLowerCase().startsWith('x') ? parseInt(code.slice(1), 16) : Number(code);
      return point >= 0 && point <= 0x10ffff ? String.fromCodePoint(point) : match;
    }).replace(/&(nbsp|amp|lt|gt|quot|apos);/gi, (_, entity) => ({ nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" })[entity.toLowerCase()]);
    if (decoded === text) break;
    text = decoded;
  }
  if (!/<[a-z][\s\S]*>/i.test(text)) return text.replace(/\r/g, '').replace(/[\t ]+/g, ' ').trim();
  return text.replace(/<(script|style|nav|footer|header|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<\/?(?:br|p|li|div|h[1-6]|section|tr)\b[^>]*>/gi, '\n').replace(/<[^>]+>/g, ' ')
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (match, code) => {
      const point = code.toLowerCase().startsWith('x') ? parseInt(code.slice(1), 16) : Number(code);
      return point >= 0 && point <= 0x10ffff ? String.fromCodePoint(point) : match;
    }).replace(/&(nbsp|amp|lt|gt|quot|apos);/gi, (_, entity) => ({ nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" })[entity.toLowerCase()])
    .replace(/\r/g, '').replace(/[\t ]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
};

export const hashClassificationInput = (input, identity = {}) => {
  const { inputHash: _inputHash, incomplete: _incomplete, ...canonical } = input;
  return createHash('sha256').update(JSON.stringify({ ...canonical, ...identity })).digest('hex');
};

export const buildClassificationInput = (job = {}, { now = new Date(), identity = {} } = {}) => {
  const referenceYear = Number(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Kolkata', year: 'numeric' }).format(now));
  // These opt-in fields are employer facts. employmentType/jobType/experienceLevel may already be inferred by a scraper.
  const sourceEmploymentType = cleanSourceText(job.sourceEmploymentType || job.atsEmploymentType || job.rawEmploymentType
    || (job.employmentTypeProvenance === 'source' ? job.employmentType : ''));
  const sourceFields = {
    description: cleanSourceText(getSourceDescription(job)),
    minimumQualification: cleanSourceText(job.minimumQualification), preferredQualification: cleanSourceText(job.preferredQualification),
    qualifications: cleanSourceText(job.qualifications), responsibilities: cleanSourceText(job.responsibilities), requirements: cleanSourceText(job.requirements),
    experienceRequired: cleanSourceText([job.sourceExperienceRequired, job.experienceRequiredProvenance === 'source' ? job.experienceRequired : null]
      .find(value => value !== null && value !== undefined && value !== '')),
  };
  const body = [...new Set([
    sourceFields.description,
    ...Object.entries(sourceFields).filter(([key, value]) => key !== 'description' && value).map(([key, value]) => `${{
      minimumQualification: 'Minimum qualifications', preferredQualification: 'Preferred qualifications', qualifications: 'Qualifications',
      responsibilities: 'Responsibilities', requirements: 'Requirements', experienceRequired: 'Required professional experience',
    }[key]}:\n${value}`),
  ].filter(Boolean))].join('\n');
  const postedDate = job.postedAt || job.postingDate;
  const scrapeDate = job.scrapedTimestamp || job.scrapedAt;
  const inferredPosted = scrapeDate && new Date(postedDate).getTime() === new Date(scrapeDate).getTime();
  const validPosted = postedDate && !inferredPosted && !Number.isNaN(new Date(postedDate).getTime()) ? new Date(postedDate).toISOString().slice(0, 10) : null;
  const input = {
    title: cleanSourceText(job.originalTitle || job.title), body, sourceFields, sourceEmploymentType,
    sourceExperienceRequired: sourceFields.experienceRequired,
    eligibleBatches: [...new Set((job.eligibleBatchesProvenance === 'source' ? job.eligibleBatches || [] : []).map(Number).filter(year => Number.isInteger(year) && year >= 1990 && year <= referenceYear + 10))].sort(),
    postedDate: validPosted, referenceYear,
    eligibleBatchesProvenance: job.eligibleBatchesProvenance === 'source' ? 'source' : null,
  };
  const runtimeIdentity = {
    modelRevision: CLASSIFICATION_MODEL.revision, runtimeVersion: CLASSIFICATION_MODEL.runtimeVersion,
    policyHash: POLICY_HASH, runtimeHash: RUNTIME_HASH, calibrationHash: 'uncalibrated', ...identity,
  };
  const inputHash = hashClassificationInput(input, runtimeIdentity);
  return { ...input, ...runtimeIdentity, inputHash, incomplete: !body || Buffer.byteLength(body, 'utf8') > CLASSIFICATION_MODEL.maxInputBytes };
};

const finiteYear = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 40;
const emptyProfile = () => ({ minimumYears: null, maximumYears: null, isOpenEnded: false, preferredMinimumYears: null, hasExplicitExperience: false, confidence: 'low', evidence: null, rawText: null });
const splitPreferenceText = text => {
  const required = [], preferred = [];
  let preferredSection = false;
  const sectionText = text.replace(/\b(\d+(?:\.\d+)?|zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+or\s+more\s+(years?|yrs?|months?)\b/gi, '$1+ $2')
    .replace(/\b((?:(?:minimum|basic|required|preferred|desirable|desired|optional|nice[- ]to[- ]have|good[- ]to[- ]have|bonus)\s+)?(?:education\s+(?:and|&)\s+experience|experience|education|qualifications?|requirements?))\s*:/gi, '\n$1:\n');
  const candidateQuantity = new RegExp('\\b(?:candidates?|applicants?|you)\\s+(?:must|need\\s+to|are\\s+required\\s+to)\\s+(?:have|bring|possess)\\s+('
    + NUMERIC_SOURCE_PATTERN.source + ')\\s+(?:of\\s+)?(?:(?:professional|work|relevant)\\s+)?(?:experience|background)\\b', 'gi');
  for (const segment of sectionText.split(/\n|(?<!\d)[.;](?=\s|$)|(?=\b(?:required|preferred|minimum qualifications?|preferred qualifications?)\s*:)/i).map(part => part.trim()).filter(Boolean)) {
    if (/^(?:minimum|basic|required|qualifications|requirements|education|experience(?=\s*:)|responsibilities|duties|benefits|about|freshers?|graduates?|no (?:prior |previous )?experience)\b/i.test(segment)) preferredSection = false;
    if (/^(?:preferred|nice[- ]to[- ]have|desirable|desired|optional|bonus|good[- ]to[- ]have)\b/i.test(segment)) preferredSection = true;
    const preference = preferredSection || /\b(?:preferred|desirable|desired|optional|nice[- ]to[- ]have|good[- ]to[- ]have|a plus|a bonus|an advantage)\b/i.test(segment);
    if (preference) {
      // Flattened ATS bullets can put a mandatory quantity and an optional
      // skill in one clause. Only an explicit applicant work requirement wins.
      const optional = segment.replace(candidateQuantity, (match, quantity) => { required.push(`${quantity} of experience`); return ''; });
      preferred.push(optional);
    } else required.push(segment);
  }
  return { required: required.join('\n'), preferred: preferred.join('\n') };
};
const NUMERIC_SOURCE_PATTERN = /\b(?:\d+(?:\.\d+)?|zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s*(?:(?:-|to)\s*(?:\d+(?:\.\d+)?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s*)?(?:\+\s*)?(?:years?|yrs?|months?)\b/i;
const sourceNumericFields = input => {
  const separated = splitPreferenceText(input.body.replace(/[\u2013\u2014]/g, '-'));
  // A break from work is not work experience, even if it is adjacent to an experience requirement.
  const breakWords = '(?:career (?:break|gap)|employment gap|break from (?:work|employment))';
  for (const key of ['required', 'preferred']) separated[key] = separated[key]
    .replace(new RegExp(NUMERIC_SOURCE_PATTERN.source + '\\s+(?:of\\s+)?' + breakWords + '\\b', 'gi'), 'career break')
    .replace(new RegExp('\\b' + breakWords + '\\s+(?:(?:of|for|up to|at most|maximum|minimum|between)\\s+)*' + NUMERIC_SOURCE_PATTERN.source, 'gi'), 'career break')
    .replace(new RegExp('^[\\t ]*(?:in|within|after|by|at)\\s+(?:the\\s+)?(?:(?:first|next|initial)\\s+)?' + NUMERIC_SOURCE_PATTERN.source + '[\\t ]*[:=-]?[\\t ]*$', 'gim'), 'performance milestone')
    .replace(new RegExp(NUMERIC_SOURCE_PATTERN.source + '\\s+(?:(?:of\\s+)?(?:service|employment|training)\\s+bond\\b|(?:of\\s+)?bond\\b(?=[\\t ]*(?:[,;.]|$)))', 'gim'), 'service bond');
  const requiredPhrase = separated.required.match(/\b(?:requir(?:ing|ed|es)|must have|at least|minimum(?: of)?)\s+(\d+(?:\.\d+)?(?:\s*(?:-|to)\s*\d+(?:\.\d+)?)?\s*(?:years?|yrs?|months?)\s+(?:of\s+)?[a-z -]{0,45}\bexperience)\b/i)?.[0];
  // The legacy bare-label parser reads only the first value of "Experience:
  // 0-2 years". Pass the whole source-backed quantity, including its unit.
  const labeledPhrase = separated.required.match(new RegExp('\\bexperience\\s*:\\s*(' + NUMERIC_SOURCE_PATTERN.source
    + '(?:\\s*(?:-|to|~)\\s*' + NUMERIC_SOURCE_PATTERN.source + ')?)', 'i'))?.[1];
  const isolatedLabel = labeledPhrase && !input.sourceFields.experienceRequired && !requiredPhrase;
  const signals = extractJobFilterSignals({ title: input.title, jobDescription: isolatedLabel ? '' : separated.required,
    experienceRequired: input.sourceFields.experienceRequired || requiredPhrase || (labeledPhrase ? `${labeledPhrase} of experience` : null) });
  const profile = signals.experienceProfile || {};
  const preferredProfile = NUMERIC_SOURCE_PATTERN.test(separated.preferred)
    ? extractJobFilterSignals({ experienceRequired: separated.preferred }).experienceProfile : null;
  const preferredMinimumYears = finiteYear(preferredProfile?.minimumYears) ? Number(preferredProfile.minimumYears) : null;
  // The existing extractor may infer zero from a cohort or title. Only source-backed requirements count as numeric years.
  const text = `${input.title}\n${separated.required}`;
  const explicit = NUMERIC_SOURCE_PATTERN.test(text)
    || /^\d+(?:\.\d+)?(?:\s*(?:-|to|\+)\s*\d*(?:\.\d+)?)?$/.test(input.sourceFields.experienceRequired)
    || /\bno (?:prior |previous |professional |work )?experience (?:is )?(?:required|necessary)\b/i.test(text);
  if (!explicit || profile.confidence === 'low' || (!finiteYear(profile.minimumYears) && !finiteYear(profile.maximumYears))) {
    return { experienceYears: [], experienceBucket: 'unspecified', experienceProfile: { ...emptyProfile(), preferredMinimumYears } };
  }
  return {
    experienceYears: (signals.experienceYears || []).filter(finiteYear).map(Number),
    experienceBucket: signals.experienceBucket || 'unspecified',
    experienceProfile: { ...emptyProfile(), ...profile, preferredMinimumYears, evidence: profile.evidence?.slice(0, 160) || null, rawText: null },
  };
};
const decisionFor = (answer, key, thresholds) => {
  const labels = Object.keys(CLASSIFICATION_POLICY.questions[key].criteria);
  const p = answer?.probabilities;
  if (!p || typeof p !== 'object' || Object.keys(p).length !== labels.length || labels.some(label => !Object.hasOwn(p, label) || typeof p[label] !== 'number' || !Number.isFinite(p[label]) || p[label] < 0 || p[label] > 1)) return null;
  const sum = labels.reduce((total, label) => total + p[label], 0);
  if (Math.abs(sum - 1) > .002 || !labels.includes(answer.choice) || p[answer.choice] < Math.max(...Object.values(p)) - .00001) return null;
  return { label: answer.choice, probability: Math.round(p[answer.choice] * 10000) / 10000, confident: p[answer.choice] >= thresholds[key] };
};
export const snapshotClassificationFields = job => Object.fromEntries(CLASSIFICATION_FIELDS.map(field => [field, field === 'experienceProfile'
  ? { minimumYears: job.experienceProfile?.minimumYears ?? null, maximumYears: job.experienceProfile?.maximumYears ?? null, isOpenEnded: job.experienceProfile?.isOpenEnded === true, preferredMinimumYears: job.experienceProfile?.preferredMinimumYears ?? null, hasExplicitExperience: job.experienceProfile?.hasExplicitExperience === true, confidence: job.experienceProfile?.confidence || 'low' }
  : field === 'experienceYears' ? (job[field] || []).filter(finiteYear).slice(0, 41) : typeof job[field] === 'string' ? job[field].slice(0, 160) : job[field] ?? null]));

export const resolveClassification = (job, prediction, { now = new Date(), mode = 'shadow', identity = {}, reason, previous, thresholds = CLASSIFICATION_POLICY.thresholds } = {}) => {
  const input = buildClassificationInput(job, { now, identity });
  const numeric = sourceNumericFields(input);
  const decisions = Object.fromEntries(Object.keys(CLASSIFICATION_POLICY.questions).map(key => [key, decisionFor(prediction?.answers?.[key], key, thresholds)]));
  const requiredKeys = ['employment', 'experience', 'seniority', ...(decisions.seniority?.label === 'leadership' ? ['leadership'] : [])];
  let rejection = reason || (input.incomplete || prediction?.complete !== true ? 'incomplete' : null);
  if (!prediction) rejection = reason || 'unavailable';
  if (!rejection && mode === 'policy' && input.calibrationHash === 'uncalibrated') rejection = 'model_unvalidated';
  if (!rejection && requiredKeys.some(key => !decisions[key])) rejection = 'invalid_response';
  if (!rejection && (prediction.conflicts?.length || requiredKeys.some(key => !decisions[key].confident))) rejection = 'uncertain';
  const explicitInternTitle = /\bintern(?:ship)?(?:\s*\([^)]*\))?$/i.test(input.title)
    && !/\b(?:head|manager|director|coordinator|mentor|supervisor)\s+(?:of|for)\b/i.test(input.title);
  const sourceAllowsZero = numeric.experienceProfile.minimumYears === 0 || /^freshers?$/i.test(input.sourceExperienceRequired);
  const managerTitle = /\b(manager|director|vice president|chief|head of)\b/i.test(input.title)
    && !/\btrainee\b/i.test(input.title) && !explicitInternTitle;
  if (!rejection && managerTitle && (decisions.employment.label === 'internship' || decisions.seniority.label === 'internship'
    || (!sourceAllowsZero && (decisions.seniority.label === 'entry' || decisions.experience.label === 'fresher_eligible')))) rejection = 'source_contradiction';
  const explicitEmployment = input.sourceEmploymentType.toLowerCase();
  const sourceEmployment = /\bintern(?:ship)?\b/.test(explicitEmployment) ? 'internship'
    : /\b(apprentice(?:ship)?|part.?time|volunteer)\b/.test(explicitEmployment) ? 'other'
      : /\b(contract|contractor|temporary|fixed.?term|freelance)\b/.test(explicitEmployment) ? 'contract'
        : /\b(full.?time|permanent|regular)\b/.test(explicitEmployment) ? 'full_time' : explicitInternTitle ? 'internship' : null;
  if (!rejection && sourceEmployment && decisions.employment.label !== sourceEmployment) rejection = 'source_contradiction';
  if (!rejection && numeric.experienceProfile.minimumYears > 0 && ['fresher_eligible', 'mixed'].includes(decisions.experience.label)) rejection = 'source_contradiction';
  if (!rejection && sourceAllowsZero && !['fresher_eligible', 'mixed'].includes(decisions.experience.label)) rejection = 'source_contradiction';
  let employment = 'unspecified';
  let experience = 'not_stated';
  let seniority = managerTitle ? 'Manager' : 'Unknown';
  if (!rejection) {
    employment = decisions.employment.label;
    experience = decisions.experience.label;
    seniority = decisions.seniority.label === 'leadership' ? LEADERSHIP[decisions.leadership.label] : SENIORITY[decisions.seniority.label];
    if (experience === 'not_stated' && managerTitle && decisions.seniority.label === 'leadership') experience = 'prior_required';
    if (employment === 'unspecified' || (employment === 'full_time' && experience === 'not_stated' && !managerTitle && numeric.experienceProfile.minimumYears === null)) rejection = 'not_stated';
  }
  if (rejection) {
    employment = sourceEmployment || 'unspecified';
    experience = numeric.experienceProfile.minimumYears > 0 ? 'prior_required'
      : sourceAllowsZero ? 'fresher_eligible' : 'not_stated';
  }
  const jobType = employment === 'internship' ? 'Intern' : employment === 'contract' ? 'Contract' : employment === 'other' ? 'Others'
    : employment === 'full_time' && (experience === 'prior_required' || (!rejection && managerTitle && !sourceAllowsZero)) ? 'Full-time Experienced'
      : employment === 'full_time' && ['fresher_eligible', 'mixed'].includes(experience) ? 'Full-time Fresher' : 'Unspecified';
  const experienceLevel = ['Internship', 'Entry Level'].includes(seniority) ? 'Entry Level' : seniority === 'Associate' ? 'Junior Level'
    : seniority === 'Mid Level' ? 'Mid Level' : seniority !== 'Unknown' ? 'Senior Level' : null;
  let resolved = { jobType, employmentType: EMPLOYMENT[employment], experienceLevel, seniority, experiencePolicy: experience, ...numeric, experienceBasis: numeric.experienceProfile.minimumYears === null ? 'unspecified' : 'employer_requirement' };
  const policy = resolveRecruitmentPolicy(input, { numeric, sourceEmployment,
    modelEmployment: !rejection ? employment : null, modelExperience: !rejection ? experience : null });
  if (policy) {
    const { employment: policyEmployment, experience: policyExperience, evidence: policyEvidence, ...fields } = policy;
    const policyType = policyEmployment === 'internship' ? 'Intern' : policyEmployment === 'contract' ? 'Contract'
      : policyEmployment === 'other' ? 'Others' : policyExperience === 'prior_required' ? 'Full-time Experienced'
        : ['fresher_eligible', 'mixed'].includes(policyExperience) ? 'Full-time Fresher' : 'Unspecified';
    if (!rejection && (employment !== policyEmployment || experience !== policyExperience)) rejection = 'policy_contradiction';
    resolved = { ...resolved, ...fields, jobType: policyType, employmentType: EMPLOYMENT[policyEmployment], experiencePolicy: policyExperience,
      ...(policyType === 'Intern' ? { seniority: 'Internship', experienceLevel: 'Entry Level' }
        : policyType === 'Full-time Fresher' ? { seniority: 'Entry Level', experienceLevel: 'Entry Level' } : {}),
      policyEvidence: policyEvidence?.slice(0, 160) || null };
  }
  if (mode === 'policy' && input.incomplete) resolved = { ...resolved, jobType: 'Unspecified', employmentType: null, seniority: 'Unknown', experienceLevel: null };
  return {
    policyVersion: CLASSIFICATION_POLICY.version, inputHash: input.inputHash, modelRevision: input.modelRevision,
    runtimeVersion: input.runtimeVersion, runtimeHash: input.runtimeHash, policyHash: input.policyHash, calibrationHash: input.calibrationHash,
    referenceYear: input.referenceYear, mode, authoritative: ['enforce', 'policy'].includes(mode), decisionSource: policy ? 'policy' : !rejection ? 'model' : 'fallback',
    status: !rejection ? 'accepted' : ['uncertain', 'source_contradiction', 'policy_contradiction', 'model_unvalidated', 'not_stated', 'incomplete'].includes(rejection) ? 'uncertain' : 'fallback',
    reason: rejection, decisions: Object.fromEntries(Object.entries(decisions).filter(([, value]) => value).map(([key, { label, probability }]) => [key, { label, probability }])),
    complete: prediction?.complete === true && !input.incomplete,
    windows: Number.isInteger(prediction?.windows) ? Math.min(10000, Math.max(0, prediction.windows)) : 0,
    evidenceContext: input.body.slice(0, 160), classifiedAt: now.toISOString(), resolved,
    previous: snapshotClassificationFields(previous || job.classification?.previous || job),
  };
};

export const getAuthoritativeClassification = (job = {}) => {
  const result = job.classification;
  return result?.authoritative === true && ['enforce', 'policy'].includes(result.mode) && result.policyVersion === CLASSIFICATION_POLICY.version
    && ['accepted', 'uncertain', 'fallback'].includes(result.status) && PUBLIC_TYPES.includes(result.resolved?.jobType)
    ? result.resolved : null;
};

export const applyClassification = job => {
  const resolved = getAuthoritativeClassification(job);
  if (!resolved) return job;
  return { ...job, ...resolved, experienceRequired: resolved.experienceRequired ?? job.sourceExperienceRequired ?? (job.experienceRequiredProvenance === 'source' ? job.experienceRequired : null)
    ?? resolved.experienceProfile.evidence ?? null };
};

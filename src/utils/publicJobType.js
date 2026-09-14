// Query-time equivalent of the public response taxonomy. Keep the parity tests in
// experiencedJobVisibility.test.js aligned when response normalization changes.
// Native expressions let Mongo filter BEFORE pagination and counting.
const str = input => ({ $convert: { input, to: 'string', onError: '', onNull: '' } });
const text = field => ({ $trim: { input: str('$' + field) } });
// Match JavaScript whitespace (including NBSP) explicitly; PCRE \s is narrower.
const WORD = '[^\\s\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+';
const EMPLOYMENT_WORD = '[^\\s_\\-\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+';
const collapse = (input, regex = WORD) => ({ $reduce: {
  input: { $regexFindAll: { input, regex } }, initialValue: '',
  in: { $concat: ['$$value', { $cond: [{ $eq: ['$$value', ''] }, '', ' '] }, '$$this.match'] },
} });
const responseText = input => ['\u2013', '\u2014', '\u2212'].reduce((value, find) => ({ $replaceAll: { input: value, find, replacement: '-' } }), input);
const num = input => ({ $convert: { input, to: 'double', onError: null, onNull: null } });
const match = (input, regex) => ({ $regexMatch: { input, regex, options: 'i' } });
const find = (input, regex) => ({ $regexFind: { input, regex, options: 'i' } });
const capture = (input, index = 0) => ({ $arrayElemAt: [{ $ifNull: [input + '.captures', []] }, index] });
const value = (input, index = 0) => num(capture(input, index));
const eq = (a, b) => ({ $eq: [a, b] });
const ne = (a, b) => ({ $ne: [a, b] });
const and = (...args) => ({ $and: args });
const or = (...args) => ({ $or: args });
const not = arg => ({ $not: [arg] });
const present = arg => ne(arg, null);
const gt = (a, b) => ({ $gt: [a, b] });
const lte = (a, b) => and(present(a), { $lte: [a, b] });
const choose = (branches, fallback) => ({ $switch: { branches: branches.map(([condition, then]) => ({ case: condition, then })), default: fallback } });
const bind = (vars, expression) => ({ $let: { vars, in: expression } });
const clamp = input => choose([[present(input), { $min: [15, { $max: [0, input] }] }]], null);
const floor = input => ({ $floor: input });
const ceil = input => ({ $ceil: input });
const partTime = /part[\s_-]?time/;
const fresher = /\b(entry[- ]level|new grad(?:uate)?s?|freshers?|fresh graduates?|recent graduates?|campus|graduate\s+(?:engineer|trainee|associate|developer|programme?|program|hiring|role|scheme|opportunity)|trainee|apprentice|0\s*-\s*1\s+years?|0\s+to\s+1\s+years?|0\s+years?)\b/;
const senior = /\b(senior|sr\.?|staff|lead|principal|architect|manager|director|head|vp|vice president)\b/;
const junior = /\b(junior|jr\.?|associate)\b/;
const canonical = choose([
  [match('$$type', /^(intern|internship)$/), 'Intern'],
  [eq('$$type', 'contract'), 'Contract'], [eq('$$type', 'others'), 'Others'],
  [eq('$$type', 'full-time fresher'), 'Full-time Fresher'],
  [eq('$$type', 'full-time experienced'), 'Full-time Experienced'],
  [eq('$$type', 'full-time'), 'Full-time'],
], null);
const employment = choose([
  [and(ne('$$employment', ''), not(match('$$employment', partTime))), choose([
    [match('$$employment', /\b(contract|contractual|contractor|freelance|temporary|fixed[\s_-]+term)\b/), 'Contract'],
    [match('$$employment', /\b(intern|internship|trainee|apprentice)\b/), 'Intern'],
    [match('$$employment', /\b(full[\s_-]*time|permanent|regular|unlimited|staff|employee|professional|white[\s_-]+collar|on[\s_-]*roll|on[\s_-]+site[\s_-]+with[\s_-]+flexibility|fte)\b/), 'Full-time'],
  ], 'Others')],
  [match('$$title', /intern|internship|trainee|apprentice/), 'Intern'],
  [or(eq('$jobType', 'Full-time Fresher'), eq('$jobType', 'Full-time Experienced')), 'Full-time'],
  [eq('$jobType', 'Internship'), 'Intern'], [eq('$jobType', 'Contract'), 'Contract'],
  [match('$$type', partTime), null],
  [match('$$title', /contract|contractor|freelance/), 'Contract'],
  [match('$$title', /part.?time/), null],
], 'Full-time');
const derivedLevel = choose([
  [not(present('$$derivedYears')), ''],
  [eq('$$derivedYears', 0), 'Entry Level'], [lte('$$derivedYears', 2), 'Junior Level'],
  [{ $gte: ['$$derivedYears', 8] }, 'Senior Level'],
], 'Mid Level');
const effectiveLevel = choose([
  [or(eq('$$storedLevel', ''), and(
    { $in: ['$$storedLevel', ['Entry Level', 'Junior Level']] },
    { $in: ['$$derivedLevel', ['Junior Level', 'Mid Level', 'Senior Level']] },
  )), '$$derivedLevel'],
], '$$storedLevel');
const isEntry = choose([
  [and(ne('$$level', ''), not(and(eq('$$level', 'Entry Level'), '$$positiveExperience'))), eq('$$level', 'Entry Level')],
  [and(eq('$jobType', 'Full-time Fresher'), not('$$positiveExperience')), true],
  [eq('$jobType', 'Full-time Experienced'), false],
  [and(not('$$positiveExperience'), match('$$cues', fresher)), true],
  [match('$$title', senior), false],
  [and(lte('$$minimum', 0), not(gt('$$maximum', 0))), true],
], false);

const LEGACY_PUBLIC_JOB_TYPE_EXPRESSION = bind({
  type: { $toLower: text('jobType') }, employment: collapse(text('employmentType'), EMPLOYMENT_WORD), title: collapse(text('title')),
  storedLevel: text('experienceLevel'), experience: collapse(text('experienceRequired')), responseExperience: responseText(collapse(text('experienceRequired'))),
  profileMin: num('$experienceProfile.minimumYears'), profileMax: num('$experienceProfile.maximumYears'),
  // Number(null) in the response normalizer is zero; missing is not a number.
  responseMin: choose([[eq({ $type: '$experienceProfile.minimumYears' }, 'null'), 0]], num('$experienceProfile.minimumYears')),
  cues: { $concat: ['title', 'department', 'description', 'jobDescription', 'minimumQualification', 'preferredQualification', 'experienceRequired'].flatMap(field => [text(field), ' ']) },
}, bind({
  canonical, employmentType: employment,
  range: find('$$experience', /(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s+years?/),
  single: find('$$experience', /(\d+(?:\.\d+)?)\s*(\+|plus)?\s+years?/),
  responseRange: find('$$responseExperience', /(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*(?:years?|yrs?)\b/),
  responsePlus: { $ifNull: [find('$$responseExperience', /(\d+(?:\.\d+)?)\s*(?:\+|plus)\s*(?:years?|yrs?)\b/),
    find('$$responseExperience', /(\d+(?:\.\d+)?)\s*(?:years?|yrs?)\s*(?:and above|or above)\b/),
    find('$$responseExperience', /(?:at least|min(?:imum)?(?: of)?|minimum|required|preferred)\s*(\d+(?:\.\d+)?)\s*(?:years?|yrs?)\b/)] },
  responseSingle: find('$$responseExperience', /(\d+(?:\.\d+)?)\s*(?:years?|yrs?)\b/),
}, bind({
  minimum: choose([
    [or(present('$$profileMin'), present('$$profileMax')), floor('$$profileMin')],
    [present('$$range'), floor(value('$$range'))],
  ], floor(value('$$single'))),
  maximum: choose([
    [or(present('$$profileMin'), present('$$profileMax')), ceil('$$profileMax')],
    [present('$$range'), ceil(value('$$range', 1))],
    [present(capture('$$single', 1)), null],
  ], floor(value('$$single'))),
  derivedYears: choose([
    [and(present('$$responseMin'), { $gte: ['$$responseMin', 0] }, lte('$$responseMin', 40)), '$$responseMin'],
    [match('$$experience', /\b(no prior experience required|no experience required|freshers? can apply|freshers?|entry[- ]level applicants are encouraged)\b/), 0],
    [present('$$responseRange'), choose([[lte(clamp(ceil(value('$$responseRange'))), clamp(floor(value('$$responseRange', 1)))), clamp(ceil(value('$$responseRange')))]], null)],
    [present('$$responsePlus'), clamp(ceil(value('$$responsePlus')))],
  ], clamp(floor({ $add: [value('$$responseSingle'), 0.5] }))),
}, bind({ derivedLevel, positiveExperience: or(
  gt('$$minimum', 0),
  and(not(present('$$minimum')), gt('$$maximum', 0)),
  gt('$$derivedYears', 0),
  present('$$responsePlus'),
  gt(value('$$responseRange'), 0),
  gt(value('$$responseSingle'), 0),
) },
  bind({ level: collapse(effectiveLevel) }, bind({
    resolved: choose([
      [and(eq('$$employmentType', 'Intern'), '$$positiveExperience'), 'Full-time Experienced'],
      [ne('$$employmentType', 'Full-time'), '$$employmentType'],
      ['$$positiveExperience', 'Full-time Experienced'],
      [isEntry, 'Full-time Fresher'],
    ], 'Full-time Experienced'),
  }, choose([
    [and({ $in: ['$$canonical', ['Full-time Fresher', 'Full-time Experienced']] }, present('$$resolved')), '$$resolved'],
    [and(eq('$$canonical', 'Intern'), '$$positiveExperience'), '$$resolved'],
    [and(present('$$canonical'), ne('$$canonical', 'Full-time')), '$$canonical'],
    [present('$$resolved'), '$$resolved'],
    [match('$$type', partTime), null],
  ], { $ifNull: ['$jobType', null] })))))));

// Most imported records already have a canonical employment type and level.
// Avoid parsing long descriptions and experience text for those proven cases.
export const PUBLIC_JOB_TYPE_EXPRESSION = bind({ type: { $toLower: text('jobType') } }, choose([
  [eq('$$type', 'contract'), 'Contract'], [eq('$$type', 'others'), 'Others'],
  [and(eq('$employmentType', 'Full-time'), { $in: ['$experienceLevel', ['Junior Level', 'Mid Level', 'Senior Level']] }), 'Full-time Experienced'],
], LEGACY_PUBLIC_JOB_TYPE_EXPRESSION));

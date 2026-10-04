// Product filter defaults are kept separate from employer-stated work experience.
const degree = /\b(?:bachelor(?:'s|s)?|master(?:'s|s)?|b\.?tech|m\.?tech|b\.e\.?|m\.e\.?|degree)\b/i;
const seniorRole = /\b(?:manager|director|vice president|chief|head of|senior|sr|principal|staff|lead|supervisor|expert)\b/i;
const excludedStudentSubject = /\b(?:our (?:staff|employees|team)|employees|staff|mentoring|mentor|supervis(?:e|ing)|manage|managing|lead (?:our |the )?(?:graduate|student|intern)|recruitment programme|recruitment program|support (?:recent )?graduates)\b/i;
const employerExperienceSubject = /\b(?:our|the|this)\s+(?:company|business|organization|organisation)\s+(?:has|have|with|brings?)\b|\bwe\s+(?:have|are\s+a\s+company\s+with)\b/i;
const applicantExperienceRequirement = /\b(?:applicants?|candidates?|you)\s+(?:(?:must|should)\s+)?(?:have|possess|bring)\s+(?:prior |previous |professional |relevant |work )?experience\b/i;
const normalize = value => String(value || '').replace(/[\u2018\u2019]/g, "'").replace(/[\u2013\u2014]/g, '-');
const clauses = text => normalize(text).split(/\n|[.;](?=\s|$)/).map(value => value.trim()).filter(Boolean);
const negated = text => /\b(?:not|never|no longer|ineligible|cannot|can't|need not)\b/i.test(text);
const applicantContext = text => /\b(?:applicants?|candidates?|you)\s+(?:(?:who|must|should)\s+)?(?:(?:have|has|are|be)\s+)?(?:(?:currently|recently|just)\s+)?(?:pursuing|studying|enrolled|completed|finished|graduated|freshers?|fresh graduates?|recent graduates?|new graduates?)\b|\b(?:can|may|must|should|eligible to|encouraged to)\s+apply\b/i.test(text);
const startsQualification = text => /^(?:(?:required|minimum|basic)\s+(?:qualifications?|requirements?)\s*:\s*)?(?:(?:currently\s+)?(?:pursuing|studying|enrolled)|recently\s+completed|just\s+completed|freshers?|fresh graduates?|recent graduates?|new graduates?|no (?:prior |previous |professional |work )?experience (?:is )?(?:required|necessary))\b/i.test(text);
const bucket = years => years <= 1 ? '0-1' : years < 3 ? '1-3' : years <= 5 ? '3-5' : years <= 8 ? '5-8' : years <= 12 ? '8-12' : '12-plus';
const inferred = (minimumYears, maximumYears, basis, evidence) => ({
  experienceYears: Array.from({ length: maximumYears - minimumYears + 1 }, (_, index) => minimumYears + index),
  experienceBucket: bucket(minimumYears), experienceBasis: basis,
  experienceRequired: `${minimumYears === maximumYears ? minimumYears : `${minimumYears}-${maximumYears}`} ${maximumYears === 1 ? 'year' : 'years'} (inferred)`,
  experienceProfile: { minimumYears, maximumYears, isOpenEnded: false, preferredMinimumYears: null,
    hasExplicitExperience: false, confidence: 'medium', inferenceMethod: basis, evidence: evidence.slice(0, 160), rawText: null },
});

export const collectRecruitmentFacts = input => {
  const text = normalize(`${input.title}\n${input.body}`);
  let preferredSection = false;
  // Some ATS pages flatten this heading and its requirements into one paragraph.
  // Restore a boundary only when qualification text follows, not in prose such
  // as "an equivalent combination of education and experience is considered".
  const sectionBody = normalize(input.body).replace(/\b((?:(?:preferred|desirable|optional|desired|nice[- ]to[- ]have|good[- ]to[- ]have|bonus)\s+)?Education\s+(?:and|&)\s+Experience)(?=\s*(?::|\n|[•-]|bachelor|master|degree|experience|relevant|previous|required))/gi, '\n$1\n')
    .replace(/\b(About\s+(?:the\s+)?ideal\s+candidate)\s*:/gi, '\n$1:\n');
  const segments = clauses(sectionBody).filter(segment => {
    if (/^(?:preferred|nice[- ]to[- ]have|desirable|optional|desired|bonus|good[- ]to[- ]have)\b/i.test(segment)) preferredSection = true;
    else if (/^(?:minimum|basic|required|qualifications|requirements|education\s+(?:and|&)\s+experience|responsibilities|duties|benefits|about|more about us)\b/i.test(segment)) preferredSection = false;
    return !preferredSection && !/\{\s*insert\b[^}]*\}/i.test(segment);
  });
  let inQualifications = false;
  const qualificationSegments = new Set(segments.filter(segment => {
    if (/^(?:(?:minimum|basic|required)?\s*(?:qualifications?|requirements?)|education\s+(?:and|&)\s+experience|about\s+(?:the\s+)?ideal\s+candidate)(?:\b|:)/i.test(segment)) inQualifications = true;
    else if (/^(?:preferred|responsibilities|duties|benefits|functional skills?|supervisory responsibilities|primary skills|more about us|about (?:us|the company)|company overview|diversity\s*(?:&|and)\s*inclusion|building a|recruitment fraud|what's in it|guidelines)\b/i.test(segment)) inQualifications = false;
    return inQualifications;
  }));
  const internOccupation = /\bintern(?:ship)?\s*(?:[-:\u2013\u2014]\s*)?(?:(?:program(?:me)?|recruitment|training|relations|operations)\s+)*(?:manager|director|coordinator|mentor|supervisor)\b/i.test(input.title)
    || /\binternship\s*(?:[-:\u2013\u2014]\s*)?(?:(?:program(?:me)?|recruitment|training|relations|operations)\s+)*(?:recruiter|specialist|administrator|officer)\b/i.test(input.title)
    || /\b(?:head|manager|director|coordinator|mentor|supervisor)\s+(?:of|for)\b/i.test(input.title)
    || /\b(?:manager|director|coordinator|mentor|supervisor)\b.{0,30}\bintern(?:ship)?\s+(?:program(?:me)?|recruitment|coordination)\b/i.test(input.title);
  const convertedIntern = /\bintern\s*[-(]?\s*converted\b|\bintern\s*(?:to|[-/]\s*to)\s*[-/]?\s*(?:fte|full[- ]time)\b/i.test(input.title);
  const internshipTitle = /\bintern(?:ship)?\b/i.test(input.title) && !internOccupation && !convertedIntern;
  const internship = internshipTitle ? input.title : segments.find(segment => !negated(segment)
    && (/\b(?:this (?:role|position|vacancy|job) (?:is|offers)|employment(?: type)?\s*:|position(?: type)?\s*:)\s+(?:an? |paid |summer )?intern(?:ship)?\b/i.test(segment)
      || ((!seniorRole.test(input.title) || /\btrainee\b/i.test(input.title))
        && ((/\bwe (?:are (?:hiring|seeking|looking for)|offer)\s+(?:(?:an?|paid|summer|experienced)\s+){0,3}intern(?:ship)?\b/i.test(segment)
            && !/\bintern(?:ship)?\s+(?:(?:program(?:me)?|recruitment|training|relations|operations)\s+)*(?:manager|director|coordinator|mentor|supervisor|recruiter|specialist|administrator|officer)\b/i.test(segment))
          || (/\binternship duration\s*[:=-]\s*\d+\b/i.test(segment)
            && !/\b(?:manag(?:e|ing)|administer(?:ing)?|oversee(?:ing)?|coordinat(?:e|ing)|mentor(?:ing)?|supervis(?:e|ing))\s+(?:(?:this|the|our|an)\s+)?internship\b/i.test(segment))
          || /^this\s+(?:exciting |paid |summer )?internship\s+(?:will\s+(?:allow|give|offer|provide)|allows?|gives?|offers?|provides?)\b/i.test(segment)))));
  const fullTime = segments.find(segment => !negated(segment) && /\b(?:full[- ]time|permanent (?:role|position|job|employment))\b/i.test(segment));
  const contractBody = segments.find(segment => !negated(segment) && /\b(?:contract(?:or)?|freelance|fixed[- ]term|temporary)\s+(?:role|position|job|employment)|\b(?:role|position|employment|job)(?: type)?\s*(?:is|:|on)?\s*(?:an? |six[- ]month |\d+[- ]month )?(?:contract|freelance|fixed[- ]term|temporary)\b/i.test(segment));
  const contract = contractBody || (!fullTime && !/\b(?:full.?time|permanent|regular)\b/i.test(input.sourceEmploymentType)
    && !/\bcontract(?:s)? (?:manager|management|administrator|administration|specialist)|\btemporary works\b/i.test(input.title)
    && /\b(?:contract(?:or)?|freelance|fixed[- ]term|temporary)\b/i.test(input.title) ? input.title : null);
  const mixedStudentPath = /\b(?:completed|finished|graduated)\b[^.;]{0,110}\bor\b[^.;]{0,100}\b(?:currently\s+)?pursuing\b|\bpursuing\b[^.;]{0,100}\bor\b[^.;]{0,110}\b(?:completed|finished|graduated)\b/i.test(normalize(input.body));
  const studying = !mixedStudentPath && segments.find(segment => !negated(segment) && !excludedStudentSubject.test(segment) && degree.test(segment)
    && !/\b(?:desirable|preferred|optional|may|can|a plus|nice to have)\b/i.test(segment)
    && (applicantContext(segment) || startsQualification(segment) || /\b(?:students?|applicants?|candidates?)\s+(?:who\s+(?:are\s+)?)?(?:are\s+)?(?:currently\s+)?pursuing\b/i.test(segment))
    && !(/\bor\b/i.test(segment) && /\b(?:completed|finished|graduated|equivalent (?:work )?experience)\b/i.test(segment))
    && /\b(?:pursuing|studying|enrolled|still (?:in|attending) college)\b/i.test(segment));
  const recent = segments.find(segment => !negated(segment) && (!excludedStudentSubject.test(segment)
    || (/^freshers?\s+with\b/i.test(segment) && !/\b(?:our (?:staff|employees|team)|employees|staff)\b/i.test(segment)))
    && (applicantContext(segment) || startsQualification(segment)
      || /\b(?:welcomes?|open to|suitable for|seeking)\s+(?:freshers?|fresh graduates?|recent graduates?|new graduates?)\b/i.test(segment))
    && (/\b(?:freshers?|fresh graduates?|recent graduates?|new graduates?|no (?:prior |previous |professional |work )?experience (?:is )?(?:required|necessary))\b/i.test(segment)
      || (degree.test(segment) && /\b(?:recently|just)\s+(?:(?:have|has)\s+)?(?:completed|finished|graduated)|\b(?:completed|finished)\b.{0,65}\brecently\b/i.test(segment))));
  const completed = segments.find(segment => !negated(segment) && !excludedStudentSubject.test(segment) && degree.test(segment)
    && /\b(?:completed|finished|graduated)\b/i.test(segment));
  const experienced = !internshipTitle && !/\btrainee\b/i.test(input.title) && seniorRole.test(input.title) ? input.title
    : segments.find(segment => !negated(segment) && !excludedStudentSubject.test(segment)
      && (!employerExperienceSubject.test(segment) || applicantExperienceRequirement.test(segment))
      && !/\b(?:preferred|desirable|desired|optional|a plus|a bonus|an advantage|nice[- ]to[- ]have|good[- ]to[- ]have)\b/i.test(segment)
      && (applicantExperienceRequirement.test(segment)
        || (!/\bintern(?:ship)?\b/i.test(segment) && /\bwe\s+(?:are\s+)?(?:looking\s+for|seeking|hiring)\s+(?:(?:an?|the)\s+)?experienced\b/i.test(segment))
        || /\b(?:prior|previous|professional|relevant) (?:work )?experience\b.{0,60}\b(?:required|mandatory|must)|\bexperienced (?:professionals?|applicants?|candidates?)\b/i.test(segment)
        || (qualificationSegments.has(segment) && /\b(?:prior|previous|professional|relevant) (?:work )?experience\b|\bexperience\s+(?:in|with|on|of|as|related|working)\b|\bworked\s+(?:on|in|with|as)\b/i.test(segment))));
  const graduationSegments = segments.filter(segment => !negated(segment) && !excludedStudentSubject.test(segment)
    && /\b(?:batch|cohort|graduat(?:e[sd]?|ing|ion)|pass[- ]?outs?)\b/i.test(segment));
  const cohorts = [...new Set([...(input.eligibleBatchesProvenance === 'source' ? input.eligibleBatches : []), ...graduationSegments.flatMap(segment => {
    const years = [];
    const group = '((?:19|20)\\d{2}(?:\\s*(?:,|/|or|and|-)\\s*(?:19|20)\\d{2})*)';
    const patterns = [new RegExp('\\b' + group + '\\s*(?:batch|cohort|graduates?|graduating|pass[- ]?outs?)\\b', 'gi'),
      new RegExp('\\b(?:batch|cohort|graduates?|graduat(?:ing|ed|ion)(?: year)?|pass[- ]?outs?)\\s*(?:(?:of|in|from|year|batch|by|required)\\s*)?' + group + '\\b', 'gi')];
    for (const pattern of patterns) for (const match of segment.matchAll(pattern)) years.push(...match[1].match(/(?:19|20)\d{2}/g).map(Number));
    return years;
  })])].filter(year => year >= 1990 && year <= input.referenceYear + 10).sort((a, b) => a - b);
  return { internship, contract, fullTime, studying, recent, completed, experienced, cohorts, graduationEvidence: graduationSegments.join(' ').slice(0, 160), text };
};

export const resolveRecruitmentPolicy = (input, { numeric, sourceEmployment, modelEmployment, modelExperience } = {}) => {
  if (input.incomplete) return null;
  const facts = collectRecruitmentFacts(input);
  const min = numeric.experienceProfile.minimumYears;
  const explicitZero = min === 0 || /^freshers?$/i.test(input.sourceExperienceRequired);
  // User-approved category defaults override employer fields, which remain separately stored.
  const employment = facts.internship || facts.studying ? 'internship' : sourceEmployment || (facts.contract ? 'contract'
    : facts.fullTime ? 'full_time'
      : (min !== null || explicitZero || facts.recent || facts.completed || facts.cohorts.length || facts.experienced) ? 'full_time' : modelEmployment);
  if (!employment || employment === 'unspecified') return null;
  let fields = null;
  const preservePreferred = value => ({ ...value, experienceProfile: { ...value.experienceProfile, preferredMinimumYears: numeric.experienceProfile.preferredMinimumYears } });
  if (!fields) {
    if (employment === 'internship') fields = inferred(0, 0, 'internship_default', facts.internship || facts.studying || input.sourceEmploymentType);
    else if (facts.cohorts.length) {
      const newest = facts.cohorts.at(-1);
      if (newest > input.referenceYear && !sourceEmployment && !facts.fullTime) {
        return { ...preservePreferred(inferred(0, 0, 'student_eligibility', facts.graduationEvidence)), employment: 'internship', experience: 'fresher_eligible', evidence: facts.graduationEvidence };
      }
      const minimum = Math.max(0, Math.min(15, input.referenceYear - newest));
      const maximum = minimum === 0 ? 0 : Math.max(minimum, Math.min(15, input.referenceYear - facts.cohorts[0]));
      fields = inferred(minimum, maximum, 'graduation_cohort', facts.graduationEvidence || `Eligible graduation batches: ${facts.cohorts.join(', ')}`);
    } else if (facts.recent) fields = inferred(0, 0, 'graduate_eligibility', facts.recent);
    else if (explicitZero) fields = inferred(0, 0, 'fresher_eligibility', input.sourceExperienceRequired || numeric.experienceProfile.evidence);
    else if (min !== null) fields = { ...numeric, experienceBasis: 'employer_requirement', experienceRequired: input.sourceExperienceRequired || numeric.experienceProfile.evidence };
    else if (facts.experienced) fields = inferred(1, 15, 'experienced_role_default', facts.experienced);
    else if (facts.completed) fields = inferred(0, 0, 'graduate_eligibility', facts.completed);
    else if (modelExperience === 'prior_required') fields = inferred(1, 15, 'model_eligibility', 'Calibrated model: prior experience required.');
    else if (['fresher_eligible', 'mixed'].includes(modelExperience)) fields = inferred(0, 0, 'model_eligibility', 'Calibrated model: applicants without experience may qualify.');
  }
  fields = fields ? preservePreferred(fields) : { ...numeric, experienceBasis: 'unspecified' };
  if (employment === 'full_time' && fields.experienceProfile.minimumYears > 0) {
    // Short but positive experience can round to zero in the legacy extractor.
    // Only the product filter years are mapped; employer bounds stay preserved.
    fields = { ...fields, experienceYears: [...new Set(fields.experienceYears.map(year => Math.max(1, Math.min(15, Math.ceil(year)))))] };
  }
  const experience = fields.experienceProfile.minimumYears > 0 ? 'prior_required'
    : fields.experienceProfile.minimumYears === 0 ? 'fresher_eligible' : 'not_stated';
  return { ...fields, employerExperienceProfile: numeric.experienceProfile, employment, experience,
    evidence: facts.internship || facts.contract || facts.fullTime || facts.experienced || facts.recent || facts.completed || facts.studying || facts.graduationEvidence || input.sourceEmploymentType };
};

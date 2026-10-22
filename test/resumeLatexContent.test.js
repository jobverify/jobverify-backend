import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSourceFacts, buildPreparationPrompt, buildLatexTailoringPrompt, buildLatexRepairPrompt, buildComparisonPrompt, validateLatexSource, validateResumeFidelity, buildResumeJobSnapshot, resumeJobHash } from '../src/services/resumeLatexContent.js';

const source = { text: `Asha Rao
asha@example.test | +91 98765 43210
EXPERIENCE
Software Engineer | Cedar Systems | Jan 2022 - Present
Built React tools with JavaScript and reduced errors by 20%.
Engineer | Maple Labs | Jun 2020 - Dec 2021
Developed Python services.
EDUCATION
BSc Computer Science | Valley University | 2016 - 2020
SKILLS
React, JavaScript, Python`, links: ['mailto:asha@example.test', 'tel:+919876543210', 'https://example.test/asha'] };
const latex = String.raw`\documentclass[11pt,a4paper]{article}
\usepackage[margin=0.6in]{geometry}
\usepackage{hyperref}
\begin{document}
\textbf{Asha Rao}\\
\href{mailto:asha@example.test}{asha@example.test}
\href{tel:+919876543210}{+91 98765 43210}
\section*{Experience}
Software Engineer | Cedar Systems | Jan 2022 -- Present
\end{document}`;
const fidelity = (text, extra = {}) => validateResumeFidelity({ facts: buildSourceFacts(source), text, links: source.links, tailored: true, ...extra });

test('protected facts retain the candidate identity, each employer, dates, degree and metric', () => {
  const facts = buildSourceFacts(source);
  assert.equal(facts.name, 'Asha Rao');
  assert.deepEqual(facts.emails, ['asha@example.test']);
  assert.ok(JSON.stringify(facts.employment).includes('Cedar Systems'));
  assert.ok(JSON.stringify(facts.employment).includes('Maple Labs'));
  assert.ok(JSON.stringify(facts.education).includes('Valley University'));
  assert.ok(facts.dates.some(date => date.includes('2022')));
  assert.ok(facts.metrics.includes('20%'));
  assert.deepEqual(buildSourceFacts(source), facts);
  assert.equal(fidelity(source.text).valid, true);
});

test('missing employers, changed email, missing dates and substituted job titles cannot pass fidelity', () => {
  for (const changed of [source.text.replace('asha@example.test', 'ashar@example.test'), source.text.replace('Cedar Systems', 'Cedar'), source.text.replace('Jan 2022 - Present', ''), source.text.replace('Software Engineer', 'Senior Agentic AI Engineer')]) {
    const result = fidelity(changed);
    assert.equal(result.valid, false, changed);
    assert.ok(result.issues.length > 0);
  }
});

test('added metrics and skills and duplicated education are rejected', () => {
  for (const extra of ['\nDelivered 50 projects.', '\nSkills: React, JavaScript, Python, Kubernetes, AWS', '\nBSc Computer Science | Valley University | 2016 - 2020']) {
    assert.equal(fidelity(source.text + extra).valid, false, extra);
  }
  assert.equal(fidelity(source.text.replace('20%', '200%')).valid, false);
});

test('mailto and tel targets must agree with the original even if the visible contacts are correct', () => {
  assert.equal(fidelity(source.text, { links: ['mailto:wrong@example.test', 'tel:+919876543210', 'https://example.test/asha'] }).valid, false);
  assert.equal(fidelity(source.text, { links: ['mailto:asha@example.test', 'tel:+919876543211', 'https://example.test/asha'] }).valid, false);
  assert.equal(fidelity(source.text, { links: [] }).valid, false);
  assert.equal(fidelity(source.text.replace('asha@example.test', 'Email')).valid, false);
  assert.equal(fidelity(source.text.replace('+91 98765 43210', 'Phone')).valid, false);
});

test('source facts also protect contact information stored only as annotation targets', () => {
  const hidden = { text: source.text.replace('asha@example.test | +91 98765 43210', 'Email | Phone'), links: source.links };
  const result = validateResumeFidelity({ facts: buildSourceFacts(hidden), text: hidden.text, links: ['mailto:other@example.test'], tailored: true });
  assert.equal(result.valid, false);
});

test('fidelity accepts reordered headers, formatting changes and grounded bullet wording', () => {
  const reordered = source.text.replace('Software Engineer | Cedar Systems | Jan 2022 - Present', 'Cedar Systems\nSoftware Engineer\nJanuary 2022 – Present').replace('Built React tools with JavaScript and reduced errors by 20%.', 'Reduced errors by 20% while building JavaScript and React tools.');
  assert.equal(fidelity(reordered).valid, true);
});

test('protected employment dates cannot be reassigned to a different employer', () => {
  const changed = source.text.replace('Jan 2022 - Present', 'TEMP').replace('Jun 2020 - Dec 2021', 'Jan 2022 - Present').replace('TEMP', 'Jun 2020 - Dec 2021');
  assert.equal(fidelity(changed).valid, false);
});

test('tailoring may remove irrelevant project dates while keeping employment and education dates', () => {
  const original = { ...source, text: source.text + '\nPROJECTS\nLegacy experiment | 2015\nBuilt a small prototype.' };
  const facts = buildSourceFacts(original);
  assert.equal(validateResumeFidelity({ facts, text: source.text, links: source.links, tailored: true }).valid, true);
  assert.equal(validateResumeFidelity({ facts, text: source.text, links: source.links, tailored: false }).valid, false);
});

test('a name sharing the header line with a role remains a protected identity', () => {
  const header = { ...source, text: source.text.replace('Asha Rao\n', 'Asha Rao | Software Engineer\n') };
  assert.equal(buildSourceFacts(header).name, 'Asha Rao');
  assert.equal(validateResumeFidelity({ facts: buildSourceFacts(header), text: source.text.replace('Asha Rao', 'Asha Roy'), links: source.links }).valid, false);
});

test('invalid contact encodings fail safely instead of throwing out of validation', () => {
  const result = fidelity(source.text, { links: [...source.links, 'mailto:%zz@example.test'] });
  assert.equal(result.valid, false);
});

test('job snapshots retain full candidate-facing fields and hashes react to every relevant change', () => {
  const job = { title: 'Engineer', company: 'Example', sourceDescription: 'Source '.repeat(2000), description: 'Display description', location: 'Pune', salary: '10-15 LPA', minimumQualification: 'BSc', preferredQualification: 'MSc', experienceRequired: '2 years', requiredSkills: ['Python'], eligibleBatches: [2020], branches: ['CS'], responsibilities: ['Build systems'], applyUrl: 'https://example.test/job', classification: { reason: 'INTERNAL_CLASSIFIER' }, postClassification: { owner: 'INTERNAL_WORKER' }, filterSignals: { confidence: 'INTERNAL_CONFIDENCE' }, clickCount: 42 };
  const snapshot = buildResumeJobSnapshot(job);
  assert.equal(snapshot.sourceDescription, job.sourceDescription);
  assert.deepEqual(snapshot.requiredSkills, ['Python']);
  assert.deepEqual(snapshot.responsibilities, ['Build systems']);
  assert.equal(snapshot.snapshotVersion, 1);
  assert.doesNotMatch(JSON.stringify(snapshot), /INTERNAL_|clickCount|classification|filterSignals/);
  assert.equal(buildResumeJobSnapshot({ source: 'internal-scraper-runner' }).source, undefined);
  for (const field of ['salary', 'location', 'minimumQualification', 'preferredQualification', 'experienceRequired', 'applyUrl']) assert.notEqual(resumeJobHash(job), resumeJobHash({ ...job, [field]: 'changed' }), field);
  assert.equal(resumeJobHash(job), resumeJobHash({ ...job, classification: { reason: 'changed' }, clickCount: 99 }));
});

test('generation and independent comparison prompts ground facts in untrusted source data', () => {
  const facts = buildSourceFacts(source);
  const preparation = buildPreparationPrompt({ source, facts });
  assert.match(preparation, /complete.*LaTeX|LaTeX.*complete/i);
  assert.match(preparation, /untrusted/i);
  assert.match(preparation, /10\s*pt|10.point/i);
  assert.ok(preparation.includes('asha@example.test'));
  const tailored = buildLatexTailoringPrompt({ source, facts, baseLatex: latex, jobSnapshot: { title: 'Senior Agentic AI Engineer', description: 'Docker '.repeat(2000) } });
  assert.ok(tailored.includes('Docker '.repeat(2000)));
  assert.match(tailored, /job requirements.*not.*candidate facts/i);
  assert.match(tailored, /two pages|2 pages/i);
  const comparison = buildComparisonPrompt({ source, latexText: source.text, tailored: true, links: source.links, facts });
  for (const field of ['supported', 'missingFacts', 'unsupportedClaims']) assert.ok(comparison.includes(field));
  assert.match(comparison, /independent|compare/i);
  assert.match(comparison, /Judge factual content, not layout/);
  assert.match(comparison, /original hyperlinks array is not a complete list/);
  const repair = buildLatexRepairPrompt({ originalPrompt: tailored, latex, issues: ['Missing Cedar Systems'] });
  assert.ok(repair.includes('Missing Cedar Systems'));
  assert.match(repair, /complete.*LaTeX|LaTeX.*complete/i);
});

test('LaTeX validation accepts a complete standalone readable document', () => {
  assert.equal(validateLatexSource(latex), latex);
});

test('LaTeX validation rejects external dependencies, TeX escape hatches and dangerous URI targets', () => {
  for (const injected of [String.raw`\input{/etc/passwd}`, String.raw`\includegraphics{https://evil.test/image}`, String.raw`\write18{curl evil.test}`, String.raw`\openout1=/tmp/file`, String.raw`\csname input\endcsname`, String.raw`\directlua{os.execute('id')}`, String.raw`\special{html:<script>}`, String.raw`\catcode0=12`, '^^5cinput{file}', String.raw`\href{javascript:alert(1)}{Portfolio}`, String.raw`\href{file:///etc/passwd}{File}`, String.raw`\usepackage{shellesc}`, String.raw`\makeatletter\@@input /etc/passwd`, String.raw`\ExplSyntaxOn\file_input:n{/etc/passwd}`, String.raw`\endlinechar=92`, String.raw`\addtocontents{/tmp/file}{text}`]) {
    assert.throws(() => validateLatexSource(latex.replace('\\end{document}', `${injected}\n\\end{document}`)), /unsafe|self.contained|unsupported|link|LaTeX/i, injected);
  }
});

test('LaTeX validation enforces complete documents, the size cap and minimum font size', () => {
  for (const invalid of [latex.replace('11pt', '9pt'), latex.replace('\\end{document}', ''), latex.replace('\\begin{document}', '\\begin{document}\\tiny '), latex.replace('\\begin{document}', '\\begin{document}\\fontsize{9}{11}\\selectfont '), latex.replace('\\begin{document}', '\\begin{document}\\fontsize9{11}\\selectfont '), `${latex}${' '.repeat(256 * 1024)}`]) assert.throws(() => validateLatexSource(invalid));
});

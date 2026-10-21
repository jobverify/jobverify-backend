import { prepareResumeModel, generateResumeText, RESUME_MODEL, remainingBudget } from './resumeRuntime.js';
import { prepareResumeCompiler, compileResumeLatex } from './latexCompiler.js';
import { buildSourceFacts, buildPreparationPrompt, buildLatexTailoringPrompt, buildLatexRepairPrompt, buildComparisonPrompt,
  validateLatexSource, validateResumeFidelity } from '../src/services/resumeLatexContent.js';

export async function prepareResumeRuntime({ deadline = Date.now() + 29 * 60000 } = {}) {
  await prepareResumeCompiler({ deadline });
  return prepareResumeModel({ deadline });
}
export async function processResumeDocument(input, { deadline = Date.now() + 25 * 60000, onPhase = async () => {}, generate = generateResumeText, compile = compileResumeLatex } = {}) {
  const tailored = input.mode === 'tailored';
  const facts = input.facts || buildSourceFacts(input.source);
  const originalPrompt = tailored ? buildLatexTailoringPrompt({ ...input, facts }) : buildPreparationPrompt({ ...input, facts });
  let prompt = originalPrompt;
  for (let attempt = 0; attempt < 2; attempt++) {
    remainingBudget(deadline, 1);
    await onPhase(attempt ? 'repairing' : 'generating');
    // Context overflow is an input error; retrying the same full input cannot fix it.
    const raw = await generate(prompt, { deadline });
    let latex = raw, result;
    const issues = [];
    try {
      latex = validateLatexSource(raw);
      await onPhase('compiling');
      result = await compile(latex, { deadline });
      await onPhase('validating');
      if (tailored && result.pageCount > 2) issues.push('The tailored PDF exceeds two pages. Shorten less relevant detail; retain every protected employment and education fact and keep all text at least 10 pt.');
      const fidelity = validateResumeFidelity({ facts, text: result.text, links: result.links, tailored });
      issues.push(...fidelity.issues);
      await onPhase('comparing');
      const comparisonRaw = await generate(buildComparisonPrompt({ source: input.source, facts, latexText: result.text, links: result.links, tailored }), { deadline, comparison: true });
      let comparison;
      try { comparison = JSON.parse(comparisonRaw); } catch { throw new Error('The source-comparison result was invalid.'); }
      if (comparison.supported !== true || !Array.isArray(comparison.missingFacts) || !Array.isArray(comparison.unsupportedClaims)) issues.push('The independent source-comparison pass did not confirm factual support.');
      if (Array.isArray(comparison.missingFacts)) issues.push(...comparison.missingFacts.map(fact => `Missing source fact: ${fact}`));
      if (Array.isArray(comparison.unsupportedClaims)) issues.push(...comparison.unsupportedClaims.map(claim => `Unsupported claim: ${claim}`));
    } catch (error) {
      if (error.statusCode === 422) throw error;
      issues.push(error.message);
    }
    if (!issues.length && result) return { latex, pdf: result.pdf, pageCount: result.pageCount, facts,
      modelVersion: `${RESUME_MODEL.modelId}@${RESUME_MODEL.revision}:${RESUME_MODEL.sha256}`, styleVersion: RESUME_MODEL.styleVersion };
    if (attempt === 0) prompt = buildLatexRepairPrompt({ originalPrompt, latex, issues });
  }
  throw Object.assign(new Error('Resume validation failed after one repair. Your previous successful version is unchanged. Please retry.'), { statusCode: 502 });
}

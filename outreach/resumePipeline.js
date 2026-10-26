import { prepareResumeModel, generateResumeText, RESUME_MODEL, remainingBudget } from './resumeRuntime.js';
import { prepareResumeCompiler, compileResumeLatex } from './latexCompiler.js';
import { safeResumeDiagnostic, resumeFailure } from './resumeDiagnostics.js';
import { buildSourceFacts, buildPreparationPrompt, buildLatexTailoringPrompt, buildLatexRepairPrompt, buildComparisonPrompt,
  validateLatexSource, validateResumeFidelity, sourceWithCandidateEvidence } from '../src/services/resumeLatexContent.js';

export async function prepareResumeRuntime({ deadline = Date.now() + 29 * 60000 } = {}) {
  await prepareResumeCompiler({ deadline });
  return prepareResumeModel({ deadline });
}
export async function processResumeDocument(input, { deadline = Date.now() + 25 * 60000, onPhase = async () => {}, onDiagnostic = () => {}, generate = generateResumeText, compile = compileResumeLatex } = {}) {
  const tailored = input.mode === 'tailored';
  const source = sourceWithCandidateEvidence(input.source, input.candidateEvidence);
  const facts = input.candidateEvidence ? buildSourceFacts(source) : input.facts || buildSourceFacts(source);
  const originalPrompt = tailored ? buildLatexTailoringPrompt({ ...input, source, facts }) : buildPreparationPrompt({ ...input, source, facts });
  let prompt = originalPrompt;
  let failureCode = 'processing_failed';
  for (let attempt = 0; attempt < 2; attempt++) {
    remainingBudget(deadline, 1);
    let stage = attempt ? 'repairing' : 'generating';
    const started = Date.now();
    const diagnose = (code, extra = {}) => onDiagnostic(safeResumeDiagnostic({ stage, code, attempt: attempt + 1, seconds: (Date.now() - started) / 1000, ...extra }));
    await onPhase(stage);
    diagnose('started');
    let latex = '', result;
    const issues = [];
    try {
      latex = await generate(prompt, { deadline, onDiagnostic });
      stage = 'latex';
      latex = validateLatexSource(latex);
      stage = 'compiling';
      await onPhase('compiling');
      result = await compile(latex, { deadline });
      diagnose('passed', { pageCount: result.pageCount });
      stage = 'validating';
      await onPhase('validating');
      if (tailored && result.pageCount > 2) {
        failureCode = 'pagination_failed';
        issues.push('The tailored PDF exceeds two pages. Shorten less relevant detail; retain every protected employment and education fact and keep all text at least 10 pt.');
        diagnose(failureCode, { pageCount: result.pageCount });
      }
      const fidelity = validateResumeFidelity({ facts, text: result.text, links: result.links, tailored });
      issues.push(...fidelity.issues);
      if (fidelity.issues.length) { failureCode = 'factual_validation_failed'; diagnose(failureCode, { issueCount: fidelity.issues.length }); }
      stage = 'comparing';
      await onPhase('comparing');
      const comparisonRaw = await generate(buildComparisonPrompt({ source, facts, latexText: result.text, links: result.links, tailored }), { deadline, comparison: true, onDiagnostic });
      let comparison;
      try { comparison = JSON.parse(comparisonRaw); } catch { throw resumeFailure('comparison_invalid'); }
      if (typeof comparison?.evidence !== 'string' || !comparison.evidence.trim()) throw resumeFailure('comparison_invalid');
      if (comparison.supported !== true || !Array.isArray(comparison.missingFacts) || !Array.isArray(comparison.unsupportedClaims)) issues.push('The independent source-comparison pass did not confirm factual support.');
      if (Array.isArray(comparison.missingFacts)) issues.push(...comparison.missingFacts.map(fact => `Missing source fact: ${fact}`));
      if (Array.isArray(comparison.unsupportedClaims)) issues.push(...comparison.unsupportedClaims.map(claim => `Unsupported claim: ${claim}`));
      if (issues.length) {
        if (comparison.supported !== true || comparison.missingFacts?.length || comparison.unsupportedClaims?.length) failureCode = 'factual_validation_failed';
        diagnose(failureCode, { issueCount: issues.length });
      }
    } catch (error) {
      failureCode = safeResumeDiagnostic({ code: error.code || ({ latex: 'latex_invalid', compiling: 'compiler_failed', validating: 'pdf_invalid', comparing: 'comparison_invalid' }[stage]) }).code;
      diagnose(failureCode, { reason: error.reason });
      // Context overflow is an input error; retrying the same full input cannot fix it.
      if (error.statusCode === 422) throw error;
      issues.push(error.message);
    }
    if (!issues.length && result) {
      stage = 'completed'; diagnose('passed', { pageCount: result.pageCount });
      return { latex, pdf: result.pdf, pageCount: result.pageCount, facts,
        modelVersion: `${RESUME_MODEL.modelId}@${RESUME_MODEL.revision}:${RESUME_MODEL.sha256}`, styleVersion: RESUME_MODEL.styleVersion };
    }
    if (attempt === 0) prompt = buildLatexRepairPrompt({ originalPrompt, latex, issues });
  }
  throw resumeFailure(failureCode);
}

# Source-only resume documents

The active worker prepares and tailors resumes from existing source text and candidate-confirmed profile evidence. It does not call an AI model or run the Docker/LaTeX compiler. Legacy inference helpers remain for compatibility; `resumePipeline.js` is the active document path.

`sourceTemplate.js` builds an ordered document, renders a native PDF with bundled licensed fonts, and creates an escaped, editable LaTeX export from the same content. Tailoring can reorder clearly identified achievement bullets within a dated experience record. Ambiguous records retain their original order. Job requirements never become candidate claims.

Before publication, PDF.js renders and inspects the PDF. Extracted characters and their order must match the template, source facts must be retained, and actual link destinations must match the original. PDF wrapping may change whitespace in contact details. No candidate text or raw errors are logged.

The worker uses a 60-second budget starting with the first workflow step. Source extraction, progress updates, rendering and inspection respect the remaining budget. GitHub queuing/provisioning and unavailable external services can still prevent a complete result within one minute; this is not a measured Actions latency guarantee.

Body text is 11pt. Base documents retain long content; tailored documents that cannot fit two readable pages fail with an actionable message instead of silently losing facts. The font set supports Latin, Greek and Cyrillic text. Unsupported characters and complex scripts fail explicitly; universal script support is not claimed.

Run the local synthetic benchmark with:

```powershell
node scripts/benchmarkSourceResumes.js --output .cache/source-only-benchmark
```

The benchmark includes source extraction and actual PDF validation for PDF, Word and TeX fixtures. It excludes MongoDB and GitHub setup/queue latency. Font files are pinned to `dejavu-fonts-ttf` 2.37.3 in `fonts/manifest.json`; their original license and README are included. This font set also covers common mathematical and decorative symbols.

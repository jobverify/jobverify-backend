# Five-step Get started flow and saved-job resume tailoring

Date: 2026-10-20

Status: User approved the five-step behavior in chat. This written design is ready for review before implementation planning.

## Intended outcome

Help job seekers set their preferences, apply those preferences, bookmark relevant jobs, upload their resume, and create a resume tailored to a specific saved job. Preserve the existing visual language shown in the user's screenshot.

The user confirmed these five steps:

1. **Make it personal:** Your profile opens a popup containing only preference filters and saves them to MongoDB.
2. **Apply filters:** Replace Try an example with Apply filters. Apply the saved preferences to the filter controls below the checklist.
3. **Save jobs:** Explain bookmarking and complete this step after a job is saved.
4. **Upload resume:** Open the existing resume uploader.
5. **Saved jobs:** Open the saved jobs section, where each job has a Create tailored resume action.

Hide collapses the steps while retaining the Get started heading and progress count; Show expands them. Tailoring uses the uploaded resume and the selected job description. Candidate facts must come from the resume, rather than job requirements or preference filters.

## Existing implementation

This workspace contains separate frontend and backend Git repositories, both with existing local changes. Implementation must preserve those changes.

- `jobverify-frontend/src/pages/JobListing/SearchWelcome.jsx` renders the current three-step checklist. Hide currently removes the whole card. Step one currently checks the profile name.
- `src/pages/Profile/ProfilePreferenceFiltersCard.jsx` already provides the eight preference fields. `saveProfile` sends partial updates to `PUT /api/user/profile`, and the backend stores `profile.profilePreferenceFilters` on the MongoDB User document.
- The jobs Redux slice already applies saved preferences when `quickMode` changes to `profile`, including resetting pagination and reflecting the selections in the visible filter controls.
- Saved jobs already use authenticated MongoDB-backed endpoints and appear in `SavedJobsPage.jsx`.
- `ResumeCard.jsx`, the resume Redux slice, and `/api/user/resume` already support private upload, download, replacement, and removal. One original resume per user is stored in a separate MongoDB document, with a 5 MB upload limit. Supported upload formats are PDF, DOC, DOCX, and LaTeX.
- `outreach/runner.js` and `outreach-drafts.yml` already run a pinned local language model in GitHub Actions. Existing dispatch, usage limits, leases, account-deletion checks, and recovery provide patterns for asynchronous generation.

## Approach

Use the existing preferences, filtering, saved-job, resume, and local-model infrastructure. Add a dedicated resume-tailoring service and persisted generation state. Extend the existing Actions worker to process explicit tailoring requests while retaining its existing bounded runtime and shared dispatch allowance.

Alternatives considered:

- A synchronous hosted AI API would reduce queue time but introduces another provider, credentials, and a separate running-cost model. It is not the default for this repository.
- Automatically tailoring all saved jobs would start work without an explicit generation request and consume unnecessary worker capacity. Generate only for the saved job selected by the user.

## Checklist and preference popup

Retain the existing colors, typography, rounded card, numbered circles, and completed checkmarks. Render five rows and highlight the first incomplete step. Hide and Show must expose `aria-expanded` and control the steps container. The header remains visible when collapsed.

Your profile opens a reusable, labelled dialog containing only the existing preference editor: Company, Job Type, Location, Experience, Role Domain, Work Arrangement, Date Posted, and Sort by. Show Save preferences and Cancel. Use the complete job metadata rather than options narrowed by the current search. Include stored selections even when they are absent from current metadata. Respect existing feature visibility rules.

The dialog owns its draft. Cancel discards edits. Save submits only `profilePreferenceFilters` through the existing profile action. Keep the dialog open on failure and retain the draft for retry. A successful save updates the authenticated profile and job preference state through the existing Redux flow. Saving preferences does not automatically execute step two.

Apply filters selects the existing Profile Preference browse mode, replaces applicable live filter values with the saved preferences, resets pagination, and brings the filters/results into view. Existing access rules still apply. If there are no saved preferences, open the preferences popup and explain that preferences must be saved first. Avoid marking the step complete when saving or applying fails.

The third row includes a bookmark illustration and a Bookmark jobs action that brings the job results into view. The row completes when the current account has at least one saved job. Bookmark failures remain visible through the existing job-card feedback.

Upload resume opens a labelled dialog reusing the existing ResumeCard behavior and validation. Fetch resume metadata when needed so an existing upload is recognized without visiting Profile. Do not load the original file into the checklist state.

Saved jobs navigates to `/saved-jobs`. The fifth row completes when the user has visited that section. Record this visit, successful filter application, and collapse preference in a small versioned local-storage record scoped to the authenticated user ID. Storage failures must not break the UI. This browser-specific progress supplements MongoDB-backed facts; bookmarks and uploaded resumes remain authoritative across devices. Clear in-memory state when the account changes.

The progress count is the number of completed rows out of five. Preference completion depends on actual saved preference values, rather than a profile name. All-default preferences do not imply personalization; Apply filters directs the user to select at least one preference if none have been configured. Public visitors can collapse the panel and see the steps; account-specific actions use the existing sign-in flow.

## Saved-job tailoring experience

Keep the existing saved-job list, loading feedback, retry action, empty state, and bookmark removal. Add a tailoring action associated with each job, separate from the ordinary Apply action.

Create tailored resume opens a dialog identifying the selected role and company. If no original resume exists, show Upload resume in that dialog. Otherwise show the source filename and a Generate tailored resume action. Generating does not submit an application or replace the original resume.

Display Queued, Generating, Ready, or Failed status. Poll only while a visible dialog has an active request, stop polling on close or logout, and restore persisted status when reopening. Preserve the last successful draft if regeneration fails. Show a retry action for recoverable failures and an actionable message when the worker is not configured.

Ready displays a readable resume preview and a Download resume action. The initial export is a UTF-8 `.txt` file with a safe role/company-derived filename; the preview also offers Print / Save as PDF using a print-only resume layout. The UI must clearly label those formats. Exporting Word or compiling LaTeX is outside this version.

## Backend contracts and data

Introduce authenticated routes under `/api/user/tailored-resumes`:

- `GET /:jobId`: Return this user's latest generation status, source freshness, and latest successful structured resume for the job. Return `data: null` if no generation exists.
- `POST /:jobId`: Validate the account, saved-job membership, current public job availability, current original resume, and worker readiness. Return an existing request for identical active inputs, or enqueue generation and return HTTP 202. Accept an explicit regeneration flag to refresh an existing result.
- `GET /:jobId/download`: Return the latest successful result as a text attachment. Never expose another account's result.

Validate IDs before querying, apply existing authentication and CSRF behavior, limit generation requests per account, and set private resume responses to `Cache-Control: no-store`. Use existing site-settings visibility rules for the job lookup.

A dedicated TailoredResume document records user, job, generation status, source resume hash, job-description hash, generation revision, bounded structured output, error classification, timestamps, and lease/attempt metadata. Enforce one current record per `(user, job)`. Store the previous successful output separately from an active generation revision so failures cannot erase it. Original resume bytes remain in the existing Resume collection.

The service must derive all input from authenticated MongoDB records. Client-supplied resume text or job descriptions are not accepted as authoritative. Include the selected job title, company, and original description. Preference filters guide discovery and do not establish skills or experience.

Replacing the original resume or changing the job description makes prior output stale; show a Regenerate action rather than describing it as current. At worker completion, verify the account still exists, the lease and revision still belong to the worker, and the source resume is unchanged before committing output. Deleting an original resume invalidates pending tailoring and removes derived results. Account deletion cleans up all tailoring documents. Removing a saved job prevents new generation and cancels pending work; existing results become inaccessible through saved-job-only endpoints.

## Resume extraction and model generation

Extract text in the worker, not the ordinary upload request. Use the existing PDF parser dependency for text PDFs. Use maintained format-specific readers for DOC and DOCX and a non-executing text extractor for LaTeX. Select and verify reader dependencies during implementation planning. Parsing must bound input size, expanded archive size, runtime, and extracted text; do not execute embedded content or LaTeX commands.

Unreadable, encrypted, malformed, or image-only documents fail with a message asking for a readable resume. Keep the original upload usable for download/replacement. Do not fabricate a resume when text extraction fails.

Use the existing pinned local model/runtime. Provide a tailoring-specific structured-output schema and token budget rather than reusing the outreach draft's 700-token output cap. Bound prompt text to the configured context, retaining candidate facts and the most relevant requirements; reject source material that cannot be processed meaningfully rather than silently dropping most of a resume.

The output schema includes candidate header, summary, skills, experience, projects, and education, with optional sections omitted when absent. The prompt permits reordering and rewriting supplied facts to emphasize relevance, and explicitly forbids inventing qualifications, employers, dates, achievements, or credentials. Treat resume and job-description content as untrusted data. Validate output shape, lengths, complete generation, and absence of instruction or markup payloads before storage. Render strings as text through React. Model output remains a draft for the user to review; schema validation cannot prove every statement is factually faithful.

Extend the existing worker to process both outreach and tailoring work under a shared overall time/task budget, with separate prompts and output validators. Preserve the outreach schema and generation behavior. Reuse the existing Actions dispatch controls and allowance rather than introducing a paid API fallback. A worker lease permits recovery after interruption, with bounded attempts and explicit retry status after exhaustion. Recovery must also run after API restarts and handle a queued request arriving while a worker is already finishing.

Do not log original resumes, prompts, generated output, personal filenames, database URIs, or provider responses. Do not upload candidate data as Actions artifacts or cache entries. Only immutable model/runtime files may use the existing cache. Live deployment still requires the workflow and its existing configuration to be present on the dispatch branch; local implementation must not trigger production work.

## Verification and completion criteria

- Behavior tests cover collapse/expand, five-step count, real preference completion, popup cancellation and failed saves, successful preference persistence, visible applied filters, pagination reset, bookmarking, resume upload, saved-job visit, and account switching.
- Browser checks cover the five-step flow and tailoring preview at desktop and mobile widths, keyboard focus, Escape/close behavior, error/retry feedback, and absence of horizontal overflow.
- Backend tests cover authenticated ownership, saved-job checks, missing resumes, unavailable jobs, duplicate requests, source changes, stale leases, account/resume deletion, extraction failures, model timeouts, malformed/incomplete model output, persisted recovery, and preservation of the prior draft.
- Meaningful extraction fixtures cover each accepted source format. Generation tests inject a deterministic model response; they must not spend external capacity or claim to establish real model quality.
- Run targeted frontend and backend tests, lint/syntax checks, the frontend production build, and the existing resume, saved-job, profile-preference, outreach-worker, and account-deletion regression tests affected by the change.
- Attempt an actual local model smoke test if the pinned runtime is available. Report separately whether model execution, real MongoDB persistence, and Actions dispatch were exercised or only validated with fixtures.

Implementation is complete when the five user-facing steps work through the existing services, a selected saved job can produce and retrieve a persisted tailored draft from the uploaded resume, downloads match the preview, failures are retryable, and affected checks pass. Operational deployment and configuration changes are reported distinctly from local code completion.

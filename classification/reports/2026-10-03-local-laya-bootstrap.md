# Automatic Laya startup for local resilient scraping

The local resilient supervisor now prepares Laya before starting the scraper child. On Windows it downloads portable Python 3.12.10 when needed, verifies the cached interpreter, installs pinned CPU dependencies when missing, and waits for the worker's compatible model/runtime/policy identity. Installation or warmup failure prevents scraper startup. Partial Python extraction is staged and never published as a complete runtime; incomplete older caches are repaired.

Use the existing dry-run launcher without workspace cleanup:

```powershell
npm run scrape:parallel:dry:resilient -- -NoClean
$active = Get-Content ..\artifacts\run-logs\active-dry-run-scrape.json | ConvertFrom-Json
Get-Content -Wait -LiteralPath "$($active.runDir)\pipeline.log"
```

Existing concurrency settings remain supported. The scraper slots fetch sources concurrently and share one CPU model with queued requests. The worker survives scraper retries and the supervisor stops only the worker it started; compatible borrowed workers are left running. The retained child handle permits owned cleanup even when the health endpoint is unresponsive. Cleanup also preserves Python, venv, weights and worker-state caches.

The existing 1200-second shared model budget is unchanged and starts after warmup. Jobs outside that budget receive policy fallback. Set `LAYA_TOTAL_BUDGET_SECONDS` explicitly to allocate a longer local inference budget. Native completion and policy fallback remain separately labelled.

## Verification

The targeted command passed all 70 checks:

```powershell
node --test test/localLaya.test.js test/layaWorker.test.js test/cleanWorkspace.test.js test/resilientLocalScrape.test.js test/localScrapeRunEnv.test.js test/scraperWorkflowSchedule.test.js test/jobClassificationClient.test.js test/recruitmentPolicy.test.js
```

The tests include first-install ordering, failed/interrupted extraction, repair of partial Python caches, cleanup preserving runtime files, installation failure preventing a scraper child, a shared worker across child retries, termination of an owned unresponsive worker, and preservation of replacement/borrowed worker ownership.

`npm run lint` passed syntax checks for 15348 JavaScript files. PowerShell parsing and the scoped tracked diff whitespace check passed.

A real cached CPU-model check used the resilient supervisor and a single synthetic job, without scraping external sources or writing MongoDB:

| UTC time | Observed event |
| --- | --- |
| 14:02:42 | Supervisor begins preparing Laya |
| 14:02:52 | Cached Python and CPU dependencies verified |
| 14:04:03 | Compatible worker ready; scraper child starts afterward |
| 14:04:14 | Complete native request returns Intern, filter years `[0]`; child exits zero |
| 14:04:16 | Owned worker termination completes; supervisor exits zero |

The pinned multilingual model revision was `55cf4c4ebb4ebe31b2550e8bdf3bd21b99753851`. The synthetic advert required two years for an internship; the final zero-year filter follows the user's category-default precedence and is a policy result. The complete native request confirms integration, not learned-model accuracy. The model weights and installed dependencies were reused. A full cold download/install was not repeated.

Local evidence is retained in `.cache/laya-python/local-bootstrap-final-tests.log`, `local-bootstrap-lint.log`, `local-bootstrap-native-smoke-final.log`, and `.cache/classification-runs/local-bootstrap-smoke-final/run-exit.json`. Routine cleanup preserves the first three logs together with the Python cache; classification-run fixtures remain disposable.

The broad `npm test` command was also run against the repository's 5722 test files. It was stopped after reaching the C-provider tests, with 75 observed failures in provider/catalog tests outside this launcher's changed files. There is no full-suite pass or complete count. These failures were not investigated as part of this local bootstrap change. The owned test runner and its Node test children were stopped; the full captured output remains in `.cache/laya-python/local-bootstrap-full-tests.log`.

Observed failing test names:

- Harbinger Systems run validates the current careers shell before using Darwinbox listings
- IndiaMART local catalog captures the verified first-party careers microsite and Klimb board contract
- IndiaMART exact-name backlog rows resolve from local provider metadata without aliases
- getScraperCatalog includes IndiaMART as a verified Klimb provider
- buildScrapers exposes a runnable IndiaMART scraper without changing the runner contract
- IndiaMART falls back to a browser-backed page loader when Node fetch times out
- IndiaMART falls back to a browser-backed pagination loader when the Klimb JSON request times out
- Kumaran Systems local catalog captures the verified first-party careers page and public jobs API
- Napier Healthcare Solutions exports the verified fail-closed careers contract
- Rave Technologies catalog tracks the NEC rename evidence, forbidden successor shells, and SmartRecruiters board
- Safran Data Systems pins the accessible keyword search page and exact-company detail contract
- Aditya Birla Capital local catalog captures the verified first-party jobs surface
- buildScrapers and company coverage resolve Aditya Birla Capital from the shared catalog
- Aditya Birla Capital scraper constants stay pinned to the verified official careers surfaces
- extractSearchResults maps the first-party Aditya Birla Capital jobs payload into the shared job shape
- Aditya Birla Capital detail-page helpers decode both verified public apply handoffs
- run validates the official Aditya Birla Capital careers surfaces and decorates jobs for the shared runner
- Aditya Birla Capital fails closed when the verified public apply handoff drifts
- getScraperCatalog includes ADOR as a public careers-page scraper
- buildScrapers exposes a runnable ADOR scraper without changing the runner contract
- extractSearchResults maps ADOR careers cards into conservative job records
- run fetches the ADOR careers page and decorates the extracted openings
- buildScrapers and company coverage resolve ArcelorMittal Nippon Steel India from the shared catalog
- getScraperCatalog includes the Ashok Leyland Darwinbox-backed script provider with official metadata
- buildScrapers exposes a runnable Ashok Leyland scraper without changing the runner contract
- createAshokLeylandScraper targets the Ashok Leyland Darwinbox host and company id
- run keeps Ashok Leyland jobs on the hosted Darwinbox routes and decorates the shared runner fields
- Bajaj Allianz local catalog captures the verified legacy-brand redirect and first-party nonlisting jobs shell
- Bajaj Allianz backlog matching works directly from the local catalog without an alias entry
- buildScrapers and company coverage resolve Bajaj Allianz from the shared catalog
- Bajaj Allianz constants stay pinned to the verified legacy redirect, current homepage handoff, jobs shell, and broken direct careers route
- Bajaj Allianz sentinel returns [] only while the verified redirect, jobs shell, and broken direct careers route remain unchanged
- Bajaj Allianz sentinel fails closed when the redirect, homepage handoff, jobs shell, or broken direct careers route drifts materially
- Bajaj Auto catalog captures the verified first-party careers hub, jobs page, APIs, and detail shell urls
- buildScrapers and company coverage resolve Bajaj Auto from the shared catalog
- Bajaj Auto pins the verified first-party careers hub, search page, career bundle, api contracts, and detail shell
- Bajaj Auto run verifies the first-party surfaces and returns normalized jobs from the requisitions api
- Bajaj Auto fails closed when the verified careers page, bundle, api contracts, or detail shell drift
- getScraperCatalog includes Bajaj Electricals on the verified official page backed by Darwinbox
- buildScrapers and company coverage resolve Bajaj Electricals without aliases
- Bajaj Electricals scraper keeps the verified official Darwinbox pointer explicit and fails closed on drift
- run maps Bajaj Electricals Darwinbox listings into Jobverify jobs and keeps only India roles
- Bajaj Finserv local catalog captures the verified first-party PeopleStrong handoff surface
- Bajaj Finserv exact backlog name matches from the local provider contract without aliases
- buildScrapers and company coverage resolve Bajaj Finserv from the shared catalog
- getScraperCatalog includes Bajaj Finserv Health as a PeopleStrong script provider
- buildScrapers exposes a runnable Bajaj Finserv Health scraper without changing the runner contract
- buildApiUrl keeps Bajaj Finserv Health on the public PeopleStrong jobs feed
- extractSearchResults returns no jobs when the live Bajaj Finserv Health PeopleStrong feed is empty
- run posts the empty search body to Bajaj Finserv Health PeopleStrong and decorates shared runner fields
- Bajaj Finserv scraper keeps the verified PeopleStrong handoff explicit and pinned to the live public API contract
- extractSearchResults maps public Bajaj Finserv PeopleStrong listing fields
- run verifies the known Bajaj Finserv handoff before replaying the public PeopleStrong API
- Bajaj Finserv scraper fails closed when the verified handoff or public portal shell drifts
- getScraperCatalog includes Bajaj Housing Finance as a verified no-public-careers surface
- buildScrapers and company coverage resolve Bajaj Housing Finance without aliases
- Bajaj Housing Finance verifies the homepage and sitemap while keeping common careers routes absent
- Bajaj Housing Finance returns an honest zero-job result while no public careers surface is exposed
- Bajaj Housing Finance fails closed if the sitemap starts exposing a careers route
- getScraperCatalog includes Bajaj Markets on the verified official page backed by Darwinbox
- buildScrapers and company coverage resolve Bajaj Markets without aliases
- Bajaj Markets scraper keeps the verified official Darwinbox handoff explicit and fails closed on drift
- run maps Bajaj Markets Darwinbox listings into Jobverify jobs and keeps only India roles
- run preserves the verified Bajaj Markets Darwinbox board while the official careers page shows branded maintenance copy
- run can recover the official Bajaj Markets careers handoff with a browser-backed HTML fetch
- Bajaj validator signals accept the current public title and canonical variants from Saturday, July 25, 2026
- Canva helpers stay pinned to the verified first-party jobs board contract
- Canva run paginates the official first-party jobs board and keeps only India roles
- Canva fails closed when the verified jobs surface or first-party job URLs change
- getScraperCatalog includes Cars24 as a verified first-party jobs-api scraper
- buildScrapers and company coverage resolve Cars24 from the shared catalog
- Cars24 verifies the official first-party careers surfaces and extracts India jobs from the public jobs feed
- Cars24 run scrapes the verified first-party jobs API and enriches jobs from the official detail route
- Cars24 keeps listing-level jobs when transient detail API rate limits block enrichment
- Cars24 fails closed when the verified careers shell or public API contracts change

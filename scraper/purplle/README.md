The adapter verifies Purplle's official careers handoff, exact LinkedIn employer identity and reciprocal domain, then reconciles listing and detail role IDs, titles, canonical URLs, locations and active same-role application controls.

Captured native responses contain nine validated active details before a rate limit: six explicitly identify India and three say Mumbai Metropolitan Region. The exact observed metro label qualifies under the existing public location policy. Those three countries remain null through normalization; their city maps to Mumbai, with no inferred region. Original native card dates are preserved. Foreign or composite metro labels do not qualify.

Missing descriptions remain eligible after the other checks pass. Newly introduced country/date/expiry carriers, including hidden metadata, require contract review. Known dates still pass the unchanged age gate. Native unknown countries are never replaced with the provider's India target.

The latest live probe verified careers and employer pages, then received HTTP429 on native job search and stopped without retry. The nine-job result is verified by replaying prior captured native responses; it is not a current live inventory claim. Whole-company totals and country completeness remain unknown, listingComplete=false, and lifecycle cleanup is disabled.

Run `node --test scraper/purplle/script.test.js scraper/purplle/native.test.js scraper/purplle/transport.test.js scraper/purplle/cityPolicy.test.js` from the backend directory. Verification needs no database writes or application submissions.

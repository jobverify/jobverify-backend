Backend API and service tests live in this folder.

- Keep HTTP/controller, middleware, utility, and service tests under `test/`.
- Keep shared scraper engine tests, scraper fixtures, and provider coverage tests under `scraper-support/tests/`.
- Keep company-local scraper tests next to the scraper as `scraper/<company>/script.test.js` when that is easier to maintain.
- Do not reintroduce a top-level `tests/` folder in this repository.

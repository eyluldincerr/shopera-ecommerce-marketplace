# Known limitations and publication checklist

This preparation preserves application code. It does not claim production readiness or resolve all findings from the source audit.

- **Database bootstrap:** missing creation scripts for Store Media and promotion tables prevent guaranteed clean setup.
- **Dashboard scope:** low-stock and top-rated selections use an initial page of up to 100 inventory/product records. They may omit qualifying records in larger stores.
- **Orders:** the list API returns an array; frontend filtering/pagination is client-side.
- **Product saves:** edits synchronize multiple API requests. A later failure may leave earlier operations saved, including intermediate ordering/variant identity changes. Recovery and transaction behavior need further verification.
- **CSV export:** values are quoted, but formula-prefix handling for spreadsheet applications needs hardening before use with untrusted data.
- **Authentication:** the shared frontend stores session values in localStorage. This is existing team infrastructure, not a new security design introduced for the portfolio.
- **Tests:** no browser end-to-end or live SQL Server verification is claimed. Backend in-memory tests cannot prove database-specific behavior.
- **Current backend test failures:** 118 of 120 tests passed during preparation. SecurityHeaders_AddNoSniffAndNoStoreForBearerRequests did not observe the expected `nosniff` header; InsufficientStock_ReturnsSafe409ProblemDetails received `application/json` instead of `application/problem+json`. Application code and tests were preserved unchanged. Diagnose these before claiming an all-green test suite.
- **Design evidence:** Figma exports, process images and screenshots are pending. No substitute designs or metrics have been invented.
- **Publication rights:** confirm permission for team/company code and assets, and confirm supplied team credits. No license is supplied.
- **Sample data:** Admin sample account/store records include contact-style information. Confirm these are fictional or replace them with clearly synthetic examples before publication. Existing test credentials appear to be fixtures, not usable account credentials.
- **Historical notes:** retained detailed API/test documentation may describe earlier contracts. Use current source and the setup guide as the starting point; do not treat historical verification notes as a current test report.

Only the clean portfolio directory is the proposed publication set. The original handoff package is outside that set.

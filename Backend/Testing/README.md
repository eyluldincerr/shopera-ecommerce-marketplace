# Backend verification material

This directory contains manual HTTP requests, SQL checks, image fixtures and expected-result scenarios. No companion ZIP is required: automated tests are already included at [tests/Shopera.Tests](../tests/Shopera.Tests).

Use the current [setup guide](../../docs/SETUP.md) first. A compatible database and externally configured connection string/JWT key are required for manual API checks. Replace request token placeholders with your own local test session and sample IDs with synthetic records from that database. Never publish filled-in credentials or real customer responses.

Run automated tests from the repository root with:

```powershell
dotnet test Backend/tests/Shopera.Tests/Shopera.Tests.csproj
```

The in-memory tests do not establish SQL Server transaction, constraint or row-version behavior. [Test-Matrix.md](Test-Matrix.md) lists expected scenarios, not a fresh pass report. [Verification-Results.md](Verification-Results.md) preserves historical observations and must not be used as the current portfolio validation result. The step-by-step guide is also historical; use current controller contracts if it differs.

Current preparation results are in [PORTFOLIO_PREPARATION.md](../../docs/PORTFOLIO_PREPARATION.md).

# Verification results

> Historical observations from the supplied team package. These results were not rerun or re-dated here. For current preparation checks, see [PORTFOLIO_PREPARATION.md](../../docs/PORTFOLIO_PREPARATION.md).

Prepared on 30 July 2026.

| Check | Result |
| --- | --- |
| Frontend Node test suite | 57 passed, 0 failed |
| Frontend `oxlint` | Passed |
| Frontend Vite production build | Passed; 193 modules transformed |
| Frontend build warning | Main JavaScript chunk exceeds Vite's 500 kB advisory threshold |
| C# structural parsing | 120 `.cs` files parsed; no `ERROR` or `MISSING` syntax nodes |
| Backend xUnit cases present | 29 |
| .NET restore/build/test in this workspace | Not run: .NET SDK is not installed |
| SQL Server integration test in this workspace | Not run: no disposable SQL Server connection was supplied |

The backend ZIP is therefore source-reviewed and structurally parsed, but it
must still be built and its 29 xUnit tests executed on a machine with the .NET
10 SDK. Database behavior must be confirmed against a disposable or approved
development copy of `ECommerceDB_Final`.

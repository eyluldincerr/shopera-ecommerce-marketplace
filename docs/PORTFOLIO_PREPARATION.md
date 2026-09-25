# Local portfolio preparation report

Prepared: 25 September 2026.

## Scope and result

A separate `shopera-ecommerce-marketplace` directory was created within the original package folder. It is the proposed publication root. Do not publish the parent handoff folder.

Deletion commands were rejected by the automatic command policy with “blocked by policy.” Instead of deleting the original package, the portfolio copy excludes the listed artifacts and internal documents. **No original files or folders were removed or modified.** SHA-256 comparison verified all 842 original files unchanged.

The clean copy contains 803 files: 781 copied unchanged, 7 documentation files revised relative to the source package, and 15 additional files (including this report and the manifest). All files were physically created in the separate copy. No Git initialization, commit, push, publication, license addition or application refactor was performed.

Application source, test code, SQL, lockfiles and legitimate project configuration were preserved byte-for-byte. Original folder paths remain intact to preserve imports and project references. The empty Admin development environment file was preserved and is covered by the root environment ignore rules.

## Every excluded directory

These directories and their contents were not copied:

- `Backend/.vs/`
- `Backend/bin/`
- `Backend/obj/`
- `Backend/tests/Shopera.Tests/bin/`
- `Backend/tests/Shopera.Tests/obj/`

There were no original node_modules, frontend dist or Git directories to copy. The list below includes every one of the 54 excluded files, including files inside the directories above.

## Every excluded file

- `Backend/.vs/ProjectEvaluation/shopera.metadata.v10.bin`
- `Backend/.vs/ProjectEvaluation/shopera.projects.v10.bin`
- `Backend/.vs/ProjectEvaluation/shopera.strings.v10.bin`
- `Backend/.vs/Shopera.slnx/DesignTimeBuild/.dtbcache.v2`
- `Backend/.vs/Shopera.slnx/FileContentIndex/1ef1946c-3b4d-4238-8f18-5631dc78c6c7.vsidx`
- `Backend/.vs/Shopera.slnx/v18/.futdcache.v2`
- `Backend/.vs/Shopera.slnx/v18/.suo`
- `Backend/.vs/Shopera.slnx/v18/DocumentLayout.json`
- `Backend/AUTH-AND-STORE-VALIDATION-FIX.md`
- `Backend/BACKEND_REPAIR_NOTES.md`
- `Backend/BUILD_AND_DEPLOYMENT_CHECKLIST.md`
- `Backend/FRIEND-AUTH-PROFILE-MERGE-AUDIT.md`
- `Backend/FRIEND_MERGE_AUDIT.md`
- `Backend/IMPLEMENTATION_COMPLETE_SUMMARY.md`
- `Backend/MERGE_AND_RUN.md`
- `Backend/PRODUCT_IMAGE_IMPLEMENTATION.md`
- `Backend/README_IMAGE_IMPLEMENTATION.md`
- `Backend/Shopera.csproj.user`
- `Backend/obj/Debug/net10.0/.NETCoreApp,Version=v10.0.AssemblyAttributes.cs`
- `Backend/obj/Debug/net10.0/Shopera.AssemblyInfo.cs`
- `Backend/obj/Debug/net10.0/Shopera.AssemblyInfoInputs.cache`
- `Backend/obj/Debug/net10.0/Shopera.GeneratedMSBuildEditorConfig.editorconfig`
- `Backend/obj/Debug/net10.0/Shopera.GlobalUsings.g.cs`
- `Backend/obj/Debug/net10.0/Shopera.assets.cache`
- `Backend/obj/Debug/net10.0/Shopera.csproj.AssemblyReference.cache`
- `Backend/obj/Debug/net10.0/rpswa.dswa.cache.json`
- `Backend/obj/Debug/net10.0/staticwebassets.removed.txt`
- `Backend/obj/Shopera.csproj.nuget.dgspec.json`
- `Backend/obj/Shopera.csproj.nuget.g.props`
- `Backend/obj/Shopera.csproj.nuget.g.targets`
- `Backend/obj/project.assets.json`
- `Backend/obj/project.nuget.cache`
- `Backend/structure.txt`
- `Backend/tests/Shopera.Tests/bin/Debug/net10.0/.msCoverageSourceRootsMapping_Shopera.Tests`
- `Backend/tests/Shopera.Tests/bin/Debug/net10.0/CoverletSourceRootsMapping_Shopera.Tests`
- `Backend/tests/Shopera.Tests/obj/Debug/net10.0/.NETCoreApp,Version=v10.0.AssemblyAttributes.cs`
- `Backend/tests/Shopera.Tests/obj/Debug/net10.0/Shopera.Tests.AssemblyInfo.cs`
- `Backend/tests/Shopera.Tests/obj/Debug/net10.0/Shopera.Tests.AssemblyInfoInputs.cache`
- `Backend/tests/Shopera.Tests/obj/Debug/net10.0/Shopera.Tests.GeneratedMSBuildEditorConfig.editorconfig`
- `Backend/tests/Shopera.Tests/obj/Debug/net10.0/Shopera.Tests.GlobalUsings.g.cs`
- `Backend/tests/Shopera.Tests/obj/Debug/net10.0/Shopera.Tests.assets.cache`
- `Backend/tests/Shopera.Tests/obj/Debug/net10.0/Shopera.Tests.csproj.AssemblyReference.cache`
- `Backend/tests/Shopera.Tests/obj/Shopera.Tests.csproj.nuget.dgspec.json`
- `Backend/tests/Shopera.Tests/obj/Shopera.Tests.csproj.nuget.g.props`
- `Backend/tests/Shopera.Tests/obj/Shopera.Tests.csproj.nuget.g.targets`
- `Backend/tests/Shopera.Tests/obj/project.assets.json`
- `Backend/tests/Shopera.Tests/obj/project.nuget.cache`
- `BuyerSeller-Frontend/Ecommerce-Frontend/FRONTEND-AUTH-PROFILE-COMPLETION.md`
- `BuyerSeller-Frontend/Ecommerce-Frontend/IMAGE-DISPLAY-HOTFIX.md`
- `BuyerSeller-Frontend/Ecommerce-Frontend/INSTALL-JWT-FRONTEND.md`
- `BuyerSeller-Frontend/Ecommerce-Frontend/SHOPERA-FRONTEND-BINARY-IMAGE-CONNECTION.md`
- `BuyerSeller-Frontend/Ecommerce-Frontend/STEP-1-SELLER-PRODUCT-INVENTORY.md`
- `README_COMPANY_HANDOFF.md`
- `SOURCE_PACKAGE_MANIFEST.txt`

## Every added file relative to the original package

- `.gitignore`
- `MY_CONTRIBUTION.md`
- `README.md`
- `design/README.md`
- `design/branding/README.md`
- `design/branding/shopera-logo-admin.png`
- `design/branding/shopera-logo-marketplace.png`
- `design/design-to-code/README.md`
- `design/figma-exports/README.md`
- `design/process/README.md`
- `docs/FILE_MANIFEST.md`
- `docs/KNOWN_LIMITATIONS.md`
- `docs/PORTFOLIO_PREPARATION.md`
- `docs/SETUP.md`
- `docs/screenshots/README.md`

The two logo exports were copied unchanged and named by their source application. Their SHA-256 hashes are identical; they are not separate light/dark variants. No new logo design, Figma asset or screenshot was invented.

## Every revised file relative to the original package

- `Admin-Frontend/Admin-shopera/README.md`
- `Backend/README.md`
- `Backend/Testing/README.md`
- `Backend/Testing/Step-by-Step-Product-Store-API.md`
- `Backend/Testing/Verification-Results.md`
- `BuyerSeller-Frontend/Ecommerce-Frontend/README.md`
- `BuyerSeller-Frontend/Ecommerce-Frontend/my-app/README.md`

Revisions replace starter/outdated overviews, preserve team credits and label historical test/learning notes. They do not invent or re-date project history.

## Final structure

```text
shopera-ecommerce-marketplace/
├── README.md
├── MY_CONTRIBUTION.md
├── .gitignore
├── design/
│   ├── README.md
│   ├── branding/
│   │   ├── README.md
│   │   ├── shopera-logo-marketplace.png
│   │   └── shopera-logo-admin.png
│   ├── figma-exports/README.md
│   ├── process/README.md
│   └── design-to-code/README.md
├── docs/
│   ├── SETUP.md
│   ├── KNOWN_LIMITATIONS.md
│   ├── PORTFOLIO_PREPARATION.md
│   ├── FILE_MANIFEST.md
│   └── screenshots/README.md
├── BuyerSeller-Frontend/
│   └── Ecommerce-Frontend/
│       ├── README.md
│       └── my-app/
│           ├── src/
│           ├── public/
│           ├── test/
│           ├── docs/
│           └── package/configuration files
├── Admin-Frontend/
│   └── Admin-shopera/
│       ├── src/
│       ├── public/
│       ├── database/
│       ├── test/
│       ├── tests/
│       └── package/configuration files
└── Backend/
    ├── Common/
    ├── Configuration/
    ├── Data/
    ├── Database/
    ├── Domain/
    ├── Features/
    ├── Properties/
    ├── Testing/
    ├── tests/
    └── project/configuration files
```

[FILE_MANIFEST.md](FILE_MANIFEST.md) lists every file in the clean copy and its classification.

## Checks performed

Builds and tests ran in a separate temporary validation copy outside the publication directory. Dependency installation and builds did not add artifacts to the portfolio copy. No live database was connected or modified.

Environment: Windows, Node 24.18.0, .NET SDK 10.0.400. Frontend dependencies were installed with `npm ci --no-audit --no-fund`; this was not a dependency-vulnerability audit.

| Check | Result |
| --- | --- |
| Buyer/Seller dependency install | Passed |
| Buyer/Seller `npm run build` | Passed; 266 modules transformed |
| Buyer/Seller `npm test` | 208 passed; 0 failed |
| Buyer/Seller `npm run lint` | Exit 0; 3 warnings |
| Admin dependency install | Passed |
| Admin `npm run build` | Passed; 2,451 modules transformed |
| Admin `npm test` | 64 passed; 0 failed |
| Admin `npm run lint` | Exit 0; 3 warnings |
| Backend `dotnet build Shopera.csproj` | Passed; 0 warnings and 0 errors |
| Backend `dotnet test tests/Shopera.Tests/Shopera.Tests.csproj` | 118 passed; 2 failed; 0 skipped |
| Static relative JS/JSX/CSS imports/references | 956 checked; no missing targets |
| Original package hash verification | All 842 original files unchanged |
| Copied application source/config/lockfile verification | Unchanged from supplied package |
| Clean-copy artifact inventory | No Git, dependency, IDE or build-output directories |

Both frontend linters reported two unnecessary slash-escape warnings in their Vite configuration. Buyer/Seller additionally reported a Fast Refresh export warning in PromotionContext; Admin reported the equivalent warning in PromotionCard. The Buyer/Seller build reported two third-party SignalR pure-annotation warnings. Both builds included plugin-timing advisories. No application or dependency changes were made to hide these warnings.

### Backend failures

1. `SecurityHardeningTests.SecurityHeaders_AddNoSniffAndNoStoreForBearerRequests`: expected `X-Content-Type-Options: nosniff`; actual header value was null. The middleware uses an OnStarting callback and the test uses DefaultHttpContext. Further investigation should distinguish test-host lifecycle behavior from live middleware behavior; no production conclusion is claimed from this test alone.
2. `GlobalExceptionHandlerTests.InsufficientStock_ReturnsSafe409ProblemDetails`: expected content type starting with `application/problem+json`; actual value was `application/json; charset=utf-8`. The handler sets the content type before WriteAsJsonAsync, which is relevant to the mismatch.

These failures occur with the supplied backend source and tests unchanged. They remain unresolved because this stage is portfolio preparation, not an application repair pass.

## Remaining before publication

- Confirm permission for team/company source and assets and verify public team credits.
- Confirm Admin sample contact data is synthetic or replace it.
- Obtain missing authoritative database creation scripts; fresh database setup remains incomplete.
- Diagnose the two backend test failures and retain honest status reporting.
- Supply original Figma exports and real screenshots; obtain an alternate-background logo export if needed.
- Review CSV formula handling, multi-request product-save recovery and dashboard aggregation limits as documented in [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md).
- Recheck the final publication set for secrets. The source audit found no obvious live credentials, but no guarantee is made about external resources or future additions.

No license has been added. Awaiting owner review before any further publication action.


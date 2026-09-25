# Setup and verification

## Current limitation

The repository is not a complete fresh-database bootstrap package. The [base schema](../Admin-Frontend/Admin-shopera/database/final_physical_database_sqlserver_updated.sql) and [incremental scripts](../Backend/Database) do not provide creation scripts for every mapped table. In particular, creation scripts for `STORE_MEDIA`, `PROMOTION_PLAN` and `PROMOTION_CAMPAIGN` are missing. The [schema verification script](../Backend/Database/verify-commerce-schema.sql) checks required schema; it does not create it.

Do not substitute invented tables or run schema creation scripts over populated databases. A compatible development database must be supplied or the missing authoritative scripts recovered before complete startup can be verified.

## Frontend commands

Use a Node.js version compatible with the locked Vite dependencies (Node 24 was available during portfolio preparation). From the repository root:

```powershell
cd BuyerSeller-Frontend/Ecommerce-Frontend/my-app
npm ci
npm run dev
```

The existing Vite development proxy forwards `/api` and `/hubs` to `https://localhost:7169`. It accepts the local development certificate. Frontend startup alone does not supply authenticated Seller data.

For the supporting Admin application, in another terminal:

```powershell
cd Admin-Frontend/Admin-shopera
npm ci
npm run dev
```

Each frontend also provides `npm run build`, `npm run lint` and `npm test`. Retain the package lockfiles and use `npm ci` for reproducible dependency installation.

## Backend prerequisites and commands

Requires .NET 10 SDK, SQL Server, a compatible schema and local development configuration. The project does not supply a populated connection string or JWT signing key.

With a compatible database available, configure `ConnectionStrings:DefaultConnection` and `Jwt:Key` through .NET user-secrets or environment variables. Use your own local values; do not place them in source-controlled files. The backend requires a JWT signing key of at least 32 characters. A trusted ASP.NET HTTPS development certificate is needed for the default HTTPS profile.

```powershell
cd Backend
dotnet restore Shopera.csproj
dotnet build Shopera.csproj --no-restore
dotnet run --project Shopera.csproj --launch-profile https
```

These are supported commands, not a claim that the missing database setup is solved. Provisioning sample accounts, approvals, products and orders is not automated by this preparation. Do not use real customer data for demonstrations.

## Tests

```powershell
dotnet test Backend/tests/Shopera.Tests/Shopera.Tests.csproj
```

Backend tests use EF's in-memory provider. Passing them does not validate SQL Server schema, uniqueness constraints, transactions or row-version behavior. Frontend tests include service/utility tests and source-structure assertions; they are not a substitute for browser workflow testing.

Current preparation results are recorded in [PORTFOLIO_PREPARATION.md](PORTFOLIO_PREPARATION.md). Original manual test notes describe scenarios and earlier observations, not fresh verification of this portfolio copy.

# Shopera backend

Supporting team API for Shopera, built with ASP.NET Core / .NET 10, Entity Framework Core and SQL Server. Seller integration uses the Seller Products, Stores and Analytics features alongside shared Orders, Identity and Notifications functionality.

Original backend team credits: Ehsan, Keymanesh and Maaz. Backend inclusion is not a claim of sole authorship by the portfolio owner.

See the [portfolio overview](../README.md), [contribution boundaries](../MY_CONTRIBUTION.md), [setup guide](../docs/SETUP.md) and [known limitations](../docs/KNOWN_LIMITATIONS.md).

The database bootstrap is incomplete. The supplied SQL lacks creation scripts for some mapped tables; do not infer that a fresh database can run all features. Configure secrets externally, and never apply schema creation scripts over populated data.

Manual scenarios are in [Testing](Testing/README.md). Automated tests are in [tests/Shopera.Tests](tests/Shopera.Tests); they use an in-memory database and do not prove SQL Server behavior.

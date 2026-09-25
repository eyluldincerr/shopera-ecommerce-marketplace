using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Shopera.Data;

namespace Shopera.Tests.Support
{
    internal sealed class TestDatabase : IAsyncDisposable
    {
        public TestDatabase()
        {
            var options =
                new DbContextOptionsBuilder<
                    ApplicationDbContext>()
                    .UseInMemoryDatabase(
                        $"ShoperaTests-{Guid.NewGuid()}")
                    .ConfigureWarnings(warnings =>
                        warnings.Ignore(
                            InMemoryEventId
                                .TransactionIgnoredWarning))
                    .Options;

            Context = new ApplicationDbContext(options);
        }

        public ApplicationDbContext Context { get; }

        public async ValueTask DisposeAsync()
        {
            await Context.DisposeAsync();
        }
    }
}

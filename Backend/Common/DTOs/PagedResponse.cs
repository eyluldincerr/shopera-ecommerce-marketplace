namespace Shopera.Common.DTOs
{
    public sealed class PagedResponse<T>
    {
        public PagedResponse(
            IReadOnlyList<T> items,
            int page,
            int pageSize,
            int totalCount)
        {
            Items = items;
            Page = page;
            PageSize = pageSize;
            TotalCount = totalCount;
        }

        public IReadOnlyList<T> Items { get; }

        public int Page { get; }

        public int PageSize { get; }

        public int TotalCount { get; }

        public int TotalPages =>
            TotalCount == 0
                ? 0
                : (int)Math.Ceiling(
                    TotalCount / (double)PageSize);
    }
}

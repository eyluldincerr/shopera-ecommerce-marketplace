namespace Shopera.Common.DTOs
{
    public sealed class ApiErrorResponse
    {
        public ApiErrorResponse(
            string code,
            string message)
        {
            Code = code;
            Message = message;
        }

        public string Code { get; }

        public string Message { get; }
    }
}

namespace Shopera.Features.Admin.Models
{
    public sealed class AdminServiceResult<T>
    {
        private AdminServiceResult(
            bool succeeded,
            T? value,
            string? errorCode,
            string? errorMessage)
        {
            Succeeded = succeeded;
            Value = value;
            ErrorCode = errorCode;
            ErrorMessage = errorMessage;
        }

        public bool Succeeded { get; }

        public T? Value { get; }

        public string? ErrorCode { get; }

        public string? ErrorMessage { get; }

        public static AdminServiceResult<T> Success(T value)
        {
            return new AdminServiceResult<T>(
                true,
                value,
                null,
                null);
        }

        public static AdminServiceResult<T> Failure(
            string errorCode,
            string errorMessage)
        {
            return new AdminServiceResult<T>(
                false,
                default,
                errorCode,
                errorMessage);
        }
    }
}

namespace Shopera.Common.Models
{
    public sealed class ServiceResult<T>
    {
        private ServiceResult(
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

        public static ServiceResult<T> Success(T value)
        {
            return new ServiceResult<T>(
                true,
                value,
                null,
                null);
        }

        public static ServiceResult<T> Failure(
            string errorCode,
            string errorMessage)
        {
            return new ServiceResult<T>(
                false,
                default,
                errorCode,
                errorMessage);
        }
    }
}

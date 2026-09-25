namespace Shopera.Common.Exceptions;

public class RequestConflictException : Exception
{
    public RequestConflictException(
        string code,
        string publicMessage,
        IReadOnlyDictionary<string, object?>? extensions = null,
        Exception? innerException = null)
        : base(publicMessage, innerException)
    {
        Code = code;
        PublicMessage = publicMessage;
        Extensions = extensions ?? new Dictionary<string, object?>();
    }

    public string Code { get; }

    public string PublicMessage { get; }

    public IReadOnlyDictionary<string, object?> Extensions { get; }
}

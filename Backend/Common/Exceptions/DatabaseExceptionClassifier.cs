using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace Shopera.Common.Exceptions;

/// <summary>
/// Classifies only database failures that are safe to interpret as an expected
/// request race/conflict. All other database exceptions must continue to fail
/// as unexpected server errors so infrastructure/programming faults are not hidden.
/// </summary>
public static class DatabaseExceptionClassifier
{
    private const int DuplicateKeyError = 2601;
    private const int UniqueConstraintError = 2627;
    private const int ReferenceConstraintError = 547;

    public static bool IsUniqueConstraintViolation(DbUpdateException exception) =>
        FindSqlException(exception) is { Number: DuplicateKeyError or UniqueConstraintError };

    public static bool IsReferenceConstraintViolation(DbUpdateException exception) =>
        FindSqlException(exception) is { Number: ReferenceConstraintError };

    public static bool MentionsConstraint(DbUpdateException exception, string constraintName)
    {
        if (string.IsNullOrWhiteSpace(constraintName))
        {
            return false;
        }

        SqlException? sqlException = FindSqlException(exception);
        return sqlException is not null &&
               sqlException.Message.Contains(constraintName, StringComparison.OrdinalIgnoreCase);
    }

    private static SqlException? FindSqlException(Exception exception)
    {
        Exception? current = exception;
        while (current is not null)
        {
            if (current is SqlException sqlException)
            {
                return sqlException;
            }

            current = current.InnerException;
        }

        return null;
    }
}

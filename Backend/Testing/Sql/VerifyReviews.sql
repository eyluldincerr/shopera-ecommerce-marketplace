SELECT
    r.ReviewID,
    r.BuyerUserID,
    r.ProductID,
    r.Rating,
    r.Comment,
    r.ReviewDate
FROM dbo.REVIEW AS r
ORDER BY r.ReviewDate DESC, r.ReviewID DESC;

SELECT
    p.ProductID,
    COUNT(r.ReviewID) AS ReviewCount,
    CAST(AVG(CAST(r.Rating AS DECIMAL(10, 2))) AS DECIMAL(10, 2)) AS AverageRating
FROM dbo.PRODUCT AS p
LEFT JOIN dbo.REVIEW AS r ON r.ProductID = p.ProductID
GROUP BY p.ProductID
ORDER BY p.ProductID;

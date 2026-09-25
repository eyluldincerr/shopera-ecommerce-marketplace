/*
    Shopera - Shipment lifecycle verification
    Run against ECommerceDB_Final after testing checkout / Seller fulfillment.

    Expected lifecycle for new orders after Step 4:
      Checkout          -> PENDING
      Seller ships      -> SHIPPED + ShippedDate
      Seller delivers   -> DELIVERED + DeliveredDate
      Buyer cancels PENDING order -> CANCELLED

    This script is read-only. It does not change data.
*/

SELECT TOP (50)
    s.ShipmentID,
    s.OrderID,
    o.OrderNumber,
    o.OrderStatus,
    s.CourierName,
    s.TrackingNumber,
    s.ShipmentStatus,
    s.ShippedDate,
    s.DeliveredDate,
    s.ShippingCost,
    o.ShippingAmount AS OrderShippingAmount
FROM dbo.SHIPMENT AS s
INNER JOIN dbo.CUSTOMER_ORDER AS o
    ON o.OrderID = s.OrderID
ORDER BY s.ShipmentID DESC;

-- Tracking numbers must be unique when they are present.
SELECT
    TrackingNumber,
    COUNT(*) AS DuplicateCount
FROM dbo.SHIPMENT
WHERE TrackingNumber IS NOT NULL
GROUP BY TrackingNumber
HAVING COUNT(*) > 1;

-- Lifecycle/date consistency checks. Expected result: zero rows.
SELECT
    s.ShipmentID,
    s.OrderID,
    o.OrderNumber,
    o.OrderStatus,
    s.ShipmentStatus,
    s.ShippedDate,
    s.DeliveredDate
FROM dbo.SHIPMENT AS s
INNER JOIN dbo.CUSTOMER_ORDER AS o
    ON o.OrderID = s.OrderID
WHERE
    (s.ShipmentStatus = N'SHIPPED' AND s.ShippedDate IS NULL)
    OR (s.ShipmentStatus = N'DELIVERED' AND (s.ShippedDate IS NULL OR s.DeliveredDate IS NULL))
    OR (s.DeliveredDate IS NOT NULL AND s.ShippedDate IS NOT NULL AND s.DeliveredDate < s.ShippedDate)
ORDER BY s.ShipmentID DESC;

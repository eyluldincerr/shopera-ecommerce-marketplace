# Service DTO convention

Service boundaries accept either backend PascalCase DTO fields or frontend
camelCase fields. Mappers convert those inputs to camelCase for application
logic. Existing PascalCase fields may remain as compatibility aliases while
the demo adapter is in use, but identity fields are never inferred from a
different entity type: `productId` and `variantId` stay independent.

export const adminProductsData = [
  {
    productId: 101,
    productName: "Ergonomic Office Chair",
    shortDescription:
      "Adjustable office chair with lumbar support.",
    description:
      "An ergonomic office chair designed for long working hours.",
    brand: "HomePro",
    modelNumber: "HP-CHAIR-01",
    productCondition: "NEW",
    conditionDescription: null,
    status: "ACTIVE",
    createdDate: "2025-05-21T10:30:00",
    storeId: 2,
    categoryId: 4,
  },
  {
    productId: 102,
    productName: "Wireless Gaming Headset",
    shortDescription:
      "Low-latency wireless headset with surround sound.",
    description:
      "A wireless gaming headset designed for PC and console gaming.",
    brand: "GameZone",
    modelNumber: "GZ-HS-200",
    productCondition: "REFURBISHED",
    conditionDescription:
      "Professionally inspected, cleaned and tested. Minor cosmetic marks may be present.",
    status: "ACTIVE",
    createdDate: "2025-05-23T14:15:00",
    storeId: 6,
    categoryId: 2,
  },
  {
    productId: 103,
    productName: "Classic Novel Collection",
    shortDescription:
      "A five-book collection of classic world literature.",
    description:
      "A carefully selected collection of five classic novels.",
    brand: "Book House",
    modelNumber: "BH-CLASSIC-05",
    productCondition: "USED_LIKE_NEW",
    conditionDescription:
      "The books are complete and clean with no writing or missing pages.",
    status: "ACTIVE",
    createdDate: "2025-05-25T09:45:00",
    storeId: 7,
    categoryId: 5,
  },
  {
    productId: 104,
    productName: "Vitamin C Face Serum",
    shortDescription:
      "Brightening facial serum with vitamin C.",
    description:
      "A lightweight facial serum designed for everyday skincare.",
    brand: "Beauty Point",
    modelNumber: "BP-VC-30",
    productCondition: "NEW",
    conditionDescription: null,
    status: "ACTIVE",
    createdDate: "2025-05-27T11:20:00",
    storeId: 8,
    categoryId: 6,
  },
  {
    productId: 105,
    productName: "Wooden Coffee Table",
    shortDescription:
      "Modern wooden coffee table for living rooms.",
    description:
      "A durable coffee table produced from natural wood.",
    brand: "HomePro",
    modelNumber: "HP-TABLE-14",
    productCondition: "NEW",
    conditionDescription: null,
    status: "OUT_OF_STOCK",
    createdDate: "2025-05-29T16:10:00",
    storeId: 2,
    categoryId: 4,
  },
  {
    productId: 106,
    productName: "Decorative Table Lamp",
    shortDescription:
      "Compact decorative lamp for indoor use.",
    description:
      "A discontinued decorative table lamp model.",
    brand: "HomePro",
    modelNumber: "HP-LAMP-03",
    productCondition: "USED_FAIR",
    conditionDescription:
      "The lamp has visible cosmetic wear but remained functional before the listing was discontinued.",
    status: "DELETED",
    createdDate: "2025-04-18T13:30:00",
    storeId: 2,
    categoryId: 3,
  },
];

export const adminProductInfoData = [
  {
    productInfoId: 1,
    productId: 101,
    productDetails: {
      items: [
        {
          title: "Ergonomic support",
          description:
            "Adjustable seat height and lumbar support are designed for long working hours.",
          displayOrder: 1,
        },
        {
          title: "Breathable design",
          description:
            "The breathable backrest supports airflow during daily use.",
          displayOrder: 2,
        },
      ],
    },
    specifications: {
      groups: [
        {
          groupName: "Dimensions and materials",
          items: [
            {
              name: "Maximum Capacity",
              value: "120",
              unit: "kg",
              displayOrder: 1,
            },
            {
              name: "Frame Material",
              value: "Steel",
              unit: null,
              displayOrder: 2,
            },
          ],
        },
      ],
    },
    whatsInTheBox: {
      items: [
        {
          itemName: "Chair Components",
          quantity: 1,
          description:
            "Components required to assemble the chair.",
          displayOrder: 1,
        },
        {
          itemName: "Assembly Tools",
          quantity: 1,
          description:
            "Basic tools required for assembly.",
          displayOrder: 2,
        },
        {
          itemName: "User Manual",
          quantity: 1,
          description:
            "Assembly and usage instructions.",
          displayOrder: 3,
        },
      ],
    },
    warrantyInformation:
      "Two-year manufacturer warranty.",
    returnPolicy:
      "Returnable within 30 days.",
    careInstructions:
      "Clean using a soft, slightly damp cloth.",
    additionalInformation:
      "Assembly is required before first use.",
    createdDate: "2025-05-21T10:30:00",
    updatedDate: null,
  },
  {
    productInfoId: 2,
    productId: 102,
    productDetails: {
      items: [
        {
          title: "Wireless gaming",
          description:
            "Low-latency wireless connection designed for PC and console gaming.",
          displayOrder: 1,
        },
        {
          title: "Detachable microphone",
          description:
            "The microphone can be detached when voice communication is not required.",
          displayOrder: 2,
        },
      ],
    },
    specifications: {
      groups: [
        {
          groupName: "Connectivity",
          items: [
            {
              name: "Wireless Connection",
              value: "2.4",
              unit: "GHz",
              displayOrder: 1,
            },
          ],
        },
        {
          groupName: "Battery",
          items: [
            {
              name: "Battery Life",
              value: "25",
              unit: "hours",
              displayOrder: 1,
            },
          ],
        },
      ],
    },
    whatsInTheBox: {
      items: [
        {
          itemName: "Wireless Headset",
          quantity: 1,
          description:
            "Main gaming headset.",
          displayOrder: 1,
        },
        {
          itemName: "USB Receiver",
          quantity: 1,
          description:
            "Wireless connection receiver.",
          displayOrder: 2,
        },
        {
          itemName: "Charging Cable",
          quantity: 1,
          description:
            "USB charging cable.",
          displayOrder: 3,
        },
        {
          itemName: "Detachable Microphone",
          quantity: 1,
          description:
            "Removable voice microphone.",
          displayOrder: 4,
        },
      ],
    },
    warrantyInformation:
      "One-year manufacturer warranty.",
    returnPolicy:
      "Returnable within 14 days.",
    careInstructions:
      "Keep away from water and excessive heat.",
    additionalInformation:
      "Compatible with Windows, PlayStation and supported consoles.",
    createdDate: "2025-05-23T14:15:00",
    updatedDate: null,
  },
  {
    productInfoId: 3,
    productId: 103,
    productDetails: {
      items: [
        {
          title:
            "Classic literature collection",
          description:
            "Five selected paperback novels are included in one protective collection box.",
          displayOrder: 1,
        },
      ],
    },
    specifications: {
      groups: [
        {
          groupName:
            "Book information",
          items: [
            {
              name: "Language",
              value: "English",
              unit: null,
              displayOrder: 1,
            },
            {
              name: "Binding",
              value: "Paperback",
              unit: null,
              displayOrder: 2,
            },
            {
              name: "Book Count",
              value: "5",
              unit: "books",
              displayOrder: 3,
            },
          ],
        },
      ],
    },
    whatsInTheBox: {
      items: [
        {
          itemName:
            "Paperback Novels",
          quantity: 5,
          description:
            "Five classic novels.",
          displayOrder: 1,
        },
        {
          itemName:
            "Collection Box",
          quantity: 1,
          description:
            "Protective storage box.",
          displayOrder: 2,
        },
      ],
    },
    warrantyInformation: null,
    returnPolicy:
      "Unopened book collections may be returned within 14 days.",
    careInstructions:
      "Store in a dry place away from direct sunlight.",
    additionalInformation: null,
    createdDate:
      "2025-05-25T09:45:00",
    updatedDate: null,
  },
  {
    productInfoId: 4,
    productId: 104,
    productDetails: {
      items: [
        {
          title: "Daily skincare",
          description:
            "A lightweight vitamin C serum designed for daily skincare routines.",
          displayOrder: 1,
        },
        {
          title:
            "Suitable skin types",
          description:
            "The formula is suitable for all skin types.",
          displayOrder: 2,
        },
      ],
    },
    specifications: {
      groups: [
        {
          groupName:
            "Product properties",
          items: [
            {
              name: "Skin Type",
              value: "All skin types",
              unit: null,
              displayOrder: 1,
            },
            {
              name: "Texture",
              value:
                "Lightweight serum",
              unit: null,
              displayOrder: 2,
            },
          ],
        },
      ],
    },
    whatsInTheBox: {
      items: [
        {
          itemName:
            "Vitamin C Serum Bottle",
          quantity: 1,
          description:
            "One skincare serum bottle.",
          displayOrder: 1,
        },
      ],
    },
    warrantyInformation: null,
    returnPolicy:
      "Opened cosmetic products cannot be returned.",
    careInstructions:
      "Store in a cool location away from sunlight.",
    additionalInformation:
      "Perform a patch test before first use.",
    createdDate:
      "2025-05-27T11:20:00",
    updatedDate: null,
  },
  {
    productInfoId: 5,
    productId: 105,
    productDetails: {
      items: [
        {
          title:
            "Natural wood construction",
          description:
            "A modern rectangular coffee table manufactured from natural wood.",
          displayOrder: 1,
        },
        {
          title: "Living room use",
          description:
            "Designed for use in modern living room spaces.",
          displayOrder: 2,
        },
      ],
    },
    specifications: {
      groups: [
        {
          groupName: "Dimensions",
          items: [
            {
              name: "Length",
              value: "110",
              unit: "cm",
              displayOrder: 1,
            },
            {
              name: "Width",
              value: "60",
              unit: "cm",
              displayOrder: 2,
            },
            {
              name: "Height",
              value: "42",
              unit: "cm",
              displayOrder: 3,
            },
          ],
        },
      ],
    },
    whatsInTheBox: {
      items: [
        {
          itemName:
            "Table Components",
          quantity: 1,
          description:
            "Natural wood table components.",
          displayOrder: 1,
        },
        {
          itemName: "Screw Set",
          quantity: 1,
          description:
            "Screws required for assembly.",
          displayOrder: 2,
        },
        {
          itemName:
            "Assembly Guide",
          quantity: 1,
          description:
            "Printed assembly instructions.",
          displayOrder: 3,
        },
      ],
    },
    warrantyInformation:
      "Two-year structural warranty.",
    returnPolicy:
      "Returnable within 30 days.",
    careInstructions:
      "Do not clean using abrasive chemicals.",
    additionalInformation:
      "Natural wood patterns may differ slightly.",
    createdDate:
      "2025-05-29T16:10:00",
    updatedDate: null,
  },
];

export const adminProductImagesData = [
  {
    imageId: 1,
    productId: 101,
    imageUrl:
      "https://placehold.co/600x600?text=Office+Chair",
    altText:
      "Ergonomic office chair",
    displayOrder: 1,
    isPrimary: true,
    createdDate:
      "2025-05-21T10:30:00",
  },
  {
    imageId: 2,
    productId: 101,
    imageUrl:
      "https://placehold.co/600x600?text=Chair+Side",
    altText:
      "Office chair side view",
    displayOrder: 2,
    isPrimary: false,
    createdDate:
      "2025-05-21T10:31:00",
  },
  {
    imageId: 3,
    productId: 102,
    imageUrl:
      "https://placehold.co/600x600?text=Gaming+Headset",
    altText:
      "Wireless gaming headset",
    displayOrder: 1,
    isPrimary: true,
    createdDate:
      "2025-05-23T14:15:00",
  },
  {
    imageId: 4,
    productId: 103,
    imageUrl:
      "https://placehold.co/600x600?text=Novel+Collection",
    altText:
      "Classic novel collection",
    displayOrder: 1,
    isPrimary: true,
    createdDate:
      "2025-05-25T09:45:00",
  },
  {
    imageId: 5,
    productId: 104,
    imageUrl:
      "https://placehold.co/600x600?text=Face+Serum",
    altText:
      "Vitamin C face serum",
    displayOrder: 1,
    isPrimary: true,
    createdDate:
      "2025-05-27T11:20:00",
  },
  {
    imageId: 6,
    productId: 105,
    imageUrl:
      "https://placehold.co/600x600?text=Coffee+Table",
    altText:
      "Wooden coffee table",
    displayOrder: 1,
    isPrimary: true,
    createdDate:
      "2025-05-29T16:10:00",
  },
  {
    imageId: 7,
    productId: 106,
    imageUrl:
      "https://placehold.co/600x600?text=Table+Lamp",
    altText:
      "Decorative table lamp",
    displayOrder: 1,
    isPrimary: true,
    createdDate:
      "2025-04-18T13:30:00",
  },
];

export const adminProductVariantsData = [
  {
    variantId: 1001,
    productId: 101,
    sku: "CHAIR-BLK-001",
    variantName: "Black",
    size: null,
    color: "Black",
    storageCapacity: null,
    price: 249.99,
    costPrice: 158,
    stockQuantity: 24,
    status: "ACTIVE",
    createdDate:
      "2025-05-21T10:35:00",
    rowVersion:
      "0x0000000000000001",
  },
  {
    variantId: 1002,
    productId: 101,
    sku: "CHAIR-GRY-001",
    variantName: "Gray",
    size: null,
    color: "Gray",
    storageCapacity: null,
    price: 249.99,
    costPrice: 158,
    stockQuantity: 0,
    status: "OUT_OF_STOCK",
    createdDate:
      "2025-05-21T10:36:00",
    rowVersion:
      "0x0000000000000002",
  },
  {
    variantId: 1003,
    productId: 102,
    sku: "HEADSET-BLK-200",
    variantName: "Black",
    size: null,
    color: "Black",
    storageCapacity: null,
    price: 89.99,
    costPrice: 54.5,
    stockQuantity: 12,
    status: "ACTIVE",
    createdDate:
      "2025-05-23T14:20:00",
    rowVersion:
      "0x0000000000000003",
  },
  {
    variantId: 1004,
    productId: 102,
    sku: "HEADSET-WHT-200",
    variantName: "White",
    size: null,
    color: "White",
    storageCapacity: null,
    price: 94.99,
    costPrice: 57,
    stockQuantity: 8,
    status: "ACTIVE",
    createdDate:
      "2025-05-23T14:21:00",
    rowVersion:
      "0x0000000000000004",
  },
  {
    variantId: 1005,
    productId: 103,
    sku: "BOOK-CLASSIC-05",
    variantName:
      "Five Book Collection",
    size: null,
    color: null,
    storageCapacity: null,
    price: 44.99,
    costPrice: 23.75,
    stockQuantity: 40,
    status: "ACTIVE",
    createdDate:
      "2025-05-25T09:50:00",
    rowVersion:
      "0x0000000000000005",
  },
  {
    variantId: 1006,
    productId: 104,
    sku: "SERUM-VC-30",
    variantName: "30 ml",
    size: "30 ml",
    color: null,
    storageCapacity: null,
    price: 19.99,
    costPrice: 8.4,
    stockQuantity: 35,
    status: "ACTIVE",
    createdDate:
      "2025-05-27T11:25:00",
    rowVersion:
      "0x0000000000000006",
  },
  {
    variantId: 1007,
    productId: 104,
    sku: "SERUM-VC-50",
    variantName: "50 ml",
    size: "50 ml",
    color: null,
    storageCapacity: null,
    price: 27.99,
    costPrice: 11.6,
    stockQuantity: 18,
    status: "ACTIVE",
    createdDate:
      "2025-05-27T11:26:00",
    rowVersion:
      "0x0000000000000007",
  },
  {
    variantId: 1008,
    productId: 105,
    sku: "TABLE-WALNUT-14",
    variantName: "Walnut",
    size: null,
    color: "Walnut",
    storageCapacity: null,
    price: 189.99,
    costPrice: 112,
    stockQuantity: 0,
    status: "OUT_OF_STOCK",
    createdDate:
      "2025-05-29T16:15:00",
    rowVersion:
      "0x0000000000000008",
  },
  {
    variantId: 1009,
    productId: 105,
    sku: "TABLE-OAK-14",
    variantName: "Oak",
    size: null,
    color: "Oak",
    storageCapacity: null,
    price: 179.99,
    costPrice: 106,
    stockQuantity: 0,
    status: "OUT_OF_STOCK",
    createdDate:
      "2025-05-29T16:16:00",
    rowVersion:
      "0x0000000000000009",
  },
  {
    variantId: 1010,
    productId: 106,
    sku: "LAMP-BEIGE-03",
    variantName: "Beige",
    size: null,
    color: "Beige",
    storageCapacity: null,
    price: 39.99,
    costPrice: 17.5,
    stockQuantity: 0,
    status: "DELETED",
    createdDate:
      "2025-04-18T13:35:00",
    rowVersion:
      "0x000000000000000A",
  },
];
export const CHECKOUT_STEPS = [
  { id: "shipping", number: 1, label: "Shipping", labelKey: "checkout.steps.shipping", path: "/checkout/shipping" },
  { id: "review", number: 2, label: "Review", labelKey: "checkout.steps.review", path: "/checkout/review" },
];

export const shippingFields = [
  { name: "fullName", label: "Full Name", type: "text", required: true, full: true },
  { name: "phone", label: "Phone Number", type: "tel", required: true, full: true },
  { name: "email", label: "E-mail Address", type: "email", required: true, full: true },
  { name: "country", label: "Country", type: "text", required: true },
  { name: "city", label: "City", type: "text", required: true },
  { name: "address", label: "Address", type: "text", required: true, full: true },
  { name: "apartment", label: "Apartment, suits, etc (Optional)", type: "text", required: false, full: true },
  { name: "postalCode", label: "ZIP/Postal Code", type: "text", required: true, full: true },
];

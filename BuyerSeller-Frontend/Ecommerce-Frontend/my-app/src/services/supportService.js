const helpTopics = Object.freeze([
  {
    topicKey: "orders",
    icon: "OS",
    titleKey: "buyer.support.topics.orders.title",
    descriptionKey: "buyer.support.topics.orders.description",
  },
  {
    topicKey: "returns",
    icon: "RR",
    titleKey: "buyer.support.topics.returns.title",
    descriptionKey: "buyer.support.topics.returns.description",
  },
  {
    topicKey: "payments",
    icon: "$",
    titleKey: "buyer.support.topics.payments.title",
    descriptionKey: "buyer.support.topics.payments.description",
  },
  {
    topicKey: "account",
    icon: "AP",
    titleKey: "buyer.support.topics.account.title",
    descriptionKey: "buyer.support.topics.account.description",
  },
  {
    topicKey: "safety",
    icon: "SS",
    titleKey: "buyer.support.topics.safety.title",
    descriptionKey: "buyer.support.topics.safety.description",
  },
  {
    topicKey: "products",
    icon: "PS",
    titleKey: "buyer.support.topics.products.title",
    descriptionKey: "buyer.support.topics.products.description",
  },
]);

const faqs = Object.freeze([
  { faqId: 1, topicKey: "orders", questionKey: "buyer.support.faqs.trackOrder.question", answerKey: "buyer.support.faqs.trackOrder.answer" },
  { faqId: 2, topicKey: "returns", questionKey: "buyer.support.faqs.returnPolicy.question", answerKey: "buyer.support.faqs.returnPolicy.answer" },
  { faqId: 3, topicKey: "orders", questionKey: "buyer.support.faqs.delivery.question", answerKey: "buyer.support.faqs.delivery.answer" },
  { faqId: 4, topicKey: "payments", questionKey: "buyer.support.faqs.payment.question", answerKey: "buyer.support.faqs.payment.answer" },
  { faqId: 5, topicKey: "account", questionKey: "buyer.support.faqs.phone.question", answerKey: "buyer.support.faqs.phone.answer" },
  { faqId: 6, topicKey: "account", questionKey: "buyer.support.faqs.password.question", answerKey: "buyer.support.faqs.password.answer" },
  { faqId: 7, topicKey: "safety", questionKey: "buyer.support.faqs.paymentSecurity.question", answerKey: "buyer.support.faqs.paymentSecurity.answer" },
  { faqId: 8, topicKey: "products", questionKey: "buyer.support.faqs.contactSeller.question", answerKey: "buyer.support.faqs.contactSeller.answer" },
]);

export const getHelpTopics = async () => helpTopics.map((topic) => ({ ...topic }));
export const getFaqs = async () => faqs.map((faq) => ({ ...faq }));

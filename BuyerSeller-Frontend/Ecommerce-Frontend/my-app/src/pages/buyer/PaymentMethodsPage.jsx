import { useTranslation } from "react-i18next";

import BuyerAccountLayout from "../../components/account/BuyerAccountLayout";

function PaymentMethodsPage() {
  const { t } = useTranslation();

  return (
    <BuyerAccountLayout activePath="/account/payment-methods">
      <section className="account-panel" aria-labelledby="payment-methods-title">
        <h1 id="payment-methods-title">{t("buyer.nav.paymentMethods")}</h1>
        <p role="status">{t("buyer.payment.unavailable")}</p>
      </section>
    </BuyerAccountLayout>
  );
}

export default PaymentMethodsPage;

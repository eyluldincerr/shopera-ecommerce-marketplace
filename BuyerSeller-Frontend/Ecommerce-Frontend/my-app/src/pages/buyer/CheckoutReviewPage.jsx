import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "react-router-dom";

import useCart from "../../hooks/useCart";
import { formatCurrency } from "../../utils/formatCurrency";
import {
  formatAddressLine,
  formatLocationLine,
} from "../../components/address/addressUtils";
import {
  CheckoutLayout,
  CheckoutPanel,
} from "./CheckoutLayout";
import {
  clearCheckoutShippingAddress,
  getCheckoutShippingAddress,
  isShippingValid,
  markCheckoutCompletionInProgress,
  submitCheckout,
} from "../../services/checkoutService.js";
import { useCheckoutData } from "../../hooks/useCheckoutData.js";
import { getCommerceConflictMessage } from "../../services/commerceErrorMessages.js";

function CheckoutReviewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const checkoutData = useCheckoutData();
  const { shipping } = checkoutData;
  const {
    cartItems,
    cart,
    subtotal,
    discount,
    total,
    currencyCode,
    appliedCoupon,
    removeCoupon,
    refreshCart,
  } = useCart();
  const shippingAddress = useMemo(() => getCheckoutShippingAddress(), []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const errorRef = useRef(null);

  useEffect(() => {
    if (submitError) {
      errorRef.current?.focus();
    }
  }, [submitError]);

  if (!isShippingValid(shipping)) {
    return <Navigate to="/checkout/shipping" replace />;
  }

  const getSubmitErrorMessage = (error) => {
    const commerceMessage = getCommerceConflictMessage(error, t, "checkout");

    if (commerceMessage) {
      return commerceMessage;
    }

    switch (error?.status) {
      case 400:
        return t("checkout.errors.validation");
      case 401:
        return t("checkout.errors.sessionExpired");
      case 403:
        return t("checkout.errors.buyerRequired");
      case 404:
        return t("checkout.errors.unavailable");
      case 409:
        return t("checkout.errors.conflict");
      default:
        return error?.isNetworkError
          ? t("checkout.errors.network")
          : t("checkout.errors.submit");
    }
  };

  const handlePlaceOrder = async () => {
    if (isSubmitting || !shippingAddress) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const order = await submitCheckout({
        shippingAddress,
        cart,
        couponCode: appliedCoupon?.couponCode,
      });
      const orderPath = markCheckoutCompletionInProgress(order.orderId);

      if (!orderPath) {
        throw new Error("The created order route is unavailable.");
      }

      clearCheckoutShippingAddress();
      removeCoupon();
      navigate(orderPath, {
        replace: true,
        state: { checkoutSuccess: true },
      });
      void refreshCart({ silent: true }).catch(() => {});
    } catch (error) {
      if (error?.status === 409) {
        await refreshCart({ silent: true }).catch(() => {});
      }

      if (String(error?.code || "").startsWith("COUPON_")) {
        removeCoupon();
      }

      setSubmitError(getSubmitErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const currency = currencyCode || cart?.currencyCode || "EUR";

  return (
    <CheckoutLayout
      activeStepId="review"
      checkoutData={checkoutData}
      backPath="/checkout/shipping"
      onPrimary={handlePlaceOrder}
      primaryDisabled={isSubmitting}
      primaryLabel={t(
        isSubmitting ? "checkout.placingOrder" : "checkout.placeOrder"
      )}
    >
      <CheckoutPanel
        title={t("checkout.reviewOrder")}
        subtitle={t("checkout.reviewSubtitle")}
        icon="review"
      >
        <div className="checkout-review">
          {submitError && (
            <p ref={errorRef} tabIndex="-1" role="alert" aria-live="assertive">
              {submitError}
            </p>
          )}
          <section>
            <h2>{t("checkout.shipping")}</h2>
            <p>{shippingAddress?.recipientName}</p>
            <p>
              {shippingAddress
                ? formatAddressLine(shippingAddress)
                : t("checkout.noAddressSelected")}
            </p>
            <p>{shippingAddress ? formatLocationLine(shippingAddress) : ""}</p>
            <p>{shippingAddress?.recipientPhone}</p>
          </section>

          <section className="checkout-review__billing">
            <h2>{t("checkout.billingAddress")}</h2>
            <p>{t("checkout.sameAsShipping")}</p>
          </section>

          <aside className="checkout-info-callout" role="status">
            <span aria-hidden="true">i</span>
            <p>{t("checkout.paymentNotice")}</p>
          </aside>

          <section>
            <h2>{t("checkout.items")}</h2>
            <div className="checkout-review__items">
              {cartItems.map((item) => (
                <div
                  key={item.cartItemId ?? item.variantId}
                  className="checkout-review__item"
                >
                  <span>{item.productName}</span>
                  <strong>
                    {item.quantity}
                    {Number.isFinite(item.unitPrice) && (
                      <>
                        {" \u00D7 "}
                        {formatCurrency(item.unitPrice, currency)}
                      </>
                    )}
                    {Number.isFinite(item.subtotal) && (
                      <>
                        {" \u00B7 "}
                        {formatCurrency(item.subtotal, currency)}
                      </>
                    )}
                  </strong>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2>{t("checkout.totals")}</h2>
            <div className="checkout-review__totals">
              <span>{t("checkout.subtotal")}</span>
              <strong>{formatCurrency(subtotal, currency)}</strong>
            </div>
            {appliedCoupon && discount > 0 && (
              <div className="checkout-review__totals">
                <span>
                  {t("checkout.coupon")} ({appliedCoupon.couponCode})
                </span>
                <strong>-{formatCurrency(discount, currency)}</strong>
              </div>
            )}
            <div className="checkout-review__totals">
              <span>{t("checkout.shipping")}</span>
              <strong>{t("checkout.free")}</strong>
            </div>
            <div className="checkout-review__totals">
              <span>{t("checkout.total")}</span>
              <strong>{formatCurrency(total, currency)}</strong>
            </div>
          </section>
        </div>
      </CheckoutPanel>
    </CheckoutLayout>
  );
}

export default CheckoutReviewPage;

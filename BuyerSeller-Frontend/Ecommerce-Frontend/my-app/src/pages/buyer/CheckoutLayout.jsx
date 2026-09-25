import { Link } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import Navbar from "../../components/layout/Navbar";
import useCart from "../../hooks/useCart";
import { formatCurrency } from "../../utils/formatCurrency";
import { CHECKOUT_STEPS } from "../../constants/checkout.js";
import { isShippingValid } from "../../services/checkoutService.js";

function CheckoutStepLink({ step, activeStepId, canOpenStep }) {
  const { t } = useTranslation();
  const activeStepIndex = CHECKOUT_STEPS.findIndex(
    (currentStep) => currentStep.id === activeStepId
  );
  const stepIndex = CHECKOUT_STEPS.findIndex(
    (currentStep) => currentStep.id === step.id
  );
  const isActive = step.id === activeStepId;
  const isComplete = stepIndex < activeStepIndex;
  const className = `checkout-step${isActive ? " checkout-step--active" : ""}${
    isComplete ? " checkout-step--complete" : ""
  }`;

  if (!canOpenStep(step.id)) {
    return (
      <button type="button" className={className} disabled>
        <span>{step.number}</span>
        <strong>{t(step.labelKey, { defaultValue: step.label })}</strong>
      </button>
    );
  }

  return (
    <Link to={step.path} className={className}>
      <span>{step.number}</span>
      <strong>{t(step.labelKey, { defaultValue: step.label })}</strong>
    </Link>
  );
}

export function CheckoutEmpty({ title, message }) {
  const { t } = useTranslation();
  return (
    <>
      <Navbar />
      <main className="checkout-page">
        <div className="container checkout-empty">
          <h1>{title}</h1>
          <p>{message}</p>
          <Link to="/" className="checkout-empty__link">
            {t("checkout.continueShopping")}
          </Link>
        </div>
      </main>
    </>
  );
}

function OrderSummary({
  message,
  onPrimary,
  primaryLabel,
  backPath,
  primaryDisabled = false,
}) {
  const { t } = useTranslation();
  const {
    cartItems,
    cartCount,
    subtotal,
    discount,
    total,
    currencyCode,
    appliedCoupon,
  } = useCart();
  const currency = currencyCode || "EUR";

  return (
    <aside className="checkout-summary" aria-labelledby="summary-title">
      <h2 id="summary-title">{t("checkout.orderSummary")}</h2>

      <div className="checkout-summary__items">
        {cartItems.map((item) => (
          <article className="checkout-summary__item" key={item.cartItemId ?? item.variantId}>
            <div className="checkout-summary__image">
              {item.image ? (
                <img src={item.image} alt={item.productName} />
              ) : (
                <span>{t("checkout.product")}</span>
              )}
            </div>

            <div>
              <h3>{item.productName}</h3>
              {Number.isFinite(item.unitPrice) && (
                <p>{formatCurrency(item.unitPrice, currency)}</p>
              )}
              <small>{t("checkout.quantity", { count: item.quantity })}</small>
            </div>

            {Number.isFinite(item.subtotal) && (
              <strong>{formatCurrency(item.subtotal, currency)}</strong>
            )}
          </article>
        ))}
      </div>

      <div className="checkout-summary__totals">
        <div>
          <span>{t("checkout.subtotal")}</span>
          <strong>{formatCurrency(subtotal, currency)}</strong>
        </div>
        {appliedCoupon && discount > 0 && (
          <div>
            <span>{t("checkout.coupon")} ({appliedCoupon.couponCode})</span>
            <strong>-{formatCurrency(discount, currency)}</strong>
          </div>
        )}
        <div>
          <span>{t("checkout.shipping")}</span>
          <strong>{t("checkout.free")}</strong>
        </div>
        <div>
          <span>{t("checkout.total")}</span>
          <strong>{formatCurrency(total, currency)}</strong>
        </div>
      </div>

      <p className="checkout-summary__count">
        {t("checkout.cartCount", { count: cartCount })}
      </p>

      {message && (
        <p className="checkout-message checkout-message--summary" role="alert">
          {message}
        </p>
      )}

      <div className="checkout-actions">
        {backPath && (
          <Link to={backPath} className="checkout-actions__back">
            {t("checkout.back")}
          </Link>
        )}

        {primaryLabel && (
          <button
            type="button"
            className="checkout-actions__primary"
            onClick={onPrimary}
            disabled={primaryDisabled}
          >
            {primaryLabel}
          </button>
        )}
      </div>
    </aside>
  );
}

export function CheckoutLayout({
  activeStepId,
  checkoutData,
  children,
  message,
  onPrimary,
  primaryLabel,
  backPath,
  primaryDisabled,
}) {
  const { t } = useTranslation();
  const { cartItems } = useCart();
  const { shipping } = checkoutData;

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [activeStepId]);

  const canOpenStep = (stepId) => {
    if (stepId === "shipping") {
      return true;
    }

    return isShippingValid(shipping);
  };

  if (cartItems.length === 0) {
    return (
      <CheckoutEmpty
        title={t("checkout.emptyTitle")}
        message={t("checkout.emptyMessage")}
      />
    );
  }

  return (
    <>
      <Navbar />

      <main className="checkout-page">
        <div
          className="container checkout-steps"
          aria-label={t("checkout.progress")}
        >
          {CHECKOUT_STEPS.map((step) => (
            <CheckoutStepLink
              key={step.id}
              step={step}
              activeStepId={activeStepId}
              canOpenStep={canOpenStep}
            />
          ))}
        </div>

        <div className="container checkout-layout">
          <div className="checkout-main">{children}</div>

          <OrderSummary
            message={message}
            onPrimary={onPrimary}
            primaryLabel={primaryLabel}
            backPath={backPath}
            primaryDisabled={primaryDisabled}
          />
        </div>
      </main>
    </>
  );
}

export function CheckoutPanel({ title, subtitle, icon, headerAction, children }) {
  return (
    <section
      className={`checkout-panel checkout-panel--${icon}`}
      aria-labelledby={`${icon}-title`}
    >
      <div className="checkout-panel__header">
        <span
          className={`checkout-panel__icon checkout-panel__icon--${icon}`}
          aria-hidden="true"
        />
        <div>
          <h1 id={`${icon}-title`}>{title}</h1>
          <p>{subtitle}</p>
        </div>

        {headerAction}
      </div>

      {children}
    </section>
  );
}

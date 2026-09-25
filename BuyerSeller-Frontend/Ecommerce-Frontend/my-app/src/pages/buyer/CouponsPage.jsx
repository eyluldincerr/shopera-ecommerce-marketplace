import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import BuyerAccountLayout from "../../components/account/BuyerAccountLayout";
import useCart from "../../hooks/useCart";
import { getAvailableCoupons } from "../../services/couponService.js";
import { formatCurrency } from "../../utils/formatCurrency";

function CouponsPage() {
  const { t, i18n } = useTranslation();
  const { applyCoupon, openCart } = useCart();
  const [coupons, setCoupons] = useState([]);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [applyingCode, setApplyingCode] = useState("");

  useEffect(() => {
    const loadCoupons = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");
        setCoupons(await getAvailableCoupons());
      } catch (error) {
        setErrorMessage(
          error?.isNetworkError
            ? t("buyer.coupons.networkError")
            : t("buyer.coupons.loadError")
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadCoupons();
  }, [t]);

  const handleCopyCode = async (coupon) => {
    try {
      await navigator.clipboard.writeText(coupon.couponCode);
      setMessage(t("buyer.coupons.copied", { code: coupon.couponCode }));
      setErrorMessage("");
    } catch {
      setErrorMessage(t("buyer.coupons.copyError"));
    }
  };

  const handleApply = async (coupon) => {
    if (applyingCode) {
      return;
    }

    setApplyingCode(coupon.couponCode);
    setMessage("");
    setErrorMessage("");

    try {
      const result = await applyCoupon(coupon.couponCode);

      if (!result?.success) {
        setErrorMessage(result?.message || t("buyer.coupons.applyError"));
        return;
      }

      setMessage(
        t("buyer.coupons.applied", { code: result.coupon.couponCode })
      );
      openCart();
    } finally {
      setApplyingCode("");
    }
  };

  const formatExpiry = (value) => {
    if (!value) {
      return "—";
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? String(value)
      : date.toLocaleDateString(i18n.language || "en");
  };

  const discountLabel = (coupon) =>
    coupon.discountType === "PERCENTAGE"
      ? t("buyer.coupons.percentageOff", { value: coupon.discountValue })
      : t("buyer.coupons.fixedOff", {
          value: formatCurrency(coupon.discountValue, "EUR"),
        });

  return (
    <BuyerAccountLayout activePath="/account/coupons" pageClassName="coupons-page">
      <section className="coupons-content">
        <div className="coupons-header">
          <div>
            <h1>{t("buyer.coupons.title")}</h1>
            <p>{t("buyer.coupons.description")}</p>
          </div>
        </div>

        {message && <div className="profile-alert success">{message}</div>}
        {errorMessage && (
          <div className="profile-alert error" role="alert">
            {errorMessage}
          </div>
        )}

        <div className="coupon-stats">
          <article>
            <span>{t("buyer.coupons.availableCount")}</span>
            <strong>{coupons.length}</strong>
          </article>
          <article>
            <span>{t("buyer.coupons.source")}</span>
            <strong>{t("buyer.coupons.shoperaAdmin")}</strong>
          </article>
          <article>
            <span>{t("buyer.coupons.currency")}</span>
            <strong>EUR</strong>
          </article>
        </div>

        {isLoading ? (
          <div className="profile-loading-card">{t("buyer.coupons.loading")}</div>
        ) : coupons.length === 0 ? (
          <section className="coupons-empty">
            <div className="coupons-empty__icon" aria-hidden="true">
              %
            </div>
            <h2>{t("buyer.coupons.emptyTitle")}</h2>
            <p>{t("buyer.coupons.emptyDescription")}</p>
          </section>
        ) : (
          <div className="coupon-grid">
            {coupons.map((coupon) => (
              <article className="coupon-card coupon-card--active" key={coupon.couponId}>
                <div className="coupon-card__discount">
                  <strong>{discountLabel(coupon)}</strong>
                  <span>{coupon.couponCode}</span>
                </div>

                <div className="coupon-card__body">
                  <div className="coupon-card__top">
                    <h2>{coupon.couponCode}</h2>
                    <span className="coupon-badge coupon-badge--active">
                      {t("buyer.coupons.active")}
                    </span>
                  </div>

                  <p>{t("buyer.coupons.backendValidated")}</p>

                  <dl className="coupon-card__meta">
                    <div>
                      <dt>{t("buyer.coupons.minimumOrder")}</dt>
                      <dd>{formatCurrency(coupon.minPurchaseAmount, "EUR")}</dd>
                    </div>
                    <div>
                      <dt>{t("buyer.coupons.discountType")}</dt>
                      <dd>
                        {coupon.discountType === "PERCENTAGE"
                          ? t("buyer.coupons.percentage")
                          : t("buyer.coupons.fixedAmount")}
                      </dd>
                    </div>
                    <div>
                      <dt>{t("buyer.coupons.expires")}</dt>
                      <dd>{formatExpiry(coupon.expiryDate)}</dd>
                    </div>
                  </dl>

                  <div className="coupon-card__actions">
                    <button type="button" onClick={() => handleCopyCode(coupon)}>
                      {t("buyer.coupons.copyCode")}
                    </button>
                    <button
                      type="button"
                      className="coupon-card__checkout-button"
                      onClick={() => handleApply(coupon)}
                      disabled={Boolean(applyingCode)}
                    >
                      {applyingCode === coupon.couponCode
                        ? t("buyer.coupons.applying")
                        : t("buyer.coupons.applyToCart")}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </BuyerAccountLayout>
  );
}

export default CouponsPage;

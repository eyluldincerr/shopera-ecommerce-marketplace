import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";

import {
  isValidPassword,
  resetPassword,
} from "../../services/authService.js";
import { getAuthFlowErrorMessageKey } from "./authFlowError.js";
import shoperaLogo from "../../assets/logo.png";

function ResetPasswordPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState(searchParams.get("token") || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorKey, setErrorKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!token.trim()) {
      setErrorKey("auth.recovery.tokenRequired");
      return;
    }
    if (!isValidPassword(newPassword)) {
      setErrorKey("auth.recovery.weakPassword");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorKey("auth.validation.passwordMismatch");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorKey("");
      await resetPassword({ token, newPassword });
      setNewPassword("");
      setConfirmPassword("");
      setIsComplete(true);
    } catch (error) {
      setErrorKey(
        getAuthFlowErrorMessageKey(error, "auth.recovery.resetFailure")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="signin-page auth-recovery-page">
      <section className="signin-panel" aria-labelledby="reset-title">
        <header className="signin-brand">
          <Link
            to="/"
            className="signin-brand__logo"
            aria-label={t("auth.shoperaHome")}
          >
            <img
              src={shoperaLogo}
              alt=""
              aria-hidden="true"
              className="signin-brand__logo-image"
            />
          </Link>
        </header>

        <div className="signin-content">
          <div className="auth-recovery-icon" aria-hidden="true">&#128274;</div>
          <div className="signin-heading">
            <h1 id="reset-title">{t("auth.recovery.resetTitle")}</h1>
            <p>{t("auth.recovery.resetDescription")}</p>
          </div>

          {isComplete ? (
            <div className="auth-recovery-result" aria-live="polite">
              <p className="auth-message auth-message--success">
                {t("auth.recovery.resetComplete")}
              </p>
              <Link className="signin-submit" to="/login">
                {t("auth.recovery.signInNewPassword")}
              </Link>
            </div>
          ) : (
            <form className="signin-form" onSubmit={handleSubmit} noValidate>
              <label className="signin-field" htmlFor="reset-token">
                <span>{t("auth.recovery.resetToken")}</span>
                <span className="signin-input">
                  <input
                    id="reset-token"
                    type="text"
                    autoComplete="off"
                    value={token}
                    placeholder={t("auth.recovery.tokenPlaceholder")}
                    onChange={(event) => {
                      setToken(event.target.value);
                      setErrorKey("");
                    }}
                  />
                </span>
              </label>

              <label className="signin-field" htmlFor="reset-password">
                <span>{t("auth.recovery.newPassword")}</span>
                <span className="signin-input">
                  <input
                    id="reset-password"
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    placeholder={t("auth.createPasswordPlaceholder")}
                    onChange={(event) => {
                      setNewPassword(event.target.value);
                      setErrorKey("");
                    }}
                  />
                </span>
              </label>

              <label className="signin-field" htmlFor="reset-confirm-password">
                <span>{t("auth.confirmPassword")}</span>
                <span className="signin-input">
                  <input
                    id="reset-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    placeholder={t("auth.confirmPasswordPlaceholder")}
                    onChange={(event) => {
                      setConfirmPassword(event.target.value);
                      setErrorKey("");
                    }}
                  />
                </span>
              </label>

              {errorKey && (
                <p className="auth-message" role="alert">{t(errorKey)}</p>
              )}

              <button
                type="submit"
                className="signin-submit"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? t("auth.recovery.resetting")
                  : t("auth.recovery.resetPassword")}
              </button>
              <Link className="auth-recovery-back" to="/login">
                {t("auth.recovery.backToSignIn")}
              </Link>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}

export default ResetPasswordPage;

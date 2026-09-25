import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { requestPasswordReset } from "../../services/authService.js";
import { getAuthFlowErrorMessageKey } from "./authFlowError.js";
import shoperaLogo from "../../assets/logo.png";

function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [result, setResult] = useState(null);
  const [errorKey, setErrorKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorKey("auth.validation.emailInvalid");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorKey("");
      setResult(await requestPasswordReset({ email }));
    } catch (error) {
      setErrorKey(
        getAuthFlowErrorMessageKey(error, "auth.recovery.requestFailure")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const developmentResetPath = result?.developmentResetToken
    ? `/reset-password?token=${encodeURIComponent(
        result.developmentResetToken
      )}`
    : "";

  return (
    <main className="signin-page auth-recovery-page">
      <section className="signin-panel" aria-labelledby="recovery-title">
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
          <div className="auth-recovery-icon" aria-hidden="true">?</div>
          <div className="signin-heading">
            <h1 id="recovery-title">{t("auth.recovery.forgotTitle")}</h1>
            <p>{t("auth.recovery.forgotDescription")}</p>
          </div>

          {result ? (
            <div className="auth-recovery-result" aria-live="polite">
              <p className="auth-message auth-message--success">
                {t("auth.recovery.requestAccepted")}
              </p>
              {developmentResetPath && (
                <Link className="signin-submit" to={developmentResetPath}>
                  {t("auth.recovery.continueReset")}
                </Link>
              )}
              <Link className="auth-recovery-back" to="/login">
                {t("auth.recovery.backToSignIn")}
              </Link>
            </div>
          ) : (
            <form className="signin-form" onSubmit={handleSubmit} noValidate>
              <label className="signin-field" htmlFor="recovery-email">
                <span>{t("auth.email")}</span>
                <span className="signin-input">
                  <span aria-hidden="true">@</span>
                  <input
                    id="recovery-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    placeholder={t("auth.emailPlaceholder")}
                    onChange={(event) => {
                      setEmail(event.target.value);
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
                  ? t("auth.recovery.sending")
                  : t("auth.recovery.sendInstructions")}
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

export default ForgotPasswordPage;

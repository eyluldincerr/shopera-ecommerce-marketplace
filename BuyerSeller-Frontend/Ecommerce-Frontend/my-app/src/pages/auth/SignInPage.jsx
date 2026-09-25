import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { getSafeRedirectPath, loginUser } from "../../services/authService";
import shoperaLogo from "../../assets/logo.png";
import { getSignInErrorMessageKey } from "./signInError.js";

function SignInPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const routeMessage = location.state?.messageKey
    ? t(location.state.messageKey)
    : location.state?.message;

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      setErrorMessage("");

      const { session } = await loginUser({ email, password });
      const redirectPath = getSafeRedirectPath(location.state?.from, session.role);

      navigate(redirectPath, { replace: true });
    } catch (error) {
      setErrorMessage(t(getSignInErrorMessageKey(error)));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="signin-page">
      <section className="signin-panel" aria-labelledby="signin-title">
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
          <div className="signin-shield" aria-hidden="true">
            <svg viewBox="0 0 72 84" role="img">
              <path
                d="M36 5 63 15v21c0 18.6-10.9 33.3-27 42.5C19.9 69.3 9 54.6 9 36V15L36 5Z"
                fill="none"
                stroke="url(#shieldGradient)"
                strokeWidth="7"
                strokeLinejoin="round"
              />
              <rect
                x="24"
                y="35"
                width="24"
                height="22"
                rx="5"
                fill="#714dff"
              />
              <path
                d="M29.5 35v-5.2a6.5 6.5 0 0 1 13 0V35"
                fill="none"
                stroke="#ffffff"
                strokeWidth="3.8"
                strokeLinecap="round"
              />
              <defs>
                <linearGradient
                  id="shieldGradient"
                  x1="8"
                  y1="10"
                  x2="64"
                  y2="70"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#ff7a35" />
                  <stop offset="0.46" stopColor="#8b46ff" />
                  <stop offset="1" stopColor="#10bfd3" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <div className="signin-heading">
            <h1 id="signin-title">{t("auth.welcomeBack")}</h1>
            <p>{t("auth.signInContinue")}</p>
          </div>

          <form className="signin-form" onSubmit={handleSubmit}>
            <label className="signin-field">
              <span>{t("auth.email")}</span>
              <span className="signin-input">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M4.5 6.5h15a1.8 1.8 0 0 1 1.8 1.8v9.4a1.8 1.8 0 0 1-1.8 1.8h-15a1.8 1.8 0 0 1-1.8-1.8V8.3a1.8 1.8 0 0 1 1.8-1.8Z"
                    fill="none"
                    stroke="url(#mailGradient)"
                    strokeWidth="1.9"
                  />
                  <path
                    d="m4 8 8 5.6L20 8"
                    fill="none"
                    stroke="url(#mailGradient)"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.9"
                  />
                  <defs>
                    <linearGradient id="mailGradient" x1="3" y1="6" x2="21" y2="19">
                      <stop stopColor="#ff7a35" />
                      <stop offset="0.5" stopColor="#8b46ff" />
                      <stop offset="1" stopColor="#10bfd3" />
                    </linearGradient>
                  </defs>
                </svg>
                <input
                  type="email"
                  placeholder={t("auth.emailPlaceholder")}
                  autoComplete="email"
                  value={email}
                  required
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setErrorMessage("");
                  }}
                />
              </span>
            </label>

            <label className="signin-field">
              <span>{t("auth.password")}</span>
              <span className="signin-input">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect
                    x="5"
                    y="10"
                    width="14"
                    height="10"
                    rx="2.2"
                    fill="none"
                    stroke="url(#lockGradient)"
                    strokeWidth="1.9"
                  />
                  <path
                    d="M8.2 10V7.7a3.8 3.8 0 0 1 7.6 0V10"
                    fill="none"
                    stroke="url(#lockGradient)"
                    strokeLinecap="round"
                    strokeWidth="1.9"
                  />
                  <defs>
                    <linearGradient id="lockGradient" x1="5" y1="4" x2="19" y2="20">
                      <stop stopColor="#ff7a35" />
                      <stop offset="0.5" stopColor="#8b46ff" />
                      <stop offset="1" stopColor="#10bfd3" />
                    </linearGradient>
                  </defs>
                </svg>
                <input
                  type={isPasswordVisible ? "text" : "password"}
                  placeholder={t("auth.passwordPlaceholder")}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setErrorMessage("");
                  }}
                />
                <button
                  type="button"
                  className="signin-input__icon"
                  aria-label={
                    isPasswordVisible
                      ? t("auth.hidePassword")
                      : t("auth.showPassword")
                  }
                  onClick={() => setIsPasswordVisible((currentValue) => !currentValue)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M3.5 12s3-5 8.5-5 8.5 5 8.5 5-3 5-8.5 5-8.5-5-8.5-5Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="2.7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                  </svg>
                </button>
              </span>
            </label>

            <Link className="signin-forgot" to="/forgot-password">
              {t("auth.forgotPassword")}
            </Link>

            {routeMessage && (
              <p className="auth-message">{routeMessage}</p>
            )}

            {errorMessage && (
              <p className="auth-message" role="alert">
                {errorMessage}
              </p>
            )}

            <button type="submit" className="signin-submit" disabled={isSubmitting}>
              {isSubmitting ? t("auth.signingIn") : t("auth.signIn")}
            </button>
          </form>


          <p className="signin-signup">
            {t("auth.noAccount")}
            <Link to="/register">{t("auth.createAccount")}</Link>
          </p>
        </div>
      </section>
    </main>
  );
}

export default SignInPage;

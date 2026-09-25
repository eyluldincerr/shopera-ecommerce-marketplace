import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, Link } from "react-router-dom";
import { getSafeRedirectPath, registerUser } from "../../services/authService";
import shoperaLogo from "../../assets/logo.png";

const initialForm = {
  fullName: "",
  email: "",
  phoneNumber: "",
  role: "Buyer",
  password: "",
  confirmPassword: "",
  acceptedTerms: false,
};

function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((previousForm) => ({
      ...previousForm,
      [name]: type === "checkbox" ? checked : value,
    }));

    setErrors((previousErrors) => ({
      ...previousErrors,
      [name]: "",
    }));

    setServerError("");
  };

  const selectRole = (role) => {
    setForm((previousForm) => ({
      ...previousForm,
      role,
    }));
  };

  const validateForm = () => {
    const validationErrors = {};

    if (!form.fullName.trim()) {
      validationErrors.fullName = t("auth.validation.fullNameRequired");
    } else if (form.fullName.trim().length < 3) {
      validationErrors.fullName = t("auth.validation.fullNameLength");
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!form.email.trim()) {
      validationErrors.email = t("auth.validation.emailRequired");
    } else if (!emailPattern.test(form.email.trim())) {
      validationErrors.email = t("auth.validation.emailInvalid");
    }

    const phonePattern =
      /^(\+90|0)?\s?5[0-9]{2}\s?[0-9]{3}\s?[0-9]{2}\s?[0-9]{2}$/;

    if (!form.phoneNumber.trim()) {
      validationErrors.phoneNumber = t("auth.validation.phoneRequired");
    } else if (!phonePattern.test(form.phoneNumber.trim())) {
      validationErrors.phoneNumber = t("auth.validation.phoneInvalid");
    }

    if (!["Buyer", "Seller"].includes(form.role)) {
      validationErrors.role = t("auth.validation.role");
    }

    if (!form.password) {
      validationErrors.password = t("auth.validation.passwordRequired");
    } else if (form.password.length < 8) {
      validationErrors.password = t("auth.validation.passwordLength");
    } else if (!/[A-Z]/.test(form.password)) {
      validationErrors.password = t("auth.validation.passwordUppercase");
    } else if (!/[a-z]/.test(form.password)) {
      validationErrors.password = t("auth.validation.passwordLowercase");
    } else if (!/[0-9]/.test(form.password)) {
      validationErrors.password = t("auth.validation.passwordNumber");
    }

    if (!form.confirmPassword) {
      validationErrors.confirmPassword = t("auth.validation.confirmPassword");
    } else if (form.password !== form.confirmPassword) {
      validationErrors.confirmPassword = t("auth.validation.passwordMismatch");
    }

    if (!form.acceptedTerms) {
      validationErrors.acceptedTerms = t("auth.validation.terms");
    }

    return validationErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationErrors = validateForm();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      setServerError("");

      const registrationData = {
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        phoneNumber: form.phoneNumber.trim(),
        password: form.password,
        role: form.role,
      };

      const { session } = await registerUser(registrationData);

      navigate(getSafeRedirectPath("", session.role), { replace: true });
    } catch (error) {
      const message = error.message || t("auth.registrationFailed");

      setServerError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="register-page">
      <section className="register-card">
        <Link
          to="/"
          className="register-logo"
          aria-label={t("auth.shoperaHome")}
        >
          <img
            src={shoperaLogo}
            alt=""
            aria-hidden="true"
            className="register-logo__image"
          />
        </Link>

        <div className="register-heading">
          <div className="profile-icon">◉</div>
          <h1>{t("auth.createYourAccount")}</h1>
          <p>{t("auth.chooseAccountType")}</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <fieldset className="role-section">
            <legend>{t("auth.accountType")}</legend>

            <div className="role-options">
              <button
                type="button"
                className={`role-card ${
                  form.role === "Buyer" ? "role-card-active" : ""
                }`}
                onClick={() => selectRole("Buyer")}
                aria-pressed={form.role === "Buyer"}
              >
                <span className="role-card-icon">🛍️</span>

                <span>
                  <strong>{t("auth.buyer")}</strong>
                  <small>{t("auth.buyerDescription")}</small>
                </span>
              </button>

              <button
                type="button"
                className={`role-card ${
                  form.role === "Seller" ? "role-card-active" : ""
                }`}
                onClick={() => selectRole("Seller")}
                aria-pressed={form.role === "Seller"}
              >
                <span className="role-card-icon">🏪</span>

                <span>
                  <strong>{t("auth.seller")}</strong>
                  <small>{t("auth.sellerDescription")}</small>
                </span>
              </button>
            </div>

            {errors.role && <p className="field-error">{errors.role}</p>}
          </fieldset>

          <div className="form-group">
            <label htmlFor="fullName">{t("auth.fullName")}</label>

            <input
              id="fullName"
              name="fullName"
              type="text"
              value={form.fullName}
              onChange={handleChange}
              placeholder={t("auth.fullNamePlaceholder")}
              autoComplete="name"
              className={errors.fullName ? "input-error" : ""}
            />

            {errors.fullName && (
              <p className="field-error">{errors.fullName}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="email">{t("auth.email")}</label>

            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder={t("auth.emailPlaceholder")}
              autoComplete="email"
              className={errors.email ? "input-error" : ""}
            />

            {errors.email && <p className="field-error">{errors.email}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="phoneNumber">{t("auth.phone")}</label>

            <input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              value={form.phoneNumber}
              onChange={handleChange}
              placeholder="+90 533 123 45 67"
              autoComplete="tel"
              className={errors.phoneNumber ? "input-error" : ""}
            />
            {errors.phoneNumber && (
              <p className="field-error">{errors.phoneNumber}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">{t("auth.password")}</label>

            <div className="password-input">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={handleChange}
                placeholder={t("auth.createPasswordPlaceholder")}
                autoComplete="new-password"
                className={errors.password ? "input-error" : ""}
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={
                  showPassword
                    ? t("auth.hidePassword")
                    : t("auth.showPassword")
                }
              >
                {showPassword ? t("auth.hide") : t("auth.show")}
              </button>
            </div>

            <small className="password-help">
              {t("auth.passwordHelp")}
            </small>

            {errors.password && (
              <p className="field-error">{errors.password}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">
              {t("auth.confirmPassword")}
            </label>

            <div className="password-input">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder={t("auth.confirmPasswordPlaceholder")}
                autoComplete="new-password"
                className={errors.confirmPassword ? "input-error" : ""}
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowConfirmPassword((current) => !current)
                }
                aria-label={
                  showConfirmPassword
                    ? t("auth.hideConfirmedPassword")
                    : t("auth.showConfirmedPassword")
                }
              >
                {showConfirmPassword ? t("auth.hide") : t("auth.show")}
              </button>
            </div>

            {errors.confirmPassword && (
              <p className="field-error">{errors.confirmPassword}</p>
            )}
          </div>

          <div className="terms-row">
            <input
              id="acceptedTerms"
              name="acceptedTerms"
              type="checkbox"
              checked={form.acceptedTerms}
              onChange={handleChange}
            />

            <label htmlFor="acceptedTerms">
              {t("auth.agreePrefix")}{" "}
              <span className="register-legal-text">{t("auth.terms")}</span>{" "}
              {t("auth.and")}{" "}
              <span className="register-legal-text">{t("auth.privacy")}</span>.
            </label>
          </div>

          {errors.acceptedTerms && (
            <p className="field-error">{errors.acceptedTerms}</p>
          )}

          {serverError && (
            <div className="server-error" role="alert">
              {serverError}
            </div>
          )}

          <button
            type="submit"
            className="register-button"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? t("auth.creatingAccount")
              : t("auth.createAccount")}
          </button>


          <p className="login-text">
            {t("auth.haveAccount")}{" "}
            <Link to="/login">{t("auth.signIn")}</Link>
          </p>
        </form>
      </section>
    </main>
  );
}

export default RegisterPage;

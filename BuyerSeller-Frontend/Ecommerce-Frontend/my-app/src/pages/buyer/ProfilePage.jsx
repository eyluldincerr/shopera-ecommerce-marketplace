import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import BuyerAccountLayout from "../../components/account/BuyerAccountLayout";
import SellerPageShell from "../../components/layout/seller/SellerPageShell";
import useAuthSession from "../../hooks/useAuthSession.js";
import { getAuthFlowErrorMessageKey } from "../auth/authFlowError.js";
import {
  changeMyPassword,
  getMyProfile,
  updateMyProfile,
} from "../../services/accountService";

const initialProfileForm = {
  fullName: "",
  email: "",
  phoneNumber: "",
  role: "",
};

const initialPasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

function ProfileShell({ profile, children }) {
  const session = useAuthSession();

  if (session?.role === "Seller") {
    return (
      <SellerPageShell>
        <div className="profile-page profile-page--seller">
          <section className="profile-content">{children}</section>
        </div>
      </SellerPageShell>
    );
  }

  return (
    <BuyerAccountLayout activePath="/account/profile" profile={profile}>
      {children}
    </BuyerAccountLayout>
  );
}

function ProfilePage() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState(initialProfileForm);
  const [profileForm, setProfileForm] = useState(initialProfileForm);
  const [passwordForm, setPasswordForm] = useState(initialPasswordForm);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [profileErrors, setProfileErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});
  const [successKey, setSuccessKey] = useState("");
  const [errorKey, setErrorKey] = useState("");

  const loadProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadFailed(false);
      setErrorKey("");
      const data = await getMyProfile();
      const normalizedData = {
        ...initialProfileForm,
        ...data,
        phoneNumber: data.phoneNumber || "",
      };

      setProfile(normalizedData);
      setProfileForm(normalizedData);
    } catch (error) {
      setLoadFailed(true);
      setErrorKey(
        getAuthFlowErrorMessageKey(
          error,
          "accountProfile.errors.loadFailure"
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const clearMessages = () => {
    setSuccessKey("");
    setErrorKey("");
  };

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfileForm((current) => ({ ...current, [name]: value }));
    setProfileErrors((current) => ({ ...current, [name]: "" }));
    clearMessages();
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((current) => ({ ...current, [name]: value }));
    setPasswordErrors((current) => ({ ...current, [name]: "" }));
    clearMessages();
  };

  const validateProfile = () => {
    const errors = {};
    const fullName = profileForm.fullName.trim();
    const phoneNumber = profileForm.phoneNumber.trim();

    if (!fullName) {
      errors.fullName = "accountProfile.validation.fullNameRequired";
    } else if (fullName.length < 3 || fullName.length > 150) {
      errors.fullName = "accountProfile.validation.fullNameLength";
    }

    if (
      phoneNumber &&
      (phoneNumber.length > 30 ||
        !/^\+?[0-9][0-9 ()-]{5,28}[0-9]$/.test(phoneNumber))
    ) {
      errors.phoneNumber = "accountProfile.validation.phoneInvalid";
    }

    return errors;
  };

  const validatePassword = () => {
    const errors = {};

    if (!passwordForm.currentPassword) {
      errors.currentPassword =
        "accountProfile.validation.currentPasswordRequired";
    }
    if (!passwordForm.newPassword) {
      errors.newPassword = "accountProfile.validation.newPasswordRequired";
    } else if (
      passwordForm.newPassword.length < 8 ||
      !/[A-Z]/.test(passwordForm.newPassword) ||
      !/[a-z]/.test(passwordForm.newPassword) ||
      !/[0-9]/.test(passwordForm.newPassword)
    ) {
      errors.newPassword = "accountProfile.errors.weakPassword";
    } else if (
      passwordForm.currentPassword &&
      passwordForm.currentPassword === passwordForm.newPassword
    ) {
      errors.newPassword = "accountProfile.errors.passwordReuse";
    }

    if (!passwordForm.confirmPassword) {
      errors.confirmPassword =
        "accountProfile.validation.confirmPasswordRequired";
    } else if (
      passwordForm.newPassword !== passwordForm.confirmPassword
    ) {
      errors.confirmPassword = "auth.validation.passwordMismatch";
    }

    return errors;
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    const errors = validateProfile();

    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      return;
    }

    try {
      setIsSavingProfile(true);
      clearMessages();
      const updatedProfile = await updateMyProfile({
        fullName: profileForm.fullName.trim(),
        phoneNumber: profileForm.phoneNumber.trim(),
      });

      setProfile(updatedProfile);
      setProfileForm(updatedProfile);
      setSuccessKey("accountProfile.profileUpdated");
    } catch (error) {
      setErrorKey(
        getAuthFlowErrorMessageKey(
          error,
          "accountProfile.errors.updateFailure"
        )
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSavePassword = async (event) => {
    event.preventDefault();
    const errors = validatePassword();

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    try {
      setIsSavingPassword(true);
      clearMessages();
      await changeMyPassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      });
      setPasswordForm(initialPasswordForm);
      setSuccessKey("accountProfile.passwordChanged");
    } catch (error) {
      setErrorKey(
        getAuthFlowErrorMessageKey(
          error,
          "accountProfile.errors.passwordFailure"
        )
      );
    } finally {
      setIsSavingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <ProfileShell profile={profile}>
        <div className="profile-loading-card">
          {t("accountProfile.loading")}
        </div>
      </ProfileShell>
    );
  }

  if (loadFailed) {
    return (
      <ProfileShell profile={profile}>
        <div className="profile-loading-card" role="alert">
          <p>{t(errorKey)}</p>
          <button type="button" onClick={loadProfile}>
            {t("common.retry")}
          </button>
        </div>
      </ProfileShell>
    );
  }

  return (
    <ProfileShell profile={profile}>
      <div className="profile-page-header">
        <div>
          <h1>{t("accountProfile.title")}</h1>
          <p>{t("accountProfile.description")}</p>
        </div>
        <span className="profile-role-badge">
          {profile.role || t("navbar.myAccount")}
        </span>
      </div>

      {successKey && (
        <div className="profile-alert success" role="status">
          {t(successKey)}
        </div>
      )}
      {errorKey && (
        <div className="profile-alert error" role="alert">
          {t(errorKey)}
        </div>
      )}

      <div className="profile-grid">
        <section className="profile-card profile-main-card">
          <div className="profile-card-title">
            <h2>{t("accountProfile.personalInformation")}</h2>
            <p>{t("accountProfile.personalDescription")}</p>
          </div>

          <form onSubmit={handleSaveProfile} className="profile-form" noValidate>
            <div className="profile-form-group">
              <label htmlFor="fullName">{t("auth.fullName")}</label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                maxLength="150"
                autoComplete="name"
                value={profileForm.fullName}
                onChange={handleProfileChange}
                placeholder={t("auth.fullNamePlaceholder")}
                aria-invalid={Boolean(profileErrors.fullName)}
              />
              {profileErrors.fullName && (
                <p className="profile-field-error">
                  {t(profileErrors.fullName)}
                </p>
              )}
            </div>

            <div className="profile-form-group">
              <label htmlFor="phoneNumber">{t("auth.phone")}</label>
              <input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                maxLength="30"
                autoComplete="tel"
                value={profileForm.phoneNumber}
                onChange={handleProfileChange}
                placeholder={t("accountProfile.phonePlaceholder")}
                aria-invalid={Boolean(profileErrors.phoneNumber)}
              />
              {profileErrors.phoneNumber && (
                <p className="profile-field-error">
                  {t(profileErrors.phoneNumber)}
                </p>
              )}
            </div>

            <div className="profile-actions">
              <button
                type="button"
                onClick={() => {
                  setProfileForm(profile);
                  setProfileErrors({});
                  clearMessages();
                }}
              >
                {t("common.cancel")}
              </button>
              <button type="submit" disabled={isSavingProfile}>
                {isSavingProfile
                  ? t("accountProfile.saving")
                  : t("common.saveChanges")}
              </button>
            </div>
          </form>
        </section>

        <section className="profile-card profile-email-card">
          <div className="profile-card-title">
            <h2>{t("accountProfile.accountEmail")}</h2>
            <p>{t("accountProfile.emailImmutable")}</p>
          </div>
          <div className="profile-form-group">
            <label htmlFor="email">{t("auth.email")}</label>
            <input
              id="email"
              type="email"
              value={profileForm.email}
              disabled
              readOnly
            />
          </div>
        </section>

        <section className="profile-card profile-security-card">
          <div className="profile-card-title">
            <h2>{t("accountProfile.security")}</h2>
            <p>{t("accountProfile.securityDescription")}</p>
          </div>

          <form onSubmit={handleSavePassword} className="profile-form" noValidate>
            {[
              ["currentPassword", "accountProfile.currentPassword", "current-password"],
              ["newPassword", "auth.recovery.newPassword", "new-password"],
              ["confirmPassword", "auth.confirmPassword", "new-password"],
            ].map(([name, labelKey, autoComplete]) => (
              <div className="profile-form-group" key={name}>
                <label htmlFor={name}>{t(labelKey)}</label>
                <input
                  id={name}
                  name={name}
                  type="password"
                  maxLength="100"
                  autoComplete={autoComplete}
                  value={passwordForm[name]}
                  onChange={handlePasswordChange}
                  aria-invalid={Boolean(passwordErrors[name])}
                />
                {passwordErrors[name] && (
                  <p className="profile-field-error">
                    {t(passwordErrors[name])}
                  </p>
                )}
              </div>
            ))}

            <div className="profile-actions">
              <button
                type="button"
                onClick={() => {
                  setPasswordForm(initialPasswordForm);
                  setPasswordErrors({});
                  clearMessages();
                }}
              >
                {t("common.cancel")}
              </button>
              <button type="submit" disabled={isSavingPassword}>
                {isSavingPassword
                  ? t("accountProfile.updatingPassword")
                  : t("accountProfile.updatePassword")}
              </button>
            </div>
          </form>
        </section>
      </div>
    </ProfileShell>
  );
}

export default ProfilePage;

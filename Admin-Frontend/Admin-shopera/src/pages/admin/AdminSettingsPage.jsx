import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Hash,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import AdminPageHeader from "../../components/admin/AdminPageHeader";
import AdminPageLayout from "../../components/admin/AdminPageLayout";
import AdminStatusBadge from "../../components/admin/AdminStatusBadge";

import {
  getAdminSettingsProfile,
  updateAdminSettingsProfile,
} from "../../api/adminSettingsService";

const initialFormValues = {
  fullName: "",
  email: "",
  phoneNumber: "",
};

const createInitials = (
  fullName
) => {
  const nameParts = String(
    fullName || ""
  )
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (nameParts.length === 0) {
    return "AD";
  }

  return nameParts
    .slice(0, 2)
    .map((namePart) =>
      namePart
        .charAt(0)
        .toUpperCase()
    )
    .join("");
};

function AdminSettingsPage() {
  const [
    profile,
    setProfile,
  ] = useState(null);

  const [
    formValues,
    setFormValues,
  ] = useState(
    initialFormValues
  );

  const [isLoading, setIsLoading] =
    useState(true);

  const [
    isProcessing,
    setIsProcessing,
  ] = useState(false);

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  useEffect(() => {
    const loadProfile =
      async () => {
        try {
          setIsLoading(true);
          setErrorMessage("");

          const loadedProfile =
            await getAdminSettingsProfile();

          setProfile(
            loadedProfile
          );

          setFormValues({
            fullName:
              loadedProfile
                ?.fullName || "",

            email:
              loadedProfile
                ?.email || "",

            phoneNumber:
              loadedProfile
                ?.phoneNumber || "",
          });
        } catch (error) {
          console.error(
            "Administrator profile could not be loaded:",
            error
          );

          setErrorMessage(
            error.message ||
              "Administrator profile could not be loaded."
          );
        } finally {
          setIsLoading(false);
        }
      };

    loadProfile();
  }, []);

  const hasChanges =
    useMemo(() => {
      if (!profile) {
        return false;
      }

      return (
        formValues.fullName.trim() !==
          String(
            profile.fullName || ""
          ).trim() ||
        formValues.phoneNumber.trim() !==
          String(
            profile.phoneNumber ||
              ""
          ).trim()
      );
    }, [
      formValues,
      profile,
    ]);

  const handleInputChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setFormValues(
      (currentValues) => ({
        ...currentValues,
        [name]: value,
      })
    );

    setSuccessMessage("");
    setErrorMessage("");
  };

  const handleSave = async (
    event
  ) => {
    event.preventDefault();

    if (
      isProcessing ||
      !hasChanges
    ) {
      return;
    }

    const normalizedFullName =
      formValues.fullName.trim();

    const normalizedPhoneNumber =
      formValues.phoneNumber.trim();

    if (!normalizedFullName) {
      setErrorMessage(
        "Full name is required."
      );

      return;
    }

    if (
      normalizedFullName.length >
      150
    ) {
      setErrorMessage(
        "Full name cannot exceed 150 characters."
      );

      return;
    }

    if (
      normalizedPhoneNumber.length >
      30
    ) {
      setErrorMessage(
        "Phone number cannot exceed 30 characters."
      );

      return;
    }

    try {
      setIsProcessing(true);
      setSuccessMessage("");
      setErrorMessage("");

      const updatedProfile =
        await updateAdminSettingsProfile({
          fullName:
            normalizedFullName,

          phoneNumber:
            normalizedPhoneNumber,
        });

      setProfile(
        updatedProfile
      );

      setFormValues({
        fullName:
          updatedProfile.fullName ||
          "",

        email:
          updatedProfile.email ||
          "",

        phoneNumber:
          updatedProfile.phoneNumber ||
          "",
      });

      window.dispatchEvent(
        new CustomEvent("admin-profile-updated", {
          detail: updatedProfile,
        })
      );

      window.dispatchEvent(
        new Event(
          "admin-data-updated"
        )
      );

      setSuccessMessage(
        "Administrator profile was updated successfully."
      );
    } catch (error) {
      console.error(
        "Administrator profile could not be updated:",
        error
      );

      setErrorMessage(
        error.message ||
          "Administrator profile could not be updated."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <AdminPageLayout>
        <AdminPageHeader
          title="Settings"
          description="Manage the current administrator account information."
        />

        <div className="admin-page-loading">
          Loading administrator
          settings...
        </div>
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Settings"
        description="Manage your administrator profile details."
      />

      {successMessage && (
        <div className="admin-page-notice admin-page-notice-success">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="admin-page-notice admin-page-notice-error">
          {errorMessage}
        </div>
      )}

      {profile ? (
        <section className="admin-settings-grid">
          <article className="admin-settings-card">
            <div className="admin-settings-card-header">
              <div>
                <UserRound
                  size={19}
                />

                <div>
                  <h2>
                    Administrator
                    Profile
                  </h2>

                  <p>
                    Update editable
                    administrator profile fields.
                  </p>
                </div>
              </div>
            </div>

            <div className="admin-settings-profile-summary">
              <div className="admin-settings-avatar">
                {createInitials(
                  profile.fullName
                )}
              </div>

              <div>
                <strong>
                  {profile.fullName ||
                    "Unnamed administrator"}
                </strong>

                <span>
                  {profile.email ||
                    "Email unavailable"}
                </span>

                <div className="admin-settings-profile-badges">
                  <AdminStatusBadge
                    status={
                      profile.role
                    }
                  />

                  <AdminStatusBadge
                    status={
                      profile.accountStatus
                    }
                  />

                </div>
              </div>
            </div>

            <form
              className="admin-settings-form"
              onSubmit={handleSave}
            >
              <div className="admin-settings-form-group">
                <label htmlFor="admin-settings-full-name">
                  Full name
                </label>

                <div className="admin-settings-input-wrapper">
                  <UserRound
                    size={17}
                  />

                  <input
                    id="admin-settings-full-name"
                    name="fullName"
                    type="text"
                    value={
                      formValues.fullName
                    }
                    maxLength={150}
                    disabled={
                      isProcessing
                    }
                    placeholder="Administrator full name"
                    autoComplete="name"
                    onChange={
                      handleInputChange
                    }
                  />
                </div>

                <small>
                  {
                    formValues
                      .fullName
                      .length
                  }
                  /150
                </small>
              </div>

              <div className="admin-settings-form-group">
                <label htmlFor="admin-settings-email">
                  Email address
                </label>

                <div className="admin-settings-input-wrapper">
                  <Mail size={17} />

                  <input
                    id="admin-settings-email"
                    name="email"
                    type="email"
                    value={
                      formValues.email
                    }
                    maxLength={255}
                    readOnly
                    disabled={isProcessing}
                    placeholder="administrator@example.com"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="admin-settings-form-group admin-settings-full-width">
                <label htmlFor="admin-settings-phone">
                  Phone number
                </label>

                <div className="admin-settings-input-wrapper">
                  <Phone size={17} />

                  <input
                    id="admin-settings-phone"
                    name="phoneNumber"
                    type="tel"
                    value={
                      formValues.phoneNumber
                    }
                    maxLength={30}
                    disabled={
                      isProcessing
                    }
                    placeholder="Optional phone number"
                    autoComplete="tel"
                    onChange={
                      handleInputChange
                    }
                  />
                </div>
              </div>

              <div className="admin-settings-form-actions admin-settings-full-width">
                <button
                  type="submit"
                  className="admin-settings-save-button"
                  disabled={
                    isProcessing ||
                    !hasChanges
                  }
                >
                  <Save size={16} />

                  {isProcessing
                    ? "Saving..."
                    : "Save Changes"}
                </button>
              </div>
            </form>
          </article>

          <aside className="admin-settings-side-column">
            <article className="admin-settings-card">
              <div className="admin-settings-card-header">
                <div>
                  <ShieldCheck
                    size={19}
                  />

                  <div>
                    <h2>
                      Account Information
                    </h2>

                    <p>
                      Read-only
                      administrator profile fields.
                    </p>
                  </div>
                </div>
              </div>

              <div className="admin-settings-information-list">
                <div>
                  <span>
                    <Hash size={15} />
                    User ID
                  </span>

                  <strong>
                    #{profile.userId}
                  </strong>
                </div>

                <div>
                  <span>
                    <ShieldCheck
                      size={15}
                    />
                    Role
                  </span>

                  <AdminStatusBadge
                    status={
                      profile.role
                    }
                  />
                </div>

                <div>
                  <span>
                    <UserRound
                      size={15}
                    />
                    Account Status
                  </span>

                  <AdminStatusBadge
                    status={
                      profile.accountStatus
                    }
                  />
                </div>

              </div>
            </article>

            <article className="admin-settings-security-note">
              <ShieldCheck
                size={20}
              />

              <div>
                <strong>
                  Protected account data
                </strong>

                <p>
                  PasswordHash is never
                  returned to or displayed
                  by the frontend.
                  Email, role, and account
                  status are read-only on
                  the personal settings page.
                </p>
              </div>
            </article>
          </aside>
        </section>
      ) : (
        <div className="admin-page-notice admin-page-notice-error">
          Administrator profile is
          unavailable.
        </div>
      )}
    </AdminPageLayout>
  );
}

export default AdminSettingsPage;

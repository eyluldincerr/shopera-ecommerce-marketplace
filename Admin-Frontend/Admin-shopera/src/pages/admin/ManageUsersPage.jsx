import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  Eye,
  Search,
  UsersRound,
} from "lucide-react";

import AdminConfirmModal from "../../components/admin/AdminConfirmModal";
import AdminDataTable from "../../components/admin/AdminDataTable";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import AdminPageLayout from "../../components/admin/AdminPageLayout";
import AdminStatusBadge from "../../components/admin/AdminStatusBadge";
import UserDetailsModal from "../../components/admin/UserDetailsModal";

import {
  activateAdminUser,
  deactivateAdminUser,
  getAdminUsers,
  suspendAdminUser,
} from "../../api/adminAccountService";

const initialConfirmationState = {
  isOpen: false,
  action: "",
  user: null,
  title: "",
  message: "",
  confirmLabel: "Confirm",
  variant: "warning",
};

const formatPermissionLevel = (
  permissionLevel
) => {
  if (!permissionLevel) {
    return "—";
  }

  return String(permissionLevel)
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
};

function ManageUsersPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [users, setUsers] =
    useState([]);

  const [
    searchValue,
    setSearchValue,
  ] = useState("");

  const [
    roleFilter,
    setRoleFilter,
  ] = useState("ALL");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("ALL");

  const [
    permissionFilter,
    setPermissionFilter,
  ] = useState("ALL");

  const [
    selectedUser,
    setSelectedUser,
  ] = useState(null);

  const [
    confirmation,
    setConfirmation,
  ] = useState(
    initialConfirmationState
  );

  const [isLoading, setIsLoading] =
    useState(true);

  const [
    isProcessing,
    setIsProcessing,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const loadedUsers =
          await getAdminUsers();

        setUsers(
          Array.isArray(loadedUsers)
            ? loadedUsers
            : []
        );
      } catch (error) {
        console.error(
          "Users could not be loaded:",
          error
        );

        setErrorMessage(
          error.message ||
            "Users could not be loaded."
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadUsers();
  }, []);

  useEffect(() => {
    if (
      isLoading ||
      !location.state
    ) {
      return;
    }

    const selectedUserId =
      Number(
        location.state
          .selectedUserId
      );

    const notificationStatusFilter =
      String(
        location.state
          .statusFilter || ""
      )
        .trim()
        .toUpperCase();

    if (
      notificationStatusFilter
    ) {
      setSearchValue("");
      setRoleFilter("ALL");
      setPermissionFilter("ALL");

      setStatusFilter(
        notificationStatusFilter
      );
    }

    if (selectedUserId) {
      const matchingUser =
        users.find(
          (user) =>
            Number(user.userId) ===
            selectedUserId
        );

      if (matchingUser) {
        setSearchValue("");
        setRoleFilter("ALL");
        setStatusFilter("ALL");
        setPermissionFilter(
          "ALL"
        );

        setSelectedUser(
          matchingUser
        );
      } else {
        setErrorMessage(
          `User account #${selectedUserId} could not be found.`
        );
      }
    }

    navigate(
      location.pathname,
      {
        replace: true,
        state: null,
      }
    );
  }, [
    users,
    isLoading,
    location.pathname,
    location.state,
    navigate,
  ]);

  const filteredUsers =
    useMemo(() => {
      const normalizedSearch =
        searchValue
          .trim()
          .toLowerCase();

      return users.filter(
        (user) => {
          const matchesSearch =
            normalizedSearch ===
              "" ||
            String(
              user.fullName || ""
            )
              .toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            String(
              user.email || ""
            )
              .toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            String(
              user.userId
            ).includes(
              normalizedSearch
            ) ||
            String(
              user.permissionLevel ||
                ""
            )
              .toLowerCase()
              .includes(
                normalizedSearch
              );

          const matchesRole =
            roleFilter === "ALL" ||
            user.databaseRole ===
              roleFilter;

          const matchesStatus =
            statusFilter === "ALL" ||
            user.accountStatus ===
              statusFilter;

          const matchesPermission =
            permissionFilter ===
              "ALL" ||
            user.permissionLevel ===
              permissionFilter;

          return (
            matchesSearch &&
            matchesRole &&
            matchesStatus &&
            matchesPermission
          );
        }
      );
    }, [
      users,
      searchValue,
      roleFilter,
      statusFilter,
      permissionFilter,
    ]);

  const userCounts =
    useMemo(() => {
      return {
        total:
          users.length,

        active:
          users.filter(
            (user) =>
              user.accountStatus ===
              "ACTIVE"
          ).length,

        suspended:
          users.filter(
            (user) =>
              user.accountStatus ===
              "SUSPENDED"
          ).length,

        inactive:
          users.filter(
            (user) =>
              user.accountStatus ===
              "INACTIVE"
          ).length,

        administrators:
          users.filter(
            (user) =>
              user.databaseRole ===
              "ADMIN"
          ).length,
      };
    }, [users]);

  const closeConfirmation =
    () => {
      if (!isProcessing) {
        setConfirmation(
          initialConfirmationState
        );
      }
    };

  const requestUserAction = (
    action,
    user
  ) => {
    setSelectedUser(null);
    setSuccessMessage("");
    setErrorMessage("");

    const actionConfigurations = {
      activate: {
        title:
          "Activate account?",

        message:
          `${user.fullName}'s account will receive ACTIVE account status.`,

        confirmLabel:
          "Activate Account",

        variant:
          "success",
      },

      suspend: {
        title:
          "Suspend account?",

        message:
          `${user.fullName}'s account will receive SUSPENDED account status.`,

        confirmLabel:
          "Suspend Account",

        variant:
          "warning",
      },

      deactivate: {
        title:
          "Set account as inactive?",

        message:
          `${user.fullName}'s account will receive INACTIVE account status. Historical records will remain preserved.`,

        confirmLabel:
          "Set as Inactive",

        variant:
          "danger",
      },
    };

    const configuration =
      actionConfigurations[action];

    if (!configuration) {
      setErrorMessage(
        "Unsupported user action."
      );

      return;
    }

    setConfirmation({
      isOpen: true,
      action,
      user,
      ...configuration,
    });
  };

  const confirmUserAction =
    async () => {
      if (!confirmation.user) {
        return;
      }

      try {
        setIsProcessing(true);
        setErrorMessage("");
        setSuccessMessage("");

        let updatedUser = null;

        if (
          confirmation.action ===
          "activate"
        ) {
          updatedUser =
            await activateAdminUser(
              confirmation.user
                .userId
            );
        }

        if (
          confirmation.action ===
          "suspend"
        ) {
          updatedUser =
            await suspendAdminUser(
              confirmation.user
                .userId
            );
        }

        if (
          confirmation.action ===
          "deactivate"
        ) {
          updatedUser =
            await deactivateAdminUser(
              confirmation.user
                .userId
            );
        }

        if (!updatedUser) {
          throw new Error(
            "Unsupported user action."
          );
        }

        setUsers(
          (currentUsers) =>
            currentUsers.map(
              (user) =>
                Number(
                  user.userId
                ) ===
                Number(
                  updatedUser.userId
                )
                  ? updatedUser
                  : user
            )
        );

        setSuccessMessage(
          `${updatedUser.fullName}'s account status was updated to ${updatedUser.status}.`
        );

        setConfirmation(
          initialConfirmationState
        );

        window.dispatchEvent(
          new Event(
            "admin-data-updated"
          )
        );
      } catch (error) {
        console.error(
          "User status could not be updated:",
          error
        );

        setErrorMessage(
          error.message ||
            "User status could not be updated."
        );
      } finally {
        setIsProcessing(false);
      }
    };

  const resetFilters = () => {
    setSearchValue("");
    setRoleFilter("ALL");
    setStatusFilter("ALL");
    setPermissionFilter("ALL");
  };

  const columns = [
    {
      key: "user",
      header: "User",

      render: (user) => (
        <div className="admin-user-table-profile">
          <div className="admin-user-table-avatar">
            {user.initials}
          </div>

          <div>
            <strong>
              {user.fullName}
            </strong>

            <span>
              {user.email}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "userId",
      header: "User ID",

      render: (user) =>
        `#${user.userId}`,
    },
    {
      key: "role",
      header: "Role",

      render: (user) => (
        <span className="admin-table-role">
          {user.role}
        </span>
      ),
    },
    {
      key: "permissionLevel",
      header:
        "Permission Level",

      render: (user) => (
        <span className="admin-table-role">
          {formatPermissionLevel(
            user.permissionLevel
          )}
        </span>
      ),
    },
    {
      key: "accountStatus",
      header:
        "Account Status",

      render: (user) => (
        <AdminStatusBadge
          status={
            user.accountStatus
          }
        />
      ),
    },
    {
      key: "joinedDate",
      header:
        "Registration Date",
    },
    {
      key: "actions",
      header: "Actions",
      className:
        "admin-table-actions-column",

      render: (user) => (
        <button
          type="button"
          className="admin-table-view-button"
          onClick={() =>
            setSelectedUser(user)
          }
        >
          <Eye size={16} />
          Manage
        </button>
      ),
    },
  ];

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="User Management"
        description="Manage account access with reversible ACTIVE, INACTIVE, and SUSPENDED statuses while preserving user history."
      />

      <section className="admin-user-summary-grid">
        <article className="admin-user-summary-card">
          <span>Total Users</span>
          <strong>
            {userCounts.total}
          </strong>
        </article>

        <article className="admin-user-summary-card">
          <span>
            Active Accounts
          </span>

          <strong>
            {userCounts.active}
          </strong>
        </article>

        <article className="admin-user-summary-card">
          <span>
            Suspended Accounts
          </span>

          <strong>
            {userCounts.suspended}
          </strong>
        </article>

        <article className="admin-user-summary-card">
          <span>
            Inactive Accounts
          </span>

          <strong>
            {userCounts.inactive}
          </strong>
        </article>

        <article className="admin-user-summary-card">
          <span>
            Administrators
          </span>

          <strong>
            {userCounts.administrators}
          </strong>
        </article>
      </section>

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

      <section className="admin-users-panel">
        <div className="admin-users-toolbar">
          <div className="admin-users-search">
            <Search size={18} />

            <input
              type="search"
              value={searchValue}
              onChange={(event) =>
                setSearchValue(
                  event.target.value
                )
              }
              placeholder="Search by name, email, user ID or permission level..."
            />
          </div>

          <select
            value={roleFilter}
            onChange={(event) =>
              setRoleFilter(
                event.target.value
              )
            }
            aria-label="Filter users by role"
          >
            <option value="ALL">
              All roles
            </option>

            <option value="BUYER">
              Customer
            </option>

            <option value="SELLER">
              Brand
            </option>

            <option value="ADMIN">
              Administrator
            </option>
          </select>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
            aria-label="Filter users by account status"
          >
            <option value="ALL">
              All account statuses
            </option>

            <option value="ACTIVE">
              ACTIVE
            </option>

            <option value="INACTIVE">
              INACTIVE
            </option>

            <option value="SUSPENDED">
              SUSPENDED
            </option>
          </select>

          <select
            value={
              permissionFilter
            }
            onChange={(event) =>
              setPermissionFilter(
                event.target.value
              )
            }
            aria-label="Filter administrators by permission level"
          >
            <option value="ALL">
              All permission levels
            </option>

            <option value="SUPER_ADMIN">
              SUPER ADMIN
            </option>

            <option value="MANAGER">
              MANAGER
            </option>

            <option value="SUPPORT">
              SUPPORT
            </option>
          </select>

          <button
            type="button"
            className="admin-reset-filters-button"
            onClick={resetFilters}
          >
            Reset filters
          </button>
        </div>

        <div className="admin-users-results-heading">
          <div>
            <UsersRound
              size={18}
            />

            <strong>
              {filteredUsers.length}{" "}
              users found
            </strong>
          </div>
        </div>

        {isLoading ? (
          <div className="admin-page-loading">
            Loading users...
          </div>
        ) : (
          <AdminDataTable
            columns={columns}
            data={filteredUsers}
            rowKey="userId"
            emptyMessage="No users match the selected filters."
          />
        )}
      </section>

      <UserDetailsModal
        isOpen={Boolean(
          selectedUser
        )}
        user={selectedUser}
        onClose={() =>
          setSelectedUser(null)
        }
        onRequestAction={
          requestUserAction
        }
      />

      <AdminConfirmModal
        isOpen={
          confirmation.isOpen
        }
        title={
          confirmation.title
        }
        message={
          confirmation.message
        }
        confirmLabel={
          confirmation.confirmLabel
        }
        variant={
          confirmation.variant
        }
        isProcessing={
          isProcessing
        }
        onConfirm={
          confirmUserAction
        }
        onCancel={
          closeConfirmation
        }
      />
    </AdminPageLayout>
  );
}

export default ManageUsersPage;

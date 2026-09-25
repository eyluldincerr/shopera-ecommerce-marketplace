import { requireAuthenticatedAdmin } from "../auth/authSession";
import { api } from "./apiClient.js";

const allowedAccountStatuses = [
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
];

const allowedPermissionLevels = [
  "SUPER_ADMIN",
  "MANAGER",
  "SUPPORT",
];

const roleDisplayNames = {
  BUYER: "Customer",
  SELLER: "Brand",
  ADMIN: "Administrator",
};

const accountStatusDisplayNames = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  SUSPENDED: "Suspended",
};

const normalizeEnum = (value) => {
  return String(value || "")
    .trim()
    .replaceAll("-", "_")
    .replaceAll(" ", "_")
    .toUpperCase();
};

const normalizeUserId = (userId) => {
  const numericUserId = Number(userId);

  if (
    !Number.isInteger(numericUserId) ||
    numericUserId <= 0
  ) {
    throw new Error(
      "User ID must be a positive whole number."
    );
  }

  return numericUserId;
};

const normalizeAccountStatus = (
  status
) => {
  const normalizedStatus =
    normalizeEnum(status);

  if (
    !allowedAccountStatuses.includes(
      normalizedStatus
    )
  ) {
    throw new Error(
      "Invalid account status."
    );
  }

  return normalizedStatus;
};

const normalizePermissionLevel = (
  permissionLevel,
  role
) => {
  if (role !== "ADMIN") {
    return null;
  }

  const normalizedPermissionLevel =
    normalizeEnum(permissionLevel);

  if (
    !allowedPermissionLevels.includes(
      normalizedPermissionLevel
    )
  ) {
    throw new Error(
      "Administrator permission level must be SUPER_ADMIN, MANAGER or SUPPORT."
    );
  }

  return normalizedPermissionLevel;
};

const normalizeProfileEmail = (
  email
) => {
  return String(email || "")
    .trim()
    .toLowerCase();
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
    return "US";
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

const formatRegistrationDate = (
  dateValue
) => {
  if (!dateValue) {
    return "Not available";
  }

  const date =
    new Date(dateValue);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Not available";
  }

  return date.toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );
};

const formatPermissionLevel = (
  permissionLevel
) => {
  if (!permissionLevel) {
    return "Not applicable";
  }

  return String(permissionLevel)
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
};

const adminUserAccounts = [];

const requireAdminAccountBackend = () => {
  throw new Error("Backend integration is not configured.");
};

const findAccountIndex = (
  userId
) => {
  const numericUserId =
    normalizeUserId(userId);

  return adminUserAccounts.findIndex(
    (account) =>
      account.userId ===
      numericUserId
  );
};

const accountEmailAlreadyExists = (
  email,
  excludedUserId
) => {
  const normalizedEmail =
    normalizeProfileEmail(email);

  const numericExcludedUserId =
    normalizeUserId(
      excludedUserId
    );

  return adminUserAccounts.some(
    (account) =>
      account.userId !==
        numericExcludedUserId &&
      normalizeProfileEmail(
        account.email
      ) === normalizedEmail
  );
};

/*
  PasswordHash is deliberately excluded.
*/
const createSafeAccountRecord = (
  account
) => {
  if (!account) {
    return null;
  }

  return {
    userId:
      account.userId,

    fullName:
      account.fullName,

    email:
      account.email,

    phoneNumber:
      account.phoneNumber,

    registrationDate:
      account.registrationDate,

    role:
      account.role,

    accountStatus:
      account.accountStatus,

    permissionLevel:
      account.permissionLevel,

  };
};

const toUserManagementView = (
  account
) => {
  return {
    id:
      account.userId,

    userId:
      account.userId,

    fullName:
      account.fullName,

    email:
      account.email,

    phone:
      account.phoneNumber ||
      "Not provided",

    phoneNumber:
      account.phoneNumber,

    role:
      roleDisplayNames[
        account.role
      ] || account.role,

    databaseRole:
      account.role,

    status:
      accountStatusDisplayNames[
        account.accountStatus
      ] ||
      account.accountStatus,

    accountStatus:
      account.accountStatus,

    joinedDate:
      formatRegistrationDate(
        account.registrationDate
      ),

    registrationDate:
      account.registrationDate,

    permissionLevel:
      account.permissionLevel,

    permissionLevelDisplay:
      formatPermissionLevel(
        account.permissionLevel
      ),

    initials:
      createInitials(
        account.fullName
      ),
  };
};

/* =====================================================
   USER MANAGEMENT
===================================================== */

export const getAdminUsers =
  async () => {
    requireAuthenticatedAdmin();
    return (await api.get("/api/Admin/users")).map(toUserManagementView);
  };

export const getAdminUserById =
  async (userId) => {
    requireAuthenticatedAdmin();
    return toUserManagementView(await api.get(`/api/Admin/users/${Number(userId)}`));
  };

export const updateAdminUserStatus =
  async (
    userId,
    newStatus
  ) => {
    requireAuthenticatedAdmin();
    const accountStatus = normalizeAccountStatus(newStatus);
    await api.put(`/api/Admin/users/${Number(userId)}/status`, { status: accountStatus });
    return getAdminUserById(userId);
  };

export const activateAdminUser =
  async (userId) => {
    return updateAdminUserStatus(
      userId,
      "ACTIVE"
    );
  };

export const suspendAdminUser =
  async (userId) => {
    return updateAdminUserStatus(
      userId,
      "SUSPENDED"
    );
  };

export const deactivateAdminUser =
  async (userId) => {
    return updateAdminUserStatus(
      userId,
      "INACTIVE"
    );
  };

/*
  The account row is preserved.
  Delete behaves as soft deactivation.
*/
export const deleteAdminUser =
  async (userId) => {
    const updatedUser =
      await deactivateAdminUser(
        userId
      );

    return {
      success: true,

      deactivatedUserId:
        updatedUser.userId,

      deletedUserId:
        updatedUser.userId,
    };
  };

/* =====================================================
   ADMIN PERMISSION LEVEL
===================================================== */

export const getAllowedAdminPermissionLevels =
  async () => {
    requireAuthenticatedAdmin();

    return [
      ...allowedPermissionLevels,
    ];
  };

export const updateAdminUserPermissionLevel =
  async (
    userId,
    permissionLevel
  ) => {
    requireAuthenticatedAdmin();
    void userId;
    void permissionLevel;
    requireAdminAccountBackend();

    const accountIndex =
      findAccountIndex(userId);

    if (accountIndex === -1) {
      throw new Error(
        "User account could not be found."
      );
    }

    const currentAccount =
      adminUserAccounts[
        accountIndex
      ];

    if (
      currentAccount.role !==
      "ADMIN"
    ) {
      throw new Error(
        "Permission level can only be assigned to administrator accounts."
      );
    }

    const normalizedPermissionLevel =
      normalizePermissionLevel(
        permissionLevel,
        currentAccount.role
      );

    adminUserAccounts[
      accountIndex
    ] = {
      ...currentAccount,

      permissionLevel:
        normalizedPermissionLevel,
    };

    return toUserManagementView(
      adminUserAccounts[
        accountIndex
      ]
    );
  };

/* =====================================================
   SHARED ACCOUNT ACCESS
===================================================== */

export const getAdminAccounts =
  async () => {
    requireAuthenticatedAdmin();
    return (await api.get("/api/Admin/users")).map(createSafeAccountRecord);
  };

export const getAdminAccountRecordById =
  async (userId) => {
    return createSafeAccountRecord(await api.get(`/api/Admin/users/${normalizeUserId(userId)}`));
  };

/* =====================================================
   PROFILE UPDATE
===================================================== */

export const updateAdminAccountProfile =
  async (
    userId,
    {
      fullName,
      email,
      phoneNumber = "",
    }
  ) => {
    void userId;
    void fullName;
    void email;
    void phoneNumber;
    requireAdminAccountBackend();
    const authenticatedAdmin = requireAuthenticatedAdmin();

    const numericUserId =
      normalizeUserId(userId);

    if (numericUserId !== Number(authenticatedAdmin.userId)) {
      throw new Error(
        "Administrators may update only their own profile through settings."
      );
    }

    const accountIndex =
      findAccountIndex(
        numericUserId
      );

    if (accountIndex === -1) {
      throw new Error(
        "User account could not be found."
      );
    }

    const normalizedFullName =
      String(fullName || "").trim();

    if (!normalizedFullName) {
      throw new Error(
        "Full name is required."
      );
    }

    if (
      normalizedFullName.length >
      150
    ) {
      throw new Error(
        "Full name cannot exceed 150 characters."
      );
    }

    const normalizedEmail =
      normalizeProfileEmail(email);

    if (!normalizedEmail) {
      throw new Error(
        "Email address is required."
      );
    }

    if (
      normalizedEmail.length >
      255
    ) {
      throw new Error(
        "Email address cannot exceed 255 characters."
      );
    }

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !emailPattern.test(
        normalizedEmail
      )
    ) {
      throw new Error(
        "A valid email address is required."
      );
    }

    if (
      accountEmailAlreadyExists(
        normalizedEmail,
        numericUserId
      )
    ) {
      throw new Error(
        "This email address is already used by another account."
      );
    }

    const normalizedPhoneNumber =
      String(
        phoneNumber || ""
      ).trim();

    if (
      normalizedPhoneNumber.length >
      30
    ) {
      throw new Error(
        "Phone number cannot exceed 30 characters."
      );
    }

    adminUserAccounts[
      accountIndex
    ] = {
      ...adminUserAccounts[
        accountIndex
      ],

      fullName:
        normalizedFullName,

      email:
        normalizedEmail,

      phoneNumber:
        normalizedPhoneNumber ||
        null,

    };

    return createSafeAccountRecord(
      adminUserAccounts[
        accountIndex
      ]
    );
  };

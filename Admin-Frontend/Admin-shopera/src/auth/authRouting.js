export const getProtectedDestination = (user, allowedRoles = []) => {
  if (!user) return "/login";
  if (user.accountStatus !== "ACTIVE" ||
      (allowedRoles.length > 0 && !allowedRoles.includes(user.role))) return "/";
  return null;
};

export const getPostLoginDestination = (session) =>
  session?.role === "ADMIN" ? "/admin" : null;

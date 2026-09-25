// src/routes/ProtectedRoute.jsx

import { Navigate, useLocation } from "react-router-dom";

import useAuthSession from "../hooks/useAuthSession.js";
import { normalizeRole } from "../services/authService";
import {
  getExpiredSessionRoute,
  getLocationPath,
  getUnauthorizedRoleRoute,
} from "./routePolicy.js";

function ProtectedRoute({ children, allowedRoles }) {
  const location = useLocation();
  const session = useAuthSession();

  if (!session) {
    return (
      <Navigate
        to={getExpiredSessionRoute()}
        replace
        state={{
          from: getLocationPath(location),
          messageKey: "auth.signInRequired",
        }}
      />
    );
  }

  const normalizedAllowedRoles = allowedRoles?.map(normalizeRole);

  if (normalizedAllowedRoles && !normalizedAllowedRoles.includes(session.role)) {
    return <Navigate to={getUnauthorizedRoleRoute(session.role)} replace />;
  }

  return children;
}

export default ProtectedRoute;

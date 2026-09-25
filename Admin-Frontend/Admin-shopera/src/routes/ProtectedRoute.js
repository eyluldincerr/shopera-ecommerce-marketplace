import { createElement, useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";

import { getAuthenticatedUser } from "../auth/authSession";
import { getProtectedDestination } from "../auth/authRouting.js";

function ProtectedRoute({ allowedRoles = [] }) {
  const [, setSessionVersion] = useState(0);
  useEffect(() => {
    const refresh = () => setSessionVersion((value) => value + 1);
    window.addEventListener("shopera:auth-changed", refresh);
    return () => window.removeEventListener("shopera:auth-changed", refresh);
  }, []);
  const authenticatedUser = getAuthenticatedUser();
  const destination = getProtectedDestination(authenticatedUser, allowedRoles);
  if (destination) return createElement(Navigate, { to: destination, replace: true });

  return createElement(Outlet);
}

export default ProtectedRoute;

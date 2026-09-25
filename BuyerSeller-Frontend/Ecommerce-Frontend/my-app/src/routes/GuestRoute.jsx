import { Navigate } from "react-router-dom";

import useAuthSession from "../hooks/useAuthSession.js";
import { getGuestOnlyRedirect } from "./routePolicy.js";

function GuestRoute({ children }) {
  const session = useAuthSession();

  if (session) {
    return <Navigate to={getGuestOnlyRedirect(session.role)} replace />;
  }

  return children;
}

export default GuestRoute;

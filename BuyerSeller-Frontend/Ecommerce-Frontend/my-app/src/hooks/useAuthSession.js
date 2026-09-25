import { useCallback, useEffect, useState } from "react";

import { getCurrentSession } from "../services/authService.js";

const readSession = () => getCurrentSession();

function useAuthSession() {
  const [session, setSession] = useState(readSession);

  const refreshSession = useCallback(() => {
    setSession(readSession());
  }, []);

  useEffect(() => {
    window.addEventListener("authChanged", refreshSession);
    window.addEventListener("storage", refreshSession);

    return () => {
      window.removeEventListener("authChanged", refreshSession);
      window.removeEventListener("storage", refreshSession);
    };
  }, [refreshSession]);

  useEffect(() => {
    if (!session?.expiresAt) {
      return undefined;
    }

    const remainingDuration = Math.max(0, session.expiresAt - Date.now());
    const expiryTimer = window.setTimeout(
      refreshSession,
      Math.min(remainingDuration + 25, 2_147_483_647)
    );

    return () => window.clearTimeout(expiryTimer);
  }, [refreshSession, session?.expiresAt]);

  return session;
}

export default useAuthSession;

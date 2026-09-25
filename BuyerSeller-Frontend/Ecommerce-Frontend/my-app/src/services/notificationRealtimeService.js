import { NOTIFICATION_ENDPOINTS } from "../config/apiEndpoints.js";
import { getCurrentSession } from "./authService.js";
import { resolveApiUrl } from "./axiosClient.js";

const SUPPORTED_ROLES = new Set(["Buyer", "Seller", "Admin"]);
const INITIAL_RETRY_DELAY_MS = 5000;
const RECONNECT_DELAYS_MS = [0, 2000, 10000, 30000];

const getRealtimeSession = () => {
  const session = getCurrentSession();

  if (
    !session?.userId ||
    !session?.token ||
    !SUPPORTED_ROLES.has(session.role)
  ) {
    return null;
  }

  return session;
};

const getSignalRModule = () => import("@microsoft/signalr");

export const createNotificationRealtimeClient = ({
  onEvent,
  onStatus,
} = {}) => {
  let connection = null;
  let isStopped = false;
  let retryTimer = null;

  const emitStatus = (status, detail = null) => {
    if (typeof onStatus === "function") {
      onStatus(status, detail);
    }
  };

  const emitEvent = (eventType, payload = null) => {
    if (typeof onEvent === "function") {
      onEvent({ eventType, payload });
    }
  };

  const clearRetryTimer = () => {
    if (retryTimer !== null && typeof window !== "undefined") {
      window.clearTimeout(retryTimer);
    }
    retryTimer = null;
  };

  const scheduleStartRetry = (startConnection) => {
    if (
      isStopped ||
      retryTimer !== null ||
      typeof window === "undefined"
    ) {
      return;
    }

    retryTimer = window.setTimeout(() => {
      retryTimer = null;
      void startConnection();
    }, INITIAL_RETRY_DELAY_MS);
  };

  const start = async () => {
    const initialSession = getRealtimeSession();
    if (!initialSession || isStopped) {
      return false;
    }

    try {
      const signalR = await getSignalRModule();
      if (isStopped) {
        return false;
      }

      const hubUrl = resolveApiUrl(NOTIFICATION_ENDPOINTS.hub);
      connection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, {
          accessTokenFactory: () => getRealtimeSession()?.token || "",
        })
        .withAutomaticReconnect(RECONNECT_DELAYS_MS)
        .configureLogging(signalR.LogLevel.Warning)
        .build();

      connection.on("ReceiveNotification", (notification) => {
        emitEvent("received", notification);
      });
      connection.on("NotificationRead", (notificationId) => {
        emitEvent("read", notificationId);
      });
      connection.on("AllNotificationsRead", (payload) => {
        emitEvent("read-all", payload);
      });

      connection.onreconnecting((error) => {
        emitStatus("reconnecting", error || null);
      });
      connection.onreconnected(() => {
        emitStatus("reconnected");
        emitEvent("reconnected");
      });

      const startConnection = async () => {
        if (isStopped || !connection || !getRealtimeSession()) {
          return;
        }

        try {
          await connection.start();
          clearRetryTimer();
          emitStatus("connected");
        } catch (error) {
          if (isStopped) {
            return;
          }
          emitStatus("fallback", error);
          scheduleStartRetry(startConnection);
        }
      };

      connection.onclose((error) => {
        if (isStopped) {
          return;
        }
        emitStatus("fallback", error || null);
        scheduleStartRetry(startConnection);
      });

      await startConnection();
      return true;
    } catch (error) {
      if (!isStopped) {
        emitStatus("fallback", error);
      }
      return false;
    }
  };

  const stop = async () => {
    isStopped = true;
    clearRetryTimer();

    const activeConnection = connection;
    connection = null;

    if (!activeConnection) {
      return;
    }

    try {
      await activeConnection.stop();
    } catch {
      // Stopping a connection is best-effort during logout/unmount.
    }
  };

  return { start, stop };
};

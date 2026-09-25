// src/App.jsx

import "./App.css";

import AppRoutes from "./routes/AppRoutes";
import CartDrawer from "./components/cart/CartDrawer";
import useNotifications from "./hooks/useNotifications";
import useNotificationFavicon from "./hooks/useNotificationFavicon";

function App() {
  const { unreadCount } = useNotifications();

  const hasUnreadNotification = unreadCount > 0;

  useNotificationFavicon(hasUnreadNotification);

  return (
    <>
      <AppRoutes />
      <CartDrawer />
    </>
  );
}

export default App;
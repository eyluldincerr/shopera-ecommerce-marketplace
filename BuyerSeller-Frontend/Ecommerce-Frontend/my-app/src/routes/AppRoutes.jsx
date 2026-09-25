// src/routes/AppRoutes.jsx

import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { useTranslation } from "react-i18next";

import CheckoutRouteGuard from "./CheckoutRouteGuard.jsx";
import GuestRoute from "./GuestRoute.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";
import { ROUTES } from "./routePolicy.js";

// Route-level lazy loading keeps the initial Shopera bundle focused on the
// shell/providers. Vite turns these dynamic imports into production chunks and
// loads each page only when the matching route is rendered.
const HomePage = lazy(() => import("../pages/buyer/HomePage.jsx"));
const CategoryPage = lazy(() => import("../pages/buyer/CategoryPage.jsx"));
const CollectionPage = lazy(() => import("../pages/buyer/CollectionPage.jsx"));
const SearchResultsPage = lazy(() => import("../pages/buyer/SearchResultsPage.jsx"));
const ProductDetailPage = lazy(() => import("../pages/buyer/ProductDetailPage.jsx"));
const StoreDirectoryPage = lazy(() => import("../pages/buyer/StoreDirectoryPage.jsx"));
const StorePage = lazy(() => import("../pages/buyer/StorePage.jsx"));
const WishlistPage = lazy(() => import("../pages/buyer/WishlistPage.jsx"));
const CartPage = lazy(() => import("../pages/buyer/CartPage.jsx"));
const CheckoutPage = lazy(() => import("../pages/buyer/CheckoutPage.jsx"));
const CheckoutShippingPage = lazy(() => import("../pages/buyer/CheckoutShippingPage.jsx"));
const CheckoutLegacyPaymentRedirect = lazy(() =>
  import("../pages/buyer/CheckoutLegacyPaymentRedirect.jsx")
);
const CheckoutReviewPage = lazy(() => import("../pages/buyer/CheckoutReviewPage.jsx"));
const OrderHistoryPage = lazy(() => import("../pages/buyer/OrderHistoryPage.jsx"));
const OrderDetailPage = lazy(() => import("../pages/buyer/OrderDetailPage.jsx"));
const ProfilePage = lazy(() => import("../pages/buyer/ProfilePage.jsx"));
const AddressesPage = lazy(() => import("../pages/buyer/AddressesPage.jsx"));
const PaymentMethodsPage = lazy(() => import("../pages/buyer/PaymentMethodsPage.jsx"));
const CouponsPage = lazy(() => import("../pages/buyer/CouponsPage.jsx"));
const SupportPage = lazy(() => import("../pages/buyer/SupportPage.jsx"));
const NotificationsPage = lazy(() => import("../pages/buyer/NotificationsPage.jsx"));

const SignInPage = lazy(() => import("../pages/auth/SignInPage.jsx"));
const RegisterPage = lazy(() => import("../pages/auth/RegisterPage.jsx"));
const ForgotPasswordPage = lazy(() => import("../pages/auth/ForgotPasswordPage.jsx"));
const ResetPasswordPage = lazy(() => import("../pages/auth/ResetPasswordPage.jsx"));

const SellerDashboardPage = lazy(() => import("../pages/seller/SellerDashboardPage.jsx"));
const SellerOrdersPage = lazy(() => import("../pages/seller/SellerOrdersPage.jsx"));
const SellerProductsPage = lazy(() => import("../pages/seller/SellerProductsPage.jsx"));
const SellerInventoryPage = lazy(() => import("../pages/seller/SellerInventoryPage.jsx"));
const SellerAnalyticsPage = lazy(() => import("../pages/seller/SellerAnalyticsPage.jsx"));
const SellerStoreProfilePage = lazy(() => import("../pages/seller/SellerStoreProfilePage.jsx"));
const SellerStoreMediaPage = lazy(() => import("../pages/seller/SellerStoreMediaPage.jsx"));
const SellerStorePreviewPage = lazy(() => import("../pages/seller/SellerStorePreviewPage.jsx"));
const SellerNotificationsPage = lazy(() => import("../pages/seller/SellerNotificationsPage.jsx"));

const NotFoundPage = lazy(() => import("../pages/NotFoundPage.jsx"));

function RouteLoadingFallback() {
  const { t } = useTranslation();

  return (
    <div className="page-loader" role="status" aria-live="polite">
      {t("common.loading")}
    </div>
  );
}

function AppRoutes() {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        {/* Public routes - guest can browse */}
        <Route path={ROUTES.HOME} element={<HomePage />} />
        <Route path={ROUTES.CATEGORY} element={<CategoryPage />} />
        <Route path={ROUTES.COLLECTION} element={<CollectionPage />} />
        <Route path={ROUTES.SEARCH} element={<SearchResultsPage />} />
        <Route path={ROUTES.PRODUCT} element={<ProductDetailPage />} />
        <Route path={ROUTES.STORES} element={<StoreDirectoryPage />} />
        <Route
          path={ROUTES.STORE}
          element={<StorePage />}
        />

        {/* Auth routes */}
        <Route
          path={ROUTES.LOGIN}
          element={
            <GuestRoute>
              <SignInPage />
            </GuestRoute>
          }
        />
        <Route
          path={ROUTES.REGISTER}
          element={
            <GuestRoute>
              <RegisterPage />
            </GuestRoute>
          }
        />
        <Route
          path={ROUTES.FORGOT_PASSWORD}
          element={
            <GuestRoute>
              <ForgotPasswordPage />
            </GuestRoute>
          }
        />
        <Route
          path={ROUTES.RESET_PASSWORD}
          element={
            <GuestRoute>
              <ResetPasswordPage />
            </GuestRoute>
          }
        />

        {/* Buyer protected routes */}
        <Route
          path={ROUTES.WISHLIST}
          element={
            <ProtectedRoute allowedRoles={["Buyer"]}>
              <WishlistPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.CART}
          element={
            <ProtectedRoute allowedRoles={["Buyer"]}>
              <CartPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.CHECKOUT}
          element={
            <ProtectedRoute allowedRoles={["Buyer"]}>
              <CheckoutRouteGuard>
                <CheckoutPage />
              </CheckoutRouteGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.CHECKOUT_SHIPPING}
          element={
            <ProtectedRoute allowedRoles={["Buyer"]}>
              <CheckoutRouteGuard>
                <CheckoutShippingPage />
              </CheckoutRouteGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/checkout/payment"
          element={
            <ProtectedRoute allowedRoles={["Buyer"]}>
              <CheckoutRouteGuard>
                <CheckoutLegacyPaymentRedirect />
              </CheckoutRouteGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.CHECKOUT_REVIEW}
          element={
            <ProtectedRoute allowedRoles={["Buyer"]}>
              <CheckoutRouteGuard>
                <CheckoutReviewPage />
              </CheckoutRouteGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ORDERS}
          element={
            <ProtectedRoute allowedRoles={["Buyer"]}>
              <OrderHistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ACCOUNT_ORDERS}
          element={
            <ProtectedRoute allowedRoles={["Buyer"]}>
              <OrderHistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ORDER_DETAIL}
          element={
            <ProtectedRoute allowedRoles={["Buyer"]}>
              <OrderDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.NOTIFICATIONS}
          element={
            <ProtectedRoute allowedRoles={["Buyer"]}>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ACCOUNT_PROFILE}
          element={
            <ProtectedRoute allowedRoles={["Buyer", "Seller"]}>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ACCOUNT_ADDRESSES}
          element={
            <ProtectedRoute allowedRoles={["Buyer"]}>
              <AddressesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ACCOUNT_PAYMENT_METHODS}
          element={
            <ProtectedRoute allowedRoles={["Buyer"]}>
              <PaymentMethodsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ACCOUNT_COUPONS}
          element={
            <ProtectedRoute allowedRoles={["Buyer"]}>
              <CouponsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ACCOUNT_SUPPORT}
          element={
            <ProtectedRoute allowedRoles={["Buyer"]}>
              <SupportPage />
            </ProtectedRoute>
          }
        />

        {/* Seller protected routes */}
        <Route
          path={ROUTES.SELLER_DASHBOARD}
          element={
            <ProtectedRoute allowedRoles={["Seller"]}>
              <SellerDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.SELLER_ORDERS}
          element={
            <ProtectedRoute allowedRoles={["Seller"]}>
              <SellerOrdersPage />
            </ProtectedRoute>
          }
        />

        {[
          [ROUTES.SELLER_PRODUCTS, SellerProductsPage],
          [ROUTES.SELLER_INVENTORY, SellerInventoryPage],
          [ROUTES.SELLER_ANALYTICS, SellerAnalyticsPage],
          [ROUTES.SELLER_STORE_PROFILE, SellerStoreProfilePage],
          [ROUTES.SELLER_STORE_MEDIA, SellerStoreMediaPage],
          [ROUTES.SELLER_STORE_PREVIEW, SellerStorePreviewPage],
          [ROUTES.SELLER_NOTIFICATIONS, SellerNotificationsPage],
        ].map(([path, SellerPage]) => (
          <Route
            key={path}
            path={path}
            element={
              <ProtectedRoute allowedRoles={["Seller"]}>
                <SellerPage />
              </ProtectedRoute>
            }
          />
        ))}

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

export default AppRoutes;

// src/routes/AppRoutes.jsx

import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute";
import { getAuthenticatedUser } from "../auth/authSession.js";

// Keep the login shell small and load each Admin page only when its route is
// visited. This preserves every existing route/guard while avoiding one large
// startup bundle containing dashboards, charts, tables and promotion tooling.
const LoginPage = lazy(() => import("../pages/LoginPage"));
const AdminDashboardPage = lazy(() => import("../pages/admin/AdminDashboardPage"));
const ManageUsersPage = lazy(() => import("../pages/admin/ManageUsersPage"));
const SellerVerificationPage = lazy(() => import("../pages/admin/SellerVerificationPage"));
const ManageSellersPage = lazy(() => import("../pages/admin/ManageSellersPage"));
const ManageProductsPage = lazy(() => import("../pages/admin/ManageProductsPage"));
const ManageCategoriesPage = lazy(() => import("../pages/admin/ManageCategoriesPage"));
const ManageOrdersPage = lazy(() => import("../pages/admin/ManageOrdersPage"));
const ManageCouponsPage = lazy(() => import("../pages/admin/ManageCouponsPage"));
const ManageReportsPage = lazy(() => import("../pages/admin/ManageReportsPage"));
const AdminAnalyticsPage = lazy(() => import("../pages/admin/AdminAnalyticsPage"));
const AdminSettingsPage = lazy(() => import("../pages/admin/AdminSettingsPage"));
const ManagePromotionsPage = lazy(() => import("../pages/admin/ManagePromotionsPage"));
const CreatePromotionPage = lazy(() => import("../pages/admin/CreatePromotionPage"));
const EditPromotionPage = lazy(() => import("../pages/admin/EditPromotionPage"));

function RootRedirect() {
  const user = getAuthenticatedUser();
  return <Navigate to={user?.role === "ADMIN" ? "/admin" : "/login"} replace />;
}

function AdminRouteFallback() {
  return (
    <div className="admin-page-loading" role="status" aria-live="polite">
      Loading...
    </div>
  );
}

function AppRoutes() {
  return (
    <Suspense fallback={<AdminRouteFallback />}>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/users" element={<ManageUsersPage />} />
          <Route path="/admin/seller-verification" element={<SellerVerificationPage />} />
          <Route path="/admin/sellers" element={<ManageSellersPage />} />
          <Route path="/admin/products" element={<ManageProductsPage />} />
          <Route path="/admin/categories" element={<ManageCategoriesPage />} />
          <Route path="/admin/orders" element={<ManageOrdersPage />} />
          <Route path="/admin/coupons" element={<ManageCouponsPage />} />
          <Route path="/admin/reports" element={<ManageReportsPage />} />
          <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
          <Route path="/admin/settings" element={<AdminSettingsPage />} />
          <Route path="/admin/promotions" element={<ManagePromotionsPage />} />
          <Route path="/admin/promotions/plans" element={<Navigate to="/admin/promotions" replace />} />
          <Route path="/admin/promotions/create" element={<CreatePromotionPage />} />
          <Route path="/admin/promotions/edit/:campaignId" element={<EditPromotionPage />} />
        </Route>

        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </Suspense>
  );
}

export default AppRoutes;

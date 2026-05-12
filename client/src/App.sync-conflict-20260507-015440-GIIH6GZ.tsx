import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { HelmetProvider } from 'react-helmet-async';
import { useBehaviorTracking } from './hooks/useBehaviorTracking';

// 前台页面
import ShopLayout from './components/ShopLayout';
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import OrdersPage from './pages/OrdersPage';
import AddressPage from './pages/AddressPage';
import FavoritesPage from './pages/FavoritesPage';
import StaticPage from './pages/StaticPage';
import PaymentResultPage from './pages/PaymentResultPage';
import QuizPage from './pages/QuizPage';
import ArticlesPage from './pages/ArticlesPage';
import ArticleDetailPage from './pages/ArticleDetailPage';
import BrandStoryPage from './pages/BrandStoryPage';

// 后台页面
import AdminLayout from './components/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminProducts from './pages/admin/Products';
import AdminMarketing from './pages/admin/Marketing';
import AdminOrders from './pages/admin/Orders';
import AdminSettings from './pages/admin/Settings';
import AdminStaff from './pages/admin/Staff';
import AdminAI from './pages/admin/AI';
import AdminArticles from './pages/admin/Articles';

import { useAuthStore } from './contexts/authStore';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

// 后台基本守卫：admin 和 staff 都可进入
function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  if (!user || (user.level !== 'admin' && user.level !== 'staff')) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// 按模块权限守卫
function PermissionGuard({ module, children }: { module: string; children: React.ReactNode }) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  // admin 全部放行
  if (user.level === 'admin') return <>{children}</>;
  // staff 检查模块权限
  if (user.level === 'staff') {
    const perms = user.permissions || [];
    if (perms.includes(module)) return <>{children}</>;
    return <Navigate to="/admin" replace />;
  }
  return <Navigate to="/login" replace />;
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function TrackingWrapper({ children }: { children: React.ReactNode }) {
  useBehaviorTracking();
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <BrowserRouter>
          <TrackingWrapper>
            <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
            <Routes>
            {/* 前台路由 */}
            <Route path="/" element={<ShopLayout />}>
              <Route index element={<HomePage />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="products/:slug" element={<ProductDetailPage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="register" element={<RegisterPage />} />
              <Route path="cart" element={<AuthGuard><CartPage /></AuthGuard>} />
              <Route path="checkout" element={<AuthGuard><CheckoutPage /></AuthGuard>} />
              <Route path="profile" element={<AuthGuard><ProfilePage /></AuthGuard>} />
              <Route path="orders" element={<AuthGuard><OrdersPage /></AuthGuard>} />
              <Route path="addresses" element={<AuthGuard><AddressPage /></AuthGuard>} />
              <Route path="favorites" element={<AuthGuard><FavoritesPage /></AuthGuard>} />
              <Route path="payment/result" element={<PaymentResultPage />} />
              <Route path="quiz" element={<QuizPage />} />
              <Route path="articles" element={<ArticlesPage />} />
              <Route path="articles/:slug" element={<ArticleDetailPage />} />
              <Route path="brand-story" element={<BrandStoryPage />} />
              <Route path=":page" element={<StaticPage />} />
            </Route>

            {/* 后台路由 */}
            <Route path="/admin" element={<AdminGuard><AdminLayout /></AdminGuard>}>
              <Route index element={<AdminDashboard />} />
              <Route path="staff" element={<PermissionGuard module="staff"><AdminStaff /></PermissionGuard>} />
              <Route path="users" element={<PermissionGuard module="users"><AdminUsers /></PermissionGuard>} />
              <Route path="products" element={<PermissionGuard module="products"><AdminProducts /></PermissionGuard>} />
              <Route path="marketing" element={<PermissionGuard module="marketing"><AdminMarketing /></PermissionGuard>} />
              <Route path="articles" element={<PermissionGuard module="articles"><AdminArticles /></PermissionGuard>} />
              <Route path="ai" element={<PermissionGuard module="ai"><AdminAI /></PermissionGuard>} />
              <Route path="orders" element={<PermissionGuard module="orders"><AdminOrders /></PermissionGuard>} />
              <Route path="settings" element={<PermissionGuard module="settings"><AdminSettings /></PermissionGuard>} />
            </Route>
          </Routes>
          </TrackingWrapper>
        </BrowserRouter>
      </HelmetProvider>
    </QueryClientProvider>
  );
}

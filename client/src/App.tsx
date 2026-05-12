import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { HelmetProvider } from 'react-helmet-async';
import { useBehaviorTracking } from './hooks/useBehaviorTracking';

// 布局组件同步加载
import ShopLayout from './components/ShopLayout';
import AdminLayout from './components/AdminLayout';

// 前台页面异步加载
const HomePage = lazy(() => import('./pages/HomePage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const AddressPage = lazy(() => import('./pages/AddressPage'));
const FavoritesPage = lazy(() => import('./pages/FavoritesPage'));
const StaticPage = lazy(() => import('./pages/StaticPage'));
const PaymentResultPage = lazy(() => import('./pages/PaymentResultPage'));
const QuizPage = lazy(() => import('./pages/QuizPage'));
const SkinAnalysisPage = lazy(() => import('./pages/SkinAnalysis'));
const SkinAnalysisProPage = lazy(() => import('./pages/SkinAnalysisPro'));
const SkinAnalysisProIntroPage = lazy(() => import('./pages/SkinAnalysisProIntroPage'));
const SkinAnalysisProReport = lazy(() => import('./pages/SkinAnalysisProReport'));
const ArticlesPage = lazy(() => import('./pages/ArticlesPage'));
const ArticleDetailPage = lazy(() => import('./pages/ArticleDetailPage'));
const ClinicalReportDetailPage = lazy(() => import('./pages/ClinicalReportDetailPage'));
const AcademicPaperDetailPage = lazy(() => import('./pages/AcademicPaperDetailPage'));
const BrandStoryPage = lazy(() => import('./pages/BrandStoryPage'));
const MemberDetailPage = lazy(() => import('./pages/MemberDetailPage'));

// 后台页面异步加载
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminProducts = lazy(() => import('./pages/admin/Products'));
const AdminCategories = lazy(() => import('./pages/admin/Categories'));
const AdminMarketing = lazy(() => import('./pages/admin/Marketing'));
const AdminOrders = lazy(() => import('./pages/admin/Orders'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));
const AdminStaff = lazy(() => import('./pages/admin/Staff'));
const AdminAI = lazy(() => import('./pages/admin/AI'));
const AdminArticles = lazy(() => import('./pages/admin/Articles'));
const AdminClinicalReports = lazy(() => import('./pages/admin/ClinicalReports'));
const AdminResearchInstitute = lazy(() => import('./pages/admin/ResearchInstitute'));

import { useAuthStore } from './contexts/authStore';
import { useTranslation } from 'react-i18next';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

// 后台基本守卫：admin 和 staff 都可进入
function AdminGuard({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
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

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-stone-50">
    <div className="w-10 h-10 border-2 border-stone-200 border-t-amber-500 rounded-full animate-spin"></div>
  </div>
);

export default function App() {
  const { refreshUser } = useAuthStore();

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <BrowserRouter>
          <TrackingWrapper>
            <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
            <Suspense fallback={<PageLoader />}>
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
                <Route path="skin-analysis-pro-intro" element={<SkinAnalysisProIntroPage />} />
                <Route path="skin-analysis" element={<AuthGuard><SkinAnalysisPage /></AuthGuard>} />
                <Route path="skin-analysis-pro" element={<AuthGuard><SkinAnalysisProPage /></AuthGuard>} />
                <Route path="skin-analysis-pro/report/:id" element={<AuthGuard><SkinAnalysisProReport /></AuthGuard>} />
                <Route path="articles" element={<AuthGuard><ArticlesPage /></AuthGuard>} />
                <Route path="articles/:slug" element={<AuthGuard><ArticleDetailPage /></AuthGuard>} />
                <Route path="clinical-reports/:slug" element={<AuthGuard><ClinicalReportDetailPage /></AuthGuard>} />
                <Route path="academic/:id" element={<AuthGuard><AcademicPaperDetailPage /></AuthGuard>} />
                <Route path="brand-story" element={<BrandStoryPage />} />
                <Route path="team/:id" element={<MemberDetailPage />} />
                <Route path=":page" element={<StaticPage />} />
              </Route>

              {/* 后台路由 */}
              <Route path="/admin" element={<AdminGuard><AdminLayout /></AdminGuard>}>
                <Route index element={<AdminDashboard />} />
                <Route path="staff" element={<PermissionGuard module="staff"><AdminStaff /></PermissionGuard>} />
                <Route path="users" element={<PermissionGuard module="users"><AdminUsers /></PermissionGuard>} />
                <Route path="products" element={<PermissionGuard module="products"><AdminProducts /></PermissionGuard>} />
                <Route path="categories" element={<PermissionGuard module="products"><AdminCategories /></PermissionGuard>} />
                <Route path="marketing" element={<PermissionGuard module="marketing"><AdminMarketing /></PermissionGuard>} />
                <Route path="research-institute" element={<PermissionGuard module="articles"><AdminResearchInstitute /></PermissionGuard>} />
                {/* 兼容旧链接直接跳转 */}
                <Route path="articles" element={<PermissionGuard module="articles"><AdminResearchInstitute /></PermissionGuard>} />
                <Route path="clinical-reports" element={<PermissionGuard module="articles"><AdminResearchInstitute /></PermissionGuard>} />
                <Route path="ai" element={<PermissionGuard module="ai"><AdminAI /></PermissionGuard>} />
                <Route path="orders" element={<PermissionGuard module="orders"><AdminOrders /></PermissionGuard>} />
                <Route path="settings" element={<PermissionGuard module="settings"><AdminSettings /></PermissionGuard>} />
              </Route>
            </Routes>
            </Suspense>
          </TrackingWrapper>
        </BrowserRouter>
      </HelmetProvider>
    </QueryClientProvider>
  );
}

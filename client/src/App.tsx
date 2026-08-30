/**
 * ==============================================================================
 * TRASOCHY 商城前端主应用入口组件 (App.tsx)
 * ==============================================================================
 * 该文件是 React 前端应用的路由与全局状态配置中心。
 * 核心功能包含：
 * 1. 挂载 React Router，实现前端 SPA 路由切换。
 * 2. 挂载 React Query Provider，提供数据缓存与请求状态管理。
 * 3. 定义路由守卫 (AuthGuard, AdminGuard, PermissionGuard)，保护敏感页面。
 * 4. 挂载全局的 UI 组件，例如 Toaster (通知弹窗) 和 Helmet (SEO标签管理器)。
 * 5. 集成使用 `useBehaviorTracking` Hook，实现全局的用户行为埋点追踪。
 * ==============================================================================
 */

import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // 请求缓存库
import { Toaster } from 'react-hot-toast'; // 轻量级 Toast 提示库
import { HelmetProvider } from 'react-helmet-async'; // SEO 头部管理
import { useBehaviorTracking } from './hooks/useBehaviorTracking'; // 行为埋点 Hook

// 同步加载核心布局组件（外壳）
import ShopLayout from './components/ShopLayout'; // C 端商城页面布局
import AdminLayout from './components/AdminLayout'; // B 端后台管理布局

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
const SurveyPage = lazy(() => import('./pages/SurveyPage'));
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
const AdminCoupons = lazy(() => import('./pages/admin/Coupons'));
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

// 后台严格守卫：仅超级管理员 admin 可进入
function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  if (!user || user.level !== 'admin') {
    return <Navigate to="/login?redirect=/admin" replace />;
  }
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
                <Route path="survey" element={<SurveyPage />} />
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
                <Route path="coupons" element={<PermissionGuard module="marketing"><AdminCoupons /></PermissionGuard>} />
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

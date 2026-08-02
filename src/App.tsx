import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { AppShell } from '@/components/layout/AppShell';
import { RequireAuth } from '@/components/layout/RequireAuth';
import { Container } from '@/components/ui/Layout';
import { Skeleton } from '@/components/ui/Skeleton';

// Code splitting por rota (FRONTEND-PLANEJAMENTO.md secao 10).
const HomePage = lazy(() => import('@/pages/HomePage').then((m) => ({ default: m.HomePage })));
const CatalogPage = lazy(() => import('@/pages/CatalogPage').then((m) => ({ default: m.CatalogPage })));
const ProductPage = lazy(() => import('@/pages/ProductPage').then((m) => ({ default: m.ProductPage })));
const CartPage = lazy(() => import('@/pages/CartPage').then((m) => ({ default: m.CartPage })));
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage })));
const CheckoutSuccessPage = lazy(() => import('@/pages/CheckoutResultPages').then((m) => ({ default: m.CheckoutSuccessPage })));
const CheckoutPendingPage = lazy(() => import('@/pages/CheckoutResultPages').then((m) => ({ default: m.CheckoutPendingPage })));
const AuthPage = lazy(() => import('@/pages/AuthPage').then((m) => ({ default: m.AuthPage })));
const FavoritesPage = lazy(() => import('@/pages/FavoritesPage').then((m) => ({ default: m.FavoritesPage })));
const ResetPasswordPage = lazy(() =>
  import('@/pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })),
);
const InstitutionalPage = lazy(() =>
  import('@/pages/institucional/InstitutionalPage').then((m) => ({ default: m.InstitutionalPage })),
);
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

// Area do cliente
const AccountLayout = lazy(() => import('@/pages/account/AccountLayout').then((m) => ({ default: m.AccountLayout })));
const AccountOverview = lazy(() => import('@/pages/account/AccountOverview').then((m) => ({ default: m.AccountOverview })));
const OrdersPage = lazy(() => import('@/pages/account/OrdersPage').then((m) => ({ default: m.OrdersPage })));
const OrderDetailPage = lazy(() => import('@/pages/account/OrderDetailPage').then((m) => ({ default: m.OrderDetailPage })));
const AddressesPage = lazy(() => import('@/pages/account/AddressesPage').then((m) => ({ default: m.AddressesPage })));
const AccountSettingsPage = lazy(() =>
  import('@/pages/account/AccountSettingsPage').then((m) => ({ default: m.AccountSettingsPage })),
);
const PrivacyPage = lazy(() => import('@/pages/account/PrivacyPage').then((m) => ({ default: m.PrivacyPage })));
const ConfirmEmailPage = lazy(() =>
  import('@/pages/ConfirmEmailPage').then((m) => ({ default: m.ConfirmEmailPage })),
);
const ReviewsPage = lazy(() => import('@/pages/account/ReviewsPage').then((m) => ({ default: m.ReviewsPage })));

// Admin
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout').then((m) => ({ default: m.AdminLayout })));
const AdminLogin = lazy(() => import('@/pages/admin/AdminLogin').then((m) => ({ default: m.AdminLogin })));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const AdminReports = lazy(() => import('@/pages/admin/AdminReports').then((m) => ({ default: m.AdminReports })));
const AdminProducts = lazy(() => import('@/pages/admin/AdminProducts').then((m) => ({ default: m.AdminProducts })));
const AdminProductForm = lazy(() => import('@/pages/admin/AdminProductForm').then((m) => ({ default: m.AdminProductForm })));
const AdminCategories = lazy(() => import('@/pages/admin/AdminCategories').then((m) => ({ default: m.AdminCategories })));
const AdminInventory = lazy(() => import('@/pages/admin/AdminInventory').then((m) => ({ default: m.AdminInventory })));
const AdminOrders = lazy(() => import('@/pages/admin/AdminOrders').then((m) => ({ default: m.AdminOrders })));
const AdminOrderDetail = lazy(() => import('@/pages/admin/AdminOrders').then((m) => ({ default: m.AdminOrderDetail })));
const AdminReviews = lazy(() => import('@/pages/admin/AdminReviews').then((m) => ({ default: m.AdminReviews })));
const AdminCoupons = lazy(() => import('@/pages/admin/AdminCommerce').then((m) => ({ default: m.AdminCoupons })));
const AdminPromotions = lazy(() => import('@/pages/admin/AdminCommerce').then((m) => ({ default: m.AdminPromotions })));
const AdminCustomers = lazy(() => import('@/pages/admin/AdminCommerce').then((m) => ({ default: m.AdminCustomers })));
const AdminShipping = lazy(() => import('@/pages/admin/AdminIntegrations').then((m) => ({ default: m.AdminShipping })));
const AdminPayments = lazy(() => import('@/pages/admin/AdminIntegrations').then((m) => ({ default: m.AdminPayments })));
const AdminFiscal = lazy(() => import('@/pages/admin/AdminIntegrations').then((m) => ({ default: m.AdminFiscal })));
const AdminAutomations = lazy(() => import('@/pages/admin/AdminAutomations').then((m) => ({ default: m.AdminAutomations })));
const AdminUsers = lazy(() => import('@/pages/admin/AdminAccess').then((m) => ({ default: m.AdminUsers })));
const AdminPermissions = lazy(() => import('@/pages/admin/AdminAccess').then((m) => ({ default: m.AdminPermissions })));
const AdminSettings = lazy(() => import('@/pages/admin/AdminAccess').then((m) => ({ default: m.AdminSettings })));

function PageFallback() {
  return (
    <Container className="py-16">
      <Skeleton className="h-72 w-full rounded-[var(--radius-xl)]" />
    </Container>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          {/* Loja (cliente) */}
          <Route element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="catalogo" element={<CatalogPage />} />
            <Route path="categoria/:slug" element={<CatalogPage />} />
            <Route path="produto/:slug" element={<ProductPage />} />
            <Route path="carrinho" element={<CartPage />} />
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="checkout/sucesso" element={<CheckoutSuccessPage />} />
            <Route path="checkout/pagamento-pendente" element={<CheckoutPendingPage />} />
            <Route path="entrar" element={<AuthPage />} />
            {/* Destino do link enviado por e-mail (token na query) */}
            <Route path="redefinir-senha" element={<ResetPasswordPage />} />
            <Route path="confirmar-email" element={<ConfirmEmailPage />} />
            <Route path="favoritos" element={<FavoritesPage />} />

            {/* Ajuda e institucional (conteudo em pages/institucional/content.ts) */}
            <Route path="ajuda/:slug" element={<InstitutionalPage group="ajuda" />} />
            <Route path="institucional/:slug" element={<InstitutionalPage group="institucional" />} />

            {/* Area do cliente (protegida) */}
            <Route
              path="minha-conta"
              element={
                <RequireAuth>
                  <AccountLayout />
                </RequireAuth>
              }
            >
              <Route index element={<AccountOverview />} />
              <Route path="pedidos" element={<OrdersPage />} />
              <Route path="pedidos/:id" element={<OrderDetailPage />} />
              <Route path="enderecos" element={<AddressesPage />} />
              <Route path="dados" element={<AccountSettingsPage />} />
              <Route path="privacidade" element={<PrivacyPage />} />
              <Route path="avaliacoes" element={<ReviewsPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Route>

          {/* Admin */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <RequireAuth admin>
                <AdminLayout />
              </RequireAuth>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="relatorios" element={<AdminReports />} />
            <Route path="produtos" element={<AdminProducts />} />
            <Route path="produtos/novo" element={<AdminProductForm />} />
            <Route path="produtos/:id" element={<AdminProductForm />} />
            <Route path="categorias" element={<AdminCategories />} />
            <Route path="estoque" element={<AdminInventory />} />
            <Route path="pedidos" element={<AdminOrders />} />
            <Route path="pedidos/:id" element={<AdminOrderDetail />} />
            <Route path="clientes" element={<AdminCustomers />} />
            <Route path="avaliacoes" element={<AdminReviews />} />
            <Route path="cupons" element={<AdminCoupons />} />
            <Route path="promocoes" element={<AdminPromotions />} />
            <Route path="frete" element={<AdminShipping />} />
            <Route path="pagamentos" element={<AdminPayments />} />
            <Route path="fiscal" element={<AdminFiscal />} />
            <Route path="usuarios" element={<AdminUsers />} />
            <Route path="permissoes" element={<AdminPermissions />} />
            <Route path="automacoes" element={<AdminAutomations />} />
            <Route path="configuracoes" element={<AdminSettings />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

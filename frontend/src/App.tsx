import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { GeniusAuthProvider } from './contexts/GeniusAuthContext';
import { TokenUsageProvider } from './contexts/TokenUsageContext';
import { CompanionProvider } from './components/companion/CompanionProvider';
import { ProtectedRoute } from './components/ProtectedRoute';

// Keep the three fast-path pages (Landing, DemoPage, Login) eagerly imported so
// the most-visited entry points render without an extra round trip. Everything
// else is split off into its own chunk so the initial bundle stays small.
import { Landing } from './pages/Landing';
import { DemoPage } from './pages/DemoPage';
// `GeniusAuth` (role-picker login) is the legacy auth page. Replaced on the
// `mobile` branch by `Login` — a single-form auth page with an Email |
// Genius-ID segmented control. The old component is still on disk so it can
// be referenced during the transition, but no route points at it any more.
// It will be deleted in Phase 4 of the roadmap.
import { Login } from './pages/Login';

// Lazy-loaded page chunks. Each `lazy(() => import(...))` becomes its own
// async bundle. Before this split, the entry chunk was ~1.4 MB because every
// page (50+) was compiled into it; now the shell stays under ~400 KB and
// downloads each page's code only when the user actually visits its route.
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const Register = lazy(() => import('./pages/Register').then(m => ({ default: m.Register })));
const RegisterStudent = lazy(() => import('./pages/RegisterStudent').then(m => ({ default: m.RegisterStudent })));
const RegisterTeacher = lazy(() => import('./pages/RegisterTeacher').then(m => ({ default: m.RegisterTeacher })));
const RegisterParent = lazy(() => import('./pages/RegisterParent').then(m => ({ default: m.RegisterParent })));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard').then(m => ({ default: m.StudentDashboard })));
const StudentCreate = lazy(() => import('./pages/StudentCreate').then(m => ({ default: m.StudentCreate })));
const StorybookCreate = lazy(() => import('./pages/StorybookCreate').then(m => ({ default: m.StorybookCreate })));
const RewardsPage = lazy(() => import('./pages/RewardsPage').then(m => ({ default: m.RewardsPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const StorePage = lazy(() => import('./pages/StorePage').then(m => ({ default: m.StorePage })));
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard').then(m => ({ default: m.TeacherDashboard })));
const ParentDashboard = lazy(() => import('./pages/ParentDashboard').then(m => ({ default: m.ParentDashboard })));
const AdminDashboardOverview = lazy(() => import('./pages/AdminDashboardOverview'));
const AdminMembers = lazy(() => import('./pages/AdminMembers'));
const AdminAcademy = lazy(() => import('./pages/AdminAcademy'));
const AdminCheckIn = lazy(() => import('./pages/AdminCheckIn'));
// Demo module pages — isolated from the live /s/aipreneur/* routes.
// All 6 modules share one chunk via this barrel import; each export
// is its own page component.
const DemoDecoratePage   = lazy(() => import('./pages/DemoModulePages').then(m => ({ default: m.DemoDecoratePage })));
const DemoProductPage    = lazy(() => import('./pages/DemoModulePages').then(m => ({ default: m.DemoProductPage })));
const DemoOperationPage  = lazy(() => import('./pages/DemoModulePages').then(m => ({ default: m.DemoOperationPage })));
const DemoMarketingPage  = lazy(() => import('./pages/DemoModulePages').then(m => ({ default: m.DemoMarketingPage })));
const DemoInnovationPage = lazy(() => import('./pages/DemoModulePages').then(m => ({ default: m.DemoInnovationPage })));
const DemoCSRPage        = lazy(() => import('./pages/DemoModulePages').then(m => ({ default: m.DemoCSRPage })));
const DemoFinancePage    = lazy(() => import('./pages/DemoModulePages').then(m => ({ default: m.DemoFinancePage })));
const GeniusProfileManager = lazy(() => import('./pages/GeniusProfileManager').then(m => ({ default: m.GeniusProfileManager })));
const AddGeniusProfile = lazy(() => import('./pages/AddGeniusProfile').then(m => ({ default: m.AddGeniusProfile })));
const GeniusAssessment = lazy(() => import('./pages/GeniusAssessment').then(m => ({ default: m.GeniusAssessment })));
const AIAnalysis = lazy(() => import('./pages/AIAnalysis').then(m => ({ default: m.AIAnalysis })));
const PrioritySelection = lazy(() => import('./pages/PrioritySelection').then(m => ({ default: m.PrioritySelection })));
const ProfileSuccess = lazy(() => import('./pages/ProfileSuccess').then(m => ({ default: m.ProfileSuccess })));
const EditGeniusProfile = lazy(() => import('./pages/EditGeniusProfile').then(m => ({ default: m.EditGeniusProfile })));
const MyPersona = lazy(() => import('./pages/MyPersona').then(m => ({ default: m.MyPersona })));
const ParentViewPersona = lazy(() => import('./pages/ParentViewPersona').then(m => ({ default: m.ParentViewPersona })));
const ParentCoinTopup = lazy(() => import('./pages/ParentCoinTopup').then(m => ({ default: m.ParentCoinTopup })));
const CompareKids = lazy(() => import('./pages/CompareKids').then(m => ({ default: m.CompareKids })));
const GeniusProfileData = lazy(() => import('./pages/GeniusProfileData').then(m => ({ default: m.GeniusProfileData })));
const ParentClassBookings = lazy(() => import('./pages/ParentClassBookings').then(m => ({ default: m.ParentClassBookings })));
const ParentClassBookingPage = lazy(() => import('./pages/ParentClassBookingPage').then(m => ({ default: m.ParentClassBookingPage })));
const AIpreneurDashboard = lazy(() => import('./pages/AIpreneurDashboard').then(m => ({ default: m.AIpreneurDashboard })));
const CreateProductModule = lazy(() => import('./pages/CreateProductModule').then(m => ({ default: m.CreateProductModule })));
const DecorateModule = lazy(() => import('./pages/DecorateModule').then(m => ({ default: m.DecorateModule })));
const OperationModule = lazy(() => import('./pages/OperationModule').then(m => ({ default: m.OperationModule })));
const MarketingModule = lazy(() => import('./pages/MarketingModule').then(m => ({ default: m.MarketingModule })));
const InnovationModule = lazy(() => import('./pages/InnovationModule').then(m => ({ default: m.InnovationModule })));
const CSRModule = lazy(() => import('./pages/CSRModule').then(m => ({ default: m.CSRModule })));
const ManageShopPage = lazy(() => import('./pages/ManageShopPage').then(m => ({ default: m.ManageShopPage })));
const PublicShopPage = lazy(() => import('./pages/PublicShopPage').then(m => ({ default: m.PublicShopPage })));
const ExploreShopsPage = lazy(() => import('./pages/ExploreShopsPage').then(m => ({ default: m.ExploreShopsPage })));
const MyOnlineStorePage = lazy(() => import('./pages/MyOnlineStorePage').then(m => ({ default: m.MyOnlineStorePage })));
const FinancePage = lazy(() => import('./pages/FinancePage').then(m => ({ default: m.FinancePage })));
const AITokensPage = lazy(() => import('./pages/AITokensPage').then(m => ({ default: m.AITokensPage })));
const PaymentCallbackPage = lazy(() => import('./pages/PaymentCallbackPage').then(m => ({ default: m.PaymentCallbackPage })));
const CodingWorkshopPage = lazy(() => import('./pages/CodingWorkshopPage').then(m => ({ default: m.CodingWorkshopPage })));
const ClassBookingPage = lazy(() => import('./pages/ClassBookingPage').then(m => ({ default: m.ClassBookingPage })));
const TokenHistoryPage = lazy(() => import('./pages/TokenHistoryPage').then(m => ({ default: m.TokenHistoryPage })));
const ShopAnalyticsPage = lazy(() => import('./pages/ShopAnalyticsPage').then(m => ({ default: m.ShopAnalyticsPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
// Public legal + help pages — all three live in one chunk via the
// LegalPages module so we don't add three separate route bundles.
const PrivacyPage = lazy(() => import('./pages/LegalPages').then(m => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import('./pages/LegalPages').then(m => ({ default: m.TermsPage })));
const SupportPage = lazy(() => import('./pages/LegalPages').then(m => ({ default: m.SupportPage })));

function RouteFallback() {
  return (
    <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-sky-400 via-cyan-500 to-teal-500">
      <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
    </div>
  );
}

const isNativeApp = typeof (window as any).Capacitor !== 'undefined';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <GeniusAuthProvider>
          <TokenUsageProvider>
            <CompanionProvider>
            <BrowserRouter>
              {/* RoundFrame: a no-op on rectangular screens; on round
                  displays (detected by useScreenShape — any ≈1:1
                  viewport, or ?shape=round) it creates a containing
                  block via `transform: translate(0)` AND adds the
                  ~13vmin inscribed-square padding, so every fixed
                  chrome element (nav, dock, FABs, modals) snaps inside
                  the visible circle without per-component changes. */}
              <div className="round-frame">
              <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={isNativeApp ? <Navigate to="/login" replace /> : <Landing />} />
                <Route path="/demo" element={<DemoPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/register" element={<RegisterStudent />} />
                <Route path="/register/student" element={<RegisterStudent />} />
                <Route path="/register/teacher" element={<RegisterTeacher />} />
                <Route path="/register/parent" element={<RegisterParent />} />

                {/* Public Shop Route - No Auth Required */}
                <Route path="/shop/:shop_slug" element={<PublicShopPage />} />

                {/* Public legal + help pages — linked from the landing
                    footer. Available to authenticated and anonymous
                    visitors alike. */}
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/support" element={<SupportPage />} />

                {/* Payment Callback Route - No Auth Required (redirect from payment gateway) */}
                <Route path="/payment/callback" element={<PaymentCallbackPage />} />

                <Route
                  path="/s/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <StudentDashboard />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/s/create"
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <StudentCreate />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/s/storybook/:chapterId"
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <StorybookCreate />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/s/rewards"
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <RewardsPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/s/profile"
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/s/store"
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <StorePage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/s/persona"
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <MyPersona />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/s/coding-workshop"
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <CodingWorkshopPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/s/classes"
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <ClassBookingPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/s/ai-data"
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <GeniusProfileData />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/s/aipreneur"
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <AIpreneurDashboard />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/s/aipreneur/manage"
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <ManageShopPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/s/aipreneur/store"
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <MyOnlineStorePage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/s/aipreneur/product"
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <CreateProductModule />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/s/aipreneur/decorate"
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <DecorateModule />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/s/aipreneur/operation"
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <OperationModule />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/s/aipreneur/marketing"
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <MarketingModule />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/s/aipreneur/innovation"
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <InnovationModule />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/s/aipreneur/csr"
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <CSRModule />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/s/aipreneur/finance"
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <FinancePage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/s/aipreneur/explore"
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <ExploreShopsPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/s/aipreneur/ai-tokens"
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <AITokensPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/s/aipreneur/profile"
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/s/aipreneur/rewards"
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <RewardsPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/s/aipreneur/tokens"
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <TokenHistoryPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/s/aipreneur/analytics"
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <ShopAnalyticsPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/s/settings"
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <SettingsPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/s/aipreneur/public-shop"
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <PublicShopPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/t/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['teacher']}>
                      <TeacherDashboard />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/p/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['parent']}>
                      <ParentDashboard />
                    </ProtectedRoute>
                  }
                />

                <Route path="/parent/genius-profiles" element={<GeniusProfileManager />} />
                <Route path="/parent/genius-profiles/add" element={<AddGeniusProfile />} />
                <Route path="/parent/genius-profiles/:profileId/edit" element={<EditGeniusProfile />} />
                <Route path="/parent/genius-profiles/:profileId/assessment" element={<GeniusAssessment />} />
                <Route path="/parent/genius-profiles/:profileId/analysis/:quizId" element={<AIAnalysis />} />
                <Route path="/parent/genius-profiles/:profileId/priorities/:quizId" element={<PrioritySelection />} />
                <Route path="/parent/genius-profiles/:profileId/success" element={<ProfileSuccess />} />
                <Route path="/parent/genius-profiles/:profileId/persona" element={<ParentViewPersona />} />
                <Route path="/parent/genius-profiles/:profileId/topup" element={
                  <ProtectedRoute allowedRoles={['parent']}>
                    <ParentCoinTopup />
                  </ProtectedRoute>
                } />
                <Route path="/parent/compare-kids" element={
                  <ProtectedRoute allowedRoles={['parent']}>
                    <CompareKids />
                  </ProtectedRoute>
                } />

                <Route path="/p/classes" element={
                  <ProtectedRoute allowedRoles={['parent']}>
                    <ParentClassBookings />
                  </ProtectedRoute>
                } />

                <Route path="/p/book-class" element={
                  <ProtectedRoute allowedRoles={['parent']}>
                    <ParentClassBookingPage />
                  </ProtectedRoute>
                } />

                <Route
                  path="/m/dashboard"
                  element={<Navigate to="/admin/dashboard" replace />}
                />

                <Route
                  path="/admin/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['master']}>
                      <AdminDashboardOverview />
                    </ProtectedRoute>
                  }
                />

                <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

                <Route
                  path="/admin/members"
                  element={
                    <ProtectedRoute allowedRoles={['master']}>
                      <AdminMembers />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/admin/academy"
                  element={
                    <ProtectedRoute allowedRoles={['master']}>
                      <AdminAcademy />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/admin/check-in"
                  element={
                    <ProtectedRoute allowedRoles={['master']}>
                      <AdminCheckIn />
                    </ProtectedRoute>
                  }
                />

                {/* Event Workshops admin + staff scanner live in
                 *  the artventure superadmin Blade UI (this React
                 *  app is student-only). See
                 *  artventure/resources/views/superadmin/event-workshops/
                 *  and artventure/routes/superadmin.php. */}

                {/* Demo module pages — accessible only via /demo flow.
                 *  Each is fully isolated: state lives in localStorage
                 *  under `aipreneur_demo_*` keys and never touches the
                 *  live `/s/aipreneur/*` data layer or backend API. */}
                <Route path="/demo/decorate"   element={<DemoDecoratePage />} />
                <Route path="/demo/product"    element={<DemoProductPage />} />
                <Route path="/demo/operation"  element={<DemoOperationPage />} />
                <Route path="/demo/marketing"  element={<DemoMarketingPage />} />
                <Route path="/demo/innovation" element={<DemoInnovationPage />} />
                <Route path="/demo/csr"        element={<DemoCSRPage />} />
                <Route path="/demo/finance"    element={<DemoFinancePage />} />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              </Suspense>
              </div>
            </BrowserRouter>
            </CompanionProvider>
          </TokenUsageProvider>
        </GeniusAuthProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

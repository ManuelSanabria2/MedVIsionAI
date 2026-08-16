import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import LandingPage from '../pages/LandingPage';

// Lazy loading de páginas para un rendimiento clínico superior (LCP < 2.5s, chunks < 250KB)
const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const AnalyzePage = lazy(() => import('../pages/AnalyzePage'));
const HistoryPage = lazy(() => import('../pages/HistoryPage'));
const AnalysisDetailPage = lazy(() => import('../pages/AnalysisDetailPage'));
const ModelsPage = lazy(() => import('../pages/ModelsPage'));
const SettingsView = lazy(() => import('../views/SettingsView').then(m => ({ default: m.SettingsView })));
const HelpView = lazy(() => import('../views/HelpView').then(m => ({ default: m.HelpView })));
const LoginPage = lazy(() => import('../pages/LoginPage'));

// Skeleton unificado de grado médico para Suspense fallback
const ClinicalLoader = () => (
  <div className="flex flex-col items-center justify-center p-12 min-h-[60vh] select-none font-sans">
    <div className="w-8 h-8 border-3 border-brand-cyan border-t-transparent rounded-full animate-spin mb-3"></div>
    <span className="text-[10px] text-brand-gray font-bold tracking-widest uppercase">
      Cargando expediente clínico unificado...
    </span>
  </div>
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/login',
    element: (
      <Suspense fallback={<ClinicalLoader />}>
        <LoginPage />
      </Suspense>
    ),
  },
  {
    path: '/app',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: '',
        element: (
          <ProtectedRoute allowedRoles={['radiologist', 'researcher', 'admin']}>
            <Suspense fallback={<ClinicalLoader />}>
              <DashboardPage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'analyze',
        element: (
          <ProtectedRoute allowedRoles={['radiologist', 'admin']}>
            <Suspense fallback={<ClinicalLoader />}>
              <AnalyzePage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'history',
        element: (
          <ProtectedRoute allowedRoles={['radiologist', 'researcher', 'admin']}>
            <Suspense fallback={<ClinicalLoader />}>
              <HistoryPage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'history/:id',
        element: (
          <ProtectedRoute allowedRoles={['radiologist', 'researcher', 'admin']}>
            <Suspense fallback={<ClinicalLoader />}>
              <AnalysisDetailPage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'models',
        element: (
          <ProtectedRoute allowedRoles={['admin']}>
            <Suspense fallback={<ClinicalLoader />}>
              <ModelsPage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'settings',
        element: (
          <ProtectedRoute allowedRoles={['radiologist', 'researcher', 'admin']}>
            <Suspense fallback={<ClinicalLoader />}>
              <SettingsView />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'help',
        element: (
          <ProtectedRoute allowedRoles={['radiologist', 'researcher', 'admin']}>
            <Suspense fallback={<ClinicalLoader />}>
              <HelpView />
            </Suspense>
          </ProtectedRoute>
        ),
      },
    ],
  },
]);

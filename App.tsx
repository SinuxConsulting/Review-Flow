
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import PublicReviewPage from './pages/public/PublicReviewPage';
import FeedbackFormPage from './pages/public/FeedbackFormPage';
import ThankYouPage from './pages/public/ThankYouPage';
import SuperDashboard from './pages/super/SuperDashboard';
import SuperLogin from './pages/super/SuperLogin';
import BusinessAdminDashboard from './pages/admin/BusinessAdminDashboard';
import BusinessAdminFeedback from './pages/admin/BusinessAdminFeedback';
import BusinessAdminLinksQr from './pages/admin/BusinessAdminLinksQr';
import BusinessAdminSettings from './pages/admin/BusinessAdminSettings';
import BusinessLogin from './pages/admin/BusinessLogin';
import AdminLayout from './components/layouts/AdminLayout';
import { authService } from './services/authService';
import { UserRole } from './types';

const ProtectedRoute = ({ children, allowedRole }: { children: React.ReactNode, allowedRole?: UserRole }) => {
  const session = authService.getSession();
  if (!session) return <Navigate to="/super/login" />;
  if (allowedRole && session.role !== allowedRole) return <Navigate to="/" />;
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        {/* Public Customer Routes */}
        <Route path="/r/:slug" element={<PublicReviewPage />} />
        <Route path="/r/:slug/feedback" element={<FeedbackFormPage />} />
        <Route path="/r/:slug/thanks" element={<ThankYouPage />} />

        {/* Super Admin Routes */}
        <Route path="/super/login" element={<SuperLogin />} />
        <Route path="/super" element={
          <ProtectedRoute allowedRole={UserRole.SUPER}>
            <SuperDashboard />
          </ProtectedRoute>
        } />

        {/* Business Admin Routes */}
        <Route path="/p/:slug/login" element={<BusinessLogin />} />
        <Route path="/p/:slug/admin" element={
          /* Fix: Wrapped component in ProtectedRoute as children */
          <ProtectedRoute>
            <AdminLayout>
              <BusinessAdminDashboard />
            </AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/p/:slug/admin/feedback" element={
          /* Fix: Wrapped component in ProtectedRoute as children */
          <ProtectedRoute>
            <AdminLayout>
              <BusinessAdminFeedback />
            </AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/p/:slug/admin/links" element={
          <ProtectedRoute>
            <AdminLayout>
              <BusinessAdminLinksQr />
            </AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/p/:slug/admin/settings" element={
          /* Fix: Wrapped component in ProtectedRoute as children */
          <ProtectedRoute>
            <AdminLayout>
              <BusinessAdminSettings />
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/" element={<Navigate to="/super" />} />
      </Routes>
    </HashRouter>
  );
};

export default App;

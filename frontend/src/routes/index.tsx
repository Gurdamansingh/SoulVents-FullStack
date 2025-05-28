import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import UserLayout from '../layouts/UserLayout';
import AdminLayout from '../layouts/AdminLayout';
import ExpertLayout from '../layouts/ExpertLayout';
import Home from '../pages/Home';
import About from '../pages/About';
import Join from '../pages/Join';
import Consultants from '../pages/Consultants';
import Professionals from '../pages/Professionals';
import Blog from '../pages/Blog';
import BlogDetail from '../pages/BlogDetail';
import Profile from '../pages/Profile';
import Credits from '../pages/Credits';
import CreditHistory from '../pages/CreditHistory';
import SafeSpace from '../pages/SafeSpace';
import Admin from '../pages/Admin';
import AdminDashboard from '../pages/admin/Dashboard';
import ExpertPortal from '../pages/ExpertPortal';
import ExpertOnboarding from '../pages/ExpertOnboarding';
import Auth from '../pages/Auth';
import RequireAuth from '../components/RequireAuth';
import RequireAdmin from '../components/RequireAdmin';
import RequireExpert from '../components/RequireExpert';
import Testimonials from '../pages/Testimonials';

const AppRoutes = () => {
  return (
    <Routes>
      {/* Auth routes - no layout */}
      <Route path="/auth" element={<Auth />} />

      {/* User routes */}
      <Route element={<UserLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/join" element={<Join />} />
        <Route path="/consultants" element={<Consultants />} />
        <Route path="/professionals" element={<Professionals />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogDetail />} />
        {/* <Route path="/safespace" element={<SafeSpace />} /> */}
        <Route path="/testimonials" element={<Testimonials />} />
        <Route
          path="/profile"
          element={
            <RequireAuth>
              <Profile />
            </RequireAuth>
          }
        />
        <Route
          path="/credits"
          element={
            <RequireAuth>
              <Credits />
            </RequireAuth>
          }
        />
        <Route
          path="/credit-history"
          element={
            <RequireAuth>
              <CreditHistory />
            </RequireAuth>
          }
        />
      </Route>

      {/* Admin routes */}
      <Route path="/admin" element={<Admin />} />
      <Route
        path="/admin/dashboard"
        element={
          <RequireAdmin>
            <AdminDashboard />
          </RequireAdmin>
        }
      />

      {/* Expert routes */}
      <Route element={<ExpertLayout />}>
        <Route
          path="/expert"
          element={
            <RequireExpert>
              <ExpertPortal />
            </RequireExpert>
          }
        />
        <Route path="/expert-onboarding" element={<ExpertOnboarding />} />
      </Route>

      {/* Catch all route - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
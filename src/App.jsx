import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './layouts/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import CourseManage from './pages/admin/CourseManage';
import FormBuilder from './pages/admin/FormBuilder';
import ResponseViewer from './pages/admin/ResponseViewer';
import ResponseTable from './pages/admin/ResponseTable';
import CalendarPage from './pages/admin/CalendarPage';
import Login from './pages/admin/Login';

import LiffLayout from './layouts/LiffLayout';
import LiffHome from './pages/liff/Home';
import LiffMyCourses from './pages/liff/MyCourses';
import LiffAssessment from './pages/liff/Assessment';
import LiffProfile from './pages/liff/Profile';
import CourseDetail from './pages/liff/CourseDetail';

import { PERMISSIONS } from './lib/permissions';

import ErrorBoundary from './components/ErrorBoundary';

const TraineeList = () => <div className="p-4">Trainee List (Coming Soon)</div>;

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Admin Login - Public */}
            <Route path="/admin/login" element={<Login />} />

            {/* Admin Layout - All Authenticated Admins/Staff */}
            <Route path="/admin" element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }>
              {/* Dashboard - Admin Only */}
              <Route index element={
                <ProtectedRoute allowedRoles={PERMISSIONS.VIEW_DASHBOARD}>
                  <Dashboard />
                </ProtectedRoute>
              } />

              {/* Course Management - Admin Only */}
              <Route path="courses" element={
                <ProtectedRoute allowedRoles={PERMISSIONS.MANAGE_COURSES}>
                  <CourseManage />
                </ProtectedRoute>
              } />

              {/* Form Builder - Admin Only */}
              <Route path="forms" element={
                <ProtectedRoute allowedRoles={PERMISSIONS.MANAGE_FORMS}>
                  <FormBuilder />
                </ProtectedRoute>
              } />

              {/* Responses - Admin & Staff */}
              <Route path="responses" element={
                <ProtectedRoute allowedRoles={PERMISSIONS.VIEW_RESPONSES}>
                  <ResponseViewer />
                </ProtectedRoute>
              } />

              {/* Response Table - Admin & Staff */}
              <Route path="response-table" element={
                <ProtectedRoute allowedRoles={PERMISSIONS.VIEW_RESPONSES}>
                  <ResponseTable />
                </ProtectedRoute>
              } />

              {/* Trainee List - Admin Only */}
              <Route path="trainees" element={
                <ProtectedRoute allowedRoles={PERMISSIONS.MANAGE_TRAINEES}>
                  <TraineeList />
                </ProtectedRoute>
              } />

              {/* Calendar - Admin & Staff */}
              <Route path="calendar" element={
                <ProtectedRoute allowedRoles={PERMISSIONS.VIEW_RESPONSES}>
                  <CalendarPage />
                </ProtectedRoute>
              } />
            </Route>

            {/* LIFF Routes */}
            <Route path="/liff" element={<LiffLayout />}>
              <Route index element={<LiffHome />} />
              <Route path="my-courses" element={<LiffMyCourses />} />
              <Route path="assessment/:courseId" element={<LiffAssessment />} />
              <Route path="profile" element={<LiffProfile />} />
            </Route>

            {/* LIFF Course Detail - Full screen without bottom nav */}
            <Route path="/liff/course/:courseId" element={<CourseDetail />} />

            {/* Default Redirect */}
            <Route path="/" element={<Navigate to="/admin" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;

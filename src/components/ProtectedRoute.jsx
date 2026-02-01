import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    const { currentUser, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!currentUser) {
        // Redirect to login page, but save the attempted url
        return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }

    // RBAC: Check if user has permission
    if (allowedRoles.length > 0 && !allowedRoles.includes(currentUser.role)) {
        // Redirect unauthorized users to a allowed page or show 403
        // For now, redirect to response viewer which is the base allowed page for staff
        return <Navigate to="/admin/responses" replace />;
    }

    return children;
};

export default ProtectedRoute;

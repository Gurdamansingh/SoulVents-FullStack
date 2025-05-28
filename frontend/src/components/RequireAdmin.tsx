import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface RequireAdminProps {
    children: React.ReactNode;
}

const RequireAdmin: React.FC<RequireAdminProps> = ({ children }) => {
    const { isAuthenticated, user } = useAuth();
    const location = useLocation();

    if (!isAuthenticated) {
        return <Navigate to="/admin" state={{ from: location }} replace />;
    }

    if (user?.role?.toUpperCase() !== 'ADMIN') {
        return <Navigate to="/admin" replace />;
    }

    return <>{children}</>;
};

export default RequireAdmin;
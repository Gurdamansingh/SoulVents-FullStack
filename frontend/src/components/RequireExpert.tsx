import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface RequireExpertProps {
    children: React.ReactNode;
}

const RequireExpert: React.FC<RequireExpertProps> = ({ children }) => {
    const { isAuthenticated, user } = useAuth();
    const location = useLocation();

    if (!isAuthenticated) {
        return <Navigate to="/auth" state={{ from: location }} replace />;
    }

    if (user?.role?.toUpperCase() !== 'EXPERT') {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};

export default RequireExpert;
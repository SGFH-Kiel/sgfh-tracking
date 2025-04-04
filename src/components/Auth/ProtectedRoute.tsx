import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { CircularProgress, Box } from '@mui/material';
import { UserRole } from '../../types/models';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { currentUser, loading } = useApp();
  const location = useLocation();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!currentUser) {
    // Redirect to login while preserving the intended destination
    return <Navigate to="/login" state={{ from: { pathname: location.pathname } }} replace />;
  }

  if (currentUser.roles.includes(UserRole.APPLICANT)) {
    return <Navigate to="/denied" state={{ from: location }} replace />;
  }

  if (currentUser.roles.length === 0) {
    return <Navigate to="/denied" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

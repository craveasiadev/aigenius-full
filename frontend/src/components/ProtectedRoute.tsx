import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGeniusAuth } from '../contexts/GeniusAuthContext';
import { AppLoader } from './ui/AppLoader';
import type { Role } from '../types/models';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: Role[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { currentUser, isLoading: authLoading } = useAuth();
  const { isAuthenticated: isGeniusAuthenticated, isLoading: geniusLoading } = useGeniusAuth();

  // Wait for both auth systems to finish loading before making any decisions
  const isStudentRoute = allowedRoles.includes('student');
  const isStudentOnlyRoute = allowedRoles.length === 1 && allowedRoles[0] === 'student';
  const isAdminRoute = allowedRoles.length === 1 && allowedRoles[0] === 'master';
  const isParentTeacherRoute = allowedRoles.some(r => ['parent', 'teacher', 'master'].includes(r));

  // Theme-aware, cheerful loader — replaces the old var(--bg) card that
  // left a big black band on tall mobile screens.
  if (isStudentRoute && geniusLoading) {
    return (
      <AppLoader
        title="Loading your shop…"
        hints={[
          'Checking your session',
          'Waking up the city',
          'Almost there',
        ]}
      />
    );
  }

  if (isParentTeacherRoute && authLoading) {
    return (
      <AppLoader
        title="Loading…"
        hints={[
          'Checking your session',
          'Getting things ready',
        ]}
      />
    );
  }

  // Check student authentication (genius token)
  if (isStudentRoute && isGeniusAuthenticated) {
    console.log('[ProtectedRoute] Student authenticated via genius token');
    return <>{children}</>;
  }

  // Student-only pages must use genius auth context
  if (isStudentOnlyRoute) {
    console.log('[ProtectedRoute] Student-only route, not authenticated via genius token, redirecting');
    return <Navigate to="/login" replace />;
  }

  // Check parent/teacher/master authentication (auth token)
  if (currentUser && allowedRoles.includes(currentUser.role)) {
    console.log('[ProtectedRoute] User authenticated:', currentUser.role);
    return <>{children}</>;
  }

  // If we get here, user is not authenticated or doesn't have the right role
  if (!currentUser && !isGeniusAuthenticated) {
    console.log('[ProtectedRoute] Not authenticated, redirecting to login');
    return <Navigate to={isAdminRoute ? '/admin/login' : '/login'} replace />;
  }

  // User is authenticated but wrong role
  console.log('[ProtectedRoute] Wrong role, redirecting to home');
  return <Navigate to="/" replace />;
};

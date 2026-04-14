import { useAuthStore } from '../store/authStore';

export function useAuth() {
  const { user, isAuthenticated, isLoading, error, login, logout, loadUser, clearError } =
    useAuthStore();

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    loadUser,
    clearError,
    isAgent: user?.role === 'agent',
    isSales: user?.role === 'sales',
    isAdmin: user?.role === 'admin',
  };
}

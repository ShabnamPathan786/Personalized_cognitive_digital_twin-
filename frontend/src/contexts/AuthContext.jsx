import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/authApi';
import { profileApi } from '../api/profileApi';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check localStorage on mount (no API call)
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const sessionId = localStorage.getItem('sessionId');
    
    if (storedUser && storedUser !== 'undefined' && sessionId) {
      try {
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('sessionId');
      }
    }
    setLoading(false);
  }, []);

  const login = async (credentials) => {
    try {
      const response = await authApi.login(credentials);
      if (response.success) {
        const userData = response.data.user;
        const sessionId = response.data.sessionId;
        
        // Store in localStorage
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('sessionId', sessionId);
        
        setUser(userData);
        setIsAuthenticated(true);
        return { success: true, data: response.data };
      }
      return { success: false, message: response.message };
    } catch (error) {
      console.error('Login failed:', error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed',
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authApi.register(userData);
      if (response.success) {
        return { success: true, data: response.data };
      }
      return { success: false, message: response.message };
    } catch (error) {
      console.error('Registration failed:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed',
      };
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('user');
      localStorage.removeItem('sessionId');
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await profileApi.completeProfile(profileData);
      if (response.success) {
        const updatedUser = { ...user, ...response.data, profileCompleted: true };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        return { success: true, data: response.data };
      }
      return { success: false, message: response.message || 'Failed to update profile' };
    } catch (error) {
      console.error('Profile update failed:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update profile',
      };
    }
  };

  // Refresh user data from server (optional - call when needed)
  const refreshUser = async () => {
    try {
      const response = await authApi.getCurrentUser();
      if (response.success) {
        localStorage.setItem('user', JSON.stringify(response.data));
        setUser(response.data);
      }
    } catch (error) {
      console.error('Refresh user failed:', error);
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    updateProfile,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
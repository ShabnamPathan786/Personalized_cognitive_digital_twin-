import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/authApi';
import { profileApi } from '../api/profileApi'; // ✅ Import profileApi
import axios from '../api/axios';

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

  // Check if user is logged in on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await authApi.getCurrentUser();
      if (response.success) {
        setUser(response.data);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      const response = await authApi.login(credentials);
      if (response.success) {
        setUser(response.data.user);
        setIsAuthenticated(true);
        return { success: true, data: response.data };
      }
      return { success: false, message: response.message };
    } catch (error) {
      console.error('Login failed:', error);
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
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  // ✅ FIXED: Use profileApi instead of direct axios call
  // ✅ Now matches the structure from profileApi.js
  const updateProfile = async (profileData) => {
    try {
      // Use profileApi which already has consistent response wrapping
      const response = await profileApi.completeProfile(profileData);

      if (response.success) {
        // Update user state with the returned data
        setUser(prevUser => ({
          ...prevUser,
          ...response.data,
          profileCompleted: true
        }));

        // Also update isAuthenticated if needed
        setIsAuthenticated(true);

        return {
          success: true,
          data: response.data
        };
      }

      return {
        success: false,
        message: response.message || 'Failed to update profile'
      };
    } catch (error) {
      console.error('Profile update failed:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update profile',
      };
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    checkAuth,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

const API_URL = 'http://localhost:5000';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  if (token) {
    axios.defaults.headers.common['x-auth-token'] = token;
  }

  useEffect(() => {
    if (token) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const loadUser = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/auth/me`);
      console.log('✅ User loaded:', res.data);
      setUser(res.data);
      setLoading(false);
    } catch (err) {
      console.error('❌ Error loading user:', err);
      localStorage.removeItem('token');
      setToken(null);
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const res = await axios.post(`${API_URL}/api/auth/login`, { email, password });
      console.log('✅ Login response:', res.data);
      
      const userData = res.data.user;
      console.log('✅ User data:', userData);
      console.log('✅ Profile picture:', userData.profilePicture);
      
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
      axios.defaults.headers.common['x-auth-token'] = res.data.token;
      
      setUser(userData);
      return { success: true };
    } catch (err) {
      console.error('❌ Login error:', err.response?.data);
      return { success: false, error: err.response?.data?.msg || 'Login failed' };
    }
  };

  const register = async (username, email, password) => {
    try {
      const res = await axios.post(`${API_URL}/api/auth/register`, { username, email, password });
      console.log('✅ Register response:', res.data);
      
      const userData = res.data.user;
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
      axios.defaults.headers.common['x-auth-token'] = res.data.token;
      setUser(userData);
      return { success: true };
    } catch (err) {
      console.error('❌ Register error:', err.response?.data);
      return { success: false, error: err.response?.data?.msg || 'Registration failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['x-auth-token'];
  };

  const updateUser = (updatedUser) => {
    console.log('🔄 Updating user:', updatedUser);
    console.log('🔄 New profile picture:', updatedUser.profilePicture);
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, token }}>
      {children}
    </AuthContext.Provider>
  );
};
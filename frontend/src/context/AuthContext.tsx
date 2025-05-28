import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, AuthContextType } from '../types';

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Check for saved token and user data
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = async (email: string): Promise<{ email: string }> => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send OTP');
      }

      return { email };
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.message || 'Login failed');
    }
  };

  const signUp = async (email: string, fullName: string): Promise<{ email: string }> => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/register/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, fullName })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
      }

      return { email };
    } catch (error: any) {
      console.error('Registration error:', error);
      throw new Error(error.message || 'Registration failed');
    }
  };

  const verifyOTP = async (email: string, otp: string): Promise<{ user: User; token: string }> => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Invalid OTP');
      }

      const data = await response.json();
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      return data;
    } catch (error: any) {
      console.error('OTP verification error:', error);
      throw new Error(error.message || 'OTP verification failed');
    }
  };

  const verifySignUpOTP = async (email: string, otp: string, fullName: string): Promise<{ user: User; token: string }> => {
    try {
      // Generate a secure random password
      const password = Array(12)
        .fill('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*')
        .map(x => x[Math.floor(Math.random() * x.length)])
        .join('');

      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/register/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          otp, 
          fullName: fullName.trim(),
          password
        })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Registration verification failed:', error);
        throw new Error(error.error || 'Failed to verify registration');
      }

      const data = await response.json();
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      return data;
    } catch (error: any) {
      console.error('Registration error:', error);
      throw new Error(error.message || 'Registration failed');
    }
  };

  const verifyExpertPassword = async (email: string, password: string): Promise<{ user: User; token: string }> => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/expert/verify-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Invalid password');
      }

      const data = await response.json();
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      return data;
    } catch (error: any) {
      console.error('Password verification error:', error);
      throw new Error(error.message || 'Password verification failed');
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated: !!user,
      login,
      signUp,
      verifyOTP,
      verifySignUpOTP,
      verifyExpertPassword,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
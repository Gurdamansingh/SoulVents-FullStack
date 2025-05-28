import React, { useState } from 'react';
import { Shield, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import OTPInput from '../components/OTPInput';
import { useNavigate } from 'react-router-dom';

const Admin = () => {
  const { login, verifyOTP, verifyExpertPassword } = useAuth();
  const navigate = useNavigate();
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });
  const [showOTP, setShowOTP] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError('');

    try {
      await login(loginForm.email);
      setShowOTP(true);
    } catch (error: any) {
      console.error('Login error:', error);
      setLoginError(error.message || 'Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPComplete = async (otp: string) => {
    setIsLoading(true);
    setLoginError('');

    try {
      const response = await verifyOTP(loginForm.email, otp);
      if (response.user.role?.toUpperCase() === 'ADMIN') {
        setShowPassword(true);
      } else {
        setLoginError('Access denied. Admin privileges required.');
      }
    } catch (error: any) {
      setLoginError(error.message || 'Invalid OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError('');

    try {
      await verifyExpertPassword(loginForm.email, loginForm.password);
      navigate('/admin/dashboard');
    } catch (error: any) {
      setLoginError(error.message || 'Invalid password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-rose-500" />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">Admin Portal</h2>
          <p className="mt-2 text-sm text-gray-600">Sign in to access the admin dashboard</p>
        </div>

        {loginError && !showOTP && !showPassword && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
            {loginError}
          </div>
        )}

        {showPassword ? (
          <form className="mt-8 space-y-6" onSubmit={handlePasswordSubmit}>
            <div className="rounded-md shadow-sm">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Enter your admin password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md placeholder-gray-500 focus:outline-none focus:ring-rose-500 focus:border-rose-500 sm:text-sm"
                  placeholder="Enter password"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500"
            >
              {isLoading ? 'Verifying...' : 'Verify Password'}
            </button>
          </form>
        ) : showOTP ? (
          <div className="mt-8 space-y-6">
            <p className="text-center text-gray-600">
              Enter the OTP sent to {loginForm.email}
            </p>
            <OTPInput onComplete={handleOTPComplete} />
            <button
              onClick={() => setShowOTP(false)}
              className="text-sm text-gray-600 hover:text-gray-900 w-full text-center"
            >
              Back to login
            </button>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div className="rounded-md shadow-sm">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md placeholder-gray-500 focus:outline-none focus:ring-rose-500 focus:border-rose-500 sm:text-sm"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 ${isLoading ? 'opacity-75 cursor-not-allowed' : ''
                }`}
            >
              {isLoading ? 'Sending OTP...' : 'Get OTP'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Admin;
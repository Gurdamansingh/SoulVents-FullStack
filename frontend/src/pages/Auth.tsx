import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, ArrowLeft, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import OTPInput from '../components/OTPInput';

const Auth = () => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        fullName: '',
        password: ''
    });
    const [showOTP, setShowOTP] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login, signUp, verifyOTP, verifySignUpOTP, verifyExpertPassword } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // If we're on the auth page and user is already logged in, redirect based on role
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            const user = JSON.parse(savedUser);
            if (user.role?.toUpperCase() === 'ADMIN') {
                navigate('/admin/dashboard');
            } else if (user.role?.toUpperCase() === 'EXPERT') {
                navigate('/expert');
            } else {
                navigate('/');
            }
        }
    }, [navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            if (isSignUp) {
                await signUp(formData.email, formData.fullName);
            } else {
                await login(formData.email);
            }
            setShowOTP(true);
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOTPComplete = async (otp: string) => {
        setError('');
        setIsLoading(true);

        try {
            let response;
            if (isSignUp) {
                response = await verifySignUpOTP(formData.email, otp, formData.fullName);
                // Check if admin/expert needs to set password
                if (response.user.role?.toUpperCase() === 'ADMIN' || response.user.role?.toUpperCase() === 'EXPERT') {
                    setShowPassword(true);
                    return;
                }
                navigate('/');
            } else {
                response = await verifyOTP(formData.email, otp);
                // Check if admin/expert needs to enter password
                if (response.user.role?.toUpperCase() === 'ADMIN' || response.user.role?.toUpperCase() === 'EXPERT') {
                    setShowPassword(true);
                    return;
                }
                navigate('/');
            }
        } catch (err: any) {
            setError(err.message || 'Invalid OTP');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await verifyExpertPassword(formData.email, formData.password);

            // Redirect based on role after password verification
            if (response.user.role?.toUpperCase() === 'ADMIN') {
                navigate('/admin/dashboard');
            } else {
                navigate('/expert');
            }
        } catch (err: any) {
            setError(err.message || 'Invalid password');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <button
                    onClick={() => navigate(-1)}
                    className="absolute top-4 left-4 text-gray-600 hover:text-gray-900"
                >
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <h2 className="text-center text-3xl font-extrabold text-gray-900">
                    {showOTP ? 'Enter OTP' : (isSignUp ? 'Create your account' : 'Sign in to your account')}
                </h2>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    {error && (
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
                            {error}
                        </div>
                    )}

                    {showPassword ? (
                        <div className="space-y-6">
                            <p className="text-center text-gray-600 mb-6">
                                Please enter your password to complete login
                            </p>
                            <form onSubmit={handlePasswordSubmit}>
                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                        Password
                                    </label>
                                    <div className="mt-1">
                                        <input
                                            id="password"
                                            name="password"
                                            type="password"
                                            required
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-rose-500 focus:border-rose-500 sm:text-sm"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500"
                                >
                                    {isLoading ? 'Verifying...' : 'Verify Password'}
                                </button>
                            </form>
                        </div>
                    ) : showOTP ? (
                        <div className="space-y-6">
                            <p className="text-center text-gray-600 mb-6">
                                Please enter the OTP sent to {formData.email}
                            </p>
                            <OTPInput onComplete={handleOTPComplete} />
                            <button
                                onClick={() => setShowOTP(false)}
                                className="w-full text-center text-sm text-gray-600 hover:text-gray-900 mt-4"
                            >
                                Back to {isSignUp ? 'Sign Up' : 'Sign In'}
                            </button>
                        </div>
                    ) : (
                        <form className="space-y-6" onSubmit={handleSubmit}>
                            {isSignUp && (
                                <div>
                                    <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                                        Full Name
                                    </label>
                                    <div className="mt-1 relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <User className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            id="fullName"
                                            name="fullName"
                                            type="text"
                                            required
                                            value={formData.fullName}
                                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                            className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-rose-500 focus:border-rose-500 sm:text-sm"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                    Email address
                                </label>
                                <div className="mt-1 relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-rose-500 focus:border-rose-500 sm:text-sm"
                                        placeholder="you@example.com"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500"
                            >
                                {isLoading ? 'Processing...' : 'Get OTP'}
                            </button>
                        </form>
                    )}

                    {!showOTP && (
                        <div className="mt-6">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-300" />
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white text-gray-500">
                                        {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-6">
                                <button
                                    onClick={() => setIsSignUp(!isSignUp)}
                                    className="w-full flex justify-center py-2 px-4 border border-rose-300 rounded-md shadow-sm text-sm font-medium text-rose-600 bg-white hover:bg-rose-50"
                                >
                                    {isSignUp ? 'Sign in instead' : 'Create a new account'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Auth;
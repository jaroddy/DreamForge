'use client'
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/authContext';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const LoginPage = () => {
    const router = useRouter();
    const { login, signup } = useAuth();
    const [isSignup, setIsSignup] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!email || !password) {
            toast.error('Please fill in all fields');
            return;
        }

        if (email.length > 20) {
            toast.error('Email must be 20 characters or less');
            return;
        }

        if (password.length > 20) {
            toast.error('Password must be 20 characters or less');
            return;
        }

        if (!email.includes('@')) {
            toast.error('Please enter a valid email address');
            return;
        }

        setLoading(true);

        try {
            if (isSignup) {
                await signup(email, password);
                toast.success('Account created successfully! You have 20 tokens to start.');
                setTimeout(() => {
                    router.push('/');
                }, 1000);
            } else {
                await login(email, password);
                toast.success('Logged in successfully!');
                setTimeout(() => {
                    router.push('/');
                }, 500);
            }
        } catch (error) {
            console.error('Auth error:', error);
            
            // Handle Firebase error messages
            let errorMessage = 'Authentication failed';
            if (error.code === 'auth/user-not-found') {
                errorMessage = 'No account found with this email';
            } else if (error.code === 'auth/wrong-password') {
                errorMessage = 'Incorrect password';
            } else if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'Email already in use';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'Password should be at least 6 characters';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Invalid email address';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            toast.error(errorMessage);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-bl from-blue-500 to-gray-100 flex items-center justify-center px-4">
            <ToastContainer position={toast.POSITION.TOP_RIGHT} />
            
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <h1 className="text-5xl font-bold text-white mb-2">DreamForge</h1>
                    <p className="text-white text-lg">Create & Print Your 3D Models</p>
                </div>

                <div className="bg-white rounded-2xl shadow-2xl p-8">
                    <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
                        {isSignup ? 'Create Account' : 'Welcome Back'}
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-gray-700 font-bold mb-2">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                maxLength="20"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter your email"
                                disabled={loading}
                            />
                            <p className="text-xs text-gray-500 mt-1">{email.length}/20 characters</p>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-gray-700 font-bold mb-2">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                maxLength="20"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter your password"
                                disabled={loading}
                            />
                            <p className="text-xs text-gray-500 mt-1">{password.length}/20 characters</p>
                        </div>

                        {isSignup && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <p className="text-sm text-green-800">
                                    🎁 <strong>New users receive 20 free tokens!</strong>
                                </p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full px-6 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold transition duration-300 disabled:bg-gray-300 disabled:cursor-not-allowed text-lg"
                        >
                            {loading ? 'Processing...' : (isSignup ? 'Create Account' : 'Login')}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            onClick={() => setIsSignup(!isSignup)}
                            disabled={loading}
                            className="text-blue-500 hover:text-blue-700 font-medium"
                        >
                            {isSignup 
                                ? 'Already have an account? Login' 
                                : "Don't have an account? Sign up"}
                        </button>
                    </div>

                    <div className="mt-6 pt-6 border-t border-gray-200">
                        <p className="text-xs text-gray-600 text-center">
                            By creating an account, you agree to use the service responsibly.
                        </p>
                    </div>
                </div>

                <div className="mt-6 text-center">
                    <p className="text-white text-sm">
                        Simple, no-frills authentication to get you started quickly.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Gift, Shield, ArrowLeft, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface CreditPlan {
    id: string;
    amount: number;
    credits: number;
    bonus: number;
    popular?: boolean;
}

const creditPlans: CreditPlan[] = [
    {
        id: 'basic',
        amount: 100,
        credits: 100,
        bonus: 0
    },
    {
        id: 'starter',
        amount: 200,
        credits: 200,
        bonus: 0
    },
    {
        id: 'popular',
        amount: 500,
        credits: 500,
        bonus: 50,
        popular: true
    },
    {
        id: 'pro',
        amount: 1000,
        credits: 1000,
        bonus: 100
    },
    {
        id: 'premium',
        amount: 2000,
        credits: 2000,
        bonus: 200
    }
];

const Credits = () => {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const [selectedPlan, setSelectedPlan] = useState<CreditPlan | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [userCredits, setUserCredits] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchUserProfile();
    }, [token]);

    const fetchUserProfile = async () => {
        if (!token) return;

        try {
            setIsLoading(true);
            const response = await fetch(`${import.meta.env.VITE_API_URL}/users/profile`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch user profile');
            }

            const profile = await response.json();
            setUserCredits(profile.credits || 0);
        } catch (error: any) {
            console.error('Error fetching user profile:', error);
            setError(error.message || 'Failed to load user credits');
        } finally {
            setIsLoading(false);
        }
    };

    const initializeRazorpay = () => {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handlePayment = async (plan: CreditPlan) => {
        try {
            setIsProcessing(true);
            setSelectedPlan(plan);

            const res = await initializeRazorpay();
            if (!res) {
                alert('Razorpay SDK failed to load');
                return;
            }

            // Create order on your backend
            const response = await fetch(`${import.meta.env.VITE_API_URL}/users/create-order`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    amount: plan.amount * 100, // Convert to paise
                    credits: plan.credits + plan.bonus
                })
            });

            const data = await response.json();

            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID,
                amount: plan.amount * 100,
                currency: "INR",
                name: "SoulVents",
                description: `${plan.credits + plan.bonus} Credits`,
                order_id: data.orderId,
                handler: async (response: any) => {
                    try {
                        // Verify payment on your backend
                        const verifyResponse = await fetch(`${import.meta.env.VITE_API_URL}/users/verify-payment`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                orderId: data.orderId,
                                paymentId: response.razorpay_payment_id,
                                signature: response.razorpay_signature,
                                credits: plan.credits + plan.bonus
                            })
                        });

                        const verifyData = await verifyResponse.json();
                        if (verifyData.success) {
                            alert('Payment successful! Credits added to your account.');
                            // Update local credits count
                            fetchUserProfile();
                        }
                    } catch (err) {
                        console.error('Payment verification error:', err);
                        alert('Payment verification failed. Please contact support.');
                    }
                },
                prefill: {
                    name: user?.full_name,
                    email: user?.email
                },
                theme: {
                    color: "#F43F5E" // rose-500
                }
            };

            const paymentObject = new (window as any).Razorpay(options);
            paymentObject.open();
        } catch (error) {
            console.error('Payment error:', error);
            alert('Failed to initiate payment. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center text-gray-600 hover:text-gray-900"
                    >
                        <ArrowLeft className="h-5 w-5 mr-2" />
                        Back
                    </button>
                </div>

                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">Add Credits</h1>
                    <p className="text-lg text-gray-600">Choose a plan that works for you</p>

                    {userCredits !== null && (
                        <div className="mt-4 inline-flex items-center bg-white px-4 py-2 rounded-full shadow-sm">
                            <span className="text-gray-600 mr-2">Your current balance:</span>
                            <span className="text-2xl font-bold text-rose-500">{userCredits} Credits</span>
                        </div>
                    )}
                </div>

                {error && (
                    <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
                        <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2" />
                        <p className="text-red-700">{error}</p>
                    </div>
                )}

                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-rose-500 border-t-transparent"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                        {creditPlans.map((plan) => (
                            <div
                                key={plan.id}
                                className={`bg-white rounded-lg shadow-md p-6 ${plan.popular ? 'border-2 border-rose-500 relative' : ''
                                    }`}
                            >
                                {plan.popular && (
                                    <div className="absolute top-0 right-0 bg-rose-500 text-white px-3 py-1 text-sm font-medium rounded-bl-lg rounded-tr-lg">
                                        Popular
                                    </div>
                                )}

                                <div className="flex items-center justify-center mb-4">
                                    {plan.amount <= 200 ? (
                                        <CreditCard className="h-12 w-12 text-rose-500" />
                                    ) : plan.amount <= 1000 ? (
                                        <Gift className="h-12 w-12 text-rose-500" />
                                    ) : (
                                        <Shield className="h-12 w-12 text-rose-500" />
                                    )}
                                </div>

                                <div className="text-center mb-6">
                                    <div className="text-2xl font-bold mb-2">₹{plan.amount}</div>
                                    <div className="text-gray-600">
                                        {plan.credits} Credits
                                        {plan.bonus > 0 && (
                                            <span className="text-rose-500"> + {plan.bonus} Bonus</span>
                                        )}
                                    </div>
                                </div>

                                <ul className="space-y-3 mb-6">
                                    <li className="flex items-center text-gray-600">
                                        <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                        Chat with Counsellors
                                    </li>
                                    <li className="flex items-center text-gray-600">
                                        <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                        Video calls
                                    </li>
                                    <li className="flex items-center text-gray-600">
                                        <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                        No expiry
                                    </li>
                                </ul>

                                <button
                                    onClick={() => handlePayment(plan)}
                                    disabled={isProcessing}
                                    className={`w-full bg-rose-500 text-white py-2 px-4 rounded-md hover:bg-rose-600 transition-colors ${isProcessing && selectedPlan?.id === plan.id ? 'opacity-75 cursor-not-allowed' : ''
                                        }`}
                                >
                                    {isProcessing && selectedPlan?.id === plan.id
                                        ? 'Processing...'
                                        : 'Buy Now'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="bg-gray-100 rounded-lg p-6">
                    <h2 className="text-lg font-semibold mb-4">How Credits Work</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <h3 className="font-medium mb-2">Flexible Usage</h3>
                            <p className="text-gray-600">Use credits for both chat and video call sessions with our experts.</p>
                        </div>
                        <div>
                            <h3 className="font-medium mb-2">Pay-as-you-go</h3>
                            <p className="text-gray-600">Credits are deducted at the expert's rate per minute during your session.</p>
                        </div>
                        <div>
                            <h3 className="font-medium mb-2">No Expiry</h3>
                            <p className="text-gray-600">Your credits never expire. Use them at your own pace.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Credits;
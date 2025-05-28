import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, IndianRupee, Calendar, Clock, Search, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface CreditTransaction {
    id: string;
    type: 'purchase' | 'usage';
    amount: number;
    description: string;
    timestamp: string;
    payment_id?: string;
    session_id?: string;
    expert_name?: string;
}

const CreditHistory = () => {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'purchases' | 'usage'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [currentBalance, setCurrentBalance] = useState<number | null>(null);

    useEffect(() => {
        if (token) {
            fetchCreditHistory();
            fetchUserProfile();
        }
    }, [token]);

    const fetchCreditHistory = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${import.meta.env.VITE_API_URL}/users/credit-history`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch credit history');
            }

            const data = await response.json();
            setTransactions(data);
        } catch (err: any) {
            console.error('Error fetching credit history:', err);
            setError(err.message || 'Failed to load credit history');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchUserProfile = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/users/profile`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch user profile');
            }

            const profile = await response.json();
            setCurrentBalance(profile.credits || 0);
        } catch (err: any) {
            console.error('Error fetching user profile:', err);
        }
    };

    const filteredTransactions = transactions
        .filter(transaction => {
            // Apply type filter
            if (filter === 'purchases' && transaction.type !== 'purchase') return false;
            if (filter === 'usage' && transaction.type !== 'usage') return false;

            // Apply search filter
            if (searchTerm) {
                const searchLower = searchTerm.toLowerCase();
                return (
                    transaction.description.toLowerCase().includes(searchLower) ||
                    (transaction.expert_name && transaction.expert_name.toLowerCase().includes(searchLower))
                );
            }

            return true;
        })
        .sort((a, b) => {
            const dateA = new Date(a.timestamp).getTime();
            const dateB = new Date(b.timestamp).getTime();
            return sortDirection === 'desc' ? dateB - dateA : dateA - dateB;
        });

    const toggleSortDirection = () => {
        setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
    };

    // Calculate totals
    const totalPurchased = transactions
        .filter(t => t.type === 'purchase')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalUsed = transactions
        .filter(t => t.type === 'usage')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center text-gray-600 hover:text-gray-900"
                    >
                        <ArrowLeft className="h-5 w-5 mr-2" />
                        Back
                    </button>
                </div>

                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4 md:mb-0">Credit History</h1>

                    {currentBalance !== null && (
                        <div className="bg-white px-4 py-2 rounded-lg shadow-sm flex items-center">
                            <span className="text-gray-600 mr-2">Current Balance:</span>
                            <span className="text-xl font-bold text-rose-500">{currentBalance} Credits</span>
                        </div>
                    )}
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white rounded-lg shadow-sm p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Total Purchased</p>
                                <p className="text-2xl font-bold text-green-500">+{totalPurchased}</p>
                            </div>
                            <IndianRupee className="h-8 w-8 text-green-500" />
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Total Used</p>
                                <p className="text-2xl font-bold text-rose-500">-{totalUsed}</p>
                            </div>
                            <Clock className="h-8 w-8 text-rose-500" />
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Current Balance</p>
                                <p className="text-2xl font-bold">{currentBalance}</p>
                            </div>
                            <IndianRupee className="h-8 w-8 text-blue-500" />
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
                    <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-4 md:space-y-0">
                        <div className="relative flex-grow">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search transactions..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 border rounded-md w-full focus:outline-none focus:ring-2 focus:ring-rose-500"
                            />
                        </div>

                        <div className="flex items-center space-x-2">
                            <Filter className="h-5 w-5 text-gray-400" />
                            <select
                                value={filter}
                                onChange={(e) => setFilter(e.target.value as any)}
                                className="border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-500"
                            >
                                <option value="all">All Transactions</option>
                                <option value="purchases">Purchases Only</option>
                                <option value="usage">Usage Only</option>
                            </select>
                        </div>

                        <button
                            onClick={toggleSortDirection}
                            className="flex items-center space-x-1 px-3 py-2 border rounded-md hover:bg-gray-50"
                        >
                            <span>Date</span>
                            {sortDirection === 'desc' ? (
                                <ChevronDown className="h-4 w-4" />
                            ) : (
                                <ChevronUp className="h-4 w-4" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Transactions List */}
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-rose-500 border-t-transparent"></div>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg">
                        {error}
                    </div>
                ) : filteredTransactions.length > 0 ? (
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredTransactions.map((transaction) => (
                                        <tr key={transaction.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <div className="flex items-center">
                                                    <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                                                    <span>{new Date(transaction.timestamp).toLocaleDateString()}</span>
                                                </div>
                                                <div className="text-xs text-gray-400 ml-6">
                                                    {new Date(transaction.timestamp).toLocaleTimeString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900">
                                                {transaction.description}
                                                {transaction.expert_name && (
                                                    <div className="text-xs text-gray-500">Expert: {transaction.expert_name}</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${transaction.type === 'purchase'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-rose-100 text-rose-800'
                                                    }`}>
                                                    {transaction.type === 'purchase' ? 'Purchase' : 'Usage'}
                                                </span>
                                            </td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${transaction.type === 'purchase'
                                                ? 'text-green-600'
                                                : 'text-rose-600'
                                                }`}>
                                                {transaction.type === 'purchase' ? '+' : '-'}
                                                {Math.abs(transaction.amount)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow-sm p-12 text-center text-gray-500">
                        No transactions found.
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreditHistory;
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, Star, IndianRupee, Clock, Award, TrendingUp } from 'lucide-react';

interface AnalyticsData {
    users: {
        total: number;
        regularUsers: number;
        experts: number;
        newUsers30d: number;
    };
    sessions: {
        total: number;
        completed: number;
        last30Days: number;
        averageDuration: number;
        totalRevenue: number;
        revenue30d: number;
    };
    experts: {
        total: number;
        consultants: number;
        professionals: number;
        onlineExperts: number;
        averageRating: number;
    };
    credits: {
        totalTransactions: number;
        purchased: number;
        used: number;
        transactions30d: number;
    };
    dailyStats: Array<{
        date: string;
        sessions: number;
        revenue: number;
    }>;
    topExperts: Array<{
        id: string;
        name: string;
        type: string;
        specialty: string;
        rating: number;
        sessions: number;
        earnings: number;
    }>;
    recentReviews: Array<{
        id: string;
        userName: string;
        expertName: string;
        rating: number;
        comment: string;
        createdAt: string;
    }>;
}

interface AnalyticsDashboardProps {
    data: AnalyticsData;
    isLoading: boolean;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ data, isLoading }) => {
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-rose-500 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Users"
                    value={data.users.total}
                    subValue={`+${data.users.newUsers30d} this month`}
                    icon={<Users className="h-6 w-6 text-rose-500" />}
                />
                <StatCard
                    title="Active Experts"
                    value={data.experts.onlineExperts}
                    subValue={`${data.experts.total} total experts`}
                    icon={<Star className="h-6 w-6 text-rose-500" />}
                />
                <StatCard
                    title="Monthly Revenue"
                    value={`₹${data.sessions.revenue30d}`}
                    subValue={`${data.sessions.last30Days} sessions`}
                    icon={<IndianRupee className="h-6 w-6 text-rose-500" />}
                />
                <StatCard
                    title="Avg Session Duration"
                    value={`${data.sessions.averageDuration} min`}
                    subValue={`${data.sessions.completed} completed`}
                    icon={<Clock className="h-6 w-6 text-rose-500" />}
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily Sessions Chart */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold mb-4">Daily Sessions</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.dailyStats}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="sessions" fill="#F43F5E" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Daily Revenue Chart */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold mb-4">Daily Revenue</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.dailyStats}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="revenue" fill="#10B981" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Top Experts */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Top Performing Experts</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expert</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sessions</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Earnings</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {data.topExperts.map((expert) => (
                                    <tr key={expert.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10">
                                                    <img
                                                        className="h-10 w-10 rounded-full"
                                                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${expert.id}`}
                                                        alt=""
                                                    />
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">{expert.name}</div>
                                                    <div className="text-sm text-gray-500">{expert.specialty}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${expert.type === 'PROFESSIONAL'
                                                ? 'bg-purple-100 text-purple-800'
                                                : 'bg-blue-100 text-blue-800'
                                                }`}>
                                                {expert.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                                                <span className="ml-1">{expert.rating.toFixed(1)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {expert.sessions}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            ₹{(expert.earnings).toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Recent Reviews */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Reviews</h3>
                <div className="space-y-4">
                    {data.recentReviews.slice(0, 5).map((review) => (
                        <div key={review.id} className="border-b pb-4 last:border-0 last:pb-0">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <span className="font-medium">{review.userName}</span>
                                    <span className="text-gray-500"> → </span>
                                    <span className="font-medium">{review.expertName}</span>
                                </div>
                                <div className="flex text-yellow-400">
                                    {[...Array(review.rating)].map((_, i) => (
                                        <Star key={i} className="h-4 w-4 fill-current" />
                                    ))}
                                </div>
                            </div>
                            <p className="text-gray-600 text-sm">{review.comment}</p>
                            <p className="text-xs text-gray-500 mt-1">
                                {new Date(review.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

interface StatCardProps {
    title: string;
    value: number | string;
    subValue: string;
    icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subValue, icon }) => (
    <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm text-gray-500">{title}</p>
                <p className="text-2xl font-bold mt-1">{value}</p>
                <p className="text-sm text-gray-500 mt-1">{subValue}</p>
            </div>
            {icon}
        </div>
    </div>
);

export default AnalyticsDashboard;
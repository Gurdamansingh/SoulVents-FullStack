export interface AnalyticsData {
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
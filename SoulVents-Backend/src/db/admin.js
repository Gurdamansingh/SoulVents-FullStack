import { db } from './index.js';

export const adminOperations = {
  getAnalytics: async () => {
    try {
      // Get total users count
      const usersResult = await db.execute(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN role = 'USER' THEN 1 END) as regular_users,
          COUNT(CASE WHEN role = 'EXPERT' THEN 1 END) as experts,
          COUNT(CASE WHEN created_at >= datetime('now', '-30 days') THEN 1 END) as new_users_30d
        FROM users
      `);

      // Get session statistics
      const sessionsResult = await db.execute(`
        SELECT 
          COUNT(*) as total_sessions,
          COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_sessions,
          COUNT(CASE WHEN created_at >= datetime('now', '-30 days') THEN 1 END) as sessions_30d,
          COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN amount ELSE 0 END), 0) as total_revenue,
          COALESCE(SUM(CASE WHEN status = 'COMPLETED' AND created_at >= datetime('now', '-30 days') 
            THEN amount ELSE 0 END), 0) as revenue_30d,
          COALESCE(AVG(CASE WHEN status = 'COMPLETED' THEN duration ELSE NULL END), 0) as avg_duration
        FROM sessions
      `);

      // Get expert statistics
      const expertsResult = await db.execute(`
        SELECT 
          COUNT(*) as total_experts,
          COUNT(CASE WHEN type = 'CONSULTANT' THEN 1 END) as consultants,
          COUNT(CASE WHEN type = 'PROFESSIONAL' THEN 1 END) as professionals,
          COUNT(CASE WHEN is_online = 1 THEN 1 END) as online_experts,
          COALESCE(AVG(rating), 0) as avg_rating
        FROM experts
      `);

      // Get credit transaction statistics
      const creditsResult = await db.execute(`
        SELECT 
          COUNT(*) as total_transactions,
          COALESCE(SUM(CASE WHEN type = 'purchase' THEN amount ELSE 0 END), 0) as total_credits_purchased,
          COALESCE(SUM(CASE WHEN type = 'usage' THEN amount ELSE 0 END), 0) as total_credits_used,
          COUNT(CASE WHEN created_at >= datetime('now', '-30 days') THEN 1 END) as transactions_30d
        FROM credit_transactions
      `);

      // Get daily stats for the last 30 days
      const dailyStatsResult = await db.execute(`
        SELECT 
          date(created_at) as date,
          COUNT(*) as sessions,
          COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN amount ELSE 0 END), 0) as revenue
        FROM sessions
        WHERE created_at >= datetime('now', '-30 days')
        GROUP BY date(created_at)
        ORDER BY date DESC
      `);

      // Get top performing experts
      const topExpertsResult = await db.execute(`
        SELECT 
          e.id,
          u.full_name,
          e.type,
          e.specialty,
          e.rating,
          COUNT(s.id) as total_sessions,
          COALESCE(SUM(s.amount), 0) as total_earnings
        FROM experts e
        JOIN users u ON e.user_id = u.id
        LEFT JOIN sessions s ON e.id = s.expert_id AND s.status = 'COMPLETED'
        GROUP BY e.id
        ORDER BY total_earnings DESC
        LIMIT 5
      `);

      // Get recent reviews
      const recentReviewsResult = await db.execute(`
        SELECT 
          r.*,
          u.full_name as user_name,
          eu.full_name as expert_name
        FROM reviews r
        JOIN users u ON r.user_id = u.id
        JOIN experts e ON r.expert_id = e.id
        JOIN users eu ON e.user_id = eu.id
        ORDER BY r.created_at DESC
        LIMIT 5
      `);

      return {
        users: {
          total: usersResult.rows[0].total_users,
          regularUsers: usersResult.rows[0].regular_users,
          experts: usersResult.rows[0].experts,
          newUsers30d: usersResult.rows[0].new_users_30d
        },
        sessions: {
          total: sessionsResult.rows[0].total_sessions,
          completed: sessionsResult.rows[0].completed_sessions,
          last30Days: sessionsResult.rows[0].sessions_30d,
          averageDuration: Math.round(sessionsResult.rows[0].avg_duration),
          totalRevenue: sessionsResult.rows[0].total_revenue,
          revenue30d: sessionsResult.rows[0].revenue_30d
        },
        experts: {
          total: expertsResult.rows[0].total_experts,
          consultants: expertsResult.rows[0].consultants,
          professionals: expertsResult.rows[0].professionals,
          onlineExperts: expertsResult.rows[0].online_experts,
          averageRating: parseFloat(expertsResult.rows[0].avg_rating.toFixed(1))
        },
        credits: {
          totalTransactions: creditsResult.rows[0].total_transactions,
          purchased: creditsResult.rows[0].total_credits_purchased,
          used: creditsResult.rows[0].total_credits_used,
          transactions30d: creditsResult.rows[0].transactions_30d
        },
        dailyStats: dailyStatsResult.rows.map(row => ({
          date: row.date,
          sessions: row.sessions,
          revenue: row.revenue
        })),
        topExperts: topExpertsResult.rows.map(expert => ({
          id: expert.id,
          name: expert.full_name,
          type: expert.type,
          specialty: expert.specialty,
          rating: expert.rating,
          sessions: expert.total_sessions,
          earnings: expert.total_earnings
        })),
        recentReviews: recentReviewsResult.rows.map(review => ({
          id: review.id,
          userName: review.user_name,
          expertName: review.expert_name,
          rating: review.rating,
          comment: review.comment,
          createdAt: review.created_at
        }))
      };
    } catch (error) {
      console.error('Error getting analytics:', error);
      throw error;
    }
  }
};
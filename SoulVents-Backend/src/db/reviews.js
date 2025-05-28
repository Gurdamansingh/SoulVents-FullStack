import { randomUUID } from "crypto"

export const reviewOperations = {
  createReview: async (sessionId, userId, expertId, rating, comment) => {
    try {
      const id = randomUUID()
      const createdAt = new Date().toISOString()

      await db.execute({
        sql: `INSERT INTO reviews (id, session_id, user_id, expert_id, rating, comment, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [id, sessionId, userId, expertId, rating, comment, createdAt],
      })

      // Update expert's average rating
      const reviews = await db.execute({
        sql: `SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews FROM reviews WHERE expert_id = ?`,
        args: [expertId],
      })

      const avgRating = reviews.rows[0].avg_rating || 0
      const totalReviews = reviews.rows[0].total_reviews || 0

      console.log(`Updated expert ${expertId} rating to ${avgRating} based on ${totalReviews} reviews`)

      await db.execute({
        sql: `UPDATE experts SET rating = ? WHERE id = ?`,
        args: [avgRating, expertId],
      })

      // Create notification for expert
      await db.execute({
        sql: `INSERT INTO notifications (id, user_id, message, created_at)
            SELECT ?, user_id, ?, CURRENT_TIMESTAMP FROM experts WHERE id = ?`,
        args: [randomUUID(), `You received a ${rating}-star rating from a recent session`, expertId],
      })

      return {
        id,
        sessionId,
        userId,
        expertId,
        rating,
        comment,
        createdAt,
      }
    } catch (error) {
      console.error("Error creating review:", error)
      throw error
    }
  },

  getExpertReviews: async (expertId) => {
    try {
      const result = await db.execute({
        sql: `SELECT r.*, u.full_name as user_name, s.type as session_type
              FROM reviews r
              JOIN users u ON r.user_id = u.id
              JOIN sessions s ON r.session_id = s.id
              WHERE r.expert_id = ?
              ORDER BY r.created_at DESC`,
        args: [expertId],
      })

      return result.rows.map((review) => ({
        ...review,
        userName: review.user_name,
        sessionType: review.session_type,
      }))
    } catch (error) {
      console.error("Error getting expert reviews:", error)
      throw error
    }
  },

  // Add the getSessionReview function to the reviewOperations object
  getSessionReview: async (sessionId) => {
    try {
      const result = await db.execute({
        sql: `SELECT * FROM reviews WHERE session_id = ? LIMIT 1`,
        args: [sessionId],
      })

      return result.rows.length > 0 ? result.rows[0] : null
    } catch (error) {
      console.error("Error getting session review:", error)
      throw error
    }
  },
}

// This is needed for the db variable to be accessible in this module
let db
export const setDb = (database) => {
  db = database
}

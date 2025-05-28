import { randomUUID } from "crypto"

const baseOperations = {
  createExpert: async (
    expertId,
    userId,
    image_url,
    type,
    specialty,
    rate,
    bio,
    languages,
    commissionRate,
    qualifications,
    licenseNumber,
    experience,
  ) => {
    try {
      console.log("Creating expert with params:", {
        expertId,
        userId,
        image_url,
        type,
        specialty,
        rate,
        bio,
        languages: Array.isArray(languages) ? languages : ["English"],
        commissionRate,
        qualifications,
        licenseNumber,
        experience,
      })

      // Ensure all parameters are defined to prevent database errors
      const safeExpertId = expertId || randomUUID()
      const safeUserId = userId || ""
      const safeImageUrl = image_url || ""
      const safeType = type || "CONSULTANT"
      const safeSpecialty = specialty || ""
      const safeRate = rate || 0
      const safeBio = bio || ""
      const safeLanguages = Array.isArray(languages) ? languages : ["English"]
      const safeCommissionRate = commissionRate || 20
      const safeQualifications = qualifications || ""
      const safeLicenseNumber = licenseNumber || ""
      const safeExperience = experience || ""

      await db.execute({
        sql: `INSERT INTO experts (
                id,
                user_id,
                image_url,
                type,
                specialty,
                rate,
                bio,
                languages,
                commission_rate,
                qualifications,
                license_number,
                experience
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          safeExpertId,
          safeUserId,
          safeImageUrl,
          safeType,
          safeSpecialty,
          safeRate,
          safeBio,
          JSON.stringify(safeLanguages),
          safeCommissionRate,
          safeQualifications,
          safeLicenseNumber,
          safeExperience,
        ],
      })

      return {
        id: safeExpertId,
        userId: safeUserId,
        image_url: safeImageUrl,
        type: safeType,
        specialty: safeSpecialty,
        rate: safeRate,
        bio: safeBio,
        languages: safeLanguages,
        commissionRate: safeCommissionRate,
        qualifications: safeQualifications,
        licenseNumber: safeLicenseNumber,
        experience: safeExperience,
      }
    } catch (error) {
      console.error("Error creating expert:", error)
      throw error
    }
  },

  getAllExperts: async () => {
    try {
      const result = await db.execute(`
        SELECT e.*, u.email, u.full_name
        FROM experts e
        JOIN users u ON e.user_id = u.id
      `)

      return result.rows.map((row) => ({
        ...row,
        languages: JSON.parse(row.languages || '["English"]'),
        availability: JSON.parse(row.availability || "{}"),
        is_online: Boolean(row.is_online),
        user: {
          email: row.email,
          fullName: row.full_name,
        },
      }))
    } catch (error) {
      console.error("Error getting all experts:", error)
      throw error
    }
  },

  getExpertById: async (id) => {
    try {
      const result = await db.execute({
        sql: `
          SELECT e.*, u.email, u.full_name
          FROM experts e
          JOIN users u ON e.user_id = u.id
          WHERE e.id = ?
        `,
        args: [id],
      })

      if (!result.rows.length) {
        return null
      }

      const expert = result.rows[0]
      return {
        ...expert,
        languages: JSON.parse(expert.languages || '["English"]'),
        availability: JSON.parse(expert.availability || "{}"),
        user: {
          email: expert.email,
          fullName: expert.full_name,
        },
      }
    } catch (error) {
      console.error("Error getting expert by id:", error)
      throw error
    }
  },

  getExpertByUserId: async (userId) => {
    try {
      // Get expert data with user info
      const expertResult = await db.execute({
        sql: `SELECT e.*, u.email, u.full_name, 
                 (SELECT COUNT(*) FROM sessions WHERE expert_id = e.id AND status = 'COMPLETED') as total_sessions,
                 (SELECT COALESCE(SUM(amount), 0) FROM sessions WHERE expert_id = e.id AND status = 'COMPLETED') as total_earnings,
                 (SELECT COALESCE(SUM(duration), 0) FROM sessions WHERE expert_id = e.id AND status = 'COMPLETED') as total_hours,
                 (SELECT COUNT(*) FROM notifications WHERE user_id = e.user_id AND is_read = 0) as notifications_count
          FROM experts e
          JOIN users u ON e.user_id = u.id
          WHERE e.user_id = ?
        `,
        args: [userId],
      })

      if (!expertResult.rows.length) {
        return null
      }

      const expert = expertResult.rows[0]

      // Get upcoming sessions
      const sessionsResult = await db.execute({
        sql: `
          SELECT s.*, u.full_name as user_full_name
          FROM sessions s
          JOIN users u ON s.user_id = u.id
          WHERE s.expert_id = ? AND s.status = 'SCHEDULED'
          ORDER BY s.start_time ASC
          LIMIT 5
        `,
        args: [expert.id],
      })

      // Get recent feedback
      const feedbackResult = await db.execute({
        sql: `
          SELECT r.*, u.full_name as user_full_name
          FROM reviews r
          JOIN users u ON r.user_id = u.id
          WHERE r.expert_id = ?
          ORDER BY r.created_at DESC
          LIMIT 5
        `,
        args: [expert.id],
      })

      // Get notifications
      const notificationsResult = await db.execute({
        sql: `
          SELECT *
          FROM notifications
          WHERE user_id = ? AND is_read = 0
          ORDER BY created_at DESC
          LIMIT 5
        `,
        args: [userId],
      })

      return {
        ...expert,
        languages: JSON.parse(expert.languages || '["English"]'),
        availability: JSON.parse(expert.availability || "{}"),
        is_online: !!expert.is_online,
        total_earnings: expert.total_earnings || 0,
        total_hours: expert.total_hours || 0,
        upcoming_sessions: sessionsResult.rows.map((session) => ({
          id: session.id,
          user: { full_name: session.user_full_name },
          time: session.start_time,
          duration: session.duration ? `${session.duration} mins` : "TBD",
          type: session.type === "CALL" ? "Video Call" : "Chat",
        })),
        recent_feedback: feedbackResult.rows.map((feedback) => ({
          id: feedback.id,
          user: { full_name: feedback.user_full_name },
          rating: feedback.rating,
          comment: feedback.comment,
          date: new Date(feedback.created_at).toLocaleDateString(),
        })),
        notifications: notificationsResult.rows.map((notification) => ({
          id: notification.id,
          message: notification.message,
          time: new Date(notification.created_at).toLocaleDateString(),
        })),
        user: {
          email: expert.email,
          full_name: expert.full_name,
        },
      }
    } catch (error) {
      console.error("Error getting expert by user ID:", error)
      throw error
    }
  },

  updateExpert: async (id, specialty, rate, bio, languages, qualifications, licenseNumber, experience) => {
    try {
      // Ensure all parameters are defined
      const safeSpecialty = specialty || ""
      const safeRate = rate || 0
      const safeBio = bio || ""
      const safeLanguages = Array.isArray(languages) ? languages : ["English"]
      const safeQualifications = qualifications || ""
      const safeLicenseNumber = licenseNumber || ""
      const safeExperience = experience || ""

      await db.execute({
        sql: `UPDATE experts SET
                specialty = ?,
                rate = ?,
                bio = ?,
                languages = ?,
                qualifications = ?,
                license_number = ?,
                experience = ?
              WHERE id = ?`,
        args: [
          safeSpecialty,
          safeRate,
          safeBio,
          JSON.stringify(safeLanguages),
          safeQualifications,
          safeLicenseNumber,
          safeExperience,
          id,
        ],
      })

      return {
        id,
        specialty: safeSpecialty,
        rate: safeRate,
        bio: safeBio,
        languages: safeLanguages,
        qualifications: safeQualifications,
        licenseNumber: safeLicenseNumber,
        experience: safeExperience,
      }
    } catch (error) {
      console.error("Error updating expert:", error)
      throw error
    }
  },

  deleteExpert: async (id) => {
    try {
      await db.execute({
        sql: "DELETE FROM experts WHERE id = ?",
        args: [id],
      })
    } catch (error) {
      console.error("Error deleting expert:", error)
      throw error
    }
  },

  updateExpertStatus: async (userId, isOnline) => {
    try {
      const onlineStatus = isOnline ? 1 : 0

      await db.execute({
        sql: `
          UPDATE experts 
          SET 
            is_online = ?,
            last_active = CURRENT_TIMESTAMP
          WHERE user_id = ?
        `,
        args: [onlineStatus, userId],
      })

      const expert = await db.execute({
        sql: `
          SELECT e.*, u.email, u.full_name
          FROM experts e
          JOIN users u ON e.user_id = u.id
          WHERE e.user_id = ?
        `,
        args: [userId],
      })

      if (!expert.rows.length) {
        throw new Error("Expert not found")
      }

      return {
        ...expert.rows[0],
        languages: JSON.parse(expert.rows[0].languages || '["English"]'),
        availability: JSON.parse(expert.rows[0].availability || "{}"),
        is_online: Boolean(expert.rows[0].is_online),
        user: {
          email: expert.rows[0].email,
          fullName: expert.rows[0].full_name,
        },
      }
    } catch (error) {
      console.error("Error updating expert status:", error)
      throw error
    }
  },

  updateInactiveExperts: async () => {
    try {
      await db.execute(`
        UPDATE experts
        SET is_online = 0
        WHERE last_active < datetime('now', '-5 minutes')
        AND is_online = 1
      `)
    } catch (error) {
      console.error("Error updating inactive experts:", error)
      throw error
    }
  },
}

// Credit transfer operations
const creditOperations = {
  updateExpertCommissionRate: async (expertId, commissionRate) => {
    try {
      await db.execute({
        sql: `UPDATE experts SET commission_rate = ? WHERE id = ?`,
        args: [commissionRate || 20, expertId],
      })
      return { success: true }
    } catch (error) {
      console.error("Error updating expert commission rate:", error)
      throw error
    }
  },

  transferCredits: async (expertId, amount) => {
    try {
      // Get expert's commission rate
      const expertResult = await db.execute({
        sql: `SELECT commission_rate FROM experts WHERE id = ?`,
        args: [expertId],
      })

      if (!expertResult.rows.length) {
        throw new Error("Expert not found")
      }

      const commissionRate = expertResult.rows[0].commission_rate
      const commission = Math.ceil((amount * commissionRate) / 100)
      const expertAmount = amount - commission

      // Update expert's credits
      await db.execute({
        sql: `UPDATE experts SET credits = credits + ? WHERE id = ?`,
        args: [expertAmount, expertId],
      })

      // Record the credit transfer
      await db.execute({
        sql: `INSERT INTO credit_transfers (
          id, expert_id, total_amount, commission_rate, commission_amount, 
          expert_amount, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        args: [randomUUID(), expertId, amount, commissionRate, commission, expertAmount],
      })

      return {
        totalAmount: amount,
        commissionRate,
        commissionAmount: commission,
        expertAmount,
      }
    } catch (error) {
      console.error("Error transferring credits:", error)
      throw error
    }
  },

  getExpertCredits: async (expertId) => {
    try {
      const result = await db.execute({
        sql: `SELECT credits FROM experts WHERE id = ?`,
        args: [expertId],
      })
      return result.rows[0]?.credits || 0
    } catch (error) {
      console.error("Error getting expert credits:", error)
      throw error
    }
  },
}

// Combine base operations with credit operations
export const expertOperations = {
  ...baseOperations,
  ...creditOperations,
  isUserExpert: async (userId, expertId) => {
    try {
      const result = await db.execute({
        sql: `SELECT e.id 
              FROM experts e 
              JOIN users u ON e.user_id = u.id 
              WHERE u.id = ? AND e.id = ?`,
        args: [userId, expertId],
      })
      return result.rows.length > 0
    } catch (error) {
      console.error("Error checking if user is expert:", error)
      return false
    }
  },
}

// This is needed for the db variable to be accessible in this module
let db
export const setDb = (database) => {
  db = database
}

export const sessionOperations = {
  createSession: async (id, userId, expertId, startTime, duration, status, rate) => {
    try {
      // Determine session type based on duration
      // If duration is null, it's likely a chat/call session that's waiting
      const type = duration === null ? "CHAT" : "CALL"

      // Validate status
      const validStatuses = ["SCHEDULED", "WAITING", "ONGOING", "COMPLETED", "CANCELLED"]
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`)
      }

      await db.execute({
        sql: `INSERT INTO sessions (
                id, user_id, expert_id, type, start_time, duration, status , rate
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [id, userId, expertId, type, startTime, duration, status, rate],
      })

      return { id, userId, expertId, type, startTime, duration, status, rate }
    } catch (error) {
      console.error("Error creating session:", error)
      throw error
    }
  },

  getSessionById: async (id) => {
    try {
      const result = await db.execute({
        sql: `
        SELECT s.*, 
               e.rate, 
               e.specialty, 
               u.full_name as expert_name, 
               u.id as expert_user_id,
               u2.full_name as user_name,
               u2.id as user_id,
               u2.email as user_email
        FROM sessions s
        JOIN experts e ON s.expert_id = e.id
        JOIN users u ON e.user_id = u.id
        JOIN users u2 ON s.user_id = u2.id
        WHERE s.id = ?
      `,
        args: [id],
      })

      if (!result.rows.length) {
        console.log(`No session found with ID: ${id}`)
        return null
      }

      // Get user credits if available
      let userCredits = null
      try {
        const creditsResult = await db.execute({
          sql: `SELECT credits FROM user_profiles WHERE user_id = ?`,
          args: [result.rows[0].user_id],
        })
        if (creditsResult.rows.length > 0) {
          userCredits = creditsResult.rows[0].credits
        }
      } catch (error) {
        console.error("Error fetching user credits:", error)
      }

      // Enhance the session object with additional information
      const session = {
        ...result.rows[0],
        user_credits: userCredits,
        connection_status: result.rows[0].is_connected ? "connected" : "disconnected",
        session_duration: {
          start: result.rows[0].start_time,
          end: result.rows[0].end_time,
          duration_minutes: result.rows[0].duration,
        },
      }

      console.log(`Session retrieved successfully: ${id}`)
      return session
    } catch (error) {
      console.error("Error getting session by ID:", error)
      throw error
    }
  },

  updateSession: async (id, endTime, duration, amount, status) => {
    try {
      await db.execute({
        sql: `UPDATE sessions SET 
                end_time = ?,
                duration = ?,
                amount = ?,
                status = ?,
                is_connected = ?
              WHERE id = ?`,
        args: [endTime, duration, amount, status, status === "ONGOING" ? 1 : 0, id],
      })

      // Update expert's total_sessions count if status is COMPLETED
      if (status === "COMPLETED") {
        await db.execute({
          sql: `UPDATE experts SET
                  total_sessions = total_sessions + 1
                WHERE id = (SELECT expert_id FROM sessions WHERE id = ?)`,
          args: [id],
        })
      }

      // Get the updated session
      const result = await db.execute({
        sql: `SELECT * FROM sessions WHERE id = ?`,
        args: [id],
      })

      return result.rows[0]
    } catch (error) {
      console.error("Error updating session:", error)
      throw error
    }
  },

  getUserSessions: async (userId) => {
    try {
      console.log(`Fetching sessions for user ID: ${userId}`)

      const result = await db.execute({
        sql: `
          SELECT s.*, e.rate, e.specialty, u.full_name as expert_name
          FROM sessions s
          JOIN experts e ON s.expert_id = e.id
          JOIN users u ON e.user_id = u.id
          WHERE s.user_id = ?
          ORDER BY s.start_time DESC
        `,
        args: [userId],
      })

      console.log(`Found ${result.rows.length} sessions for user ${userId}`)

      // Always return an array, even if no sessions are found
      return result.rows || []
    } catch (error) {
      console.error(`Error getting user sessions for user ${userId}:`, error)
      // Return empty array instead of throwing error
      return []
    }
  },

  getExpertSessions: async (expertId) => {
    try {
      const result = await db.execute({
        sql: `SELECT s.*,
                    u.full_name as user_name,
                    u.email as user_email,
                    CASE 
                      WHEN s.status = 'ONGOING' THEN 'Active'
                      WHEN s.status = 'WAITING' THEN 'Waiting'
                      WHEN s.status = 'SCHEDULED' AND s.start_time > datetime('now') THEN 'Upcoming'
                      ELSE s.status
                    END as session_status
              FROM sessions s
              JOIN users u ON s.user_id = u.id
              WHERE s.expert_id = ? AND s.status IN ('ONGOING', 'WAITING', 'SCHEDULED')
              ORDER BY 
                CASE 
                  WHEN s.status = 'ONGOING' THEN 1
                  WHEN s.status = 'WAITING' THEN 2
                  WHEN s.status = 'SCHEDULED' THEN 3
                  ELSE 3
                END,
                s.start_time ASC`,
        args: [expertId],
      })

      // Always return an array, even if no sessions are found
      return (result.rows || []).map((session) => ({
        ...session,
        user: {
          full_name: session.user_name,
          email: session.user_email,
        },
        formatted_duration: session.duration ? `${session.duration} mins` : "Ongoing",
        formatted_time: new Date(session.start_time).toLocaleString(),
      }))
    } catch (error) {
      console.error("Error getting expert sessions:", error)
      return []
    }
  },

  getActiveSession: async (userId, expertId) => {
    try {
      const result = await db.execute({
        sql: `SELECT s.*, e.rate, s.is_connected
          FROM sessions s
          JOIN experts e ON s.expert_id = e.id
          WHERE (s.user_id = ? OR s.expert_id = ?)
          AND s.status = 'ONGOING'
          AND s.is_connected = 1 
          LIMIT 1`,
        args: [userId, expertId],
      })
      return result.rows[0] || null
    } catch (error) {
      console.error("Error getting active session:", error)
      throw error
    }
  },

  getExpertOngoingSession: async (expertId) => {
    try {
      const result = await db.execute({
        sql: `
          SELECT s.*, u.credits as user_credits
          FROM sessions s
          JOIN user_profiles u ON s.user_id = u.user_id
          WHERE s.expert_id = ?
          AND s.status = 'ONGOING'
          AND s.is_connected = 1
          LIMIT 1
        `,
        args: [expertId],
      })
      return result.rows[0] || null
    } catch (error) {
      console.error("Error getting expert ongoing session:", error)
      throw error
    }
  },

  calculateEstimatedWaitTime: async (session) => {
    try {
      const startTime = new Date(session.start_time).getTime()
      const currentTime = Date.now()
      const elapsedMinutes = Math.floor((currentTime - startTime) / 60000)
      const remainingCredits = session.user_credits
      const expertRate = session.rate

      // Calculate remaining minutes based on user's credits
      const remainingMinutes = Math.floor(remainingCredits / expertRate)

      // Estimate wait time (remaining session time + buffer)
      const estimatedWaitTime = Math.max(0, remainingMinutes - elapsedMinutes + 5)

      return estimatedWaitTime
    } catch (error) {
      console.error("Error calculating wait time:", error)
      return 0
    }
  },
}

// This is needed for the db variable to be accessible in this module
let db
export const setDb = (database) => {
  db = database
}

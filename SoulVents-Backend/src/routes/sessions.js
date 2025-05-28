import { Router } from "express"
import { sessionOperations } from "../db/sessions.js"
import { expertOperations } from "../db/experts.js"
import { userOperations } from "../db/users.js"
import { reviewOperations } from "../db/reviews.js"
import { creditOperations } from "../db/credits.js"
import { authenticateToken } from "../middleware/auth.js"
import { randomUUID } from "crypto"

const router = Router()

let io
export const setSocketIO = (socketIO) => {
  io = socketIO

  io.on("connection", (socket) => {
    socket.on("join_chat", (data) => {
      socket.join(data.roomId)
      console.log(`🟢 Socket ${socket.id} joined room ${data.roomId}`)
    })
    socket.on("send_message", (message) => {
      console.log(`📩 Server received message:`, message)

      // Ensure message is sent to the correct room
      io.to(message.roomId).emit("receive_message", message)
      console.log(`📡 Message forwarded to room: ${message.roomId}`)
    })

    socket.on("expert_online", (expertId) => {
      socket.join(`expert_${expertId}`)
      console.log(`🟢 Expert ${expertId} is now online.`)
    })

    socket.on("signal", (data) => {
      console.log(`📡 Forwarding signal to room: ${data.sessionId}`)
      socket.to(`session_${data.sessionId}`).emit("signal", data)
    })

    // WebRTC signaling
    socket.on("offer", (data) => {
      console.log(`📡 Forwarding offer from ${data.from} to ${data.to}`, { sessionId: data.sessionId })

      // Find the appropriate room based on session ID
      const room = `session_${data.sessionId}`
      socket.to(room).emit("offer", data)
    })

    socket.on("answer", (data) => {
      console.log(`📡 Forwarding answer from ${data.from} to ${data.to}`, { sessionId: data.sessionId })

      // Find the appropriate room based on session ID
      const room = `session_${data.sessionId}`
      socket.to(room).emit("answer", data)
    })

    socket.on("ice_candidate", (data) => {
      console.log(`📡 Forwarding ICE candidate from ${data.from} to ${data.to}`, { sessionId: data.sessionId })

      // Find the appropriate room based on session ID
      const room = `session_${data.sessionId}`
      socket.to(room).emit("ice_candidate", data)
    })

    socket.on("broadcast_to_room", (data) => {
      console.log(`📢 Broadcasting ${data.event} to room ${data.room}:`, data.data)
      socket.to(data.room).emit(data.event, data.data)
    })

    socket.on("call_ended", (data) => {
      console.log(`📴 Call ended for session ${data.sessionId}:`, data)
      io.to(`session_${data.sessionId}`).emit("call_ended", data)
    })

    socket.on("disconnect", () => {
      console.log(`🔴 Socket ${socket.id} disconnected`)
    })
    socket.on("session_ended", (data) => {
      io.to(`session_${data.sessionId}`).emit("session_ended", data)
    })
  })
}
// Create a scheduled session
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { expertId, startTime, duration } = req.body
    const expert = await expertOperations.getExpertById(expertId)
    const session = await sessionOperations.createSession(
      randomUUID(),
      req.user.id,
      expertId,
      startTime,
      duration,
      "SCHEDULED",
      expert.rate,
    )
    res.json(session)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Create a chat session
router.post("/chat", authenticateToken, async (req, res) => {
  try {
    const { expertId } = req.body

    // Check if user or expert has an active session with chat/call modal open
    const activeSession = await sessionOperations.getActiveSession(req.user.id, expertId)
    if (activeSession && activeSession.status === "ONGOING" && activeSession.is_connected) {
      return res.status(400).json({ error: "Session already in progress" })
    }

    // If expert has an ongoing session, calculate estimated wait time
    const expertOngoingSession = await sessionOperations.getExpertOngoingSession(expertId)
    if (expertOngoingSession) {
      const estimatedWaitTime = await sessionOperations.calculateEstimatedWaitTime(expertOngoingSession)
      return res.status(400).json({
        error: "Expert is currently in another session",
        estimatedWaitTime,
      })
    }

    // Get expert details to include rate
    const expert = await expertOperations.getExpertById(expertId)
    if (!expert) {
      return res.status(404).json({ error: "Expert not found" })
    }

    // Check if user has enough credits
    const userProfile = await userOperations.getUserProfile(req.user.id)
    if (!userProfile) {
      return res.status(404).json({ error: "User profile not found" })
    }

    if (userProfile.credits < expert.rate) {
      return res.status(400).json({
        error: "Insufficient credits",
        requiredCredits: expert.rate,
        availableCredits: userProfile.credits,
      })
    }

    const sessionId = randomUUID()
    const session = await sessionOperations.createSession(
      sessionId,
      req.user.id,
      expertId,
      new Date().toISOString(),
      null,
      "WAITING",
      expert.rate, // Add rate to session creation
    )
    console.log(`🔍 Emitting session_request to expert: ${expertId}`)
    console.log(`🔍 All connected sockets:`, Object.keys(io.sockets.sockets))

    io.to(`expert_${expertId}`).emit("session_request", {
      type: "chat_request",
      expertId: expertId, // Add this
      session: {
        id: sessionId,
        user_name: req.user.full_name, // This matches frontend expectation
        start_time: new Date().toISOString(),
        type: "Chat",
      },
    })
    console.log(`📩 Sent session_request to expert (Socket ID: ${expertId})`)

    // Return session with expert rate and user credits
    res.json({
      ...session,
      expertRate: expert.rate,
      userCredits: userProfile.credits,
    })
  } catch (error) {
    console.error("Error creating chat session:", error)
    res.status(400).json({ error: error.message })
  }
})

// Update the call session creation endpoint to ensure proper response format
router.post("/call", authenticateToken, async (req, res) => {
  try {
    const { expertId } = req.body

    // Generate sessionId correctly ✅
    const sessionId = randomUUID()
    console.log(`Generated session ID for call: ${sessionId}`)

    // Check if expert exists
    const expert = await expertOperations.getExpertById(expertId)
    if (!expert) {
      return res.status(404).json({ error: "Expert not found" })
    }

    // Check if user exists and has enough credits
    const userProfile = await userOperations.getUserProfile(req.user.id)
    if (!userProfile) {
      return res.status(404).json({ error: "User profile not found" })
    }
    if (userProfile.credits < expert.rate) {
      return res.status(200).json({
        message: "Insufficient credits. Please add more to start the session.",
        requiredCredits: expert.rate,
        availableCredits: userProfile.credits,
      })
    }

    // Create a session record in the database
    const session = await sessionOperations.createSession(
      sessionId,
      req.user.id,
      expertId,
      new Date().toISOString(),
      null,
      "WAITING",
      expert.rate,
    )

    console.log(`Created call session in database: ${sessionId}`)

    // Emit event to expert ✅
    io.to(`expert_${expertId}`).emit("session_request", {
      type: "call_request",
      expertId: expertId,
      session: {
        id: sessionId,
        user: {
          full_name: req.user.full_name,
          id: req.user.id,
        },
        type: "CALL",
      },
    })

    console.log(`Emitted call request to expert: ${expertId}`)

    // Return a properly formatted response
    const responseData = {
      id: sessionId,
      sessionId: sessionId, // Include both formats for compatibility
      expertRate: expert.rate,
      userCredits: userProfile.credits,
      status: "WAITING",
      type: "CALL",
    }

    console.log(`Sending response to client:`, responseData)
    res.json(responseData)
  } catch (error) {
    console.error("Error creating call session:", error)
    res.status(400).json({ error: error.message })
  }
})

// Expert joins session
router.post("/:id/join", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    // Get session details
    const session = await sessionOperations.getSessionById(id)
    if (!session) {
      return res.status(404).json({ error: "Session not found" })
    }

    // Verify the expert is authorized to join this session
    const expert = await expertOperations.getExpertByUserId(req.user.id)
    if (!expert || expert.id !== session.expert_id) {
      return res.status(403).json({ error: "Not authorized to join this session" })
    }

    // Update session status to ONGOING
    const updatedSession = await sessionOperations.updateSession(id, null, null, null, "ONGOING")
    const roomId = `session_${id}`
    const connectedSockets = io.sockets.adapter.rooms.get(roomId)
    console.log(`🟢 Emitting session_update to room: ${roomId}`)
    console.log(
      `🟢 Connected sockets in room ${roomId}:`,
      connectedSockets ? Array.from(connectedSockets) : "No connected sockets",
    )
    // Emit session update to both user and expert
    io.to(roomId).emit("session_update", {
      sessionId: id,
      status: "ONGOING",
      expertId: session.expert_id,
    })
    console.log("🔴 Broadcasting session update to all clients in room:", roomId)
    res.json({ message: "Expert joined session", sessionId: id, status: "ONGOING" })
  } catch (error) {
    console.error("Error joining session:", error)
    res.status(400).json({ error: error.message })
  }
})

// Expert joins call
router.post("/:id/join-call", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    // Get session details
    const session = await sessionOperations.getSessionById(id)
    if (!session) {
      return res.status(404).json({ error: "Session not found" })
    }

    // Verify expert is authorized
    const expert = await expertOperations.getExpertByUserId(req.user.id)
    if (!expert || expert.id !== session.expert_id) {
      return res.status(403).json({ error: "Not authorized to join this call" })
    }

    // Update session status
    await sessionOperations.updateSession(id, null, null, null, "ONGOING")

    // Notify user
    io.to(`session_${id}`).emit("call_accepted", {
      sessionId: id,
      expertId: expert.id,
      timestamp: new Date().toISOString(),
    })

    console.log(`[${new Date().toISOString()}] Expert joined call session: ${id}`)

    res.json({
      message: "Joined call successfully",
      sessionId: id,
      status: "ONGOING",
    })
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error joining call:`, error)
    res.status(400).json({ error: error.message })
  }
})

// End a session
router.put("/:id/end", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const { endTime, duration, creditsUsed } = req.body

    // Get session details
    const session = await sessionOperations.getSessionById(id)
    if (!session) {
      return res.status(404).json({ error: "Session not found" })
    }

    // Notify all clients in the session room that the session is ending
    const roomId = `session_${id}`
    io.to(roomId).emit("session_update", {
      sessionId: id,
      status: "COMPLETED",
    })

    // ✅ Emit session_ended to notify both user and expert
    io.to(roomId).emit("session_ended", {
      sessionId: id,
      endedBy: req.user.id === session.user_id ? "user" : "expert",
    })

    // Update session
    const updatedSession = await sessionOperations.updateSession(id, endTime, duration, creditsUsed, "COMPLETED")

    // Transfer credits to expert
    if (creditsUsed > 0) {
      await expertOperations.transferCredits(session.expert_id, creditsUsed)
    }

    // Update user credits and record transaction
    if (creditsUsed) {
      const updatedCredits = await userOperations.updateUserCredits(req.user.id, -creditsUsed)
      await creditOperations.createCreditTransaction(
        req.user.id,
        creditsUsed,
        "usage",
        `${session.type === "CHAT" ? "Chat" : "Call"} session with ${session.expert_name}`,
        null,
        id,
      )

      return res.json({
        ...updatedSession,
        remainingCredits: updatedCredits,
      })
    }

    res.json(updatedSession)
  } catch (error) {
    console.error("Error ending session:", error)
    res.status(400).json({ error: error.message })
  }
})

// End call session
router.put("/:id/end-call", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const { endTime, duration, creditsUsed, reason } = req.body

    // Get session details
    const session = await sessionOperations.getSessionById(id)
    if (!session) {
      return res.status(404).json({ error: "Session not found" })
    }

    // Verify user is authorized (either the user or the expert)
    const isUser = session.user_id === req.user.id
    const expert = await expertOperations.getExpertByUserId(req.user.id)
    const isExpert = expert && expert.id === session.expert_id

    if (!isUser && !isExpert) {
      return res.status(403).json({ error: "Not authorized to end this call" })
    }

    // Notify all clients in the session room that the call is ending
    io.to(`session_${id}`).emit("call_ended", {
      sessionId: id,
      endedBy: isUser ? "user" : "expert",
      reason: reason || "Call ended by " + (isUser ? "user" : "expert"),
      timestamp: new Date().toISOString(),
    })

    // Update session
    const updatedSession = await sessionOperations.updateSession(
      id,
      endTime || new Date().toISOString(),
      duration,
      creditsUsed,
      "COMPLETED",
    )

    // Transfer credits to expert if applicable
    if (creditsUsed > 0) {
      await expertOperations.transferCredits(session.expert_id, creditsUsed)

      // Update user credits
      await userOperations.updateUserCredits(session.user_id, -creditsUsed)

      // Record transaction
      await creditOperations.createCreditTransaction(
        session.user_id,
        creditsUsed,
        "usage",
        `Call session with ${session.expert_name}`,
        null,
        id,
      )
    }

    console.log(`[${new Date().toISOString()}] Call session ended: ${id}`)

    res.json({
      message: "Call ended successfully",
      sessionId: id,
      status: "COMPLETED",
      creditsUsed: creditsUsed || 0,
    })
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error ending call:`, error)
    res.status(400).json({ error: error.message })
  }
})

router.get("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params
  const session = await sessionOperations.getSessionById(id)
  res.json(session)
})

// Get user's sessions
router.get("/user", authenticateToken, async (req, res) => {
  try {
    const sessions = await sessionOperations.getUserSessions(req.user.id)
    res.json(sessions)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Get expert's sessions
router.get("/expert", authenticateToken, async (req, res) => {
  try {
    // Get expert ID from user ID
    const expert = await expertOperations.getExpertByUserId(req.user.id)
    if (!expert) {
      return res.status(404).json({ error: "Expert not found" })
    }

    const sessions = await sessionOperations.getExpertSessions(expert.id)
    res.json(sessions)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Get session by ID
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const session = await sessionOperations.getSessionById(id)

    if (!session) {
      return res.status(404).json({ error: "Session not found" })
    }

    // Check if user is authorized to view this session
    if (session.user_id !== req.user.id && session.expert?.user_id !== req.user.id) {
      return res.status(403).json({ error: "Not authorized to view this session" })
    }

    res.json(session)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Submit session rating
router.post("/:id/rate", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const { rating, comment } = req.body

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Invalid rating" })
    }

    // Get session details
    const session = await sessionOperations.getSessionById(id)
    if (!session) {
      return res.status(404).json({ error: "Session not found" })
    }

    // Verify user owns this session
    if (session.user_id !== req.user.id) {
      return res.status(403).json({ error: "Not authorized to rate this session" })
    }

    // Check if session is already rated
    const existingReview = await reviewOperations.getSessionReview(id)
    if (existingReview) {
      return res.status(400).json({ error: "Session already rated" })
    }

    // Create review
    const review = await reviewOperations.createReview(id, req.user.id, session.expert_id, rating, comment)

    // Get updated expert info with new rating
    const expert = await expertOperations.getExpertById(session.expert_id)

    res.json({
      review,
      expertRating: expert.rating,
    })
  } catch (error) {
    console.error("Error submitting rating:", error)
    res.status(400).json({ error: error.message })
  }
})

export default router

import { Router } from "express"
import { db } from "../db/index.js"
import { userOperations } from "../db/users.js"
import { expertOperations } from "../db/experts.js"
import { withdrawalOperations } from "../db/withdrawals.js"
import { adminOperations } from "../db/admin.js"
import { sendWelcomeEmail } from "../services/emailService.js"
import { authenticateToken, isAdmin } from "../middleware/auth.js"
import bcrypt from "bcryptjs"
import { randomUUID, randomBytes } from "crypto"

// Function to generate random password
const generateRandomPassword = () => {
  return randomBytes(8).toString("hex")
}

const router = Router()

// Get all users
router.get("/users", authenticateToken, isAdmin, async (req, res) => {
  try {
    const users = await userOperations.getAllUsers()
    res.json(users)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Create user
router.post("/users", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { email, password, fullName, role } = req.body
    const passwordHash = await bcrypt.hash(password, 10)
    const id = randomUUID()

    const user = await userOperations.createUser(id, email, passwordHash, fullName, role)
    res.json(user)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Update user
router.put("/users/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { email, fullName, role } = req.body
    const user = await userOperations.updateUser(req.params.id, email, fullName, role)
    res.json(user)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Delete user
router.delete("/users/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    await userOperations.deleteUser(req.params.id)
    res.json({ message: "User deleted successfully" })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Get analytics data
router.get("/analytics", authenticateToken, isAdmin, async (req, res) => {
  try {
    const analytics = await adminOperations.getAnalytics()
    res.json(analytics)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get all experts
router.get("/experts", authenticateToken, isAdmin, async (req, res) => {
  try {
    const experts = await expertOperations.getAllExperts()
    res.json(experts)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Create expert
router.post("/experts", authenticateToken, isAdmin, async (req, res) => {
  try {
    const {
      email,
      password,
      fullName,
      imageUrl,
      type,
      specialty,
      rate,
      bio,
      languages,
      commissionRate,
      qualifications = "", // Provide default values for optional fields
      licenseNumber = "",
      experience = "",
    } = req.body

    console.log("Creating expert with data:", {
      email,
      fullName,
      imageUrl,
      type,
      specialty,
      rate,
      bio,
      languages,
      commissionRate,
      qualifications,
      licenseNumber,
      experience,
    })

    // Validate required fields
    if (!email || !password || !fullName || !type) {
      return res.status(400).json({ error: "Missing required fields: email, password, fullName, type" })
    }

    // Validate expert type
    if (!type || !["CONSULTANT", "PROFESSIONAL"].includes(type)) {
      return res.status(400).json({ error: "Invalid expert type. Must be either CONSULTANT or PROFESSIONAL" })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const existingUser = await userOperations.findUserByEmail(email);
    let userId;
    if (existingUser) {
      // Use the existing user ID
      userId = existingUser.id;
      console.log(`Using existing user ID for email: ${email}`);
      // Update the user's password and role
      await userOperations.updateUser(userId, email, fullName, "EXPERT", passwordHash);
      console.log(`Updated user with ID: ${userId}`);
    } else {
      // Create a new user if the email doesn't exist
      userId = randomUUID();
      await userOperations.createUser(userId, email, passwordHash, fullName, 'EXPERT');
      console.log(`Created new user for email: ${email}`);
    }


    // Then create expert profile
    const expertId = randomUUID()

    // Ensure all parameters are defined
    const expert = await expertOperations.createExpert(
      expertId,
      userId,
      imageUrl || "", // Provide empty string if imageUrl is undefined
      type,
      specialty || "", // Provide empty string if specialty is undefined
      rate || 0, // Provide 0 if rate is undefined
      bio || "", // Provide empty string if bio is undefined
      languages || ["English"], // Provide default language if languages is undefined
      commissionRate || 20, // Provide default commission rate if undefined
      qualifications,
      licenseNumber,
      experience,
    )

    // Send welcome email with credentials
    try {
      await sendWelcomeEmail(email, fullName, password, type === "CONSULTANT" ? "Counsellor" : "Professional")
    } catch (emailError) {
      console.error("Error sending welcome email:", emailError)
      // Don't throw error here as the user is already created
    }

    res.json(expert)
  } catch (error) {
    console.error("Error creating expert:", error)
    res.status(400).json({ error: error.message })
  }
})

// Update expert
router.put("/experts/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    const {
      specialty,
      rate,
      bio,
      languages,
      commissionRate,
      qualifications = "",
      licenseNumber = "",
      experience = "",
    } = req.body

    // Update commission rate if provided
    if (commissionRate !== undefined) {
      await expertOperations.updateExpertCommissionRate(req.params.id, commissionRate)
    }

    const expert = await expertOperations.updateExpert(
      req.params.id,
      specialty || "",
      rate || 0,
      bio || "",
      languages || ["English"],
      qualifications,
      licenseNumber,
      experience,
    )
    res.json(expert)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Delete expert
router.delete("/experts/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    await expertOperations.deleteExpert(req.params.id)
    res.json({ message: "Expert deleted successfully" })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Get pending withdrawals
router.get("/withdrawals", authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT w.*, e.user_id, u.full_name, u.email
      FROM withdrawal_requests w
      JOIN experts e ON w.expert_id = e.id
      JOIN users u ON e.user_id = u.id
      WHERE w.status = 'PENDING'
      ORDER BY w.created_at DESC
    `)

    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Process withdrawal request
router.put("/withdrawals/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" })
    }

    await withdrawalOperations.updateWithdrawalStatus(id, status, req.user.id)
    res.json({ success: true })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

export default router

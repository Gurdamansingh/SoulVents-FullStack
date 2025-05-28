import { Router } from "express"
import { reviewOperations } from "../db/reviews.js"
import { expertOperations } from "../db/experts.js"
import { authenticateToken } from "../middleware/auth.js"
import { randomUUID } from "crypto"

const router = Router()

router.post("/", authenticateToken, async (req, res) => {
  try {
    const { sessionId, expertId, rating, comment } = req.body
    const review = await reviewOperations.createReview(randomUUID(), sessionId, req.user.id, expertId, rating, comment)

    // Update expert's average rating
    const reviews = await reviewOperations.getExpertReviews(expertId)
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    await expertOperations.updateExpertRating(expertId, avgRating)

    res.json(review)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

export default router

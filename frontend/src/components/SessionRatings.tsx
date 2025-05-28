"use client"

import type React from "react"
import { useState } from "react"
import { Star, Send } from "lucide-react"
import { useAuth } from "../context/AuthContext"

interface SessionRatingProps {
  sessionId: string
  expertId: string
  expertName: string
  onClose: () => void
}

const SessionRating = ({ sessionId, expertId, expertName, onClose }: SessionRatingProps) => {
  const { token } = useAuth()
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hoveredRating, setHoveredRating] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/sessions/${sessionId}/rate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rating, comment }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to submit rating")
      }

      onClose()
    } catch (error) {
      console.error("Error submitting rating:", error)
      setError(error instanceof Error ? error.message : "Failed to submit rating. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-4">Rate Your Session</h2>
        <p className="text-gray-600 mb-6">How was your session with {expertName}?</p>

        {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-600 p-3 rounded-md">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Star Rating */}
          <div className="flex justify-center space-x-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(null)}
                onClick={() => setRating(star)}
                className="focus:outline-none"
              >
                <Star
                  className={`h-8 w-8 ${
                    (hoveredRating !== null ? star <= hoveredRating : star <= rating)
                      ? "text-yellow-400 fill-current"
                      : "text-gray-300"
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Rating Description */}
          <p className="text-center text-gray-600">
            {rating === 5
              ? "Excellent! Exceeded expectations"
              : rating === 4
                ? "Very good session"
                : rating === 3
                  ? "Good, but could be better"
                  : rating === 2
                    ? "Fair, needs improvement"
                    : "Poor experience"}
          </p>

          {/* Comment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Share your experience (optional)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
              placeholder="Tell us more about your experience..."
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-md hover:bg-gray-50">
              Skip
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center px-4 py-2 bg-rose-500 text-white rounded-md hover:bg-rose-600"
            >
              <Send className="h-4 w-4 mr-2" />
              {isSubmitting ? "Submitting..." : "Submit Rating"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default SessionRating

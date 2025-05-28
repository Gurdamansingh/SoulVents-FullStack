"use client"

import { useState, useEffect } from "react"
import { Star, MessageCircle, Phone } from "lucide-react"
import { useNavigate } from "react-router-dom"
import TermsModal from "../components/TermsModal"
import ChatWindow from "../components/ChatWindow"
import CallInterface from "../components/CallInterface"
import { api } from "../services/api"
import { useAuth } from "../context/AuthContext"
import type { Expert } from "../types"

interface Filters {
  search: string
  specialty: string
  language: string
  priceRange: string
  rating: string
  sortBy: string
}

const Consultants = () => {
  const { isAuthenticated, token } = useAuth()
  const navigate = useNavigate()
  const [consultants, setConsultants] = useState<Expert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [showCall, setShowCall] = useState(false)
  const [selectedConsultant, setSelectedConsultant] = useState<Expert | null>(null)
  const [interactionType, setInteractionType] = useState<"chat" | "call">("chat")
  const [filters, setFilters] = useState<Filters>({
    search: "",
    specialty: "",
    language: "",
    priceRange: "",
    rating: "",
    sortBy: "",
  })

  useEffect(() => {
    fetchConsultants()
  }, [])

  const fetchConsultants = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`${import.meta.env.VITE_API_URL}/experts`)
      if (!response.ok) {
        throw new Error("Failed to fetch consultants")
      }
      const experts = await response.json()
      // Filter only consultants
      const consultantsList = experts
        .filter((expert: Expert) => expert.type === "CONSULTANT")
        .map((expert: Expert) => ({
          ...expert,
          is_online: Boolean(expert.is_online),
        }))
      setConsultants(consultantsList)
    } catch (err: any) {
      setError(err.message || "Failed to load consultants")
      console.error("Error fetching consultants:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleInteractionClick = async (consultant: Expert, type: "chat" | "call") => {
    if (!isAuthenticated) {
      navigate("/auth")
      return
    }

    setSelectedConsultant(consultant)
    setInteractionType(type)
    setShowTermsModal(true)
  }

  const handleAcceptTerms = async () => {
    if (!selectedConsultant || !token) return

    try {
      setShowTermsModal(false)
      let session

      if (interactionType === "chat") {
        session = await api.createChatSession(selectedConsultant.id, token)
        setShowChat(true)
        if (session) {
          const updatedConsultant = {
            ...selectedConsultant,
            sessionId: session.id,
          }
          setSelectedConsultant(updatedConsultant)
        }
      } else {
        session = await api.createCallSession(selectedConsultant.id, token)
        console.log("Call session created:", session)
        if (session) {
          const updatedConsultant = {
            ...selectedConsultant,
            sessionId: session.id,
          }
          setSelectedConsultant(updatedConsultant)
          setShowCall(true)
        }
      }
    } catch (err) {
      console.error("Error creating session:", err)
      alert("Failed to start session. Please try again.")
    }
  }

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const filteredConsultants = consultants
    .filter((consultant) => {
      // Search filter
      if (filters.search && !consultant.user.fullName.toLowerCase().includes(filters.search.toLowerCase())) {
        return false
      }

      // Specialty filter
      if (filters.specialty && consultant.specialty !== filters.specialty) {
        return false
      }

      // Language filter
      if (filters.language && !consultant.languages.includes(filters.language)) {
        return false
      }

      // Price range filter
      if (filters.priceRange) {
        const rate = consultant.rate
        switch (filters.priceRange) {
          case "low":
            return rate < 3
          case "medium":
            return rate >= 3 && rate <= 4
          case "high":
            return rate > 4
        }
      }

      // Rating filter
      if (filters.rating) {
        const rating = Number.parseFloat(filters.rating)
        return consultant.rating >= rating
      }

      return true
    })
    .sort((a, b) => {
      // First sort by online status
      if (a.is_online && !b.is_online) return -1
      if (!a.is_online && b.is_online) return 1

      // Then apply the selected sort
      switch (filters.sortBy) {
        case "rating":
          return b.rating - a.rating
        case "price_low":
          return a.rate - b.rate
        case "price_high":
          return b.rate - a.rate
        case "experience":
          return b.total_sessions - a.total_sessions
        default:
          return 0
      }
    })

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-rose-500 border-t-transparent"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-center">{error}</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold mb-8">Our Counsellors</h1>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <input
            type="text"
            placeholder="Search counsellors..."
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
          />

          <select
            value={filters.specialty}
            onChange={(e) => handleFilterChange("specialty", e.target.value)}
            className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <option value="">All Specialties</option>
            <option value="Emotional Support">Emotional Support</option>
            <option value="Relationship">Relationship</option>
            <option value="Career">Career</option>
            <option value="Anxiety">Anxiety</option>
            <option value="Depression">Depression</option>
          </select>

          <select
            value={filters.language}
            onChange={(e) => handleFilterChange("language", e.target.value)}
            className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <option value="">All Languages</option>
            <option value="English">English</option>
            <option value="Spanish">Spanish</option>
            <option value="French">French</option>
            <option value="Hindi">Hindi</option>
            <option value="Mandarin">Mandarin</option>
          </select>

          <select
            value={filters.priceRange}
            onChange={(e) => handleFilterChange("priceRange", e.target.value)}
            className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <option value="">All Prices</option>
            <option value="low">Under 3 C/min</option>
            <option value="medium">3-4 C/min</option>
            <option value="high">Above 4 C/min</option>
          </select>

          <select
            value={filters.rating}
            onChange={(e) => handleFilterChange("rating", e.target.value)}
            className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <option value="">All Ratings</option>
            <option value="4.5">4.5+ Stars</option>
            <option value="4">4+ Stars</option>
            <option value="3.5">3.5+ Stars</option>
          </select>

          <select
            value={filters.sortBy}
            onChange={(e) => handleFilterChange("sortBy", e.target.value)}
            className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <option value="">Sort By</option>
            <option value="rating">Highest Rated</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
            <option value="experience">Most Experienced</option>
          </select>
        </div>
      </div>

      {/* Consultants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredConsultants.map((consultant) => (
          <ConsultantCard
            key={consultant.id}
            consultant={consultant}
            onChatClick={() => handleInteractionClick(consultant, "chat")}
            onCallClick={() => handleInteractionClick(consultant, "call")}
          />
        ))}
      </div>

      {filteredConsultants.length === 0 && (
        <div className="text-center py-12 text-gray-500">No consultants found matching your criteria.</div>
      )}

      {/* Modals and Windows */}
      <TermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAccept={handleAcceptTerms}
        type={interactionType}
      />

      {showChat && selectedConsultant && (
        <ChatWindow
          expertName={selectedConsultant.user.fullName}
          expertId={selectedConsultant.id}
          sessionId={selectedConsultant.sessionId || selectedConsultant.id}
          expertImage={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedConsultant.id}`}
          isOnline={selectedConsultant.is_online}
          expertRate={selectedConsultant.rate}
          onClose={() => setShowChat(false)}
        />
      )}

      {showCall && selectedConsultant && (
        <CallInterface
          expertName={selectedConsultant.user.fullName}
          expertId={selectedConsultant.id}
          sessionId={selectedConsultant.sessionId || selectedConsultant.id}
          expertImage={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedConsultant.id}`}
          expertRate={selectedConsultant.rate}
          expertType={selectedConsultant.type}
          onEnd={() => setShowCall(false)}
          onClose={() => setShowCall(false)}
        />
      )}
    </div>
  )
}

interface ConsultantCardProps {
  consultant: Expert
  onChatClick: () => void
  onCallClick: () => void
}

const ConsultantCard = ({ consultant, onChatClick, onCallClick }: ConsultantCardProps) => (
  <div className="bg-white rounded-lg shadow-md overflow-hidden">
    <div className="relative">
      <img
        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${consultant.id}`}
        alt={consultant.user.fullName}
        className="w-full h-48 object-cover"
      />
      <div
        className={`absolute top-4 right-4 px-3 py-1 rounded-full text-sm font-medium ${
          consultant.is_online ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
        }`}
      >
        {consultant.is_online ? "Online" : "Offline"}
      </div>
    </div>
    <div className="p-6">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-xl font-semibold">{consultant.user.fullName}</h3>
        <div className="flex items-center">
          <Star className="h-5 w-5 text-yellow-400 fill-current" />
          <span className="ml-1">{(consultant.rating).toFixed(1)}</span>
        </div>
      </div>
      <div className="mb-2">
        <span className="text-sm text-gray-600">Languages: </span>
        <span className="text-sm font-medium">{consultant.languages.join(", ")}</span>
      </div>
      <div className="mb-2">
        <span className="text-sm text-gray-600">Specialty: </span>
        <span className="text-sm font-medium">{consultant.specialty}</span>
      </div>
      <div className="mb-2">
        <span className="text-sm text-gray-600">Experience: </span>
        <span className="text-sm font-medium">{consultant.total_sessions} sessions</span>
      </div>
      <p className="text-gray-600 mb-4">{consultant.bio}</p>
      <div className="flex justify-between items-center">
        <div className="group relative inline-block">
          <span className="text-rose-500 font-semibold">{consultant.rate} C/min</span>
          <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Credits per minute
          </span>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={onChatClick}
            disabled={!consultant.is_online}
            className={`flex items-center px-4 py-2 rounded-md ${
              consultant.is_online
                ? "bg-rose-500 text-white hover:bg-rose-600"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
            }`}
          >
            <MessageCircle className="h-5 w-5 mr-2" />
            Chat
          </button>
          {/* Voice call only for consultants */}
          {consultant.type === "CONSULTANT" && (
            <button
              onClick={onCallClick}
              disabled={!consultant.is_online}
              className={`flex items-center px-4 py-2 rounded-md ${
                consultant.is_online
                  ? "border border-rose-500 text-rose-500 hover:bg-rose-50"
                  : "border border-gray-200 text-gray-500 cursor-not-allowed"
              }`}
            >
              <Phone className="h-5 w-5 mr-2" />
              Voice Call
            </button>
          )}
        </div>
      </div>
    </div>
  </div>
)

export default Consultants

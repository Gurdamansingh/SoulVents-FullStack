"use client"

import { useState, useEffect } from "react"
import { Star, MessageCircle, Phone, Award } from "lucide-react"
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

const Professionals = () => {
  const { isAuthenticated, token } = useAuth()
  const [professionals, setProfessionals] = useState<Expert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [showCall, setShowCall] = useState(false)
  const [selectedProfessional, setSelectedProfessional] = useState<Expert | null>(null)
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
    fetchProfessionals()
  }, [])

  const fetchProfessionals = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`${import.meta.env.VITE_API_URL}/experts`)
      if (!response.ok) {
        throw new Error("Failed to fetch professionals")
      }
      const experts = await response.json()
      // Filter only professionals
      const professionalsList = experts
        .filter((expert: Expert) => expert.type === "PROFESSIONAL")
        .map((expert: Expert) => ({
          ...expert,
          is_online: Boolean(expert.is_online),
        }))
      setProfessionals(professionalsList)
    } catch (err: any) {
      setError(err.message || "Failed to load professionals")
      console.error("Error fetching professionals:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleInteractionClick = async (professional: Expert, type: "chat" | "call") => {
    if (!isAuthenticated) {
      // Redirect to auth page
      window.location.href = "/auth"
      return
    }

    setSelectedProfessional(professional)
    setInteractionType(type)
    setShowTermsModal(true)
  }

  const handleAcceptTerms = async () => {
    if (!selectedProfessional || !token) return

    try {
      setShowTermsModal(false)
      let session

      if (interactionType === "chat") {
        session = await api.createChatSession(selectedProfessional.id, token)
        if (session) {
          const updatedProfessional = {
            ...selectedProfessional,
            sessionId: session.id,
          }
          setSelectedProfessional(updatedProfessional)
        }
        setShowChat(true)
      } else {
        session = await api.createCallSession(selectedProfessional.id, token)
        if (session) {
          const updatedProfessional = {
            ...selectedProfessional,
            sessionId: session.id,
          }
          setSelectedProfessional(updatedProfessional)
        }
        setShowCall(true)
      }
    } catch (err) {
      console.error("Error creating session:", err)
      alert("Failed to start session. Please try again.")
    }
  }

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const filteredProfessionals = professionals
    .filter((professional) => {
      // Search filter
      if (filters.search && !professional.user.fullName.toLowerCase().includes(filters.search.toLowerCase())) {
        return false
      }
      // Specialty filter
      if (filters.specialty && professional.specialty !== filters.specialty) {
        return false
      }
      // Language filter
      if (filters.language && !professional.languages.includes(filters.language)) {
        return false
      }
      // Price range filter
      if (filters.priceRange) {
        const rate = professional.rate
        switch (filters.priceRange) {
          case "low":
            return rate < 25
          case "medium":
            return rate >= 25 && rate <= 30
          case "high":
            return rate > 30
        }
      }
      // Rating filter
      if (filters.rating) {
        const rating = Number.parseFloat(filters.rating)
        return professional.rating >= rating
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
      <h1 className="text-3xl font-bold mb-8">Licensed Mental Health Professionals</h1>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <input
            type="text"
            placeholder="Search professionals..."
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
            <option value="Clinical Psychology">Clinical Psychology</option>
            <option value="Psychotherapy">Psychotherapy</option>
            <option value="Counseling">Counseling</option>
            <option value="Psychiatry">Psychiatry</option>
            <option value="Mental Health">Mental Health</option>
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
            <option value="low">Under 25 C/min</option>
            <option value="medium">25-30 C/min</option>
            <option value="high">Above 30 C/min</option>
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

      {/* Professionals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProfessionals.map((professional) => (
          <ProfessionalCard
            key={professional.id}
            professional={professional}
            onChatClick={() => handleInteractionClick(professional, "chat")}
            onCallClick={() => handleInteractionClick(professional, "call")}
          />
        ))}
      </div>

      {filteredProfessionals.length === 0 && (
        <div className="text-center py-12 text-gray-500">No professionals found matching your criteria.</div>
      )}

      {/* Modals and Windows */}
      <TermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAccept={handleAcceptTerms}
        type={interactionType}
      />

      {showChat && selectedProfessional && (
        <ChatWindow
          expertName={selectedProfessional.user.fullName}
          expertId={selectedProfessional.id}
          expertImage={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedProfessional.id}`}
          isOnline={selectedProfessional.is_online}
          sessionId={selectedProfessional.sessionId || selectedProfessional.id}
          expertRate={selectedProfessional.rate}
          onClose={() => setShowChat(false)}
        />
      )}

      {showCall && selectedProfessional && (
        <CallInterface
          expertName={selectedProfessional.user.fullName}
          expertId={selectedProfessional.id}
          expertImage={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedProfessional.id}`}
          sessionId={selectedProfessional.sessionId || selectedProfessional.id}
          expertRate={selectedProfessional.rate}
          expertType={selectedProfessional.type}
          onEnd={() => setShowCall(false)}
        />
      )}
    </div>
  )
}

const ProfessionalCard = ({
  professional,
  onChatClick,
  onCallClick,
}: {
  professional: Expert
  onChatClick: () => void
  onCallClick: () => void
}) => (
  <div className="bg-white rounded-lg shadow-md overflow-hidden">
    <div className="relative">
      <img
        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${professional.id}`}
        alt={professional.user.fullName}
        className="w-full h-48 object-cover"
      />
      <div
        className={`absolute top-4 right-4 px-3 py-1 rounded-full text-sm font-medium ${
          professional.is_online ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
        }`}
      >
        {professional.is_online ? "Online" : "Offline"}
      </div>
    </div>
    <div className="p-6">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-xl font-semibold">{professional.user.fullName}</h3>
        <div className="flex items-center">
          <Star className="h-5 w-5 text-yellow-400 fill-current" />
          <span className="ml-1">{(professional.rating).toFixed(2)}</span>
        </div>
      </div>
      <div className="flex items-center mb-2">
        <Award className="h-4 w-4 text-rose-500 mr-1" />
        <span className="text-sm">{professional.qualifications || "Licensed Professional"}</span>
      </div>
      <div className="mb-2">
        <span className="text-sm text-gray-600">Languages: </span>
        <span className="text-sm font-medium">{professional.languages.join(", ")}</span>
      </div>
      <div className="mb-2">
        <span className="text-sm text-gray-600">Specialty: </span>
        <span className="text-sm font-medium">{professional.specialty}</span>
      </div>
      <p className="text-gray-600 mb-4">{professional.bio}</p>
      <div className="flex justify-between items-center">
        <div className="group relative inline-block">
          <span className="text-rose-500 font-semibold">{professional.rate} C/min</span>
          <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Credits per minute
          </span>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={onChatClick}
            disabled={!professional.is_online}
            className={`flex items-center px-4 py-2 rounded-md ${
              professional.is_online
                ? "bg-rose-500 text-white hover:bg-rose-600"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
            }`}
          >
            <MessageCircle className="h-5 w-5 mr-2" />
            Chat
          </button>
          <button
            onClick={onCallClick}
            disabled={!professional.is_online}
            className={`flex items-center px-4 py-2 rounded-md ${
              professional.is_online
                ? "border border-rose-500 text-rose-500 hover:bg-rose-50"
                : "border border-gray-200 text-gray-500 cursor-not-allowed"
            }`}
          >
            <Phone className="h-5 w-5 mr-2" />
            Call
          </button>
        </div>
      </div>
    </div>
  </div>
)

export default Professionals

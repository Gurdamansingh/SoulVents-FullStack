"use client"
import { useState, useEffect, useRef } from "react"
import type React from "react"

import { Calendar, IndianRupee, Star, Users, MessageCircle, Bell, BadgeIndianRupee } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import SocketService from "../../services/socketService"
import ExpertChatWindow from "../../components/ExpertChatWindow"
import ExpertCallInterface from "../../components/ExpertCallInterface"
import type { ExpertData, Session } from "../../types/expert"
import { api } from "../../services/api"

interface DashboardProps {
  expertData: ExpertData | null
  onStatusChange: (isOnline: boolean) => Promise<void>
}

const Dashboard = ({ expertData, onStatusChange }: DashboardProps) => {
  const { token } = useAuth()
  const [isOnline, setIsOnline] = useState(expertData?.is_online || false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [showCall, setShowCall] = useState(false)
  const [currentChatUser, setCurrentChatUser] = useState<{
    name: string
    id: string
  } | null>(null)
  const [showChatRequest, setShowChatRequest] = useState<boolean>(false)
  const [showCallRequest, setShowCallRequest] = useState<boolean>(false)
  const [currentSession, setCurrentSession] = useState<Session | null>(null)
  const [currentCallSession, setCurrentCallSession] = useState<any>(null)
  const [activeSessions, setActiveSessions] = useState<Session[]>([])
  const socketService = SocketService.getInstance()
  const [expertRoom, setExpertRoom] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [hasInteracted, setHasInteracted] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false);

  // Add session type definition
  interface SessionRequest {
    type: "chat_request" | "call_request"
    expertId: string
    session: {
      id: string
      user_name: string
      user_id: string
      start_time: string
      type: "Call" | "Chat"
    }
  }

  // Create audio element on component mount
  useEffect(() => {
    audioRef.current = new Audio(`${window.location.origin}/join.wav`)
    audioRef.current.volume = 0.5

    // Add interaction listener to document
    const handleInteraction = () => {
      setHasInteracted(true)
      document.removeEventListener("click", handleInteraction)
      document.removeEventListener("keydown", handleInteraction)
    }

    document.addEventListener("click", handleInteraction)
    document.addEventListener("keydown", handleInteraction)

    return () => {
      document.removeEventListener("click", handleInteraction)
      document.removeEventListener("keydown", handleInteraction)
    }
  }, [])

  const playNotificationSound = () => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(`${window.location.origin}/join.wav`)
        audioRef.current.volume = 0.5
      }

      if (hasInteracted) {
        const playPromise = audioRef.current.play()
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            console.warn("Notification sound failed to play:", error)
          })
        }
      } else {
        console.log("Skipping notification sound - user hasn't interacted with the page yet")
      }
    } catch (error) {
      console.warn("Error initializing notification sound:", error)
    }
  }

  useEffect(() => {
    if (expertData?.id) {
      const expertRoom = `expert_${expertData.id}`
      setExpertRoom(expertRoom)

      // Listen for session requests
      const unsubscribeSessionRequest = socketService.on("session_request", (data: SessionRequest) => {
        console.log("Received session request:", data)
        if (data.expertId === expertData.id) {
          // Extract user information with fallbacks
          const userName = data.session.user_name || "User"
          const userId = data.session.user_id || "unknown"

          const session: Session = {
            id: data.session.id,
            user: {
              full_name: userName,
              id: userId,
            },
            expert: {
              full_name: expertData.user.full_name,
              id: expertData.id,
              specialty: expertData.specialty,
              user_id: expertData.user_id,
              rate: expertData.rate,
            },
            time: data.session.start_time || new Date().toISOString(),
            duration: "0",
            type: data.session.type,
            status: "WAITING",
          }

          console.log("Setting current session:", session)
          setCurrentSession(session)

          // Clear any existing requests
          setShowChatRequest(false)
          setShowCallRequest(false)

          if (data.type === "chat_request") {
            setShowChatRequest(true)
          } else if (data.type === "call_request") {
            setShowCallRequest(true)
            setCurrentCallSession({
              sessionId: data.session.id,
              userId: userId,
              userName: userName,
            })
          }
          playNotificationSound()
        }
      })

      // Handle call requests
      const unsubscribeCallRequest = socketService.on("call_request", (data) => {
        console.log("Call request received:", data)
        if (data.expertId === expertData.id) {
          // Extract user information with fallbacks
          const userName = data.userName || data.session?.user_name || data.session?.user?.full_name || "User"
          const userId = data.userId || data.session?.user_id || "unknown"
          const sessionId = data.sessionId || data.session?.id

          if (!sessionId) {
            console.error("Invalid call request - missing sessionId")
            return
          }

          setShowCallRequest(true)
          setCurrentCallSession({
            sessionId: sessionId,
            userId: userId,
            userName: userName,
          })

          console.log("Set current call session:", {
            sessionId: sessionId,
            userId: userId,
            userName: userName,
          })

          playNotificationSound()
        }
      })

      // Handle call ended
      const unsubscribeCallEnded = socketService.on("call_ended", (data) => {
        console.log("Call ended event received:", data)
        if (currentCallSession && data.sessionId === currentCallSession.sessionId) {
          setShowCall(false)
          setCurrentCallSession(null)
          alert("Call ended: " + (data.reason || "The user ended the call"))
        }
      })

      return () => {
        
        unsubscribeSessionRequest()
        unsubscribeCallRequest()
        unsubscribeCallEnded()
      }
    }
  }, [expertData, hasInteracted])

  // Monitor socket connection status
  useEffect(() => {
    const checkConnection = () => {
      const isConnected = socketService.isConnected()
    

      if (!isConnected) {
        console.log(`Connecting Socket: ${isConnected ? "Connected" : "Disconnected"}`)
        socketService.connect()
      }
     
    }
    const handleConnect = () => {
      if (expertRoom) {
        console.log("Socket connected, joining room1:")
        socketService.joinRoom(expertRoom)
      }
    }
    socketService.getSocket()?.on("connect", handleConnect)
    // Check immediately
    checkConnection()

    // Then check periodically
    const interval = setInterval(checkConnection, 10000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    socketService.onAny((event, data) => {
      console.log(`📩 Received event: ${event}`, data)
    })

    return () => {
      socketService.offAny()
    }
  }, [])

  const handleJoinSession = async (sessionId: string) => {
    try {
      if (!sessionId) {
        throw new Error("Invalid session ID")
      }

      console.log("Joining session:", sessionId)

      // Validate session ID format
      if (!sessionId.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)) {
        throw new Error("Invalid session ID format")
      }

      // Get current session type
      const isChat = showChatRequest
      const isCall = showCallRequest

      const session = await api.joinSession(sessionId, token)
      console.log("Session joined:", session, "Type:", isChat ? "chat" : "call")

      // Join the session room
      console.log("Socket connected, joining room2:")
      socketService.joinRoom(`session_${sessionId}`)

      // Get user details from session
      const userName = session.user_name || session.user?.full_name || "User"
      const userId = session.user_id || session.user?.id || "unknown"

      // First emit session update
      socketService.emit("session_update", {
        sessionId,
        status: "ONGOING",
        expertId: expertData?.id,
        userId: userId,
        type: isChat ? "CHAT" : "CALL",
        user: {
          full_name: userName,
          id: userId,
        },
      })

      // Clear request modals first
      setShowChatRequest(false)
      setShowCallRequest(false)

      // Show appropriate interface
      if (isChat) {
        setShowChat(true)
        setCurrentChatUser({
          name: userName,
          id: userId,
        })
      } else if (isCall) {
        setShowCall(true)
        // Keep the current call session data
      }

      // Update session status
      setCurrentSession((prev: Session | null) =>
        prev
          ? {
              ...prev,
              user: {
                full_name: userName,
                id: userId,
              },
              time: session.start_time || prev.time,
              type: session.type || prev.type,
              status: "ONGOING",
            }
          : null,
      )
    } catch (error) {
      console.error("Error joining session:", error)
      alert("Failed to join session. Please try again.")
    }
  }

  const handleJoinCall = async () => {
    try {
      console.log("Current call session data:", currentCallSession)
      if (!currentCallSession || !currentCallSession.sessionId) {
        throw new Error("Invalid call session")
      }

      const sessionId = currentCallSession.sessionId
      const userId = currentCallSession.userId || "unknown"
      const userName = currentCallSession.userName || "User"

      setShowCallRequest(false)

      try {
        // Join call session
        await api.joinSession(sessionId, token)
        if (socketService.isConnected()) {
        // Join the session room
        console.log("Socket connected, joining room3:")
        socketService.joinRoom(`session_${sessionId}`)
        }
        // Emit session update
        socketService.emit("session_update", {
          sessionId,
          status: "ONGOING",
          expertId: expertData?.id,
          userId: userId,
          type: "CALL",
          user: {
            full_name: userName,
            id: userId,
          },
        })

        // Accept the call
        socketService.emit("call_accepted", {
          sessionId,
          expertId: expertData?.id,
          userId: userId,
        })

        setShowCall(true)
      } catch (error) {
        console.error("Error joining call:", error)
        alert("Failed to join call. Please try again.")
        setCurrentCallSession(null)
      }
    } catch (error) {
      console.error("Error joining call:", error)
      alert("Failed to join call. Please try again.")
    }
  }

  const handleDeclineCall = () => {
    if (currentCallSession && currentCallSession.sessionId) {
      socketService.emit("call_declined", {
        sessionId: currentCallSession.sessionId,
        expertId: expertData?.id,
        userId: currentCallSession.userId || "unknown",
        reason: "Expert declined the call",
      })
    }

    setShowCallRequest(false)
    setCurrentCallSession(null)
  }

  const handleEndCall = () => {
    if (currentCallSession && currentCallSession.sessionId) {
      socketService.emit("call_ended", {
        sessionId: currentCallSession.sessionId,
        expertId: expertData?.id,
        userId: currentCallSession.userId || "unknown",
        reason: "Expert ended the call",
      })
    }

    setShowCall(false)
    setCurrentCallSession(null)
  }

  // Update local state when expertData changes
  useEffect(() => {
    if (expertData) {
      setIsOnline(expertData.is_online)
      // Filter and sort active sessions
      const ongoingAndUpcoming = (expertData.upcoming_sessions || [])
        .filter((session) => session.status === "ONGOING" || session.status === "SCHEDULED")
        .sort((a, b) => {
          // Sort by status (ONGOING first) then by time
          if (a.status === "ONGOING" && b.status !== "ONGOING") return -1
          if (a.status !== "ONGOING" && b.status === "ONGOING") return 1
          return new Date(a.time).getTime() - new Date(b.time).getTime()
        })
      setActiveSessions(ongoingAndUpcoming)
    }
  }, [expertData])

  if (!expertData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-rose-500 border-t-transparent"></div>
      </div>
    )
  }
  useEffect(() => {
    if (!localStorage.getItem("lastCheckedTime")) {
      localStorage.setItem("lastCheckedTime", "0");
    }
  }, []);
  const handleNotificationClick = () => {
    setShowNotifications(true);

    // Update the last checked time in localStorage
    localStorage.setItem("lastCheckedTime", Date.now().toString());
  
  };
  const getUnreadNotificationsCount = () => {
    const lastCheckedTime = parseInt(localStorage.getItem("lastCheckedTime") || "0", 10);
  
    // Filter notifications that arrived after the last checked time
    return (expertData.notifications || []).filter(
      (notification) => new Date(notification.time).getTime() > lastCheckedTime
    ).length;
  };

  const handleStatusToggle = async () => {
    try {
      setIsUpdating(true)
      await onStatusChange(!isOnline)
      setIsOnline(!isOnline)
    } catch (error) {
      console.error("Error updating status:", error)
      alert("Failed to update status. Please try again.")
    } finally {
      setIsUpdating(false)
    }
  }

  // Format numbers safely
  const formatNumber = (num: number | undefined | null): string => {
    if (num === undefined || num === null) return "0"
    return num.toString()
  }

  // Format currency
  const formatCurrency = (amount: number | undefined | null): string => {
    if (amount === undefined || amount === null) return "₹0"
    // Calculate actual earnings after commission
    const commission = amount * (expertData.commission_rate / 100)
    const actualEarnings = amount - commission
    return `₹${actualEarnings.toFixed(2)}`
  }

  // Format rating
  const formatRating = (rating: number | undefined | null): string => {
    if (rating === undefined || rating === null) return "0.0"
    return rating.toFixed(1)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold">Expert Dashboard</h1>
            <div className="flex items-center space-x-4">
              <div className="relative" onClick={handleNotificationClick}>
                <Bell className="h-6 w-6 text-gray-500 cursor-pointer" />
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {getUnreadNotificationsCount()}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm">Status:</span>
                <button
                  onClick={handleStatusToggle}
                  disabled={isUpdating}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    isOnline ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                  } ${isUpdating ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  {isOnline ? "Online" : "Offline"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<IndianRupee className="h-6 w-6 text-rose-500" />}
            title="Total Earnings"
            value={(
              (expertData.total_earnings || 0) - 
              ((expertData.total_earnings || 0) * (expertData.commission_rate || 10)) / 100
            ).toFixed(2)}
          />
          <StatCard
            icon={<BadgeIndianRupee className="h-6 w-6 text-green-500" />}
            title="Available Credits"
            value={`${(expertData.total_earnings).toFixed(2)} Credits`}
          />
          <StatCard
            icon={<Users className="h-6 w-6 text-rose-500" />}
            title="Total Sessions"
            value={formatNumber(expertData.total_sessions)}
          />
          <StatCard
            icon={<Star className="h-6 w-6 text-rose-500" />}
            title="Average Rating"
            value={formatRating(expertData.rating)}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upcoming Sessions */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <Calendar className="h-5 w-5 text-rose-500 mr-2" />
              Upcoming Sessions
            </h2>
            <div className="space-y-4">
              {activeSessions.map((session) => (
                <div key={session.id} className="border-b pb-4 last:border-0 last:pb-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{session.user.full_name}</h3>
                      <p className="text-sm text-gray-500">{new Date(session.time).toLocaleString()}</p>
                      <p className="text-sm text-gray-500">Duration: {session.duration || "Ongoing"}</p>
                      <p className="text-sm text-gray-500">Type: {session.type}</p>
                      {session.status === "WAITING" && (
                        <button
                          onClick={() => handleJoinSession(session.id)}
                          className="mt-2 text-sm bg-rose-500 text-white px-3 py-1 rounded-md hover:bg-rose-600"
                        >
                          Join Session
                        </button>
                      )}
                    </div>
                    <span
                      className={`text-sm font-medium px-2 py-1 rounded-full ${
                        session.status === "ONGOING"
                          ? "bg-green-100 text-green-800"
                          : session.status === "WAITING"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {session.status === "ONGOING" ? "Active" : session.status === "WAITING" ? "Waiting" : "Upcoming"}
                    </span>
                  </div>
                </div>
              ))}
              {activeSessions.length === 0 && <p className="text-center text-gray-500">No upcoming sessions</p>}
            </div>
          </div>

          {/* Recent Feedback */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <MessageCircle className="h-5 w-5 text-rose-500 mr-2" />
              Recent Feedback
            </h2>
            <div className="space-y-4">
              {(expertData.recent_feedback || []).map((feedback) => (
                <div key={feedback.id} className="border-b pb-4 last:border-0 last:pb-0">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium">{feedback.user.full_name}</span>
                    <div className="flex text-yellow-400">
                      {[...Array(feedback.rating)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-current" />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{feedback.comment}</p>
                  <p className="text-xs text-gray-500">{feedback.date}</p>
                </div>
              ))}
              {(!expertData.recent_feedback || expertData.recent_feedback.length === 0) && (
                <p className="text-center text-gray-500">No feedback yet</p>
              )}
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <Bell className="h-5 w-5 text-rose-500 mr-2" />
              Notifications
            </h2>
            <div className="space-y-4">
              {(expertData.notifications || []).map((notification) => (
                <div key={notification.id} className="border-b pb-4 last:border-0 last:pb-0">
                  <p className="text-sm text-gray-600 mb-1">{notification.message}</p>
                  <p className="text-xs text-gray-500">{notification.time}</p>
                </div>
              ))}
              {(!expertData.notifications || expertData.notifications.length === 0) && (
                <p className="text-center text-gray-500">No new notifications</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chat Request Modal */}
      {showChatRequest && currentSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">New Chat Request</h3>
            <p className="mb-4">
              {currentSession?.user?.full_name || "Unknown User"} would like to start a chat session with you.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowChatRequest(false)
                  setCurrentSession(null)
                }}
                className="px-4 py-2 border rounded-md hover:bg-gray-50"
              >
                Decline
              </button>
              <button
                onClick={() => {
                  handleJoinSession(currentSession.id)
                }}
                className="px-4 py-2 bg-rose-500 text-white rounded-md hover:bg-rose-600"
              >
                Join Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Call Request Modal */}
      {showCallRequest && currentCallSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">New Video Call Request</h3>
            <p className="mb-4">
              {currentCallSession.userName || "Unknown User"} would like to start a video call with you.
            </p>
            <div className="flex justify-end space-x-4">
              <button onClick={handleDeclineCall} className="px-4 py-2 border rounded-md hover:bg-gray-50">
                Decline
              </button>
              <button
                onClick={handleJoinCall}
                className="px-4 py-2 bg-rose-500 text-white rounded-md hover:bg-rose-600"
              >
                Join Call
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Interface */}
      {showChat && currentSession && currentChatUser && (
        <ExpertChatWindow
          userName={currentChatUser.name}
          userImage={`https://api.dicebear.com/7.x/avataaars/svg?seed=${currentChatUser.id}`}
          sessionId={currentSession.id}
          onClose={() => {
            setShowChat(false)
            setCurrentSession(null)
            setCurrentChatUser(null)
          }}
        />
      )}

      {/* Call Interface */}
      {showCall && currentCallSession && (
        <ExpertCallInterface
          sessionId={currentCallSession.sessionId}
          userId={currentCallSession.userId || "unknown"}
          userName={currentCallSession.userName || "User"}
          expertType={expertData?.type}
          onEndCall={handleEndCall}
        />
      )}
     {/*Notifications Modal */}
     {showNotifications && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 max-w-md w-full">
      <h3 className="text-lg font-semibold mb-4">Notifications</h3>
      <div className="space-y-4">
        {(expertData.notifications || []).map((notification) => {
          const isUnread =
            new Date(notification.time).getTime() >
            parseInt(localStorage.getItem("lastCheckedTime") || "0", 10);

          return (
            <div
              key={notification.id}
              className={`border-b pb-4 last:border-0 last:pb-0 ${
                isUnread ? "bg-gray-100" : ""
              }`}
            >
              <p className="text-sm text-gray-600 mb-1">{notification.message}</p>
              <p className="text-xs text-gray-500">{notification.time}</p>
            </div>
          );
        })}
        {(!expertData.notifications || expertData.notifications.length === 0) && (
          <p className="text-center text-gray-500">No new notifications</p>
        )}
      </div>
      <div className="flex justify-end mt-4">
        <button
          onClick={() => setShowNotifications(false)}
          className="px-4 py-2 bg-rose-500 text-white rounded-md hover:bg-rose-600"
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}

      {/* Connection Status Indicator (hidden but useful for debugging) */}
      <div className="hidden fixed bottom-4 right-4 px-3 py-1 rounded-full text-xs font-medium bg-opacity-90">
        {socketService.isConnected() ? (
          <span className="text-green-800 bg-green-100 px-2 py-1 rounded-full">Connected</span>
        ) : (
          <span className="text-red-800 bg-red-100 px-2 py-1 rounded-full">Disconnected</span>
        )}
      </div>
    </div>
  )
}

interface StatCardProps {
  icon: React.ReactNode
  title: string
  value: string
}

const StatCard = ({ icon, title, value }: StatCardProps) => (
  <div className="bg-white rounded-lg shadow-md p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500 mb-1">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
      {icon}
    </div>
  </div>
)

export default Dashboard

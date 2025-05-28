"use client"

import { useState, useRef, useEffect } from "react"
import { Send, X, Clock, AlertCircle, IndianRupee } from "lucide-react"
import SocketService from "../services/socketService"
import SessionService from "../services/sessionService"
import { useAuth } from "../context/AuthContext"
import { v4 as uuidv4 } from "uuid"
import { api } from "../services/api"
import SessionRating from "./SessionRatings"

interface Message {
  id: string
  sender: "user" | "expert" | "system"
  content: string
  timestamp: string
  senderName?: string
  roomId?: string
}

interface ChatWindowProps {
  expertName: string
  expertImage: string
  expertId: string
  isOnline: boolean
  sessionId: string
  expertRate: number
  onClose: () => void
}

const ChatWindow = ({
  expertName,
  expertImage,
  expertId,
  isOnline,
  sessionId,
  expertRate,
  onClose,
}: ChatWindowProps) => {
  const [elapsedTime, setElapsedTime] = useState(0)
  const { token, user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [sessionRoomId] = useState(`session_${sessionId}`)
  const [sessionStarted, setSessionStarted] = useState(false)
  const [creditsUsed, setCreditsUsed] = useState(0)
  const [remainingCredits, setRemainingCredits] = useState(0)
  const [isConnecting, setIsConnecting] = useState(true)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [showCreditWarning, setShowCreditWarning] = useState(false)
  const [creditWarningMessage, setCreditWarningMessage] = useState("")
  const [showExitConfirmation, setShowExitConfirmation] = useState(false)
  const [isWaiting, setIsWaiting] = useState(true)
  const [isExpert, setIsExpert] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [userCredits, setUserCredits] = useState<number>(0)
  const [duration, setDuration] = useState("00:00")
  const socketService = SocketService.getInstance()
  const sessionService = SessionService.getInstance()
  const [chatEnded, setChatEnded] = useState(false)
  const [sessionEndMessage, setSessionEndMessage] = useState("")
  const [showRating, setShowRating] = useState(false)

  const playMessageNotificationSound = () => {
    try {
      const audio = new Audio(`${window.location.origin}/message.wav`)
      audio.volume = 0.5

      // Make sure the sound is played only after user interaction
      const playPromise = audio.play()

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log("Message notification sound played successfully.")
          })
          .catch((error) => {
            console.warn("Message notification sound failed to play:", error)
          })
      }
    } catch (error) {
      console.warn("Error initializing message notification sound:", error)
    }
  }
  useEffect(() => {
    const fetchUserCredits = async () => {
      try {
        const token = localStorage.getItem("token") || sessionStorage.getItem("token")
        if (!token) {
          console.error("No auth token found")
          return
        }

        // Fetch user profile to get credits
        const userProfile = await api.getUserProfile(token)
        console.log("User profile fetched:", userProfile)

        if (userProfile && typeof userProfile.credits === "number") {
          const credits = userProfile.credits
          console.log("User has", credits, "credits available")
          setUserCredits(credits)

          // Update session service with the correct credit amount
          sessionService.setUserCredits(credits)
          setRemainingCredits(credits)
        } else {
          console.error("Credits not found in user profile:", userProfile)
        }
      } catch (error) {
        console.error("Error fetching user credits:", error)
      }
    }

    fetchUserCredits()
  }, [])

  useEffect(() => {
    if (!sessionId) return

    const roomId = `session_${sessionId}`
    console.log(`📡 Setting up session_update listener before joining: ${roomId}`)

    const handleSessionUpdate = (data: { sessionId: string; status: string }) => {
      console.log(`🟡 Received session_update on user side:`, data)

      if (data.sessionId === sessionId && data.status === "ONGOING") {
        console.log("✅ Expert has joined, starting session")
        setTimeout(() => {
          setIsWaiting(false)
          setIsConnecting(false)
          setSessionStarted(true)
          sessionService.startCharging()
        }, 200)
      }
    }

    // Ensure previous listeners are removed before setting a new one
    socketService.off("session_update")
    socketService.on("session_update", handleSessionUpdate)

    if (!socketService.isConnected()) {
      console.log("⏳ Waiting for socket to connect before joining session...")
      socketService.connect()
      setTimeout(() => {
        socketService.joinRoom(roomId)
      }, 300) // Allow time for connection
    } else {
      socketService.joinRoom(roomId)
    }

    return () => {
      console.log(`❌ Removing session_update listener and leaving room: ${roomId}`)
      socketService.off("session_update")
      socketService.leaveRoom(roomId)
    }
  }, [sessionId, token, user, expertRate])

  useEffect(() => {
    if (!sessionStarted) return

    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 1)
      setDuration(formatTime(elapsedTime + 1))

      if (!isExpert) {
        setRemainingCredits((prev) => Math.max(0, prev - expertRate / 60))
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [sessionStarted, elapsedTime, expertRate])

  useEffect(() => {
    const sessionRoomId = `session_${sessionId}`
    console.log(`📡 Setting up receive_message listener for room: ${sessionRoomId}`)

    const handleReceiveMessage = (message: Message) => {
      console.log(`📩 User received message:`, message)

      // Ignore messages that don't belong to the current session
      if (message.roomId !== sessionRoomId) {
        console.warn("🔴 Ignoring message from a different session:", message)
        return
      }
      if (message.sender === "expert") {
        playMessageNotificationSound()
      }
      // ✅ Prevent adding user's own message received from the socket again
      setMessages((prevMessages) => {
        if (!prevMessages.some((msg) => msg.id === message.id)) {
          return [...prevMessages, message]
        }
        return prevMessages
      })
      scrollToBottom()
    }

    socketService.off("receive_message", handleReceiveMessage)
    socketService.on("receive_message", handleReceiveMessage)

    return () => {
      console.log(`❌ Removing receive_message listener for room: ${sessionRoomId}`)
      socketService.off("receive_message", handleReceiveMessage)
    }
  }, [sessionId])

  useEffect(() => {

    const handleSessionEnded = ({ sessionId: endedSessionId, endedBy }: { sessionId: string; endedBy: "user" | "expert" }) => {
      if (endedSessionId === sessionId) {
        sessionService.setActiveSessionId(sessionId);
        sessionService.endSession(endedSessionId, token || "").then((response) => console.log(response))
        setChatEnded(true)
        setSessionEndMessage(`Chat ended by ${endedBy === "expert" ? "Expert" : "You"}.`);
        setShowRating(true);
        onClose()
      }
    }

    socketService.on("session_ended", handleSessionEnded)

    return () => {
      socketService.off("session_ended", handleSessionEnded)
    }
  }, [sessionId,token])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    const handleSessionUpdate = ({ sessionId: updatedSessionId, status }: { sessionId: string; status: string }) => {
      if (updatedSessionId === sessionId && status === "COMPLETED") {
        console.log("Session update received with status COMPLETED on user side.");
        sessionService.setActiveSessionId(sessionId);
        // Emit session_ended as if the user ended it
        socketService.emit("session_ended", { sessionId, endedBy: "user" });
  
        // End the session and update UI
        sessionService.endSession(sessionId, token || "").then((response) => {
          console.log("Credits transferred successfully:", response);
        });
  
        setChatEnded(true);
        setSessionEndMessage("Chat ended by Expert.");
        setShowRating(true); // Show rating modal
        onClose();
      }
    };
  
    socketService.on("session_update", handleSessionUpdate);
  
    return () => {
      socketService.off("session_update", handleSessionUpdate);
    };
  }, [sessionId, token]);

  useEffect(() => {
    const handleCreditUpdate = (data: any) => {
      if (data.sessionId === sessionId && typeof data.credits === "number") {
        console.log("Received credit update from backend:", data.credits)
        sessionService.updateCredits(data.credits)
      }
    }

    socketService.on("credit_update", handleCreditUpdate)

    return () => {
      socketService.off("credit_update", handleCreditUpdate)
    }
  }, [sessionId])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }
  const updateCredits = (credits: number) => {
    const used = sessionService.getCreditsUsed()
    console.log(`Credit update - Used: ${used.toFixed(2)}, Remaining: ${credits.toFixed(2)}`)
    setCreditsUsed(used)
    setRemainingCredits(credits)
    sessionService.setOnCreditsUpdateCallback(updateCredits)
    setRemainingCredits(sessionService.getRemainingCredits())
  }

  const handleSend = () => {
    if (!newMessage.trim()) return

    if (!isExpert && !sessionService.isSessionActive()) {
      setCreditWarningMessage("This session has ended. Please start a new session.")
      setShowCreditWarning(true)
      return
    }

    if (!isExpert && sessionService.getRemainingCredits() <= 0) {
      setCreditWarningMessage("You have run out of credits. Please add more credits to continue chatting.")
      setShowCreditWarning(true)
      return
    }

    const message: Message = {
      id: uuidv4(),
      sender: isExpert ? "expert" : "user",
      senderName: user?.full_name || (isExpert ? expertName : "User"),
      content: newMessage,
      timestamp: new Date().toISOString(),
      roomId: sessionRoomId,
    }
    // Emit message to server
    socketService.emit("send_message", message)
    // Update UI for sender (self-message)
    setMessages((prevMessages) => {
      if (!prevMessages.some((msg) => msg.id === message.id)) {
        return [...prevMessages, message]
      }
      return prevMessages
    })
    setNewMessage("")
    scrollToBottom()
  }

  const handleClose = async () => {
    setShowExitConfirmation(true)
  }

  const handleConfirmExit = async () => {
    try {
      if (token) {
        socketService.emit("session_update", {
          sessionId,
          status: "COMPLETED",
        })

        console.log("Emitting session_update with status COMPLETED.");

      // Wait for the session_update to propagate
      await new Promise((resolve) => setTimeout(resolve, 500));

      setTimeout(() => {
        setChatEnded(true);
        setSessionEndMessage("You have ended the chat.");
        socketService.leaveRoom(`session_${sessionId}`); // Leave room LAST
        setShowRating(true); // Show rating modal after ending the session
      }, 500);
    }
  } catch (error) {
    console.error("Error ending session:", error);
    onClose(); // Force close even if there's an error
  }
};

  const handleContinueChat = () => {
    setShowExitConfirmation(false)
  }
  const dismissCreditWarning = () => {
    setShowCreditWarning(false)
  }
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0")
    const secs = (seconds % 60).toString().padStart(2, "0")
    return `${minutes}:${secs}`
  }

  const handleRatingClose = () => {
    setShowRating(false)
    onClose() // Close the chat window after rating is submitted or skipped
  }

  if (connectionError) {
    return (
      <div className="fixed bottom-4 right-4 w-96 h-[600px] bg-white rounded-lg shadow-xl flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center">
            <div className="relative">
              <img
                src={expertImage || "/placeholder.svg"}
                alt={expertName}
                className="w-10 h-10 rounded-full object-cover"
              />
            </div>
            <div className="ml-3">
              <h3 className="font-semibold">{expertName}</h3>
            </div>
          </div>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="text-red-500 mb-4">{connectionError}</div>
            <button onClick={onClose} className="px-4 py-2 bg-rose-500 text-white rounded-md hover:bg-rose-600">
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="fixed bottom-4 right-4 w-96 h-[600px] bg-white rounded-lg shadow-xl flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center">
          <div className="relative">
            <img
              src={expertImage || "/placeholder.svg"}
              alt={expertName}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${isOnline ? "bg-green-500" : "bg-gray-400"}`}
            />
          </div>
          <div className="ml-3">
            <h3 className="font-semibold">{expertName}</h3>
            <p className="text-sm text-gray-500">{isWaiting ? "Connecting..." : isOnline ? "Online" : "Offline"}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center text-sm text-gray-500">
            <Clock className="h-4 w-4 mr-1" />
            <span>{duration}</span>
          </div>
          <div className="flex items-center text-sm text-rose-500 font-medium">
            <IndianRupee className="h-4 w-4 mr-1" />
            {!isExpert && <span>{(userCredits).toFixed(2)} C</span>}
          </div>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

         {/* Session End Message */}
    {sessionEndMessage && (
      <div className="p-4 bg-gray-100 text-gray-700 text-center">
        {sessionEndMessage}
      </div>
    )}

      {/* Credit warning */}
      {showCreditWarning && (
        <div className="p-3 bg-yellow-100 border-b border-yellow-200">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-yellow-700">{creditWarningMessage}</p>
            </div>
            <button onClick={dismissCreditWarning} className="text-yellow-500 hover:text-yellow-700 ml-2">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Remaining credits */}
      <div className="px-4 py-2 bg-gray-50 border-b flex justify-between items-center">
        <span className="text-sm text-gray-500">Rate: {expertRate} C/min</span>
        <div className="flex items-center">
          <span className="text-sm text-gray-500 mr-1">Remaining:</span>
          <span className={`text-sm font-medium ${remainingCredits < 10 ? "text-red-500" : "text-green-500"}`}>
            {remainingCredits.toFixed(2)} Credits
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isConnecting ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-rose-500 border-t-transparent"></div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={`${message.id}-${Math.random().toString(36).substr(2, 5)}`}
              className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  message.sender === "user" ? "bg-rose-500 text-white" : "bg-gray-100 text-gray-800"
                }`}
              >
                <p>{message.content}</p>
                <p className={`text-xs mt-1 ${message.sender === "user" ? "text-rose-100" : "text-gray-500"}`}>
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type your message..."
            className={`flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-rose-500 ${
              isConnecting || (!isExpert && remainingCredits <= 0) || (!isExpert && isWaiting) ? "bg-gray-100" : ""
            }`}
            disabled={isConnecting || (!isExpert && remainingCredits <= 0) || (!isExpert && isWaiting)}
          />
          <button
            onClick={handleSend}
            disabled={
              isConnecting || !newMessage.trim() || (!isExpert && remainingCredits <= 0) || (!isExpert && isWaiting)
            }
            className={`${
              isConnecting || !newMessage.trim() || remainingCredits <= 0 || isWaiting
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-rose-500 hover:bg-rose-600"
            } text-white p-2 rounded-full`}
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
        {!isExpert && isWaiting && (
          <p className="text-center text-sm text-gray-500 mt-2">Waiting for expert to join the chat...</p>
        )}
      </div>

      {/* Exit Confirmation Modal */}
      {showExitConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">End Chat Session?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to end this chat session? Your credits will be deducted based on the time spent.
            </p>
            <div className="flex justify-end space-x-4">
              <button onClick={handleContinueChat} className="px-4 py-2 border rounded-md hover:bg-gray-50">
                Continue Chat
              </button>
              <button
                onClick={handleConfirmExit}
                className="px-4 py-2 bg-rose-500 text-white rounded-md hover:bg-rose-600"
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Rating Modal */}
      {showRating && (
        <SessionRating sessionId={sessionId} expertId={expertId} expertName={expertName} onClose={handleRatingClose} />
      )}
    </div>
  )
}

export default ChatWindow

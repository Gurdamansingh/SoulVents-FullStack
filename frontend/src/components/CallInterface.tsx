"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare, RefreshCw, X } from "lucide-react"
import SocketService from "../services/socketService"
import { useAuth } from "../context/AuthContext"
import SessionService from "../services/sessionService"
import { api } from "../services/api"
import SessionRating from "./SessionRatings"

interface CallInterfaceProps {
  sessionId: string
  expertId: string
  expertName: string
  expertRate?: number
  expertType?: string
  expertImage?: string
  onEnd?: () => void
  onClose?: () => void
}

const CallInterface = ({
  sessionId,
  expertId,
  expertName,
  expertRate,
  expertType = "professional", // Default to professional if not specified
  expertImage,
  onEnd,
  onClose,
}: CallInterfaceProps) => {
  const { user } = useAuth()
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(expertType === "CONSULTANT")
  const [isConnecting, setIsConnecting] = useState(true)
  const [callStatus, setCallStatus] = useState<"connecting" | "connected" | "disconnected">("connecting")
  const [callDuration, setCallDuration] = useState(0)
  const [messages, setMessages] = useState<{ sender: string; text: string; time: string }[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [showChat, setShowChat] = useState(false)
  const [connectionAttempts, setConnectionAttempts] = useState(0)
  const [socketConnected, setSocketConnected] = useState(false)
  const [isCallEnded, setIsCallEnded] = useState(false)
  const [creditsUsed, setCreditsUsed] = useState(0)
  const [remainingCredits, setRemainingCredits] = useState(0)
  const [userCredits, setUserCredits] = useState(0)
  const [showEndCallModal, setShowEndCallModal] = useState(false)
  const [endCallMessage, setEndCallMessage] = useState("")
  const [showRating, setShowRating] = useState(false)
  const [expertJoined, setExpertJoined] = useState(false) // Track if expert has joined

  // Determine if this is a voice-only call based on expert type
  const isVoiceOnlyCall = expertType === "CONSULTANT"

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const socketService = SocketService.getInstance()
  const sessionService = SessionService.getInstance()
  const callTimerRef = useRef<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const maxConnectionAttempts = 3

  // Store pending ICE candidates that arrive before remote description is set
  const pendingIceCandidatesRef = useRef<RTCIceCandidate[]>([])
  const isRemoteDescriptionSetRef = useRef<boolean>(false)
  const isProcessingAnswerRef = useRef<boolean>(false)

  // Fetch user credits when component mounts
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

  // Initialize session when component mounts
  useEffect(() => {
    console.log("CallInterface mounted with sessionId:", sessionId)
    console.log("Expert rate:", expertRate)
    console.log("Expert type:", expertType)
    console.log("Is voice-only call:", isVoiceOnlyCall)

    // Initialize the session with the expert rate if available
    if (sessionId && expertId && expertRate) {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token")
      if (token) {
        // Start a call session
        sessionService.startSession(sessionId, "call", expertRate)
        console.log("Session initialized with rate:", expertRate)

        // Fetch user credits again to ensure we have the latest
        api
          .getUserProfile(token)
          .then((profile) => {
            if (profile && typeof profile.credits === "number") {
              console.log("Updated user credits:", profile.credits)
              sessionService.setUserCredits(profile.credits)
              setRemainingCredits(profile.credits)
            }
          })
          .catch((error) => console.error("Error fetching updated user credits:", error))
      }
    }

    // Set video off by default for consultants/counsellors
    if (isVoiceOnlyCall) {
      setIsVideoOff(true)
    }

    // Join the session room immediately
    socketService.joinRoom(`session_${sessionId}`)
    console.log(`Joined session room: session_${sessionId}`)

    // Request call acceptance from expert
    socketService.emit("call_request", {
      sessionId,
      expertId,
      userId: user?.id,
      userName: user?.full_name || "User",
    })
    console.log("Sent call_request to expert")

    return () => {
      // Ensure all media tracks are stopped when component unmounts
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          track.stop()
          console.log(`Stopped track on unmount: ${track.kind}`)
        })
        localStreamRef.current = null
      }
    }
  }, [sessionId, expertId, expertRate, expertType, isVoiceOnlyCall, user])

  // Check socket connection status
  useEffect(() => {
    const checkSocketConnection = () => {
      const isConnected = socketService.isConnected()
      setSocketConnected(isConnected)

      if (!isConnected) {
        console.log("Socket disconnected, attempting to reconnect...")
        socketService.connect()
      }
    }

    // Check immediately
    checkSocketConnection()

    // Then check periodically
    const interval = setInterval(checkSocketConnection, 5000)

    return () => clearInterval(interval)
  }, [])

  // Listen for expert joining the call
  useEffect(() => {
    const handleCallAccepted = (data: any) => {
      console.log("Received call_accepted event:", data)
      if (data.sessionId === sessionId) {
        console.log("Expert joined the call, initializing WebRTC")
        setExpertJoined(true)
      }
    }

    const handleSessionUpdate = (data: any) => {
      console.log("Received session_update event:", data)
      if (data.sessionId === sessionId && data.status === "ONGOING") {
        console.log("Session is now ONGOING, expert has joined")
        setExpertJoined(true)
      }
    }

    socketService.on("call_accepted", handleCallAccepted)
    socketService.on("session_update", handleSessionUpdate)

    return () => {
      socketService.off("call_accepted", handleCallAccepted)
      socketService.off("session_update", handleSessionUpdate)
    }
  }, [sessionId])

  // Function to add pending ICE candidates after remote description is set
  const addPendingIceCandidates = async () => {
    if (!peerConnectionRef.current) return

    if (pendingIceCandidatesRef.current.length > 0) {
      console.log(`Adding ${pendingIceCandidatesRef.current.length} pending ICE candidates`)

      for (const candidate of pendingIceCandidatesRef.current) {
        try {
          await peerConnectionRef.current.addIceCandidate(candidate)
          console.log("Added pending ICE candidate")
        } catch (error) {
          console.error("Error adding pending ICE candidate:", error)
        }
      }

      // Clear pending candidates after adding them
      pendingIceCandidatesRef.current = []
    }
  }

  // Utility for event cleanup
  const useSocketHandlers = (handlers: { event: string; handler: (...args: any[]) => void }[], deps: any[] = []) => {
    useEffect(() => {
      handlers.forEach(({ event, handler }) => socketService.on(event, handler))
      return () => {
        handlers.forEach(({ event, handler }) => socketService.off(event, handler))
      }
    }, deps)
  }

  // === 1. Handle reconnection attempts ===
  useEffect(() => {
    if (isCallEnded) return
    if (connectionAttempts >= maxConnectionAttempts) {
      setCallStatus("disconnected")
    }
  }, [connectionAttempts, maxConnectionAttempts, isCallEnded])

  // === 2. Initialize WebRTC only after expert has joined ===
  useEffect(() => {
    if (!expertJoined || isCallEnded || connectionAttempts >= maxConnectionAttempts) {
      console.log("Skipping WebRTC initialization:", {
        expertJoined,
        isCallEnded,
        connectionAttempts,
        maxConnectionAttempts,
      })
      return
    }

    console.log("Expert has joined, initializing WebRTC connection")
    let isMounted = true

    const initializeCall = async () => {
      try {
        setIsConnecting(true)
        setCallStatus("connecting")

        isRemoteDescriptionSetRef.current = false
        isProcessingAnswerRef.current = false
        pendingIceCandidatesRef.current = []

        console.log(`Initializing call (attempt ${connectionAttempts + 1}/${maxConnectionAttempts})...`)
        console.log(`Session ID: ${sessionId}`)
        console.log(`Expert ID: ${expertId}`)
        console.log(`Expert Name: ${expertName || "Unknown"}`)
        console.log(`Expert Type: ${expertType}`)
        console.log(`Is voice-only call: ${isVoiceOnlyCall}`)

        // Wait for socket connection (max 5s)
        if (!socketService.isConnected()) {
          console.log("Waiting for socket connection...")
          await new Promise((resolve) => {
            const checkInterval = setInterval(() => {
              if (socketService.isConnected()) {
                clearInterval(checkInterval)
                resolve(true)
              }
            }, 500)
            setTimeout(() => {
              clearInterval(checkInterval)
              resolve(false)
            }, 5000)
          })
        }

        // PeerConnection config
        const configuration: RTCConfiguration = {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun2.l.google.com:19302" },
            { urls: "stun:stun3.l.google.com:19302" },
            { urls: "stun:stun4.l.google.com:19302" },
          ],
          iceCandidatePoolSize: 10,
          iceTransportPolicy: "all",
        }

        console.log("Creating peer connection with configuration:", configuration)
        peerConnectionRef.current = new RTCPeerConnection(configuration)

        // ICE Candidate Event - only set up after expert has joined
        peerConnectionRef.current.onicecandidate = (event) => {
          if (event.candidate) {
            console.log("Generated ICE candidate for expert:", event.candidate.candidate.split(" ")[0])
            socketService.emit("ice_candidate", {
              sessionId,
              candidate: event.candidate,
              from: "user",
              to: "expert",
            })
          } else {
            console.log("ICE candidate gathering complete")
          }
        }

        peerConnectionRef.current.onicegatheringstatechange = () => {
          console.log("ICE gathering state:", peerConnectionRef.current?.iceGatheringState)
        }

        peerConnectionRef.current.oniceconnectionstatechange = () => {
          const state = peerConnectionRef.current?.iceConnectionState
          console.log("ICE connection state:", state)
          if (state === "failed") {
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
            reconnectTimeoutRef.current = window.setTimeout(() => {
              if (connectionAttempts < maxConnectionAttempts - 1 && !isCallEnded && isMounted) {
                cleanupCall(false)
                setConnectionAttempts((prev) => prev + 1)
              } else {
                setCallStatus("disconnected")
                if (connectionAttempts >= maxConnectionAttempts - 1) {
                  setEndCallMessage("Call connection failed. Please try again later.")
                  setShowEndCallModal(true)
                }
              }
            }, 2000)
          } else if (["connected", "completed"].includes(state || "")) {
            setIsConnecting(false)
            setCallStatus("connected")
            startCallTimer()
          }
        }

        peerConnectionRef.current.onconnectionstatechange = () => {
          const state = peerConnectionRef.current?.connectionState
          console.log("Connection state:", state)
          if (state === "connected") {
            setIsConnecting(false)
            setCallStatus("connected")
            startCallTimer()
          } else if (["disconnected", "failed"].includes(state || "")) {
            setCallStatus("disconnected")
            stopCallTimer()
          }
        }

        peerConnectionRef.current.ontrack = (event) => {
          console.log("Received remote track", event.streams)
          if (remoteVideoRef.current && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0]
            setIsConnecting(false)
            setCallStatus("connected")
          }
        }

        // Request media
        const constraints = {
          video: isVoiceOnlyCall ? false : true,
          audio: true,
        }
        try {
          console.log("Requesting media with constraints:", constraints)
          const stream = await navigator.mediaDevices.getUserMedia(constraints)
          localStreamRef.current = stream

          if (localVideoRef.current && !isVoiceOnlyCall) {
            localVideoRef.current.srcObject = stream
          }

          stream.getTracks().forEach((track) => {
            if (peerConnectionRef.current) {
              peerConnectionRef.current.addTrack(track, stream)
              console.log(`Added track to peer connection: ${track.kind}`)
            }
          })

          console.log("Local media stream initialized")
        } catch (mediaError) {
          console.error("Error accessing media devices:", mediaError)
          alert("Could not access camera or microphone. Please check permissions.")
        }

        // Create Offer - only after expert has joined
        try {
          console.log("Creating offer...")
          const offer = await peerConnectionRef.current!.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: !isVoiceOnlyCall,
            iceRestart: true,
          })
          console.log("Offer created successfully")

          await peerConnectionRef.current!.setLocalDescription(offer)
          console.log("Local description set successfully")

          socketService.emit("offer", {
            sessionId,
            sdp: offer,
            from: "user",
            to: "expert",
            isVoiceOnly: isVoiceOnlyCall,
          })
          console.log("Sent offer to expert")
        } catch (error) {
          console.error("Error creating offer:", error)
        }
      } catch (error) {
        console.error("Error initializing call:", error)
        setCallStatus("disconnected")
      }
    }

    initializeCall()

    return () => {
      isMounted = false
      if (isCallEnded) {
        cleanupCall(true)
      }
    }
  }, [
    expertJoined, // Only initialize after expert has joined
    sessionId,
    expertId,
    expertName,
    expertType,
    isVoiceOnlyCall,
    connectionAttempts,
    isCallEnded,
    maxConnectionAttempts,
  ])

  // === 3. Register socket event handlers ===
  useSocketHandlers(
    [
      {
        event: "ice_candidate",
        handler: async (data: any) => {
          console.log("Received ICE candidate:", data)
          if (
            data.to === "user" &&
            data.from === "expert" &&
            data.sessionId === sessionId &&
            peerConnectionRef.current &&
            data.candidate
          ) {
            try {
              const candidate = new RTCIceCandidate(data.candidate)
              if (!peerConnectionRef.current.remoteDescription?.type) {
                console.log("Remote description not set yet, storing ICE candidate for later")
                pendingIceCandidatesRef.current.push(candidate)
                return
              }
              console.log("Adding ICE candidate from expert")
              await peerConnectionRef.current.addIceCandidate(candidate)
              console.log("Added ICE candidate successfully")
            } catch (error) {
              console.error("Error handling ICE candidate:", error)
            }
          }
        },
      },
      {
        event: "answer",
        handler: async (data: any) => {
          console.log("Received answer:", data)
          if (
            data.to === "user" &&
            data.from === "expert" &&
            data.sessionId === sessionId &&
            peerConnectionRef.current &&
            data.sdp
          ) {
            if (isProcessingAnswerRef.current) {
              console.log("Already processing an answer, ignoring this one")
              return
            }

            isProcessingAnswerRef.current = true
            const state = peerConnectionRef.current.signalingState
            console.log("Current signaling state:", state)

            if (state !== "have-local-offer") {
              console.log(`Ignoring answer in ${state} state to prevent errors`)
              isProcessingAnswerRef.current = false
              return
            }

            try {
              console.log("Setting remote description from answer")
              await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp))
              console.log("Remote description set successfully")

              isRemoteDescriptionSetRef.current = true
              await addPendingIceCandidates()
            } catch (err) {
              console.error("Error processing answer:", err)
            }
            isProcessingAnswerRef.current = false
          }
        },
      },
      {
        event: "call_ended",
        handler: (data: any) => {
          console.log("Received call_ended event:", data)
          if (data.sessionId !== sessionId) return
          const endedBy = data.endedBy === "expert" ? "Expert" : "You"
          setEndCallMessage(`${endedBy} ended the call.`)
          setShowEndCallModal(true)

          const activeSessionId = sessionService.getActiveSessionId()
          const token = localStorage.getItem("token") || sessionStorage.getItem("token")
          if (activeSessionId && user?.id && token) {
            sessionService
              .endSession(activeSessionId, token)
              .then(() => console.log("Session ended successfully"))
              .catch((error) => console.error("Error ending session:", error))
          }
          setIsCallEnded(true)
          cleanupCall(true)

          if (data.endedBy === "expert" || data.endedBy === "user") {
            setShowRating(true)
          } else {
            setTimeout(() => {
              if (typeof onEnd === "function") {
                onEnd()
              } else if (typeof onClose === "function") {
                onClose()
              } else {
                window.history.back()
              }
            }, 500)
          }
        },
      },
      {
        event: "call_message",
        handler: (data: any) => {
          console.log("Received call message:", data)
          if (data.sessionId !== sessionId) return
          const sender = data.from === "expert" ? expertName : "You"
          const messageText = data.message || data.text
          setMessages((prev) => [
            ...prev,
            {
              sender,
              text: messageText,
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
          ])
          if (data.from === "expert") {
            const audio = new Audio("/message.wav")
            audio.play().catch((err) => console.error("Error playing message sound:", err))
          }
        },
      },
      {
        event: "receive_message",
        handler: (data: any) => {
          // reuse call_message logic
          socketService.emit("call_message", data)
        },
      },
    ],
    [sessionId, expertName, isCallEnded],
  )

  useEffect(() => {
    if (callStatus === "connected" && !isCallEnded) {
      console.log("Call connected, starting charging with user credits:", userCredits)

      // Make sure session service has the latest user credits
      sessionService.setUserCredits(userCredits)

      // Start charging when call is connected
      sessionService.startCharging()

      // Set up credit update listener
      const updateCredits = (credits: number) => {
        const used = sessionService.getCreditsUsed()
        console.log(`Credit update - Used: ${used.toFixed(2)}, Remaining: ${credits.toFixed(2)}`)
        setCreditsUsed(used)
        setRemainingCredits(credits)
      }

      sessionService.setOnCreditsUpdateCallback(updateCredits)
      setRemainingCredits(sessionService.getRemainingCredits())

      // Set up low credits warning
      sessionService.setOnCreditsLowCallback((remaining) => {
        setEndCallMessage(
          `You have ${remaining.toFixed(2)} credits remaining. The call will end when you run out of credits.`,
        )
        setShowEndCallModal(true)
      })

      // Set up credits exhausted handler
      sessionService.setOnCreditsExhaustedCallback(() => {
        setEndCallMessage("You've run out of credits. The call will end now.")
        setShowEndCallModal(true)
        handleEndCall()
      })

      return () => {
        // Clean up listeners
        sessionService.setOnCreditsUpdateCallback(() => {})
        sessionService.setOnCreditsLowCallback(() => {})
        sessionService.setOnCreditsExhaustedCallback(() => {})
      }
    }
  }, [callStatus, isCallEnded, userCredits])

  // Listen for credit updates from backend
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

  // Scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  const startCallTimer = () => {
    if (callTimerRef.current) return

    const startTime = Date.now() - callDuration * 1000
    callTimerRef.current = window.setInterval(() => {
      const seconds = Math.floor((Date.now() - startTime) / 1000)
      setCallDuration(seconds)
    }, 1000)
  }

  const stopCallTimer = () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current)
      callTimerRef.current = null
    }
  }

  const cleanupCall = (complete: boolean) => {
    // Add a static flag to prevent multiple simultaneous cleanups
    if ((cleanupCall as any).isCleaningUp) {
      console.log("Cleanup already in progress, skipping duplicate call")
      return
    }
    ;(cleanupCall as any).isCleaningUp = true

    console.log("Cleaning up call, complete:", complete)
    stopCallTimer()

    // Clear reconnect timeout if it exists
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    // Reset WebRTC state
    isRemoteDescriptionSetRef.current = false
    isProcessingAnswerRef.current = false
    pendingIceCandidatesRef.current = []

    // Remove all socket listeners
    socketService.off("ice_candidate")
    socketService.off("offer")
    socketService.off("answer")
    socketService.off("call_ended")
    socketService.off("call_message")
    socketService.off("credit_update")

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    // Stop all tracks in local stream
    if (localStreamRef.current) {
      console.log("Stopping all media tracks...")
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop()
        console.log(`Stopped track: ${track.kind}`)
      })
      localStreamRef.current = null
    }

    // Leave session room only if complete cleanup
    if (complete) {
      socketService.leaveRoom(`session_${sessionId}`)
    }

    // Reset the cleanup flag when done
    setTimeout(() => {
      ;(cleanupCall as any).isCleaningUp = false
    }, 500)
  }

  const handleToggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks()
      if (audioTracks.length > 0) {
        // Instead of disabling the track which can trigger renegotiation,
        // just set the enabled property which maintains the connection
        audioTracks.forEach((track) => {
          track.enabled = !track.enabled
          console.log(`Audio ${track.enabled ? "enabled" : "disabled"} for track ${track.id}`)
        })
        setIsMuted(!isMuted)
      }
    }
  }

  const handleToggleVideo = () => {
    // Don't allow toggling video for voice-only calls
    if (isVoiceOnlyCall) return

    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks()
      if (videoTracks.length > 0) {
        videoTracks.forEach((track) => {
          track.enabled = !track.enabled
          console.log(`Video ${track.enabled ? "enabled" : "disabled"} for track ${track.id}`)
        })
        setIsVideoOff(!isVideoOff)
      }
    }
  }

  const handleEndCall = () => {
    if (user?.id) {
      setIsCallEnded(true)

      const activeSessionId = sessionService.getActiveSessionId() || sessionId

      // Emit call ended event
      socketService.emit("call_ended", {
        sessionId,
        expertId,
        userId: user.id,
        endedBy: "user",
        reason: "User ended the call",
      })

      // Show rating modal
      setShowRating(true)
      socketService.emit("broadcast_to_room", {
        room: `session_${activeSessionId}`,
        event: "call_ended",
        data: {
          sessionId: activeSessionId,
          expertId,
          userId: user.id,
          endedBy: "user",
          reason: "User ended the call",
        },
      })
    }
  }

  // Update the handleSendMessage function to properly send messages
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim()) return

    // Send message via socket with the correct event and data structure
    socketService.emit("call_message", {
      sessionId,
      from: "user",
      to: "expert",
      message: newMessage,
      roomId: `session_${sessionId}`, // Add the roomId for proper routing
    })

    // Add message to local state
    setMessages((prev) => [
      ...prev,
      {
        sender: "You",
        text: newMessage,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ])

    // Clear input
    setNewMessage("")
  }

  const handleRetryConnection = () => {
    if (connectionAttempts < maxConnectionAttempts - 1) {
      cleanupCall(false)
      setConnectionAttempts((prev) => prev + 1) // This will trigger the useEffect to run again
    } else {
      setEndCallMessage("Maximum connection attempts reached. Please end the call and try again later.")
      setShowEndCallModal(true)
    }
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const handleRatingClose = () => {
    setShowRating(false)
    setIsCallEnded(false)
    setCallStatus("disconnected")
    setCallDuration(0)
    setMessages([])
    setCreditsUsed(0)
    setRemainingCredits(userCredits)
    console.log("Call ended and state reset.")
    // Small delay to ensure cleanup completes before callbacks
    setTimeout(() => {
      window.location.reload()
      if (typeof onEnd === "function") {
        onEnd()
      } else if (typeof onClose === "function") {
        onClose()
      } else {
        console.warn("onEnd and onClose are not functions or not provided")
        // Fallback behavior if callbacks are not provided
        window.location.reload()
      }
    }, 500)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
      {/* Call status bar */}
      <div className="bg-gray-900 text-white p-4 flex justify-between items-center">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-rose-500 flex items-center justify-center text-white font-bold mr-3 overflow-hidden">
            {expertImage ? (
              <img src={expertImage || "/placeholder.svg"} alt={expertName} className="w-full h-full object-cover" />
            ) : (
              expertName.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h3 className="font-medium">{expertName}</h3>
            <div className="flex items-center">
              <p className="text-sm text-gray-300">
                {!expertJoined
                  ? "Waiting for expert to join..."
                  : callStatus === "connecting"
                    ? "Connecting..."
                    : callStatus === "connected"
                      ? formatDuration(callDuration)
                      : "Disconnected"}
              </p>
              {isVoiceOnlyCall && (
                <span className="ml-2 text-xs bg-gray-700 text-white px-2 py-0.5 rounded-full">Voice Only</span>
              )}
            </div>
          </div>
        </div>
        <div className="ml-auto mr-4 text-sm">
          {callStatus === "connected" && (
            <div className="flex flex-col items-end">
              <span>Credits used: {creditsUsed.toFixed(2)}</span>
              <span>Remaining: {remainingCredits.toFixed(2)}</span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {!socketConnected && (
            <span className="text-xs bg-red-800 text-white px-2 py-1 rounded-full">Socket Disconnected</span>
          )}
          <button onClick={() => setShowChat(!showChat)} className="p-2 rounded-full hover:bg-gray-700">
            <MessageSquare className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex">
        {/* Video area */}
        <div className={`relative flex-1 ${showChat ? "w-2/3" : "w-full"}`}>
          {/* Remote video (full size) */}
          {isVoiceOnlyCall ? (
            <div className="w-full h-full flex items-center justify-center bg-gray-900">
              <div className="text-center">
                <div className="w-24 h-24 rounded-full bg-rose-500 flex items-center justify-center text-white text-4xl font-bold mx-auto mb-4 overflow-hidden">
                  {expertImage ? (
                    <img
                      src={expertImage || "/placeholder.svg"}
                      alt={expertName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    expertName.charAt(0).toUpperCase()
                  )}
                </div>
                <h2 className="text-white text-2xl font-medium">{expertName}</h2>
                <p className="text-gray-400 mt-2">
                  {!expertJoined
                    ? "Waiting for expert to join..."
                    : callStatus === "connecting"
                      ? "Connecting..."
                      : formatDuration(callDuration)}
                </p>
                <p className="text-gray-500 mt-1">Voice Call</p>
              </div>
            </div>
          ) : (
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
          )}

          {/* Connection overlay */}
          {(isConnecting || !expertJoined) && (
            <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-rose-500 border-t-transparent mb-4"></div>
              <p className="text-white text-lg mb-4">
                {!expertJoined ? "Waiting for expert to join..." : `Connecting to ${expertName}...`}
              </p>
              {expertJoined && (
                <p className="text-white text-sm mb-4">
                  Attempt {connectionAttempts + 1} of {maxConnectionAttempts}
                </p>
              )}
              {expertJoined && connectionAttempts > 0 && (
                <button
                  onClick={handleRetryConnection}
                  className="flex items-center bg-rose-500 text-white px-4 py-2 rounded-md hover:bg-rose-600"
                >
                  <RefreshCw className="h-4 w-4 mr-2" /> Retry Connection
                </button>
              )}
            </div>
          )}

          {/* Local video (picture-in-picture) - only show for video calls */}
          {!isVoiceOnlyCall && (
            <div className="absolute bottom-4 right-4 w-1/4 max-w-xs">
              <video ref={localVideoRef} autoPlay playsInline muted className="w-full rounded-lg shadow-lg" />
              {isVideoOff && (
                <div className="absolute inset-0 bg-gray-900 rounded-lg flex items-center justify-center">
                  <p className="text-white text-sm">Camera Off</p>
                </div>
              )}
            </div>
          )}

          {/* Call controls */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-900 bg-opacity-80 rounded-full px-2 sm:px-4 py-2 flex items-center space-x-2 sm:space-x-4 max-w-full overflow-x-auto">
            <button
              onClick={handleToggleMute}
              className={`p-2 sm:p-3 rounded-full ${isMuted ? "bg-red-500" : "bg-gray-700"}`}
            >
              {isMuted ? (
                <MicOff className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              ) : (
                <Mic className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              )}
            </button>

            {/* Only show video toggle for non-voice-only calls */}
            {!isVoiceOnlyCall && (
              <button
                onClick={handleToggleVideo}
                className={`p-2 sm:p-3 rounded-full ${isVideoOff ? "bg-red-500" : "bg-gray-700"}`}
              >
                {isVideoOff ? (
                  <VideoOff className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                ) : (
                  <Video className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                )}
              </button>
            )}

            <button onClick={handleEndCall} className="p-2 sm:p-3 rounded-full bg-red-500">
              <PhoneOff className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </button>
          </div>
        </div>

        {/* Chat area */}
        {showChat && (
          <div className="w-1/3 bg-white flex flex-col">
            <div className="p-4 border-b">
              <h3 className="font-medium">Chat with {expertName}</h3>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto">
              {messages.length === 0 ? (
                <p className="text-center text-gray-500 my-4">No messages yet</p>
              ) : (
                messages.map((msg, index) => (
                  <div key={index} className={`mb-3 ${msg.sender === "You" ? "text-right" : ""}`}>
                    <div
                      className={`inline-block rounded-lg px-4 py-2 max-w-xs ${
                        msg.sender === "You" ? "bg-rose-500 text-white" : "bg-gray-200 text-gray-800"
                      }`}
                    >
                      <p>{msg.text}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {msg.sender} • {msg.time}
                    </p>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t">
              <div className="flex">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 border rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <button type="submit" className="bg-rose-500 text-white px-4 py-2 rounded-r-lg">
                  Send
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Call ended modal */}
      {showEndCallModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowEndCallModal(false)}></div>
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 relative z-10">
            <button
              onClick={() => setShowEndCallModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-xl font-semibold mb-4">Call Status</h3>
            <p className="text-gray-700 mb-6">{endCallMessage}</p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowEndCallModal(false)}
                className="bg-rose-500 text-white px-4 py-2 rounded-md hover:bg-rose-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rating modal */}
      {showRating && (
        <SessionRating sessionId={sessionId} expertId={expertId} expertName={expertName} onClose={handleRatingClose} />
      )}
    </div>
  )
}

export default CallInterface

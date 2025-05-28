"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare, RefreshCw, X } from "lucide-react"
import SocketService from "../services/socketService"
import { useAuth } from "../context/AuthContext"
import SessionService from "../services/sessionService"

interface ExpertCallInterfaceProps {
  sessionId: string
  userId: string
  userName: string
  expertType?: string
  onEndCall?: () => void
}

const ExpertCallInterface = ({
  sessionId,
  userId,
  userName,
  expertType = "professional", // Default to professional if not specified
  onEndCall,
}: ExpertCallInterfaceProps) => {
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
  const [showEndCallModal, setShowEndCallModal] = useState(false)
  const [endCallMessage, setEndCallMessage] = useState("")

  // Determine if this is a voice-only call based on expert type
  const [isVoiceOnlyCall, setIsVoiceOnlyCall] = useState(expertType === "CONSULTANT")

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const socketService = SocketService.getInstance()
  const callTimerRef = useRef<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const maxConnectionAttempts = 3
  const sessionService = SessionService.getInstance()

  // Store pending ICE candidates that arrive before remote description is set
  const pendingIceCandidatesRef = useRef<RTCIceCandidate[]>([])
  const isRemoteDescriptionSetRef = useRef<boolean>(false)
  const isProcessingOfferRef = useRef<boolean>(false)
  const hasReceivedRemoteStream = useRef(false)
  const didRunRef = useRef(false)

  // Initialize component
  useEffect(() => {
    console.log("ExpertCallInterface mounted with sessionId:", sessionId)
    console.log("Expert type:", expertType)
    console.log("Is voice-only call:", isVoiceOnlyCall)

    // Set video off by default for consultants/counsellors
    if (isVoiceOnlyCall) {
      setIsVideoOff(true)
    }

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
  }, [sessionId, expertType, isVoiceOnlyCall])

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

  // Function to add pending ICE candidates after remote description is set
  const addPendingIceCandidates = async () => {
    if (pendingIceCandidatesRef.current.length > 0 && peerConnectionRef.current) {
      console.log(`Adding ${pendingIceCandidatesRef.current.length} pending ICE candidates`)
      for (const candidate of pendingIceCandidatesRef.current) {
        try {
          await peerConnectionRef.current.addIceCandidate(candidate)
          console.log("Added pending ICE candidate")
        } catch (err) {
          console.error("Failed to add pending ICE candidate:", err)
        }
      }
      pendingIceCandidatesRef.current = []
    }
  }
  // Initialize WebRTC
  useEffect(() => {
    if (didRunRef.current) {
      console.log("Effect skipped due to strict mode double mount")
      return
    }
    didRunRef.current = true
  
    if (isCallEnded) return
    if (connectionAttempts >= maxConnectionAttempts) {
      setCallStatus("disconnected")
      return
    }

    // If we've already reached max attempts, don't try again
    if (connectionAttempts >= maxConnectionAttempts) {
      setCallStatus("disconnected")
      return
    }

    let isMounted = true
    const eventHandlers: { event: string; handler: any }[] = []

    const registerEventHandler = (event: string, handler: any) => {
      socketService.on(event, handler)
      eventHandlers.push({ event, handler })
    }

    const initializeCall = async () => {
      try {
        setIsConnecting(true)
        setCallStatus("connecting")

        // Reset state for new connection
        isRemoteDescriptionSetRef.current = false
        isProcessingOfferRef.current = false
        pendingIceCandidatesRef.current = []

        console.log(`Initializing call (attempt ${connectionAttempts + 1}/${maxConnectionAttempts})...`)
        console.log(`Session ID: ${sessionId}`)
        console.log(`User ID: ${userId}`)
        console.log(`User Name: ${userName || "Unknown"}`)
        console.log(`Expert Type: ${expertType}`)
        console.log(`Is voice-only call: ${isVoiceOnlyCall}`)

        // Join the session room
        socketService.joinRoom(`session_${sessionId}`)

        // Wait to ensure socket connection is established
        if (!socketService.isConnected()) {
          console.log("Waiting for socket connection...")
          let connected = false
          for (let i = 0; i < 10; i++) {
            await new Promise((resolve) => setTimeout(resolve, 500))
            if (socketService.isConnected()) {
              connected = true
              console.log("Socket connected after waiting")
              break
            }
          }

          if (!connected) {
            console.error("Failed to establish socket connection after waiting")
            throw new Error("Socket connection failed")
          }
        }

        // Configure ICE servers with more STUN/TURN options for better connectivity
        const configuration: RTCConfiguration = {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun2.l.google.com:19302" },
            { urls: "stun:stun3.l.google.com:19302" },
            { urls: "stun:stun4.l.google.com:19302" },
            // Consider adding TURN servers for production
          ],
          iceCandidatePoolSize: 10,
          iceTransportPolicy: "all" as RTCIceTransportPolicy,
        }

        // Create peer connection
        peerConnectionRef.current = new RTCPeerConnection(configuration)

        try {
          // For voice-only calls, ONLY request audio permissions, not video
          const constraints = {
            video: false, // Always set to false for voice-only calls
            audio: true,
          }

          if (!isVoiceOnlyCall) {
            constraints.video = true
          }

          console.log("Requesting media with constraints:", constraints)

          const stream = await navigator.mediaDevices.getUserMedia(constraints)
          localStreamRef.current = stream

          // Only set up local video if this is not a voice-only call
          if (localVideoRef.current && !isVoiceOnlyCall) {
            localVideoRef.current.srcObject = stream
          }

          // Add tracks to peer connection
          stream.getTracks().forEach((track) => {
            if (peerConnectionRef.current && localStreamRef.current) {
              peerConnectionRef.current.addTrack(track, localStreamRef.current)
              console.log(`Added track to peer connection: ${track.kind}`)
            }
          })

          console.log(
            "Local media stream initialized successfully with tracks:",
            stream
              .getTracks()
              .map((t) => t.kind)
              .join(", "),
          )
        } catch (mediaError) {
          console.error("Error accessing media devices:", mediaError)
          alert("Could not access camera or microphone. Please check permissions.")
          // Continue without media if permissions denied
        }

        // Handle ICE candidates
        peerConnectionRef.current.onicecandidate = (event) => {
          if (event.candidate) {
            console.log("Generated ICE candidate for user")
            socketService.emit("ice_candidate", {
              sessionId,
              candidate: event.candidate,
              from: "expert",
              to: "user",
            })
          } else {
            console.log("ICE candidate gathering complete")
          }
        }
        // Log ICE gathering state changes
        peerConnectionRef.current.onicegatheringstatechange = () => {
          console.log("ICE gathering state:", peerConnectionRef.current?.iceGatheringState)
        }

        // Handle ICE connection state changes
        peerConnectionRef.current.oniceconnectionstatechange = () => {
          console.log("ICE connection state:", peerConnectionRef.current?.iceConnectionState)

          if ( peerConnectionRef.current &&
            peerConnectionRef.current?.iceConnectionState === "failed" &&
            !hasReceivedRemoteStream.current
          ) {
            console.log("ICE connection failed or disconnected, considering retry...")
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current)
            }

            // Wait a moment before trying to reconnect
            reconnectTimeoutRef.current = window.setTimeout(() => {
              // Only attempt reconnection if we haven't reached max attempts and the call isn't ended
              if (connectionAttempts < maxConnectionAttempts - 1 && !isCallEnded && isMounted) {
                console.log("Attempting to restart ICE connection...")
                // Try to restart ICE without full reconnect first
                if (peerConnectionRef.current) {
                  try {
                    peerConnectionRef.current.restartIce()
                    console.log("ICE restart initiated")
                  } catch (error) {
                    console.error("Error restarting ICE:", error)
                    cleanupCall(false)
                    setConnectionAttempts((prev) => prev + 1)
                  }
                }
              } else {
                console.log("Max reconnection attempts reached or call ended")
                setCallStatus("disconnected")
                if (connectionAttempts >= maxConnectionAttempts - 1) {
                  setEndCallMessage("Call connection failed. Please try again later.")
                  setShowEndCallModal(true)
                }
              }
            }, 2000)
          } else if (
            peerConnectionRef.current?.iceConnectionState === "connected" ||
            peerConnectionRef.current?.iceConnectionState === "completed"
          ) {
            setIsConnecting(false)
            setCallStatus("connected")
            startCallTimer()
          }
        }

        // Handle connection state changes
        peerConnectionRef.current.onconnectionstatechange = () => {
          console.log("Connection state:", peerConnectionRef.current?.connectionState)
          if (peerConnectionRef.current?.connectionState === "connected") {
            setIsConnecting(false)
            setCallStatus("connected")
            startCallTimer()
          } else if (
            peerConnectionRef.current?.connectionState === "disconnected" ||
            peerConnectionRef.current?.connectionState === "failed"
          ) {
            setCallStatus("disconnected")
            stopCallTimer()
          }
        }

        // Handle remote stream
        peerConnectionRef.current.ontrack = (event) => {
          console.log("Received remote track", event.streams)
          if (remoteVideoRef.current && event.streams[0]) {
            console.log("Setting remote video stream")
            remoteVideoRef.current.srcObject = event.streams[0]
            setIsConnecting(false)
            setCallStatus("connected")
            hasReceivedRemoteStream.current = true 
          }
        }

        // Listen for ICE candidates from user
        const iceHandler = async (data: any) => {
          if (
            data.to === "expert" &&
            data.from === "user" &&
            data.sessionId === sessionId &&
            peerConnectionRef.current &&
            data.candidate // Make sure candidate exists
          ) {
            try {
              const candidate = new RTCIceCandidate(data.candidate)
              console.log("Received ICE candidate from user:", data.candidate?.candidate?.split(" ").slice(0, 5).join(" "))

              // If remote description is not set yet, store the candidate for later
              if (!isRemoteDescriptionSetRef.current) {
                console.log("Remote description not set yet, storing ICE candidate for later")
                pendingIceCandidatesRef.current.push(candidate)
                return
              }
              if (!data.candidate || !data.candidate.candidate) {
                console.warn("Received malformed ICE candidate", data.candidate)
                return
              }
              // Otherwise add it immediately
              console.log("Adding ICE candidate from user")
              await peerConnectionRef.current.addIceCandidate(candidate)
              console.log("Added ICE candidate from user")
            } catch (error) {
              console.error("Error handling ICE candidate:", error)
            }
          }
        }
        registerEventHandler("ice_candidate", iceHandler)

        // Listen for SDP offers from user
        const offerHandler = async (data: any) => {
          if (data.to === "expert" && data.sessionId === sessionId && peerConnectionRef.current) {
            try {
              // If we're already processing an offer, ignore this one
              if (isProcessingOfferRef.current) {
                console.log("Already processing an offer, ignoring this one")
                return
              }

              isProcessingOfferRef.current = true
              console.log("Received offer from user:", data.sdp?.type || "unknown")

              // Check if we're already in a stable or have-remote-offer state, which means
              // we shouldn't process another offer right now
              const currentSignalingState = peerConnectionRef.current.signalingState
              console.log("Current signaling state:", currentSignalingState)

              if (currentSignalingState !== "stable" && currentSignalingState !== "have-local-pranswer") {
                console.log(`Ignoring offer in ${currentSignalingState} state to prevent errors`)
                isProcessingOfferRef.current = false
                return
              }

              // Check if the user specified this is a voice-only call
              if (data.isVoiceOnly !== undefined) {
                console.log("User specified voice-only call:", data.isVoiceOnly)
                setIsVoiceOnlyCall(data.isVoiceOnly)

                // If this is a voice-only call, make sure video is off
                if (data.isVoiceOnly) {
                  setIsVideoOff(true)

                  // Stop any video tracks if they exist
                  if (localStreamRef.current) {
                    localStreamRef.current.getVideoTracks().forEach((track) => {
                      track.stop()
                      console.log("Stopped video track due to voice-only call")
                    })
                  }
                }
              }

              // Set remote description from user's offer
              if (!data.sdp) {
                console.error("Received offer without SDP data")
                isProcessingOfferRef.current = false
                return
              }
              if (isRemoteDescriptionSetRef.current) {
                console.warn("Remote description already set — ignoring duplicate offer")
                isProcessingOfferRef.current = false
                return
              }

              console.log("Setting remote description from user offer")
              await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp))
              console.log("Set remote description from user offer")
              isRemoteDescriptionSetRef.current = true

              // Process any pending ICE candidates
              await addPendingIceCandidates()

              // Create answer
              console.log("Creating answer")
              const answer = await peerConnectionRef.current.createAnswer()
              console.log("Created answer")
              if (peerConnectionRef.current.signalingState !== "have-remote-offer") {
                console.warn("Unexpected signaling state when trying to set local description:", peerConnectionRef.current.signalingState)
                isProcessingOfferRef.current = false
                return
              }
              // Set local description with our answer
              console.log("Setting local description with answer")
              await peerConnectionRef.current.setLocalDescription(answer)
              console.log("Set local description with answer")

              // Send answer to user
              console.log("Sending answer to user")
              socketService.emit("answer", {
                sessionId,
                sdp: answer,
                from: "expert",
                to: "user",
              })
              console.log("Sent answer to user")

              isProcessingOfferRef.current = false
            } catch (error) {
              console.error("Error creating/sending answer:", error)
              isProcessingOfferRef.current = false
            }
          }
        }
        registerEventHandler("offer", offerHandler)

        // Listen for call ended event
        const callEndedHandler = (data: any) => {
          console.log("Received call_ended event:", data)
          if (data.sessionId === sessionId) {
            setIsCallEnded(true)
            setEndCallMessage(`Call ended by ${data.endedBy === "expert" ? "You" : "User"}.`);
            // Show who ended the call
            setShowEndCallModal(true)
            cleanupCall(true)

            // Small delay to ensure cleanup completes before callbacks
            setTimeout(() => {
              window.location.reload()
              if (typeof onEndCall === "function") {
                onEndCall()
              } else {
                console.warn("onEndCall is not a function or not provided")
              }
            }, 500)
          }
        }
        registerEventHandler("call_ended", callEndedHandler)

        // Listen for chat messages
        const messageHandler = (data: any) => {
          console.log("Received call message:", data)
          if (data.sessionId === sessionId) {
            setMessages((prev) => [
              ...prev,
              {
                sender: data.from === "user" ? userName || "User" : "You",
                text: data.message,
                time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              },
            ])
          }
        }
        registerEventHandler("call_message", messageHandler)
        // Important: Expert should not create an offer - wait for user to send one
        console.log("Expert initialized and waiting for user to send offer")
      } catch (error) {
        console.error("Error initializing call:", error)
        setCallStatus("disconnected")
      }
    }

    // Initialize the call
    initializeCall()

    // Return cleanup function
    return () => {
      isMounted = false

      // Remove all registered event handlers
      eventHandlers.forEach(({ event, handler }) => {
        socketService.off(event, handler)
      })
      
      if (isCallEnded || callStatus === "disconnected") {
        cleanupCall(true)
      } else {
        console.warn("Cleanup skipped – call still active.")
      }
    }
  }, [
    sessionId,
    userId,
    userName,
    expertType,
    isVoiceOnlyCall,
    connectionAttempts,
    isCallEnded,
    maxConnectionAttempts,
    onEndCall,
  ])

  useEffect(() => {
    if (callStatus === "connected" && !isCallEnded) {
      // Start charging when call is connected
      sessionService.startCharging()

      return () => {
        // Clean up listener
        sessionService.setOnCreditsUpdateCallback(() => {})
      }
    }
  }, [callStatus, isCallEnded])

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
    console.trace("CALL CLEANUP TRIGGERED", complete)
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
    isProcessingOfferRef.current = false
    pendingIceCandidatesRef.current = []
    hasReceivedRemoteStream.current = false

    // Remove all socket listeners
    socketService.off("ice_candidate")
    socketService.off("offer")
    socketService.off("answer")
    socketService.off("call_ended")
    socketService.off("call_message")

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
    setIsCallEnded(true)

    // Get the active session ID from session service
    const activeSessionId = sessionService.getActiveSessionId() || sessionId

    console.log("Expert ending call for session:", activeSessionId)

    // Emit call ended event
    socketService.emit("call_ended", {
      sessionId: activeSessionId,
      expertId: user?.id,
      userId,
      endedBy: "expert",
      reason: "Expert ended the call",
    })
    
    // // End the session in the backend
    // if (user?.id) {
    //   // Get token from localStorage or auth context
    //   const token = localStorage.getItem("token") || sessionStorage.getItem("token")
    //   if (token) {
    //     sessionService
    //       .endSession(activeSessionId, token)
    //       .then(() => console.log("Session ended successfully"))
    //       .catch((error) => console.error("Error ending session:", error))
    //   }
    // }
    cleanupCall(true)
    // Also broadcast to the session room to ensure all clients receive it
    socketService.emit("broadcast_to_room", {
      room: `session_${activeSessionId}`,
      event: "call_ended",
      data: {
        sessionId: activeSessionId,
        expertId: user?.id,
        userId,
        endedBy: "expert",
        reason: "Expert ended the call",
      },
    })

console.log("Cleaning up byy broadcast_to_room")


    // Small delay to ensure cleanup completes before callbacks
    setTimeout(() => {
      if (typeof onEndCall === "function") {
        onEndCall()
      } else {
        console.warn("onEndCall is not a function or not provided")
        // Fallback behavior if onEndCall is not provided
        window.history.back()
      }
    }, 500)
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim()) return

    // Send message via socket
    socketService.emit("call_message", {
      sessionId,
      from: "expert",
      to: "user",
      message: newMessage,
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
      console.log("Retrying connection...")
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
      {/* Call status bar */}
      <div className="bg-gray-900 text-white p-4 flex justify-between items-center">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-rose-500 flex items-center justify-center text-white font-bold mr-3">
            {userName ? userName.charAt(0).toUpperCase() : "U"}
          </div>
          <div>
            <h3 className="font-medium">{userName || "User"}</h3>
            <div className="flex items-center">
              <p className="text-sm text-gray-300">
                {callStatus === "connecting"
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
        <div className="ml-auto mr-4 text-sm">{/* Expert doesn't need to see credits information */}</div>
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
                <div className="w-24 h-24 rounded-full bg-rose-500 flex items-center justify-center text-white text-4xl font-bold mx-auto mb-4">
                  {userName ? userName.charAt(0).toUpperCase() : "U"}
                </div>
                <h2 className="text-white text-2xl font-medium">{userName || "User"}</h2>
                <p className="text-gray-400 mt-2">
                  {callStatus === "connecting" ? "Connecting..." : formatDuration(callDuration)}
                </p>
                <p className="text-gray-500 mt-1">Voice Call</p>
              </div>
            </div>
          ) : (
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
          )}

          {/* Connection overlay */}
          {isConnecting && (
            <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-rose-500 border-t-transparent mb-4"></div>
              <p className="text-white text-lg mb-4">Connecting to {userName || "User"}...</p>
              <p className="text-white text-sm mb-4">
                Attempt {connectionAttempts + 1} of {maxConnectionAttempts}
              </p>
              {connectionAttempts > 0 && (
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
              <h3 className="font-medium">Chat with {userName || "User"}</h3>
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
    </div>
  )
}

export default ExpertCallInterface

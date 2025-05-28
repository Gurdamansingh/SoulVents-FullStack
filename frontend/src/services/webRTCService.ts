import SimplePeer from "simple-peer"
import SocketService from "./socketService"

class WebRTCService {
  private static instance: WebRTCService
  private peerConnection: RTCPeerConnection | null = null
  private peer: SimplePeer.Instance | null = null
  private localStream: MediaStream | null = null
  private remoteStream: MediaStream | null = null
  private onRemoteStreamCallback: ((stream: MediaStream) => void) | null = null
  private onConnectionStateChangeCallback: ((state: RTCPeerConnectionState) => void) | null = null
  private onIceCandidateCallback: ((candidate: RTCIceCandidate) => void) | null = null
  private socketService: SocketService
  private onStreamCallback: ((stream: MediaStream) => void) | null = null
  private onErrorCallback: ((error: Error) => void) | null = null
  private onCloseCallback: (() => void) | null = null
  private onCallRequestCallback: ((data: any) => void) | null = null
  private sessionId: string | null = null
  private userId: string | null = null
  private expertId: string | null = null
  private role: "user" | "expert" | null = null
  private iceServers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ]
  private isInitiator = false
  private targetId: string | null = null
  private connectionState: "new" | "connecting" | "connected" | "disconnected" | "failed" | "closed" = "new"
  private iceCandidates: RTCIceCandidate[] = []
  private reconnectTimeout: NodeJS.Timeout | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 3
  private reconnectDelay = 2000 // 2 seconds

  private constructor() {
    this.socketService = SocketService.getInstance()
    this.setupSocketListeners()
  }

  public static getInstance(): WebRTCService {
    if (!WebRTCService.instance) {
      WebRTCService.instance = new WebRTCService()
    }
    return WebRTCService.instance
  }

  private setupSocketListeners(): void {
    // Listen for call requests
    this.socketService.on("call_request", (data) => {
      console.log("Received call request:", data)
      if (this.onCallRequestCallback) {
        this.onCallRequestCallback(data)
      }
    })

    // Listen for session updates
    this.socketService.on("session_update", (data) => {
      console.log("Received session update:", data)
      if (data.status === "COMPLETED") {
        this.cleanup()
        if (this.onCloseCallback) {
          this.onCloseCallback()
        }
      }
    })

    // Listen for incoming calls
    this.socketService.onCallUser((data) => {
      if (this.peer) {
        console.log("Already in a call, rejecting...")
        return
      }

      console.log("Received call from:", data.from)
      this.targetId = data.from
      this.isInitiator = false
      this.initializePeer(false, data.from)

      if (this.peer) {
        try {
          this.connectionState = "connecting"
          // Use type assertion to tell TypeScript that peer is a SimplePeer.Instance
          ;(this.peer as SimplePeer.Instance).signal(data.signalData)
        } catch (error) {
          console.error("Error signaling peer:", error)
          this.connectionState = "failed"
          if (this.onErrorCallback) {
            this.onErrorCallback(new Error("Failed to establish connection"))
          }
        }
      }
    })

    // Listen for call acceptance
    this.socketService.onCallAccepted((signal) => {
      console.log("Call accepted, receiving signal")
      if (this.peer) {
        try {
          // Use type assertion to tell TypeScript that peer is a SimplePeer.Instance
          ;(this.peer as SimplePeer.Instance).signal(signal)
        } catch (error) {
          console.error("Error signaling peer after call acceptance:", error)
          this.connectionState = "failed"
          if (this.onErrorCallback) {
            this.onErrorCallback(new Error("Failed to establish connection after call acceptance"))
          }
        }
      }
    })
  }

  public async initialize(sessionId: string, role: "user" | "expert"): Promise<void> {
    this.sessionId = sessionId
    this.role = role

    // Close any existing connection
    this.cleanup()

    // Configure ICE servers
    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
      ],
    }

    // Create new peer connection
    this.peerConnection = new RTCPeerConnection(configuration)

    // Set up event handlers
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.onIceCandidateCallback) {
        this.onIceCandidateCallback(event.candidate)
      }
    }

    this.peerConnection.onconnectionstatechange = () => {
      if (this.peerConnection && this.onConnectionStateChangeCallback) {
        this.onConnectionStateChangeCallback(this.peerConnection.connectionState)
      }
    }

    this.peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0]
        if (this.onRemoteStreamCallback) {
          this.onRemoteStreamCallback(this.remoteStream)
        }
      }
    }

    try {
      // Get local media stream
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })

      // Add tracks to peer connection
      this.localStream.getTracks().forEach((track) => {
        if (this.peerConnection && this.localStream) {
          this.peerConnection.addTrack(track, this.localStream)
        }
      })
    } catch (error) {
      console.error("Error getting user media:", error)
      throw error
    }
  }

  public async startLocalStream(video = true, audio = true): Promise<MediaStream> {
    try {
      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => track.stop())
      } else {
        console.log("Stream is missing — retrying...")
        setTimeout(async () => {
          this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        }, 500)
      }
      const isConsultantCall = this.targetId?.includes("CONSULTANT")
      const shouldEnableVideo = !isConsultantCall && video
      const constraints = {
        video: shouldEnableVideo ? { width: 1280, height: 720, facingMode: "user" } : false,
        audio: audio ? { echoCancellation: true, noiseSuppression: true } : false,
      }
      // For consultants, force video to false

      // Request permissions with constraints
      // const constraints = {
      //     video: shouldEnableVideo ? {
      //         width: { ideal: 1280 },
      //         height: { ideal: 720 },
      //         facingMode: "user"
      //     } : false,
      //     audio: audio && typeof navigator.mediaDevices !== 'undefined' ? {
      //         echoCancellation: true,
      //         noiseSuppression: true,
      //         autoGainControl: true
      //     } : false
      // };

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Media devices not supported")
      }

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints)
      console.log("Local stream started:", this.localStream)
      return this.localStream
    } catch (error) {
      if (error === "NotAllowedError") {
        console.error("User denied media permissions")
      }
      console.error("Error accessing media devices:", error)
      throw new Error("Failed to access camera and microphone")
    }
  }

  public stopLocalStream(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        track.stop()
        console.log(`Stopped track: ${track.kind}:${track.id}`)
      })
      this.localStream = null
    }
  }

  public initializePeer(initiator: boolean, targetId: string): void {
    // Determine if this is a consultant call by checking targetId format
    const isConsultantCall = targetId.includes("session_")

    if (!SimplePeer || typeof SimplePeer !== "function") {
      console.error("SimplePeer not available")
      if (this.onErrorCallback) {
        this.onErrorCallback(new Error("WebRTC not supported"))
      }
      return
    }

    if (this.peer) {
      this.destroyPeer()
    }

    this.isInitiator = initiator
    this.targetId = targetId
    this.connectionState = "new"

    if (!this.localStream) {
      // Try to initialize local stream if not already done
      this.startLocalStream(!isConsultantCall, true)
        .then(() => this.createPeerConnection())
        .catch((error) => {
          console.error("Error starting local stream:", error)
          if (this.onErrorCallback) {
            this.onErrorCallback(error)
          }
        })
    } else {
      this.createPeerConnection()
      this.socketService.on("signal", (data) => {
        console.log("📡 Received signaling data:", data)
        if (this.peer) {
          this.peer.signal(data.signal)
        }
      })
    }
  }

  private createPeerConnection(): void {
    try {
      if (!this.localStream) {
        console.error("Local stream not initialized")
        if (this.onErrorCallback) {
          this.onErrorCallback(new Error("Local stream not initialized"))
        }
        return
      }

      this.initializePeerWithStream()
    } catch (error) {
      console.error("Error in createPeerConnection:", error)
      this.handlePeerError(error)
    }
  }

  private initializePeerWithStream(): void {
    try {
      console.log(`Initializing peer as ${this.isInitiator ? "initiator" : "receiver"} for target: ${this.targetId}`)
      const tracks = this.localStream?.getTracks() || []
      console.log(
        "Local stream tracks:",
        tracks.map((t) => t.kind),
      )
      if (!this.localStream) {
        throw new Error("Local stream is not initialized")
      }

      const peerOptions = {
        initiator: this.isInitiator,
        stream: this.localStream,
        trickle: true,
        config: {
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        },
      }

      // Ensure SimplePeer is properly imported
      if (typeof SimplePeer !== "function") {
        throw new Error("SimplePeer is not properly initialized")
      }

      // Create new peer instance
      try {
        if (!this.localStream) {
          throw new Error("Local stream is not initialized")
        }
      } catch (peerError) {
        console.error("Error creating SimplePeer instance:", peerError)
        throw peerError
      }
      this.peer = new SimplePeer(peerOptions)
      console.log("✅ SimplePeer instance created")
      this.peer.on("signal", (data) => {
        // console.log('Generated signal:', this.isInitiator ? 'as initiator' : 'as receiver', data.type);
        console.log("Sending signaling data:", data)
        this.socketService.emit("signal", {
          sessionId: this.sessionId,
          signal: data,
        })
        this.connectionState = "connecting"
        if (this.isInitiator) {
          this.socketService.callUser(this.targetId!, data, this.userId || this.sessionId || "", "User")
        } else {
          this.socketService.answerCall(this.targetId!, data)
        }
        if (this.peer) {
          console.log("🔗 Passing signal to peer")
          this.peer.signal(data)
        } else {
          console.warn("⚠️ Peer not initialized when signal received")
        }

        // Store ICE candidates if they're in the signal
        // Check if data is an ICE candidate by checking for the type property
        if (data.type === "candidate" && "candidate" in data) {
          // Type assertion to tell TypeScript this is an RTCIceCandidate
          const iceCandidate = data as unknown as RTCIceCandidate
          this.iceCandidates.push(iceCandidate)
        }
      })

      this.peer.on("stream", (stream) => {
        console.log(
          "Received remote stream with tracks:",
          stream
            .getTracks()
            .map((t) => `${t.kind}:${t.id}`)
            .join(", "),
        )
        this.remoteStream = stream
        this.connectionState = "connected"
        if (this.onStreamCallback) {
          this.onStreamCallback(stream)
        }
      })

      this.peer.on("track", (track, stream) => {
        console.log(`Received track: ${track.kind}:${track.id}`)
        // This is an alternative way to handle incoming tracks
        // Some browsers might trigger this instead of the 'stream' event
        if (!this.remoteStream) {
          this.remoteStream = stream
          if (this.onStreamCallback) {
            this.onStreamCallback(stream)
          }
        }
      })

      this.peer.on("error", (err) => {
        console.error("Peer connection error:", err)
        this.connectionState = "failed"
        this.handleConnectionFailure()
        if (this.onErrorCallback) {
          this.onErrorCallback(err)
        }
      })

      this.peer.on("close", () => {
        console.log("Peer connection closed")
        this.connectionState = "closed"
        this.handleConnectionFailure()
        if (this.onCloseCallback) {
          this.onCloseCallback()
        }
      })

      this.peer.on("connect", () => {
        console.log("Peer connection established")
        this.connectionState = "connected"
        this.reconnectAttempts = 0

        // Send a test message to confirm data channel is working
        if (this.peer) {
          this.peer.send(
            JSON.stringify({
              type: "connection-test",
              timestamp: new Date().toISOString(),
            }),
          )
        }
      })

      this.peer.on("data", (data) => {
        try {
          const message = JSON.parse(data.toString())
          console.log("Received data message:", message)
        } catch (e) {
          console.log("Received data:", data.toString())
        }
      })

      console.log("Peer initialized:", this.isInitiator ? "as initiator" : "as receiver")
    } catch (error) {
      console.error("Error initializing peer:", error)
      this.handlePeerError(error)
    }
  }

  private handlePeerError(error: any): void {
    this.connectionState = "failed"
    if (this.onErrorCallback) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      this.onErrorCallback(new Error("Failed to initialize peer connection: " + errorMessage))
    }
  }

  public destroyPeer(): void {
    if (this.peer) {
      try {
        this.peer.destroy()
        console.log("Peer destroyed")
      } catch (error) {
        console.error("Error destroying peer:", error)
      }
      this.peer = null
    }
    this.remoteStream = null
    this.connectionState = "closed"
    this.iceCandidates = []
  }

  public getLocalStream(): MediaStream | null {
    return this.localStream
  }

  public async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error("Peer connection not initialized")
    }

    try {
      const offer = await this.peerConnection.createOffer()
      await this.peerConnection.setLocalDescription(offer)
      return offer
    } catch (error) {
      console.error("Error creating offer:", error)
      throw error
    }
  }

  public async createAnswer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error("Peer connection not initialized")
    }

    try {
      const answer = await this.peerConnection.createAnswer()
      await this.peerConnection.setLocalDescription(answer)
      return answer
    } catch (error) {
      console.error("Error creating answer:", error)
      throw error
    }
  }

  public async setRemoteDescription(sdp: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error("Peer connection not initialized")
    }

    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdp))
    } catch (error) {
      console.error("Error setting remote description:", error)
      throw error
    }
  }

  public async addIceCandidate(candidate: RTCIceCandidate): Promise<void> {
    if (!this.peerConnection) {
      throw new Error("Peer connection not initialized")
    }

    try {
      await this.peerConnection.addIceCandidate(candidate)
    } catch (error) {
      console.error("Error adding ICE candidate:", error)
      throw error
    }
  }

  public setOnStreamCallback(callback: (stream: MediaStream) => void): void {
    this.onStreamCallback = callback
    // If we already have a remote stream, call the callback immediately
    if (this.remoteStream && callback) {
      callback(this.remoteStream)
    }
  }

  public setOnRemoteStream(callback: (stream: MediaStream) => void): void {
    this.onRemoteStreamCallback = callback
    // If we already have a remote stream, call the callback immediately
    if (this.remoteStream) {
      callback(this.remoteStream)
    }
  }

  public setOnConnectionStateChange(callback: (state: RTCPeerConnectionState) => void): void {
    this.onConnectionStateChangeCallback = callback
    // If we already have a connection state, call the callback immediately
    if (this.peerConnection) {
      callback(this.peerConnection.connectionState)
    }
  }

  public setOnIceCandidate(callback: (candidate: RTCIceCandidate) => void): void {
    this.onIceCandidateCallback = callback
  }

  public setOnErrorCallback(callback: (error: Error) => void): void {
    this.onErrorCallback = callback
  }

  public setOnCloseCallback(callback: () => void): void {
    this.onCloseCallback = callback
  }

  public setOnCallRequestCallback(callback: (data: any) => void): void {
    this.onCallRequestCallback = callback
  }

  public toggleAudio(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled
        console.log(`Audio ${enabled ? "enabled" : "disabled"} for track ${track.id}`)
      })
    }
  }

  public toggleVideo(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = enabled
        console.log(`Video ${enabled ? "enabled" : "disabled"} for track ${track.id}`)
      })
    }
  }

  public getConnectionState(): string | RTCPeerConnectionState | null {
    return this.peerConnection ? this.peerConnection.connectionState : this.connectionState
  }

  public setSessionInfo(sessionId: string, userId: string, expertId: string): void {
    this.sessionId = sessionId
    this.userId = userId
    this.expertId = expertId
    console.log("Session info set:", { sessionId, userId, expertId })
  }

  private handleConnectionFailure(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}`)

      // Clear any existing timeout
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout)
      }

      // Attempt to reconnect after delay
      this.reconnectTimeout = setTimeout(() => {
        if (this.targetId) {
          console.log("Reinitializing peer connection...")
          this.destroyPeer()
          this.initializePeer(this.isInitiator, this.targetId)
        }
      }, this.reconnectDelay * this.reconnectAttempts) // Exponential backoff
    } else {
      console.log("Max reconnection attempts reached")
      this.destroyPeer()
    }
  }

  public cleanup(): void {
    // Stop all tracks in local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop())
    }
    this.stopLocalStream()
    this.destroyPeer()
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
    this.sessionId = null
    this.userId = null
    this.expertId = null
    this.targetId = null
    this.isInitiator = false
    this.connectionState = "new"
    this.reconnectAttempts = 0
    this.iceCandidates = []
    this.role = null
    console.log("WebRTC service cleaned up")
  }

  // Method to restart ICE if connection fails
  public restartIce(): void {
    if (this.peer && this.connectionState === "failed") {
      try {
        // For SimplePeer, we need to destroy and recreate the peer
        const wasInitiator = this.isInitiator
        const targetId = this.targetId

        if (targetId) {
          this.destroyPeer()
          this.initializePeer(wasInitiator, targetId)
          console.log("ICE connection restarted")
        }
      } catch (error) {
        console.error("Error restarting ICE:", error)
      }
    }
  }

  public getSessionId(): string | null {
    return this.sessionId
  }

  public getRole(): "user" | "expert" | null {
    return this.role
  }
}

export default WebRTCService

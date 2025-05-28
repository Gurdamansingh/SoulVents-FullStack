import { io, type Socket } from "socket.io-client"

const WS_URL = import.meta.env.VITE_WS_URL || "http://localhost:5000"

class SocketService {
  private static instance: SocketService
  private socket: Socket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectInterval = 3000 // 3 seconds
  private rooms: Set<string> = new Set()
  private pendingOperations: Array<() => void> = []
  private messageCallbacks: Map<string, ((message: any) => void)[]> = new Map()
  private sessionUpdateCallbacks: Map<string, ((data: any) => void)[]> = new Map()
  private isConnecting = false
  private expertRoom: string | null = null
  private registeredExpertId: string | null = null
  private eventListeners: Map<string, Array<(data: any) => void>> = new Map()
  private activeListeners: Set<string> = new Set()

  private constructor() {
    this.initializeSocket()
  }

  public getExpertId(): string | null {
    return this.registeredExpertId
  }

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService()
    }
    return SocketService.instance
  }

  private initializeSocket(): void {
    if (this.socket || this.isConnecting) return

    try {
      this.isConnecting = true
      console.log("Initializing socket connection to:", WS_URL)

      this.socket = io(WS_URL, {
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectInterval,
        transports: ["websocket", "polling"],
        timeout: 10000,
        path: "/socket.io/", // Explicitly set the socket.io path
        autoConnect: true,
        forceNew: false,
        rejectUnauthorized: false, // For development with self-signed certs
      })

      this.setupSocketListeners()
      this.isConnecting = false

      // Add a timeout to check if connection was successful
      setTimeout(() => {
        if (this.socket && !this.socket.connected) {
          console.log("Socket failed to connect within timeout, attempting reconnect")
          this.socket.connect()
        }
      }, 3000)
    } catch (error) {
      console.error("Socket initialization error:", error)
      this.isConnecting = false

      // Try again after a delay
      setTimeout(() => {
        this.isConnecting = false
        this.initializeSocket()
      }, 5000)
    }
  }

  private setupSocketListeners(): void {
    if (!this.socket) return

    this.socket.on("connect", () => {
      console.log("Socket connected:", this.socket?.id)
      this.reconnectAttempts = 0

      // Rejoin all rooms after reconnection
      this.rooms.forEach((roomId) => {
        console.log("joined room id:", roomId)
        this.joinRoom(roomId)
      })

      // Execute any pending operations
      while (this.pendingOperations.length > 0) {
        const operation = this.pendingOperations.shift()
        if (operation) operation()
      }
    })

    this.socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason)

      if (reason === "io server disconnect") {
        // The server has forcefully disconnected the socket
        this.reconnect()
      }
    })

    this.socket.on("connect_error", (error) => {
      console.error("Connection error:", error)
      this.reconnectAttempts++

      if (this.reconnectAttempts > this.maxReconnectAttempts) {
        console.error("Max reconnection attempts reached")
      }
    })

    // Listen for incoming messages
    this.socket.on("receive_message", (data) => {
      const roomId = data.roomId
      if (this.messageCallbacks.has(roomId)) {
        const callbacks = this.messageCallbacks.get(roomId) || []
        callbacks.forEach((callback) => callback(data))
      }
    })

    // Listen for session updates
    this.socket.on("session_update", (data) => {
      const sessionId = data.sessionId
      if (this.sessionUpdateCallbacks.has(sessionId)) {
        const callbacks = this.sessionUpdateCallbacks.get(sessionId) || []
        callbacks.forEach((callback) => callback(data))
      }
    })

    // Set up event listeners from the map
    this.eventListeners.forEach((callbacks, event) => {
      callbacks.forEach((callback) => {
        this.socket?.on(event, callback)
        this.activeListeners.add(event)
      })
    })
  }

  private reconnect(): void {
    if (this.socket && !this.socket.connected && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
  
      // Clear any existing reconnection attempts
      if (this.socket.io && this.socket.io._reconnecting) {
        this.socket.io.reconnection(false);
      }
  
      // Force a new connection after a delay
      setTimeout(() => {
        if (this.socket) {
          // Close the existing socket if it's in a bad state
          if (this.socket.disconnected) {
            this.socket.close();
          }
          this.socket.connect();
        }
      }, this.reconnectInterval);
  
    } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached, creating new socket");
  
      // Force a completely new socket
      if (this.socket) {
        this.socket.close();
        this.socket = null;
      }
  
      this.reconnectAttempts = 0;
      this.initializeSocket();
    }
  }
  

  public getSocket(): Socket | null {
    if (!this.socket && !this.isConnecting) {
      this.initializeSocket()
    }
    return this.socket
  }

  public isConnected(): boolean {
    return this.socket?.connected || false
  }

  public onAny(callback: (event: string, data: any) => void) {
    if (!this.socket) {
      this.initializeSocket()
    }
    this.socket?.onAny(callback)
  }

  public offAny() {
    if (!this.socket) return
    this.socket.offAny()
  }

  public setExpertId(id: string): void {
    if (id === this.registeredExpertId) return

    this.registeredExpertId = id
    this.expertRoom = `expert_${id}`

    if (this.socket?.connected) {
      // Join expert's room
      this.joinRoom(this.expertRoom)

      // Register expert with socket server (only once)
      this.socket.emit("register_expert", {
        expertId: id,
        timestamp: new Date().toISOString(),
      })
    } else {
      // Queue the operation for when the socket connects
      this.pendingOperations.push(() => {
        if (this.expertRoom) {
          this.joinRoom(this.expertRoom)
          this.socket?.emit("register_expert", {
            expertId: id,
            timestamp: new Date().toISOString(),
          })
        }
      })
    }
  }

  public joinRoom(roomId: string): void {
    // Always ensure room ID starts with 'session_' or 'expert_'
    const normalizedRoomId =
      roomId.startsWith("session_") || roomId.startsWith("expert_") ? roomId : `session_${roomId}`

    // Add to rooms set regardless of connection status
    this.rooms.add(normalizedRoomId)

    if (!this.socket) {
      console.log("Socket not initialized, initializing before joining room:", normalizedRoomId)
      this.initializeSocket()
      this.pendingOperations.push(() => this.emitJoinRoom(normalizedRoomId))
      return
    }

    if (!this.socket.connected) {
      console.warn("Socket not connected, queuing room join:", normalizedRoomId)
      this.pendingOperations.push(() => this.emitJoinRoom(normalizedRoomId))

      // Try to connect the socket
      this.socket.connect()
      return
    }

    this.emitJoinRoom(normalizedRoomId)
  }

  private emitJoinRoom(roomId: string): void {
    if (!this.socket?.connected) return

    console.log("Joining room:", roomId)
    this.socket.emit("join_room", { room: roomId })
    this.socket.emit("join_chat", { roomId: roomId })

    // Emit room joined event with additional context
    this.socket.emit("room_joined", {
      roomId: roomId,
      expertId: this.registeredExpertId,
      timestamp: new Date().toISOString(),
    })
    console.log(`Joined room: ${roomId}`)
  }

  public leaveRoom(roomId: string): void {
    // Don't leave expert's own room
    if (this.expertRoom && roomId === this.expertRoom) {
      return
    }

    // Remove from rooms set
    this.rooms.delete(roomId)

    if (!this.socket?.connected) {
      console.warn("Socket not connected, cannot leave room")
      return
    }

    console.log("Leaving room:", roomId)
    this.socket.emit("leave_room", { room: roomId })
    this.socket.emit("leave_chat", { roomId })

    // Remove all callbacks for this room
    this.messageCallbacks.delete(roomId)

    console.log(`Left room: ${roomId}`)
  }

  public sendMessage(roomId: string, message: any): void {
    // Ensure room ID is properly formatted
    const normalizedRoomId =
      roomId.startsWith("session_") || roomId.startsWith("expert_") ? roomId : `session_${roomId}`

    if (!this.socket) {
      this.initializeSocket()
      this.pendingOperations.push(() => this.sendMessage(normalizedRoomId, message))
      return
    }

    if (!this.socket.connected) {
      console.error("Cannot send message: socket not connected")
      this.pendingOperations.push(() => this.sendMessage(normalizedRoomId, message))
      return
    }

    if (!this.rooms.has(normalizedRoomId)) {
      this.joinRoom(normalizedRoomId)
    }

    const messageData = {
      ...message,
      roomId: normalizedRoomId,
      expertId: this.registeredExpertId,
      timestamp: new Date().toISOString(),
    }
    this.socket.emit("send_message", messageData)
  }

  public onReceiveMessage(roomId: string, callback: (message: any) => void): () => void {
    if (!this.messageCallbacks.has(roomId)) {
      this.messageCallbacks.set(roomId, [])
    }

    const callbacks = this.messageCallbacks.get(roomId) || []
    callbacks.push(callback)
    this.messageCallbacks.set(roomId, callbacks)

    // Make sure we're in the room
    if (!this.rooms.has(roomId)) {
      this.joinRoom(roomId)
    }

    // Return unsubscribe function
    return () => {
      const updatedCallbacks = (this.messageCallbacks.get(roomId) || []).filter((cb) => cb !== callback)

      if (updatedCallbacks.length === 0) {
        this.messageCallbacks.delete(roomId)
      } else {
        this.messageCallbacks.set(roomId, updatedCallbacks)
      }
    }
  }

  public onSessionUpdate(sessionId: string, callback: (data: any) => void): () => void {
    if (!this.sessionUpdateCallbacks.has(sessionId)) {
      this.sessionUpdateCallbacks.set(sessionId, [])
    }

    const callbacks = this.sessionUpdateCallbacks.get(sessionId) || []
    callbacks.push(callback)
    this.sessionUpdateCallbacks.set(sessionId, callbacks)

    if (this.socket) {
      this.socket.on("session_update", callback)
      this.activeListeners.add("session_update")
    }

    return () => {
      const updatedCallbacks = (this.sessionUpdateCallbacks.get(sessionId) || []).filter((cb) => cb !== callback)

      if (updatedCallbacks.length === 0) {
        this.sessionUpdateCallbacks.delete(sessionId)
      } else {
        this.sessionUpdateCallbacks.set(sessionId, updatedCallbacks)
      }
    }
  }

  // WebRTC signaling methods
  public callUser(userToCall: string, signalData: any, from: string, name: string): void {
    if (!this.socket) {
      this.initializeSocket()
      this.pendingOperations.push(() => this.callUser(userToCall, signalData, from, name))
      return
    }

    if (!this.socket.connected) {
      console.error("Cannot call user: socket not connected")
      this.pendingOperations.push(() => this.callUser(userToCall, signalData, from, name))
      return
    }

    this.socket.emit("call_user", {
      userToCall,
      signalData,
      from,
      name,
    })
    console.log("Call initiated to:", userToCall)
  }

  public answerCall(to: string, signal: any): void {
    if (!this.socket) {
      this.initializeSocket()
      this.pendingOperations.push(() => this.answerCall(to, signal))
      return
    }

    if (!this.socket.connected) {
      console.error("Cannot answer call: socket not connected")
      this.pendingOperations.push(() => this.answerCall(to, signal))
      return
    }

    this.socket.emit("answer_call", { to, signal })
    console.log("Call answered to:", to)
  }

  public onCallUser(callback: (data: any) => void): () => void {
    if (!this.socket) {
      this.initializeSocket()
    }

    this.socket?.on("call_user", callback)
    this.activeListeners.add("call_user")

    return () => {
      this.socket?.off("call_user", callback)
    }
  }

  public onCallAccepted(callback: (signal: any) => void): () => void {
    if (!this.socket) {
      this.initializeSocket()
    }

    this.socket?.on("call_accepted", callback)
    this.activeListeners.add("call_accepted")

    return () => {
      this.socket?.off("call_accepted", callback)
    }
  }

  public disconnect(): void {
    if (this.socket) {
      // Leave all rooms
      this.rooms.forEach((roomId) => {
        this.leaveRoom(roomId)
      })

      // Clear all callbacks
      this.messageCallbacks.clear()
      this.sessionUpdateCallbacks.clear()

      // Remove all event listeners
      this.activeListeners.forEach((event) => {
        this.socket?.off(event)
      })
      this.activeListeners.clear()

      // Disconnect socket
      this.socket.disconnect()
      this.socket = null
    }
  }

  public emitSessionUpdate(sessionId: string, data: any): void {
    if (!this.socket) {
      this.initializeSocket()
      this.pendingOperations.push(() => this.emitSessionUpdate(sessionId, data))
      return
    }

    if (!this.socket.connected) {
      console.warn("Socket not connected, queuing session update")
      this.pendingOperations.push(() => this.emitSessionUpdate(sessionId, data))
      return
    }

    // Join session room if not already joined
    const sessionRoom = `session_${sessionId}`
    if (!this.rooms.has(sessionRoom)) {
      this.joinRoom(sessionRoom)
    }

    const updateData = {
      sessionId,
      roomId: sessionRoom,
      ...data,
      timestamp: new Date().toISOString(),
    }

    console.log("📡 Emitting session update:", updateData)
    this.socket.emit("session_update", updateData)

    // Broadcast to room
    this.socket.emit("broadcast_to_room", {
      room: sessionRoom,
      event: "session_update",
      data: updateData,
    })
  }

  public connect() {
    if (!this.socket) {
      this.initializeSocket()
    } else if (!this.socket.connected) {
      this.socket.connect()
    }
  }

  public off(event: string, callback?: (data: any) => void) {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback)
      } else {
        this.socket.off(event)
      }
      this.activeListeners.delete(event)
    }
  }

  public on(event: string, callback: (data: any) => void) {
    if (!this.socket) {
      this.initializeSocket()
    }

    // Add to event listeners map
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)?.push(callback)

    // Add listener to socket if connected
    if (this.socket) {
      this.socket.on(event, callback)
      this.activeListeners.add(event)
    }

    // Return unsubscribe function
    return () => {
      // Remove from socket
      this.socket?.off(event, callback)
      this.activeListeners.delete(event)

      // Remove from map
      const callbacks = this.eventListeners.get(event)
      if (callbacks) {
        const index = callbacks.indexOf(callback)
        if (index !== -1) {
          callbacks.splice(index, 1)
        }
        if (callbacks.length === 0) {
          this.eventListeners.delete(event)
        }
      }
    }
  }

  public emit(event: string, data: any) {
    if (!this.socket) {
      console.log(`Cannot emit ${event}, socket not initialized, initializing now`)
      this.initializeSocket()
      this.pendingOperations.push(() => this.emit(event, data))
      return
    }

    if (!this.socket.connected) {
      console.warn(`Cannot emit ${event}, socket not connected, queuing operation`)
      this.pendingOperations.push(() => this.emit(event, data))

      // Try to connect the socket
      this.socket.connect()
      return
    }

    console.log(`Emitting ${event}:`, data)
    this.socket.emit(event, data)
  }

  public onSessionEvents(setShowCallRequest: any, setCurrentSession: any, setShowCall: any) {
    if (!this.socket) {
      this.initializeSocket()
    }

    const setupListeners = () => {
      this.socket?.on("call_request", (data) => {
        console.log("📞 Call request received:", data)
        setShowCallRequest(true)
        setCurrentSession(data.session)
      })
      this.activeListeners.add("call_request")

      this.socket?.on("call_accepted", (data) => {
        console.log("✅ Call accepted:", data)
        setShowCall(true)
        setCurrentSession(data.session)
      })
      this.activeListeners.add("call_accepted")

      this.socket?.on("call_ended", (data) => {
        console.log("📴 Call ended:", data)
        alert("The call has ended.")
        setShowCall(false)
        setCurrentSession(null)
      })
      this.activeListeners.add("call_ended")

      this.socket?.on("session_ended", (data) => {
        console.log("❌ Session ended:", data)
        alert(`${data.endedBy} has ended the session.`)
        setCurrentSession(null)
      })
      this.activeListeners.add("session_ended")
    }

    // Setup listeners immediately if socket is connected
    if (this.socket?.connected) {
      setupListeners()
    } else {
      // Otherwise queue for when socket connects
      this.pendingOperations.push(setupListeners)
    }

    // Return cleanup function
    return () => {
      this.off("call_request")
      this.off("call_accepted")
      this.off("call_ended")
      this.off("session_ended")
    }
  }

  public emitCallRequest(sessionId: string) {
    this.emit("call_request", { sessionId })
  }

  public emitEndCall(sessionId: string) {
    this.emit("call_ended", { sessionId })
  }

  // New call signaling methods
  public emitCallSignal(type: "offer" | "answer" | "iceCandidate", sessionId: string, data: any): void {
    this.emit(type, {
      sessionId,
      ...data,
      timestamp: new Date().toISOString(),
    })
  }

  public emitCallAccepted(sessionId: string, expertId: string, userId: string): void {
    this.emit("call_accepted", {
      sessionId,
      expertId,
      userId,
      timestamp: new Date().toISOString(),
    })
  }

  public emitCallEnded(sessionId: string, endedBy: string, reason: string): void {
    this.emit("call_ended", {
      sessionId,
      endedBy,
      reason,
      timestamp: new Date().toISOString(),
    })
  }

  public onCallSignal(type: "offer" | "answer" | "iceCandidate", callback: (data: any) => void): () => void {
    return this.on(type, callback)
  }

  public onCallRequest(callback: (data: any) => void): () => void {
    return this.on("call_request", callback)
  }

  public onCallEnded(callback: (data: any) => void): () => void {
    return this.on("call_ended", callback)
  }

  private logEvent(event: string, data?: any): void {
    console.log(`[Socket][${new Date().toISOString()}] ${event}`, data ? data : "")
  }

  // Helper methods for specific events
  public emitMessage(sessionId: string, message: string, from: string, to: string): void {
    this.emit("message", {
      sessionId,
      message,
      from,
      to,
      timestamp: new Date().toISOString(),
    })
  }

  public emitIceCandidate(
    sessionId: string,
    candidate: RTCIceCandidate,
    from: "user" | "expert",
    to: "user" | "expert",
  ): void {
    this.emit("ice_candidate", {
      sessionId,
      candidate,
      from,
      to,
    })
  }

  public broadcastToRoom(roomId: string, event: string, data: any): void {
    if (!this.socket) {
      this.initializeSocket()
      this.pendingOperations.push(() => this.broadcastToRoom(roomId, event, data))
      return
    }

    if (!this.socket.connected) {
      console.warn("Socket not connected, queuing room broadcast")
      this.pendingOperations.push(() => this.broadcastToRoom(roomId, event, data))
      return
    }

    console.log(`Broadcasting ${event} to room ${roomId}:`, data)
    this.socket.emit("broadcast_to_room", {
      room: roomId,
      event,
      data,
    })
  }
}

export default SocketService

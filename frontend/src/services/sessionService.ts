const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000"

interface Session {
  id: string
  userId: string
  expertId: string
  type: "CHAT" | "CALL"
  startTime: string
  duration: number | null
  status: "SCHEDULED" | "WAITING" | "ONGOING" | "COMPLETED" | "CANCELLED"
  rate: number
  expertRate: number
  userCredits: number
}

class SessionService {
  private static instance: SessionService
  private activeSessionId: string | null = null
  private sessionStartTime: Date | null = null
  private sessionType: "chat" | "call" | null = null
  private expertRate: number | null = null
  private sessionStatus: "waiting" | "ongoing" | "ended" = "waiting"
  private sessionInterval: NodeJS.Timeout | null = null
  private creditsUsed = 0
  private onSessionEndCallback: (() => void) | null = null
  private onCreditsLowCallback: ((remainingCredits: number) => void) | null = null
  private onCreditsExhaustedCallback: (() => void) | null = null
  private userCredits = 0
  private creditWarningThreshold = 10 // Warning when 10 credits left
  private hasShownLowCreditsWarning = false
  private isCharging = false
  private token: string | null = null

  private constructor() {}

  public static getInstance(): SessionService {
    if (!SessionService.instance) {
      SessionService.instance = new SessionService()
    }
    return SessionService.instance
  }

  public async createSession(expertId: string, type: "chat" | "call", token: string): Promise<any> {
    try {
      this.token = token

      // Check if there's already an active session
      if (this.isSessionActive()) {
        throw new Error("You already have an active session")
      }

      // First, fetch user profile to get current credits
      await this.fetchUserCredits(token)

      const endpoint = type === "chat" ? "sessions/chat" : "sessions/call"
      const sessionType = type === "chat" ? "CHAT" : "CALL"

      const response = await fetch(`${API_URL}/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          expertId,
          type: sessionType,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || `Failed to create ${type} session`)
      }

      const session: Session = await response.json()
      console.log(`Created ${type} session:`, session)
      await this.startSession(session.id, type, session.expertRate || 0)
      return session
    } catch (error) {
      console.error(`Error creating ${type} session:`, error)
      throw error
    }
  }

  private async fetchUserCredits(token: string): Promise<void> {
    try {
      console.log("Fetching user credits...")
      const response = await fetch(`${API_URL}/users/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch user profile")
      }

      const profile = await response.json()
      this.userCredits = profile.credits || 0
      console.log(`User has ${this.userCredits} credits available`)
    } catch (error) {
      console.error("Error fetching user credits:", error)
      // Default to 0 if we can't fetch
      this.userCredits = 0
    }
  }

  public startSession(sessionId: string, type: "chat" | "call", expertRate: number): void {
    if (this.activeSessionId) {
      // this.endSessionLocally();
    }
    if (
      !sessionId ||
      !sessionId.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
    ) {
      console.error("Invalid session ID format")
      return
    }
    this.activeSessionId = sessionId
    // End any existing session first
    this.sessionType = type
    this.expertRate = expertRate
    this.sessionStatus = "waiting"
    this.creditsUsed = 0
    this.hasShownLowCreditsWarning = false

    console.log(`Session started: ${sessionId}, type: ${type}, rate: ${expertRate}, credits: ${this.userCredits}`)
  }

  private lastBackendUpdateTime = 0

  // Enhance the startCharging method to better handle call sessions
  public startCharging(): void {
    if (this.sessionStatus === "waiting") {
      this.sessionStartTime = new Date()
      this.sessionStatus = "ongoing"
      this.isCharging = true
      this.hasShownLowCreditsWarning = false

      // Add validation to prevent missing data errors
      if (!this.expertRate) {
        console.warn("Warning: Expert rate is not set, using default value of 1")
        this.expertRate = 1 // Use a default value to prevent null errors
      }

      console.log(
        `Started charging for session: ${this.activeSessionId}, type: ${this.sessionType}, rate: ${this.expertRate}, credits: ${this.userCredits}`,
      )

      // Start tracking session duration and credits
      this.sessionInterval = setInterval(() => {
        const now = Date.now()

        // Only deduct credits if backend update happened > 3 seconds ago
        if (now - this.lastBackendUpdateTime > 3000) {
          this.updateCreditsUsed()
        }
      }, 1000) // Update every 1 second for smoother deduction
    }
  }

  // Enhance the updateCreditsUsed method to handle call sessions better
  private updateCreditsUsed(): void {
    // Add more robust validation
    if (!this.sessionStartTime) {
      console.log("Cannot update credits: missing session start time")
      return
    }

    if (!this.expertRate || this.expertRate <= 0) {
      console.log("Cannot update credits: invalid expert rate", this.expertRate)
      return
    }

    if (!this.isCharging) {
      return
    }

    const now = new Date()
    const durationMinutes = (now.getTime() - this.sessionStartTime.getTime()) / 60000
    const newCreditsUsed = Number.parseFloat((durationMinutes * this.expertRate).toFixed(2))
    const remainingCredits = Math.max(0, this.userCredits - newCreditsUsed)

    if (newCreditsUsed !== this.creditsUsed) {
      this.creditsUsed = newCreditsUsed

      console.log(`Credits update: used=${newCreditsUsed.toFixed(2)}, remaining=${remainingCredits.toFixed(2)}`)

      // Skip local update if backend updated recently
      if (Date.now() - this.lastBackendUpdateTime < 3000) {
        console.log("🛑 Skipping local update due to fresh backend update")
        return
      }

      if (this.onCreditsUpdateCallback) {
        this.onCreditsUpdateCallback(remainingCredits)
      }

      if (remainingCredits <= this.creditWarningThreshold && !this.hasShownLowCreditsWarning) {
        this.hasShownLowCreditsWarning = true
        if (this.onCreditsLowCallback) {
          this.onCreditsLowCallback(remainingCredits)
        }
      }

      if (remainingCredits <= 0) {
        this.isCharging = false
        if (this.onCreditsExhaustedCallback) {
          this.onCreditsExhaustedCallback()
        }
      }
    }
  }

  // Enhance the endSession method to better handle call sessions
  public async endSession(sessionId: string, token: string): Promise<void> {
    if (!sessionId) {
      console.error("No active session to end")
      return
    }

    if (sessionId !== this.activeSessionId) {
      console.error("Session ID mismatch:", { provided: sessionId, active: this.activeSessionId })
    }

    try {
      // Final update of credits used before ending
      this.updateCreditsUsed()

      console.log(`Ending session ${sessionId}, credits used: ${this.creditsUsed}`)

      // Use the correct endpoint based on session type
      const endpoint =
        this.sessionType === "call"
          ? `${API_URL}/sessions/${sessionId}/end-call`
          : `${API_URL}/sessions/${sessionId}/end`

      const response = await fetch(endpoint, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          endTime: new Date().toISOString(),
          duration: this.getSessionDurationMinutes(),
          creditsUsed: this.creditsUsed,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to end session")
      } else {
        this.userCredits -= this.creditsUsed
        console.log(`Session ended successfully. Credits used: ${this.creditsUsed}`)
      }
    } catch (error) {
      console.error("Error ending session:", error)
      throw error
    } finally {
      // Clean up after session ends
      this.endSessionLocally()
    }
  }

  private endSessionLocally(): void {
    if (!this.activeSessionId || this.sessionStatus === "ended") return

    if (this.sessionInterval) {
      clearInterval(this.sessionInterval)
      this.sessionInterval = null
    }

    this.activeSessionId = null
    this.sessionStartTime = null
    this.sessionType = null
    this.expertRate = null
    this.hasShownLowCreditsWarning = false
    this.sessionStatus = "ended"
    this.isCharging = false
    this.creditsUsed = 0

    console.log(`Session ended locally`)

    if (this.onSessionEndCallback) {
      this.onSessionEndCallback()
    }
  }

  public getSessionDurationMinutes(): number {
    if (!this.sessionStartTime) return 0

    const now = new Date()
    return Math.ceil((now.getTime() - this.sessionStartTime.getTime()) / 60000)
  }

  public getSessionDurationFormatted(): string {
    if (!this.sessionStartTime) return "00:00"

    const now = new Date()
    const durationSeconds = Math.floor((now.getTime() - this.sessionStartTime.getTime()) / 1000)
    const minutes = Math.floor(durationSeconds / 60)
    const seconds = durationSeconds % 60

    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  public getCreditsUsed(): number {
    return this.creditsUsed
  }

  public getRemainingCredits(): number {
    return Number.parseFloat(Math.max(0, this.userCredits - this.creditsUsed).toFixed(2))
  }

  public isSessionActive(): boolean {
    return this.activeSessionId !== null && this.sessionStatus !== "ended"
  }

  public getSessionType(): "chat" | "call" | null {
    return this.sessionType
  }

  public getSessionStatus(): string {
    return this.sessionStatus
  }

  public getActiveSessionId(): string | null {
    return this.activeSessionId
  }

  private onCreditsUpdateCallback?: (credits: number) => void

  public setOnCreditsUpdateCallback(callback: (credits: number) => void) {
    this.onCreditsUpdateCallback = callback
  }

  public updateCredits(credits: number) {
    console.log(`🔄 Updating credits from backend: ${credits}`)

    this.lastBackendUpdateTime = Date.now() // ✅ Track backend update time

    if (this.onCreditsUpdateCallback) {
      this.onCreditsUpdateCallback(credits)
    }

    // ✅ Ensure local deduction does NOT override backend value
    this.creditsUsed = Math.max(0, this.userCredits - credits)
  }

  public setOnSessionEndCallback(callback: () => void): void {
    this.onSessionEndCallback = callback
  }

  public setOnCreditsLowCallback(callback: (remainingCredits: number) => void): void {
    this.onCreditsLowCallback = callback
  }

  public setOnCreditsExhaustedCallback(callback: () => void): void {
    this.onCreditsExhaustedCallback = callback
  }

  public setUserCredits(credits: number): void {
    console.log(`Setting user credits to ${credits}`)
    this.userCredits = credits
  }
  public setActiveSessionId(sessionId: string): void {
    console.log(`Setting active session ID to ${sessionId}`)
    this.activeSessionId = sessionId
  }
}

export default SessionService

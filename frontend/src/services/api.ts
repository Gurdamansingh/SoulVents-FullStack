import type { Expert } from "../types"
import SocketService from "./socketService"
import WebRTCService from "./webRTCService"
import SessionService from "./sessionService"

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000"
const WS_URL = import.meta.env.VITE_WS_URL || "http://localhost:5000"

// Helper function to ensure token is present
const requireToken = (token: string | null): string => {
  if (!token) {
    throw new Error("Authentication required")
  }
  return token
}

// Helper function for fetch requests
const fetchWithAuth = async (url: string, options: RequestInit = {}, token?: string | null) => {
  const headers = new Headers(options.headers || {})
  headers.set("Content-Type", "application/json")

  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `Request failed with status ${response.status}`)
  }

  return response.json()
}

export const api = {
  // Auth
  login: async (email: string, password: string) => {
    try {
      return await fetchWithAuth(`${API_URL}/auth/login`, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      })
    } catch (error) {
      console.error("Login error:", error)
      throw error
    }
  },

  register: async (userData: any) => {
    return fetchWithAuth(`${API_URL}/auth/register`, {
      method: "POST",
      body: JSON.stringify(userData),
    })
  },

  verifyOTP: async (email: string, otp: string) => {
    return fetchWithAuth(`${API_URL}/auth/verify-otp`, {
      method: "POST",
      body: JSON.stringify({ email, otp }),
    })
  },

  resendOTP: async (email: string) => {
    return fetchWithAuth(`${API_URL}/auth/resend-otp`, {
      method: "POST",
      body: JSON.stringify({ email }),
    })
  },

  // Admin API
  admin: {
    getUsers: async (token: string | null) => {
      const validToken = requireToken(token)
      try {
        const response = await fetch(`${API_URL}/admin/users`, {
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        })
        if (!response.ok) throw new Error("Failed to fetch users")
        return response.json()
      } catch (error) {
        console.error("Error fetching users:", error)
        throw error
      }
    },

    getExperts: async (token: string | null) => {
      const validToken = requireToken(token)
      try {
        const response = await fetch(`${API_URL}/admin/experts`, {
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        })
        if (!response.ok) throw new Error("Failed to fetch experts")
        const experts = await response.json()

        // Split experts by type
        return {
          consultants: experts.filter((e: Expert) => e.type === "CONSULTANT"),
          professionals: experts.filter((e: Expert) => e.type === "PROFESSIONAL"),
        }
      } catch (error) {
        console.error("Error fetching experts:", error)
        throw error
      }
    },

    createUser: async (data: any, token: string | null) => {
      const validToken = requireToken(token)
      try {
        const response = await fetch(`${API_URL}/admin/users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${validToken}`,
          },
          body: JSON.stringify(data),
        })
        if (!response.ok) throw new Error("Failed to create user")
        return response.json()
      } catch (error) {
        console.error("Error creating user:", error)
        throw error
      }
    },

    createExpert: async (data: any, token: string | null) => {
      const validToken = requireToken(token)
      try {
        const response = await fetch(`${API_URL}/admin/experts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${validToken}`,
          },
          body: JSON.stringify(data),
        })
        if (!response.ok) throw new Error("Failed to create expert")
        return response.json()
      } catch (error) {
        console.error("Error creating expert:", error)
        throw error
      }
    },

    updateUser: async (id: string, data: any, token: string | null) => {
      const validToken = requireToken(token)
      try {
        const response = await fetch(`${API_URL}/admin/users/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${validToken}`,
          },
          body: JSON.stringify(data),
        })
        if (!response.ok) throw new Error("Failed to update user")
        return response.json()
      } catch (error) {
        console.error("Error updating user:", error)
        throw error
      }
    },

    updateExpert: async (id: string, data: any, token: string | null) => {
      const validToken = requireToken(token)
      try {
        const response = await fetch(`${API_URL}/admin/experts/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${validToken}`,
          },
          body: JSON.stringify(data),
        })
        if (!response.ok) throw new Error("Failed to update expert")
        return response.json()
      } catch (error) {
        console.error("Error updating expert:", error)
        throw error
      }
    },

    deleteUser: async (id: string, token: string | null) => {
      const validToken = requireToken(token)
      try {
        const response = await fetch(`${API_URL}/admin/users/${id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        })
        if (!response.ok) throw new Error("Failed to delete user")
        return response.json()
      } catch (error) {
        console.error("Error deleting user:", error)
        throw error
      }
    },

    deleteExpert: async (id: string, token: string | null) => {
      const validToken = requireToken(token)
      try {
        const response = await fetch(`${API_URL}/admin/experts/${id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        })
        if (!response.ok) throw new Error("Failed to delete expert")
        return response.json()
      } catch (error) {
        console.error("Error deleting expert:", error)
        throw error
      }
    },
  },

  // Expert API
  expert: {
    login: async (email: string, password: string) => {
      try {
        const response = await fetch(`${API_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        })
        if (!response.ok) throw new Error("Login failed")
        return response.json()
      } catch (error) {
        console.error("Login error:", error)
        throw error
      }
    },

    getProfile: async (token: string | null) => {
      const validToken = requireToken(token)
      try {
        const response = await fetch(`${API_URL}/experts/profile`, {
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        })
        if (!response.ok) throw new Error("Failed to fetch profile")
        return response.json()
      } catch (error) {
        console.error("Error fetching profile:", error)
        throw error
      }
    },

    updateProfile: async (data: any, token: string | null) => {
      const validToken = requireToken(token)
      try {
        const response = await fetch(`${API_URL}/experts/profile`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${validToken}`,
          },
          body: JSON.stringify(data),
        })
        if (!response.ok) throw new Error("Failed to update profile")
        return response.json()
      } catch (error) {
        console.error("Error updating profile:", error)
        throw error
      }
    },
  },

  // User
  getUserProfile: async (token: string) => {
    return fetchWithAuth(`${API_URL}/users/profile`, {}, token)
  },

  updateUserProfile: async (userData: any, token: string) => {
    return fetchWithAuth(
      `${API_URL}/users/profile`,
      {
        method: "PUT",
        body: JSON.stringify(userData),
      },
      token,
    )
  },

  // Public API
  getExperts: async (category?: string): Promise<Expert[]> => {
    const url = category ? `${API_URL}/experts?category=${category}` : `${API_URL}/experts`
    return fetchWithAuth(url)
  },

  getExpertById: async (id: string) => {
    return fetchWithAuth(`${API_URL}/experts/${id}`)
  },

  // Session Management
  createChatSession: async (expertId: string, token: string | null) => {
    const sessionService = SessionService.getInstance()
    return sessionService.createSession(expertId, "chat", requireToken(token))
  },

  createCallSession: async (expertId: string, token: string | null) => {
    const sessionService = SessionService.getInstance()
    try {
      const response = await fetch(`${API_URL}/sessions/call`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${requireToken(token)}`,
        },
        body: JSON.stringify({ expertId }),
      })

      if (!response.ok) {
        throw new Error("Failed to create call session")
      }

      const session = await response.json()
      await sessionService.startSession(session.id, "call", session.rate)
      return session
    } catch (error) {
      console.error("Error creating call session:", error)
      throw error
    }
  },

  // Join a call session (for experts)
  joinCallSession: async (sessionId: string, token: string | null) => {
    try {
      const response = await fetch(`${API_URL}/sessions/${sessionId}/join-call`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${requireToken(token)}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to join call session")
      }

      return await response.json()
    } catch (error) {
      console.error("Error joining call session:", error)
      throw error
    }
  },

  // End a call session
  endCallSession: async (sessionId: string, token: string | null, data: any) => {
    try {
      const response = await fetch(`${API_URL}/sessions/${sessionId}/end-call`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${requireToken(token)}`,
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to end call session")
      }

      return await response.json()
    } catch (error) {
      console.error("Error ending call session:", error)
      throw error
    }
  },

  // Sessions
  createSession: async (expertId: string, type: string, token: string) => {
    return fetchWithAuth(
      `${API_URL}/sessions`,
      {
        method: "POST",
        body: JSON.stringify({ expert_id: expertId, type }),
      },
      token,
    )
  },

  joinSession: async (sessionId: string, token: string | null) => {
    const validToken = requireToken(token)
    return fetchWithAuth(
      `${API_URL}/sessions/${sessionId}/join`,
      {
        method: "POST",
      },
      validToken,
    )
  },

  endSession: async (sessionId: string, token: string | null) => {
    const validToken = requireToken(token)
    return fetch(`${API_URL}/sessions/${sessionId}/end`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        endTime: new Date().toISOString(),
        status: "COMPLETED",
      }),
    })
  },

  rateSession: async (sessionId: string, rating: number, comment: string, token: string) => {
    return fetchWithAuth(
      `${API_URL}/sessions/${sessionId}/rate`,
      {
        method: "POST",
        body: JSON.stringify({ rating, comment }),
      },
      token,
    )
  },

  getUserSessions: async (token: string) => {
    return fetchWithAuth(`${API_URL}/sessions/user`, {}, token)
  },

  getExpertSessions: async (token: string) => {
    return fetchWithAuth(`${API_URL}/sessions/expert`, {}, token)
  },

  // Credits
  getUserCredits: async (token: string) => {
    return fetchWithAuth(`${API_URL}/credits`, {}, token)
  },

  purchaseCredits: async (amount: number, token: string) => {
    return fetchWithAuth(
      `${API_URL}/credits/purchase`,
      {
        method: "POST",
        body: JSON.stringify({ amount }),
      },
      token,
    )
  },

  getCreditHistory: async (token: string) => {
    return fetchWithAuth(`${API_URL}/credits/history`, {}, token)
  },

  // Expert Portal
  expertLogin: async (email: string, password: string) => {
    return fetchWithAuth(`${API_URL}/experts/login`, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })
  },

  getExpertDashboard: async (token: string) => {
    return fetchWithAuth(`${API_URL}/experts/dashboard`, {}, token)
  },

  updateExpertStatus: async (isOnline: boolean, token: string) => {
    return fetchWithAuth(
      `${API_URL}/experts/status`,
      {
        method: "POST",
        body: JSON.stringify({ is_online: isOnline }),
      },
      token,
    )
  },

  getExpertEarnings: async (token: string) => {
    return fetchWithAuth(`${API_URL}/experts/earnings`, {}, token)
  },

  requestWithdrawal: async (amount: number, token: string) => {
    return fetchWithAuth(
      `${API_URL}/experts/withdraw`,
      {
        method: "POST",
        body: JSON.stringify({ amount }),
      },
      token,
    )
  },

  // Call-specific endpoints
  initiateCall: async (sessionId: string, token: string) => {
    return fetchWithAuth(
      `${API_URL}/sessions/${sessionId}/call/initiate`,
      {
        method: "POST",
      },
      token,
    )
  },

  acceptCall: async (sessionId: string, token: string) => {
    return fetchWithAuth(
      `${API_URL}/sessions/${sessionId}/call/accept`,
      {
        method: "POST",
      },
      token,
    )
  },

  declineCall: async (sessionId: string, reason: string, token: string) => {
    return fetchWithAuth(
      `${API_URL}/sessions/${sessionId}/call/decline`,
      {
        method: "POST",
        body: JSON.stringify({ reason }),
      },
      token,
    )
  },

  endCall: async (sessionId: string, reason: string, token: string) => {
    return fetchWithAuth(
      `${API_URL}/sessions/${sessionId}/call/end`,
      {
        method: "POST",
        body: JSON.stringify({ reason }),
      },
      token,
    )
  },

  // Socket and WebRTC services
  getSocketService: () => {
    return SocketService.getInstance()
  },

  getWebRTCService: () => {
    return WebRTCService.getInstance()
  },

  getSessionService: () => {
    return SessionService.getInstance()
  },

  async fetchCredits(token: string | null) {
    const response = await fetch(`${API_URL}/users/credits`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) {
      throw new Error("Failed to fetch credits")
    }
    return response
  },
}

"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { CreditCard, Bell, Lock, User, Plus, Clock, IndianRupee, History, RefreshCw } from "lucide-react"
import { useAuth } from "../context/AuthContext"

const Profile = () => {
  const { user, token } = useAuth()
  const [profile, setProfile] = useState<any>(null)
  const [sessions, setSessions] = useState<any[]>([]) // Initialize as empty array
  const [isLoading, setIsLoading] = useState(true)
  const [isSessionsLoading, setIsSessionsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [creditUpdateInterval, setCreditUpdateInterval] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (token) {
      fetchProfile()
      fetchSessions()

      // Set up interval to refresh credits every 30 seconds
      const interval = setInterval(fetchProfile, 30000)
      setCreditUpdateInterval(interval)

      return () => {
        if (interval) {
          clearInterval(interval)
        }
      }
    }
  }, [token])

  const fetchProfile = async () => {
    try {
      setIsLoading((prev) => !profile && prev) // Only show loading on initial fetch
      const response = await fetch(`${import.meta.env.VITE_API_URL}/users/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch profile")
      }

      const data = await response.json()
      setProfile(data)
    } catch (err: any) {
      console.error("Error fetching profile:", err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchSessions = async () => {
    try {
      setIsSessionsLoading(true)
      setSessionError(null)

      console.log("Fetching user sessions...")
      const response = await fetch(`${import.meta.env.VITE_API_URL}/sessions/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch sessions: ${response.status} ${response.statusText}`)
      }

      // Always parse as JSON, even if response is empty
      const data = await response.json()
      console.log("Sessions data received:", data)

      // Always ensure we have an array
      setSessions(Array.isArray(data) ? data : [])
    } catch (err: any) {
      console.error("Error fetching sessions:", err)
      setSessions([]) // Set to empty array on error
      setSessionError(err.message)
    } finally {
      setIsSessionsLoading(false)
    }
  }

  const handleRefreshSessions = () => {
    fetchSessions()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-rose-500 border-t-transparent"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-md">{error}</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold mb-8">My Profile</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Info */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <input
                  type="text"
                  value={profile?.full_name || user?.full_name || ""}
                  readOnly
                  className="mt-1 block w-full px-4 py-2 border rounded-md bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={user?.email || ""}
                  readOnly
                  className="mt-1 block w-full px-4 py-2 border rounded-md bg-gray-50"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Recent Sessions</h2>
              <button
                onClick={handleRefreshSessions}
                className="flex items-center text-sm text-rose-500 hover:text-rose-600"
                disabled={isSessionsLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isSessionsLoading ? "animate-spin" : ""}`} />
                {isSessionsLoading ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {sessionError && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-md mb-4 text-sm">
                Error loading sessions: {sessionError}
                <button onClick={handleRefreshSessions} className="ml-2 underline hover:no-underline">
                  Try again
                </button>
              </div>
            )}

            {isSessionsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-rose-500 border-t-transparent"></div>
              </div>
            ) : sessions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Expert
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Date
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Duration
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Credits
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sessions.map((session) => (
                      <tr key={session.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {session.expert_name || "Unknown Expert"}
                          </div>
                          <div className="text-sm text-gray-500">{session.specialty || "General"}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {session.start_time ? new Date(session.start_time).toLocaleDateString() : "N/A"}
                          </div>
                          <div className="text-sm text-gray-500">
                            {session.start_time ? new Date(session.start_time).toLocaleTimeString() : ""}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {session.duration ? `${session.duration} min` : "-"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{session.amount || "-"}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              session.status === "COMPLETED"
                                ? "bg-green-100 text-green-800"
                                : session.status === "ONGOING"
                                  ? "bg-blue-100 text-blue-800"
                                  : session.status === "SCHEDULED"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : session.status === "WAITING"
                                      ? "bg-purple-100 text-purple-800"
                                      : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {session.status || "Unknown"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <p>No sessions yet</p>
                <p className="text-sm mt-2">
                  Your session history will appear here once you've had sessions with experts.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Credits Balance</h2>
            <div className="text-3xl font-bold text-rose-500 mb-4">{(profile?.credits || 0).toFixed(2)}</div>
            <div className="flex flex-col space-y-3">
              <Link
                to="/credits"
                className="w-full flex items-center justify-center bg-rose-500 text-white px-4 py-2 rounded-md hover:bg-rose-600"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Credits
              </Link>
              <Link
                to="/credit-history"
                className="w-full flex items-center justify-center border border-rose-500 text-rose-500 px-4 py-2 rounded-md hover:bg-rose-50"
              >
                <History className="h-5 w-5 mr-2" />
                View History
              </Link>
              <div className="text-sm text-gray-500 mt-2">
                Credits are used for chat and call sessions with experts.
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Session Stats</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-gray-500 mr-2" />
                  <span className="text-gray-700">Total Sessions</span>
                </div>
                <span className="font-semibold">{sessions.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <IndianRupee className="h-5 w-5 text-gray-500 mr-2" />
                  <span className="text-gray-700">Credits Spent</span>
                </div>
                <span className="font-semibold">
                  {sessions.length > 0 ? sessions.reduce((total, session) => total + (session.amount || 0), 0) : 0}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <button className="w-full flex items-center px-4 py-2 text-left hover:bg-gray-50 rounded-md">
                <User className="h-5 w-5 mr-2 text-gray-500" />
                Edit Profile
              </button>
              <button className="w-full flex items-center px-4 py-2 text-left hover:bg-gray-50 rounded-md">
                <CreditCard className="h-5 w-5 mr-2 text-gray-500" />
                Payment Methods
              </button>
              <button className="w-full flex items-center px-4 py-2 text-left hover:bg-gray-50 rounded-md">
                <Bell className="h-5 w-5 mr-2 text-gray-500" />
                Notifications
              </button>
              <button className="w-full flex items-center px-4 py-2 text-left hover:bg-gray-50 rounded-md">
                <Lock className="h-5 w-5 mr-2 text-gray-500" />
                Security
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile

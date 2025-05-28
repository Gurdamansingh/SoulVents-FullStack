"use client"

import { IndianRupee, TrendingUp, Calendar, Download } from "lucide-react"
import type { ExpertData } from "../../types/expert"
import { useState, useEffect } from "react"
import { api } from "../../services/api"

interface EarningsProps {
  expertData: ExpertData | null
}

// Define a more specific session type for the earnings page
interface EarningsSession {
  id: string
  user: {
    full_name: string
  }
  time: string
  duration: string
  credits_used?: number
  status?: string
}

const Earnings = ({ expertData }: EarningsProps) => {
  const [totalEarnings, setTotalEarnings] = useState(0)
  const [availableCredits, setAvailableCredits] = useState(0)
  const [monthlyEarnings, setMonthlyEarnings] = useState<{ month: string; amount: number }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [recentSessions, setRecentSessions] = useState<EarningsSession[]>([])

  useEffect(() => {
    if (expertData) {
      const fetchEarningsData = async () => {
        try {
          setIsLoading(true)
          const token = localStorage.getItem("token") || sessionStorage.getItem("token")
          if (!token) {
            console.error("No auth token found")
            return
          }

          // Fetch expert earnings data
          const earningsData = await api.getExpertEarnings(token)

          // Calculate total earnings (total credits earned minus commission)
          const commission = expertData.commission_rate || 0.2 // Default 20% if not specified
          const totalCredits = earningsData.totalCredits || 0
          const calculatedTotalEarnings = totalCredits * (1 - commission)

          setTotalEarnings(calculatedTotalEarnings)
          setAvailableCredits(earningsData.availableCredits || 0)

          // Set monthly earnings data
          setMonthlyEarnings([
            { month: "Jan", amount: earningsData.monthlyEarnings?.jan || 0 },
            { month: "Feb", amount: earningsData.monthlyEarnings?.feb || 0 },
            { month: "Mar", amount: earningsData.monthlyEarnings?.mar || 0 },
          ])

          // Set recent sessions with credits information
          if (earningsData.recentSessions) {
            setRecentSessions(earningsData.recentSessions)
          } else if (expertData.upcoming_sessions) {
            // Fallback to expertData if no recent sessions in earnings data
            setRecentSessions(expertData.upcoming_sessions as unknown as EarningsSession[])
          }
        } catch (error) {
          console.error("Error fetching earnings data:", error)
          // Fallback to expertData if API call fails
          if (expertData.upcoming_sessions) {
            setRecentSessions(expertData.upcoming_sessions as unknown as EarningsSession[])
          }
        } finally {
          setIsLoading(false)
        }
      }

      fetchEarningsData()
    }
  }, [expertData])

  if (!expertData || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-rose-500 border-t-transparent"></div>
      </div>
    )
  }

  // Format currency
  const formatCurrency = (amount: number): string => {
    return `₹${amount.toFixed(2)}`
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Earnings Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Earnings</p>
                <p className="text-2xl font-bold">{formatCurrency(totalEarnings)}</p>
                <p className="text-xs text-gray-500">After {(expertData.commission_rate || 0.2) * 100}% commission</p>
              </div>
              <IndianRupee className="h-8 w-8 text-rose-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Available Credits</p>
                <p className="text-2xl font-bold">{availableCredits.toFixed(2)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-rose-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Hours</p>
                <p className="text-2xl font-bold">{expertData.total_hours || 0}</p>
              </div>
              <Calendar className="h-8 w-8 text-rose-500" />
            </div>
          </div>
        </div>

        {/* Monthly Earnings Chart */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold">Monthly Earnings</h2>
            <button className="flex items-center text-rose-500 hover:text-rose-600">
              <Download className="h-5 w-5 mr-2" />
              Download Report
            </button>
          </div>
          <div className="h-64 flex items-end justify-between">
            {monthlyEarnings.map((month) => (
              <div key={month.month} className="flex flex-col items-center">
                <div
                  className="w-16 bg-rose-500 rounded-t-lg"
                  style={{
                    height: `${Math.max(20, (month.amount / Math.max(...monthlyEarnings.map((m) => m.amount), 1)) * 200)}px`,
                  }}
                ></div>
                <p className="mt-2 text-sm text-gray-600">{month.month}</p>
                <p className="text-sm font-medium">{formatCurrency(month.amount)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-6">Recent Sessions</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Client</th>
                  <th className="text-left py-3 px-4">Date</th>
                  <th className="text-left py-3 px-4">Duration</th>
                  <th className="text-left py-3 px-4">Credits</th>
                  <th className="text-left py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.map((session) => (
                  <tr key={session.id} className="border-b">
                    <td className="py-3 px-4">{session.user.full_name}</td>
                    <td className="py-3 px-4">{new Date(session.time).toLocaleString()}</td>
                    <td className="py-3 px-4">{session.duration} min</td>
                    <td className="py-3 px-4 font-medium">
                      {(session.credits_used || (expertData.rate || 0) * Number.parseInt(session.duration)).toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        {session.status || "Completed"}
                      </span>
                    </td>
                  </tr>
                ))}
                {(!recentSessions || recentSessions.length === 0) && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      No recent sessions
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Earnings

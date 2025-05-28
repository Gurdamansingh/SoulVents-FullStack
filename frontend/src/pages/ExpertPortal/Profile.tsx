"use client"
import { Camera, Star } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import type { ExpertData } from "../../types/expert"

interface ProfileProps {
  expertData: ExpertData
}

const Profile = ({ expertData }: ProfileProps) => {
  const { token } = useAuth()
  const profile = expertData

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Profile Header */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center space-x-6">
              <div className="relative">
                <img
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`}
                  alt="Profile"
                  className="h-32 w-32 rounded-full object-cover"
                />
                <button
                  className="absolute bottom-0 right-0 bg-rose-500 text-white p-2 rounded-full hover:bg-rose-600"
                  disabled
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1">
                <div className="text-2xl font-bold w-full mb-2 px-3 py-2 border rounded-md">
                  {profile.user.full_name}
                </div>
                <div className="text-gray-600 w-full px-3 py-2 border rounded-md">{profile.specialty}</div>
                <div className="flex items-center mt-2">
                  <span className="text-gray-600 mr-2">Rating:</span>
                  <div className="flex items-center">
                    <Star className="h-5 w-5 text-yellow-400 fill-current" />
                    <span className="ml-1 font-medium">{profile.rating.toFixed(1)}</span>
                    <span className="ml-2 text-gray-500 text-sm">({profile.total_sessions} sessions)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Professional Information */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">Professional Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                <div className="w-full px-3 py-2 border rounded-md">{profile.bio}</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rate (₹/min)</label>
                  <div className="w-full px-3 py-2 border rounded-md">{profile.rate}</div>
                </div>
                {profile.type === "PROFESSIONAL" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
                      <div className="w-full px-3 py-2 border rounded-md">{profile.licenseNumber || "N/A"}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Qualifications</label>
                      <div className="w-full px-3 py-2 border rounded-md">{profile.qualifications || "N/A"}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Experience</label>
                      <div className="w-full px-3 py-2 border rounded-md">{profile.experience || "N/A"}</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Languages */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">Languages</h2>
            <div className="flex flex-wrap gap-2">
              {profile.languages.map((language) => (
                <div key={language} className="px-3 py-1 rounded-full text-sm bg-rose-500 text-white">
                  {language}
                </div>
              ))}
            </div>
          </div>

          {/* Availability */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">Availability</h2>
            <div className="space-y-4">
              {Object.entries(profile.availability).map(([day, schedule]) => (
                <div key={day} className="flex items-center space-x-4">
                  <div className="w-32 capitalize">{day}</div>
                  <div className="px-3 py-2 border rounded-md">{schedule.start}</div>
                  <span>to</span>
                  <div className="px-3 py-2 border rounded-md">{schedule.end}</div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={schedule.available}
                      disabled
                      className="rounded text-rose-500 focus:ring-rose-500"
                    />
                    <span>Available</span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import type { ExpertData } from '../../types/expert';

interface ProfileProps {
  expertData: ExpertData;
}

const Profile = ({ expertData }: ProfileProps) => {
  const { token } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Profile Header */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center space-x-6">
              <div className="relative">
                <img
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${expertData.id}`}
                  alt="Profile"
                  className="h-32 w-32 rounded-full object-cover"
                />
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={expertData.user.full_name}
                  className="text-2xl font-bold w-full mb-2 px-3 py-2 border rounded-md bg-gray-50"
                  readOnly
                  disabled
                />
                <input
                  type="text"
                  value={expertData.specialty}
                  className="text-gray-600 w-full px-3 py-2 border rounded-md bg-gray-50"
                  readOnly
                  disabled
                />
              </div>
            </div>
          </div>

          {/* Professional Information */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">Professional Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bio
                </label>
                <textarea
                  value={expertData.bio}
                  rows={4}
                  className="w-full px-3 py-2 border rounded-md bg-gray-50"
                  readOnly
                  disabled
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rate (₹/min)
                  </label>
                  <input
                    type="number"
                    value={expertData.rate}
                    className="w-full px-3 py-2 border rounded-md bg-gray-50"
                    readOnly
                    disabled
                  />
                </div>
                {expertData.type === 'PROFESSIONAL' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        License Number
                      </label>
                      <input
                        type="text"
                        value={expertData.licenseNumber || ''}
                        className="w-full px-3 py-2 border rounded-md bg-gray-50"
                        readOnly
                        disabled
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Qualifications
                      </label>
                      <input
                        type="text"
                        value={expertData.qualifications || ''}
                        className="w-full px-3 py-2 border rounded-md bg-gray-50"
                        readOnly
                        disabled
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Experience
                      </label>
                      <input
                        type="text"
                        value={expertData.experience || ''}
                        className="w-full px-3 py-2 border rounded-md bg-gray-50"
                        readOnly
                        disabled
                      />
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
              {expertData.languages.map(language => (
                <span
                  key={language}
                  className="px-3 py-1 rounded-full bg-rose-100 text-rose-600 text-sm"
                >
                  {language}
                </span>
              ))}
            </div>
          </div>

          {/* Availability */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">Availability</h2>
            <div className="space-y-4">
              {Object.entries(expertData.availability).map(([day, schedule]) => (
                <div key={day} className="flex items-center space-x-4">
                  <div className="w-32 capitalize">{day}</div>
                  <div className="flex items-center space-x-2">
                    <span>{schedule.start}</span>
                    <span>to</span>
                    <span>{schedule.end}</span>
                    <span className={`ml-4 px-2 py-1 rounded-full text-xs ${
                      schedule.available
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {schedule.available ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Statistics */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-500">Total Sessions</p>
                <p className="text-2xl font-bold">{expertData.total_sessions}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Average Rating</p>
                <p className="text-2xl font-bold">{expertData.rating.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Hours</p>
                <p className="text-2xl font-bold">{expertData.total_hours}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
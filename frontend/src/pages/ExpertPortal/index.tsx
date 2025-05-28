import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { LayoutDashboard, User, IndianRupee, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import SocketService from '../../services/socketService';
import Dashboard from './Dashboard';
import Profile from './Profile';
import Earnings from './Earnings';
import Finance from '../../components/expert/Finance';
import ExpertSettings from '../../components/expert/Settings';

const ExpertPortal = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [expertData, setExpertData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socketService = SocketService.getInstance();

  useEffect(() => {
    if (!user || !token) return;

    const fetchExpertData = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/experts/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch expert data');
        }

        const data = await response.json();
        // Set expert ID in socket service for notifications
        socketService.setExpertId(data.id);
        setExpertData(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExpertData();

    // Set up interval to refresh expert data and update online status
    const interval = setInterval(async () => {
      try {
        // Update online status
        await updateOnlineStatus(true);
        // Fetch fresh data
        await fetchExpertData();
      } catch (error) {
        console.error('Error in periodic update:', error);
      }
    }, 30000); // Every 30 seconds

    // Set up visibility change handler
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updateOnlineStatus(false);
      } else {
        updateOnlineStatus(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Set initial online status
    updateOnlineStatus(true);

    // Cleanup
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Set offline when component unmounts
      updateOnlineStatus(false);
    };
  }, [user, token]);

  const updateOnlineStatus = async (isOnline: boolean) => {
    if (!token) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/experts/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isOnline })
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      // Update local state with the returned expert data
      const data = await response.json();
      setExpertData(data);
    } catch (error) {
      console.error('Error updating online status:', error);
    }
  };

  useEffect(() => {
    if (expertData?.id) {
      console.log(`Registering expert ID in socket: ${expertData.id}`);
      socketService.setExpertId(expertData.id);
    }
  }, [expertData?.id]); // Only run when expert ID changes

  const handleLogout = async () => {
    try {
      // Set expert status to offline before logging out
      await updateOnlineStatus(false);
      await logout();
      navigate('/auth');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-rose-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-md">
          {error}
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard expertData={expertData} onStatusChange={updateOnlineStatus} />;
      case 'profile':
        return <Profile expertData={expertData} />;
      case 'finance':
        return <Finance expertData={expertData} />;
      case 'settings':
        return <ExpertSettings expertData={expertData} onSave={handleSettingsSave} />;
      default:
        return <Dashboard expertData={expertData} onStatusChange={updateOnlineStatus} />;
    }
  };

  const handleSettingsSave = async (settings: any) => {
    try {
      // Update expert settings
      const response = await fetch(`${import.meta.env.VITE_API_URL}/experts/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });

      if (!response.ok) {
        throw new Error('Failed to update settings');
      }

      // Refresh expert data
      const updatedExpert = await response.json();
      setExpertData(updatedExpert);
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Side Navigation */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white border-r">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-center h-16 border-b">
            <h1 className="text-xl font-bold text-rose-500">Expert Portal</h1>
          </div>
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              <NavItem
                icon={<LayoutDashboard className="h-5 w-5" />}
                text="Dashboard"
                isActive={activeTab === 'dashboard'}
                onClick={() => setActiveTab('dashboard')}
              />
              <NavItem
                icon={<User className="h-5 w-5" />}
                text="Profile"
                isActive={activeTab === 'profile'}
                onClick={() => setActiveTab('profile')}
              />
              <NavItem
                icon={<IndianRupee className="h-5 w-5" />}
                text="Finance"
                isActive={activeTab === 'finance'}
                onClick={() => setActiveTab('finance')}
              />
              <NavItem
                icon={<Settings className="h-5 w-5" />}
                text="Settings"
                isActive={activeTab === 'settings'}
                onClick={() => setActiveTab('settings')}
              />
            </ul>
          </nav>
          <div className="p-4 border-t">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64">
        {renderContent()}
      </div>
    </div>
  );
};

interface NavItemProps {
  icon: React.ReactNode;
  text: string;
  isActive: boolean;
  onClick: () => void;
}

const NavItem = ({ icon, text, isActive, onClick }: NavItemProps) => (
  <li>
    <button
      onClick={onClick}
      className={`flex items-center w-full px-4 py-2 rounded-lg ${isActive
        ? 'bg-rose-50 text-rose-500'
        : 'text-gray-600 hover:bg-gray-50'
        }`}
    >
      {icon}
      <span className="ml-3">{text}</span>
    </button>
  </li>
);

export default ExpertPortal;
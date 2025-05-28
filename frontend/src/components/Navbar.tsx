import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Users, BookOpen, UserCircle, MessageSquare, LogOut, CreditCard, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      setIsDropdownOpen(false);
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <nav className="sticky top-0 bg-white shadow-md z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <div className="relative">
                <Heart className="h-8 w-8 text-rose-500" />
                <Heart className="h-8 w-8 text-rose-500 absolute top-0 left-0 animate-ping opacity-75" />
              </div>
              <span className="ml-2 text-xl font-semibold text-gray-900">SoulVents</span>
            </Link>
            <div className="hidden md:flex md:ml-10 space-x-8">
              <NavLink to="/consultants" icon={<Users className="h-5 w-5" />} text="Counsellors" />
              <NavLink to="/professionals" icon={<Users className="h-5 w-5" />} text="Professionals" />
              {/* <NavLink to="/safespace" icon={<MessageSquare className="h-5 w-5" />} text="SafeSpace" /> */}
              <NavLink to="/blog" icon={<BookOpen className="h-5 w-5" />} text="Blogs" />
              <NavLink to="/testimonials" icon={<BookOpen className="h-5 w-5" />} text="Testimonials" />
            </div>
          </div>
          <div className="flex items-center">
            {isAuthenticated ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center px-4 py-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                >
                  <UserCircle className="h-6 w-6" />
                  <span className="ml-2">{user?.full_name || 'Profile'}</span>
                  <ChevronDown className="ml-2 h-4 w-4" />
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1">
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <div className="flex items-center">
                        <UserCircle className="h-4 w-4 mr-2" />
                        Edit Profile
                      </div>
                    </Link>
                    <Link
                      to="/credits"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <div className="flex items-center">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Buy Credits
                      </div>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <div className="flex items-center">
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                      </div>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/auth"
                className="flex items-center px-4 py-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100"
              >
                <UserCircle className="h-6 w-6" />
                <span className="ml-2">Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

const NavLink = ({ to, icon, text }: { to: string; icon: React.ReactNode; text: string }) => (
  <Link
    to={to}
    className="flex items-center px-3 py-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100"
  >
    {icon}
    <span className="ml-2">{text}</span>
  </Link>
);

export default Navbar;
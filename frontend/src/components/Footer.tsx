import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Facebook, Instagram, Linkedin, Twitter } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center">
              <div className="relative">
                <Heart className="h-8 w-8 text-rose-500" />
                <Heart className="h-8 w-8 text-rose-500 absolute top-0 left-0 animate-ping opacity-75" />
              </div>
              <span className="ml-2 text-xl font-semibold">SoulVents</span>
            </div>
            <p className="mt-4 text-gray-400">
              Your trusted platform for emotional support and mental well-being. Connect with experts who care.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link to="/" className="text-gray-400 hover:text-white">Home</Link></li>
              <li><Link to="/consultants" className="text-gray-400 hover:text-white">Counsellors</Link></li>
              <li><Link to="/professionals" className="text-gray-400 hover:text-white">Professionals</Link></li>
              <li><Link to="/testimonials" className="text-gray-400 hover:text-white">Testimonials</Link></li>
              <li><Link to="/blog" className="text-gray-400 hover:text-white">Blogs</Link></li>
              <li><Link to="/about" className="text-gray-400 hover:text-white">About Us</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Join Us</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/join?type=consultant"
                  className="text-gray-400 hover:text-white"
                >
                  Join as Counsellor
                </Link>
              </li>
              <li>
                <Link
                  to="/join?type=professional"
                  className="text-gray-400 hover:text-white"
                >
                  Join as Professional
                </Link>
              </li>
              <li>
                <Link
                  to="/join?type=contributor"
                  className="text-gray-400 hover:text-white"
                >
                  Join as Contributor
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
            <p className="text-gray-400">support@soulvents.com</p>
            <div className="flex space-x-4 mt-4">
              <SocialIcon icon={<Facebook className="h-5 w-5" />} href="https://www.facebook.com/people/Soulvents/61573886039210" />
              <SocialIcon icon={<Instagram className="h-5 w-5" />} href="https://instagram.com/soulvents.official" />
              <SocialIcon icon={<Twitter className="h-5 w-5" />} href="https://twitter.com/soulvents" />
              <SocialIcon icon={<Linkedin className="h-5 w-5" />} href="https://linkedin.com/company/soulvents-official" />
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} SoulVents. All rights reserved.</p>
          <div className="mt-2 space-x-4 text-sm">
            <Link to="/privacy" className="hover:text-white">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-white">Terms of Service</Link>
            <Link to="/faq" className="hover:text-white">FAQ</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

const SocialIcon = ({ icon, href }: { icon: React.ReactNode; href: string }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="text-gray-400 hover:text-white transition-colors"
  >
    {icon}
  </a>
);

export default Footer;
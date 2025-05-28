import React from 'react';
import { Star, MessageCircle, Phone, Award, Briefcase } from 'lucide-react';

const counselors = [
  {
    id: 1,
    name: 'David Thompson',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e',
    rating: 4.9,
    specialty: 'Career Development',
    price: 3.5,
    languages: ['English', 'French'],
    qualifications: 'Certified Career Development Professional',
    experience: '10+ years',
    industries: ['Technology', 'Finance'],
    about: 'Specialized in helping professionals navigate career transitions and growth opportunities.',
  },
  {
    id: 2,
    name: 'Lisa Chen',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
    rating: 4.8,
    specialty: 'Career Counseling',
    price: 3.0,
    languages: ['English', 'Mandarin'],
    qualifications: 'Master\'s in Career Counseling',
    experience: '8+ years',
    industries: ['Healthcare', 'Education'],
    about: 'Expert in career assessment and planning, helping individuals find their ideal career path.',
  },
];

const CareerCounselors = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold mb-8">Career Counselors</h1>
      
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <input
            type="text"
            placeholder="Search counselors..."
            className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
          <select className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500">
            <option value="">All Industries</option>
            <option value="technology">Technology</option>
            <option value="finance">Finance</option>
            <option value="healthcare">Healthcare</option>
            <option value="education">Education</option>
          </select>
          <select className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500">
            <option value="">All Languages</option>
            <option value="english">English</option>
            <option value="french">French</option>
            <option value="mandarin">Mandarin</option>
            <option value="hindi">Hindi</option>
          </select>
          <select className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500">
            <option value="">Price Range</option>
            <option value="low">Under ₹3/min</option>
            <option value="medium">₹3-4/min</option>
            <option value="high">Above ₹4/min</option>
          </select>
          <select className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500">
            <option value="">Sort By</option>
            <option value="rating">Rating</option>
            <option value="price">Price</option>
            <option value="experience">Experience</option>
          </select>
        </div>
      </div>

      {/* Counselors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {counselors.map((counselor) => (
          <CounselorCard key={counselor.id} counselor={counselor} />
        ))}
      </div>
    </div>
  );
};

const CounselorCard = ({ counselor }: { counselor: any }) => (
  <div className="bg-white rounded-lg shadow-md overflow-hidden">
    <img
      src={counselor.image}
      alt={counselor.name}
      className="w-full h-48 object-cover"
    />
    <div className="p-6">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-xl font-semibold">{counselor.name}</h3>
        <div className="flex items-center">
          <Star className="h-5 w-5 text-yellow-400 fill-current" />
          <span className="ml-1">{counselor.rating}</span>
        </div>
      </div>
      <div className="flex items-center mb-2">
        <Award className="h-4 w-4 text-rose-500 mr-1" />
        <span className="text-sm">{counselor.qualifications}</span>
      </div>
      <div className="flex items-center mb-2">
        <Briefcase className="h-4 w-4 text-rose-500 mr-1" />
        <span className="text-sm">{counselor.experience}</span>
      </div>
      <div className="mb-2">
        <span className="text-sm text-gray-600">Industries: </span>
        <span className="text-sm font-medium">{counselor.industries.join(', ')}</span>
      </div>
      <div className="mb-2">
        <span className="text-sm text-gray-600">Languages: </span>
        <span className="text-sm font-medium">{counselor.languages.join(', ')}</span>
      </div>
      <p className="text-gray-600 mb-4">{counselor.about}</p>
      <div className="flex justify-between items-center">
        <span className="text-rose-500 font-semibold">₹{counselor.price}/min</span>
        <div className="flex space-x-2">
          <button className="flex items-center px-4 py-2 bg-rose-500 text-white rounded-md hover:bg-rose-600">
            <MessageCircle className="h-5 w-5 mr-2" />
            Chat
          </button>
          <button className="flex items-center px-4 py-2 border border-rose-500 text-rose-500 rounded-md hover:bg-rose-50">
            <Phone className="h-5 w-5 mr-2" />
            Call
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default CareerCounselors;
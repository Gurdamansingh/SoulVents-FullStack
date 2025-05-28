import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Phone, Star, ArrowRight, CheckCircle, Users, Award, Brain, Heart, Shield } from 'lucide-react';

interface Testimonial {
  id: string;
  name: string;
  location?: string;
  image: string;
  rating: number;
  title: string;
  content: string;
  created_at: string;
  tags: string[];
}

const Home = () => {
  const [recentTestimonials, setRecentTestimonials] = useState<Testimonial[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRecentTestimonials();
  }, []);

  const fetchRecentTestimonials = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/testimonials/recent?limit=3`);
      if (response.ok) {
        const data = await response.json();
        setRecentTestimonials(data);
      }
    } catch (error) {
      console.error('Error fetching recent testimonials:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-rose-50 to-rose-100 py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 md:mb-6">
              Talk to Someone Who Cares – Anytime, Anywhere
            </h1>
            <p className="text-lg md:text-xl text-gray-600 mb-6 md:mb-8">
              Choose from trusted consultants or certified professionals
            </p>
            <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <Link
                to="/consultants"
                className="bg-rose-500 text-white px-6 py-3 rounded-lg hover:bg-rose-600 transition-colors w-full sm:w-auto text-center"
              >
                Find a Counsellor
              </Link>
              <Link
                to="/professionals"
                className="bg-white text-rose-500 px-6 py-3 rounded-lg border border-rose-500 hover:bg-rose-50 transition-colors w-full sm:w-auto text-center"
              >
                Connect with a Professional
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-12 md:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <StepCard
              number={1}
              title="Browse Experts"
              description="Find the right consultant or professional for your needs"
              icon={<MessageCircle className="h-8 w-8" />}
            />
            <StepCard
              number={2}
              title="Select Your Expert"
              description="Choose based on expertise, ratings, and availability"
              icon={<Star className="h-8 w-8" />}
            />
            <StepCard
              number={3}
              title="Start Talking"
              description="Connect instantly via chat or call"
              icon={<Phone className="h-8 w-8" />}
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 md:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12">Why Choose Us</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            <FeatureCard
              icon={<Shield className="h-12 w-12 text-rose-500" />}
              title="Safe & Secure"
              description="Your privacy and security are our top priorities"
            />
            <FeatureCard
              icon={<Users className="h-12 w-12 text-rose-500" />}
              title="Expert Support"
              description="Qualified professionals ready to help"
            />
            <FeatureCard
              icon={<Heart className="h-12 w-12 text-rose-500" />}
              title="Personalized Care"
              description="Support tailored to your unique needs"
            />
            <FeatureCard
              icon={<Brain className="h-12 w-12 text-rose-500" />}
              title="Holistic Approach"
              description="Comprehensive mental health support"
            />
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-12 md:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12">Choose Your Support Level</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg">
              <div className="flex items-center justify-center mb-6">
                <Users className="h-12 w-12 text-rose-500" />
              </div>
              <h3 className="text-xl font-bold text-center mb-4">Counsellors</h3>
              <ul className="space-y-3 mb-8">
                <ComparisonItem text="Trained emotional support providers" />
                <ComparisonItem text="Perfect for daily stress and anxiety" />
                <ComparisonItem text="More affordable rates" />
                <ComparisonItem text="Available 24/7" />
                <ComparisonItem text="Chat or voice call options" />
              </ul>
              <div className="space-y-4 text-center">
                <div className="group relative inline-block">
                  <span className="block text-2xl font-bold text-rose-500">2-3 C/min</span>
                  <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Credits per minute
                  </span>
                </div>
                <div>
                  <Link
                    to="/consultants"
                    className="inline-block bg-rose-500 text-white px-6 py-2 rounded-lg hover:bg-rose-600 w-full"
                  >
                    Find a Counsellor
                  </Link>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg border-2 border-rose-500 transform md:-translate-y-4">
              <div className="flex items-center justify-center mb-6">
                <Award className="h-12 w-12 text-rose-500" />
              </div>
              <h3 className="text-xl font-bold text-center mb-4">Professionals</h3>
              <ul className="space-y-3 mb-8">
                <ComparisonItem text="Licensed psychologists & therapists" />
                <ComparisonItem text="Clinical mental health support" />
                <ComparisonItem text="Structured therapy sessions" />
                <ComparisonItem text="Professional diagnosis" />
                <ComparisonItem text="Treatment plans" />
              </ul>
              <div className="space-y-4 text-center">
                <div className="group relative inline-block">
                  <span className="block text-2xl font-bold text-rose-500">25-30 C/min</span>
                  <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Credits per minute
                  </span>
                </div>
                <div>
                  <Link
                    to="/professionals"
                    className="inline-block bg-rose-500 text-white px-6 py-2 rounded-lg hover:bg-rose-600 w-full"
                  >
                    Find a Professional
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-12 md:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12">What Our Users Say</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {isLoading ? (
              // Loading placeholders
              [...Array(3)].map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-lg shadow-lg h-full animate-pulse">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 rounded-full bg-gray-200 mr-4"></div>
                    <div>
                      <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="h-4 w-4 bg-gray-200 rounded-full mr-1"></div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))
            ) : recentTestimonials.length > 0 ? (
              // Actual testimonials
              recentTestimonials.map((testimonial) => (
                <TestimonialCard
                  key={testimonial.id}
                  content={testimonial.content}
                  author={testimonial.name}
                  image={testimonial.image}
                  rating={testimonial.rating}
                />
              ))
            ) : (
              // Fallback testimonials if API fails
              [
                {
                  content: "The consultants here are so understanding and supportive. I feel much better after every session.",
                  author: "Sarah M.",
                  image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80",
                  rating: 5
                },
                {
                  content: "Professional therapy sessions have helped me overcome my anxiety. The therapists are highly qualified and caring.",
                  author: "James R.",
                  image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e",
                  rating: 5
                },
                {
                  content: "The guidance I received was invaluable. It helped me make better choices and improve my mental well-being.",
                  author: "Emily W.",
                  image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330",
                  rating: 5
                }
              ].map((testimonial, index) => (
                <TestimonialCard
                  key={index}
                  content={testimonial.content}
                  author={testimonial.author}
                  image={testimonial.image}
                  rating={testimonial.rating}
                />
              ))
            )}
          </div>
          <div className="text-center mt-8">
            <Link to="/testimonials" className="inline-flex items-center text-rose-500 hover:text-rose-600">
              Read More Success Stories
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-rose-500 text-white py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6">Ready to Feel Better?</h2>
          <p className="text-lg md:text-xl mb-6 md:mb-8">Start your journey to better mental health today.</p>
          <Link
            to="/consultants"
            className="inline-flex items-center bg-white text-rose-500 px-6 py-3 rounded-lg hover:bg-rose-50 transition-colors"
          >
            Get Started
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  );
};

const StepCard = ({
  number,
  title,
  description,
  icon,
}: {
  number: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}) => (
  <div className="text-center p-6 rounded-lg bg-white shadow-lg">
    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-100 text-rose-500 mb-4">
      {icon}
    </div>
    <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-rose-500 text-white mb-4">
      {number}
    </div>
    <h3 className="text-xl font-semibold mb-2">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </div>
);

const FeatureCard = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => (
  <div className="text-center p-6">
    <div className="flex justify-center mb-4">{icon}</div>
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </div>
);

const ComparisonItem = ({ text }: { text: string }) => (
  <li className="flex items-center">
    <CheckCircle className="h-5 w-5 text-rose-500 mr-2 flex-shrink-0" />
    <span className="text-gray-700">{text}</span>
  </li>
);

const TestimonialCard = ({
  content,
  author,
  image,
  rating,
}: {
  content: string;
  author: string;
  image: string;
  rating: number;
}) => (
  <div className="bg-white p-6 rounded-lg shadow-lg h-full">
    <div className="flex items-center mb-4">
      <img
        src={image}
        alt={author}
        className="w-12 h-12 rounded-full object-cover mr-4"
      />
      <div>
        <h3 className="font-semibold">{author}</h3>
        <div className="flex text-yellow-400">
          {[...Array(rating)].map((_, i) => (
            <Star key={i} className="h-4 w-4 fill-current" />
          ))}
        </div>
      </div>
    </div>
    <p className="text-gray-600 italic">
      {content.length > 150 ? `${content.substring(0, 150)}...` : content}
    </p>
  </div>
);

export default Home;
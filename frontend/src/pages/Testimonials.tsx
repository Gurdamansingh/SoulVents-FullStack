import React, { useState, useEffect } from 'react';
import { Star, Quote, Search, Filter, ChevronDown, ChevronUp, Heart, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Testimonial data structure
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
    expert_type?: string;
    featured?: boolean;
}

const Testimonials = () => {
    const { isAuthenticated } = useAuth();
    const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
    const [featuredTestimonials, setFeaturedTestimonials] = useState<Testimonial[]>([]);
    const [activeFilter, setActiveFilter] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [sortBy, setSortBy] = useState<string>('recent');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showSubmitForm, setShowSubmitForm] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        location: '',
        rating: 5,
        title: '',
        content: '',
        expertType: '',
        tags: [] as string[]
    });
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    useEffect(() => {
        fetchTestimonials();
        fetchFeaturedTestimonials();
    }, []);

    const fetchTestimonials = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${import.meta.env.VITE_API_URL}/testimonials`);
            if (!response.ok) {
                throw new Error('Failed to fetch testimonials');
            }
            const data = await response.json();
            setTestimonials(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load testimonials');
            console.error('Error fetching testimonials:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchFeaturedTestimonials = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/testimonials/featured`);
            if (!response.ok) {
                throw new Error('Failed to fetch featured testimonials');
            }
            const data = await response.json();
            setFeaturedTestimonials(data);
        } catch (err: any) {
            console.error('Error fetching featured testimonials:', err);
            // Don't set error state here to avoid blocking the main testimonials display
        }
    };

    const handleSubmitTestimonial = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError(null);
        setSubmitSuccess(false);

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('You must be logged in to submit a testimonial');
            }

            const response = await fetch(`${import.meta.env.VITE_API_URL}/testimonials`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: formData.name,
                    location: formData.location,
                    rating: formData.rating,
                    title: formData.title,
                    content: formData.content,
                    expertType: formData.expertType || null,
                    tags: formData.tags
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to submit testimonial');
            }

            setSubmitSuccess(true);
            setFormData({
                name: '',
                location: '',
                rating: 5,
                title: '',
                content: '',
                expertType: '',
                tags: []
            });

            // Close the form after a delay
            setTimeout(() => {
                setShowSubmitForm(false);
                setSubmitSuccess(false);
            }, 3000);

        } catch (err: any) {
            setSubmitError(err.message || 'Failed to submit testimonial');
            console.error('Error submitting testimonial:', err);
        }
    };

    const toggleTag = (tag: string) => {
        setFormData(prev => {
            const newTags = prev.tags.includes(tag)
                ? prev.tags.filter(t => t !== tag)
                : [...prev.tags, tag];
            return { ...prev, tags: newTags };
        });
    };

    // Filter testimonials based on active filter and search term
    const filteredTestimonials = testimonials.filter(testimonial => {
        // Filter by category
        if (activeFilter !== 'all' && !testimonial.tags.some(tag => tag.includes(activeFilter))) {
            return false;
        }

        // Filter by search term
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            return (
                testimonial.title.toLowerCase().includes(searchLower) ||
                testimonial.content.toLowerCase().includes(searchLower) ||
                testimonial.name.toLowerCase().includes(searchLower) ||
                testimonial.tags.some(tag => tag.toLowerCase().includes(searchLower))
            );
        }

        return true;
    });

    // Sort testimonials
    const sortedTestimonials = [...filteredTestimonials].sort((a, b) => {
        switch (sortBy) {
            case 'recent':
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            case 'rating':
                return b.rating - a.rating;
            case 'oldest':
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            default:
                return 0;
        }
    });

    // Get unique tags for filter options
    const allTags = testimonials.flatMap(t => t.tags);
    const uniqueTags = Array.from(new Set(allTags));

    // Common tags for the submission form
    const commonTags = [
        'Anxiety', 'Depression', 'Stress', 'Relationship',
        'Career', 'Self-esteem', 'Grief', 'Trauma',
        'Consultant', 'Professional'
    ];

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-rose-500 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Hero Section */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">Success Stories</h1>
                    <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                        Read about the experiences of people who have found support, healing, and growth through SoulVents.
                    </p>
                </div>

                {/* Featured Testimonials */}
                {featuredTestimonials.length > 0 && (
                    <div className="mb-16">
                        <h2 className="text-2xl font-bold text-gray-900 mb-8">Featured Stories</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {featuredTestimonials.map(testimonial => (
                                <div key={testimonial.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
                                    <div className="relative h-64">
                                        <img
                                            src={testimonial.image}
                                            alt={testimonial.name}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
                                            <div className="p-6 text-white">
                                                <h3 className="text-xl font-bold">{testimonial.title}</h3>
                                                <p className="text-sm opacity-90">{testimonial.name}, {testimonial.location}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center">
                                                <Quote className="h-6 w-6 text-rose-500 mr-2" />
                                                <div className="flex text-yellow-400">
                                                    {[...Array(testimonial.rating)].map((_, i) => (
                                                        <Star key={i} className="h-4 w-4 fill-current" />
                                                    ))}
                                                </div>
                                            </div>
                                            <span className="text-sm text-gray-500">{new Date(testimonial.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-gray-600 mb-4">
                                            {testimonial.content.length > 200 && expandedId !== testimonial.id
                                                ? `${testimonial.content.substring(0, 200)}...`
                                                : testimonial.content}
                                        </p>
                                        {testimonial.content.length > 200 && (
                                            <button
                                                onClick={() => setExpandedId(expandedId === testimonial.id ? null : testimonial.id)}
                                                className="text-rose-500 hover:text-rose-600 text-sm font-medium"
                                            >
                                                {expandedId === testimonial.id ? 'Read less' : 'Read more'}
                                            </button>
                                        )}
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {testimonial.tags.map(tag => (
                                                <span
                                                    key={tag}
                                                    className="bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-xs"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                        <div className="relative flex-grow md:max-w-md">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search testimonials..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 border rounded-md w-full focus:outline-none focus:ring-2 focus:ring-rose-500"
                            />
                        </div>

                        <div className="flex flex-wrap gap-4">
                            <div className="flex items-center space-x-2">
                                <Filter className="h-5 w-5 text-gray-400" />
                                <select
                                    value={activeFilter}
                                    onChange={(e) => setActiveFilter(e.target.value)}
                                    className="border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-500"
                                >
                                    <option value="all">All Categories</option>
                                    {uniqueTags.map(tag => (
                                        <option key={tag} value={tag}>{tag}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => setSortBy(sortBy === 'recent' ? 'oldest' : 'recent')}
                                    className="flex items-center space-x-1 px-3 py-2 border rounded-md hover:bg-gray-50"
                                >
                                    <span>Date</span>
                                    {sortBy === 'recent' ? (
                                        <ChevronDown className="h-4 w-4" />
                                    ) : (
                                        <ChevronUp className="h-4 w-4" />
                                    )}
                                </button>

                                <button
                                    onClick={() => setSortBy('rating')}
                                    className={`flex items-center space-x-1 px-3 py-2 border rounded-md hover:bg-gray-50 ${sortBy === 'rating' ? 'bg-rose-50 border-rose-200 text-rose-600' : ''
                                        }`}
                                >
                                    <span>Rating</span>
                                    <Star className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Testimonials Grid */}
                {error ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-center mb-8">
                        {error}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                        {sortedTestimonials.map(testimonial => (
                            <div key={testimonial.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                                <div className="p-6">
                                    <div className="flex items-center space-x-4 mb-4">
                                        <img
                                            src={testimonial.image}
                                            alt={testimonial.name}
                                            className="w-12 h-12 rounded-full object-cover"
                                        />
                                        <div>
                                            <h3 className="font-semibold">{testimonial.name}</h3>
                                            <div className="flex text-yellow-400">
                                                {[...Array(testimonial.rating)].map((_, i) => (
                                                    <Star key={i} className="h-4 w-4 fill-current" />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <h4 className="text-lg font-semibold mb-2">{testimonial.title}</h4>
                                    <p className="text-gray-600 mb-4">
                                        {testimonial.content.length > 150 && expandedId !== testimonial.id
                                            ? `${testimonial.content.substring(0, 150)}...`
                                            : testimonial.content}
                                    </p>
                                    {testimonial.content.length > 150 && (
                                        <button
                                            onClick={() => setExpandedId(expandedId === testimonial.id ? null : testimonial.id)}
                                            className="text-rose-500 hover:text-rose-600 text-sm font-medium"
                                        >
                                            {expandedId === testimonial.id ? 'Read less' : 'Read more'}
                                        </button>
                                    )}
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {testimonial.tags.map(tag => (
                                            <span
                                                key={tag}
                                                className="bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-xs"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="mt-4 flex justify-between items-center">
                                        <span className="text-sm text-gray-500">{new Date(testimonial.created_at).toLocaleDateString()}</span>
                                        <span className="text-sm text-gray-500">
                                            {testimonial.expert_type === 'PROFESSIONAL' ? 'Professional' : 'Consultant'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* No Results */}
                {!isLoading && !error && sortedTestimonials.length === 0 && (
                    <div className="bg-white rounded-lg shadow-md p-8 text-center mb-12">
                        <p className="text-gray-500 mb-4">No testimonials found matching your criteria.</p>
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setActiveFilter('all');
                            }}
                            className="text-rose-500 hover:text-rose-600 font-medium"
                        >
                            Clear filters
                        </button>
                    </div>
                )}

                {/* Share Your Story CTA */}
                <div className="bg-rose-50 border border-rose-100 rounded-lg p-8 text-center">
                    <div className="flex justify-center mb-4">
                        <Heart className="h-12 w-12 text-rose-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Share Your Story</h2>
                    <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                        Has SoulVents made a difference in your life? We'd love to hear about your experience and how our platform has helped you on your mental health journey.
                    </p>
                    {isAuthenticated ? (
                        <button
                            onClick={() => setShowSubmitForm(true)}
                            className="inline-block bg-rose-500 text-white px-6 py-3 rounded-lg hover:bg-rose-600 transition-colors"
                        >
                            Submit Your Testimonial
                        </button>
                    ) : (
                        <Link
                            to="/auth"
                            className="inline-block bg-rose-500 text-white px-6 py-3 rounded-lg hover:bg-rose-600 transition-colors"
                        >
                            Sign In to Share Your Story
                        </Link>
                    )}
                </div>
            </div>

            {/* Testimonial Submission Form Modal */}
            {showSubmitForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold">Share Your Experience</h2>
                            <button
                                onClick={() => setShowSubmitForm(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {submitSuccess ? (
                            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md mb-4">
                                Thank you for sharing your story! Your testimonial has been submitted for review.
                            </div>
                        ) : submitError ? (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
                                {submitError}
                            </div>
                        ) : null}

                        <form onSubmit={handleSubmitTestimonial} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Your Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Location (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                                    placeholder="City, Country"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Title
                                </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                                    required
                                    placeholder="A brief title for your testimonial"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Your Experience
                                </label>
                                <textarea
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    rows={5}
                                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                                    required
                                    placeholder="Share your experience with SoulVents..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Rating
                                </label>
                                <div className="flex items-center">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, rating: star })}
                                            className="text-2xl focus:outline-none"
                                        >
                                            <Star
                                                className={`h-8 w-8 ${star <= formData.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                                    }`}
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Expert Type
                                </label>
                                <div className="flex space-x-4">
                                    <label className="inline-flex items-center">
                                        <input
                                            type="radio"
                                            name="expertType"
                                            value="CONSULTANT"
                                            checked={formData.expertType === 'CONSULTANT'}
                                            onChange={() => setFormData({ ...formData, expertType: 'CONSULTANT' })}
                                            className="h-4 w-4 text-rose-500 focus:ring-rose-500"
                                        />
                                        <span className="ml-2">Consultant</span>
                                    </label>
                                    <label className="inline-flex items-center">
                                        <input
                                            type="radio"
                                            name="expertType"
                                            value="PROFESSIONAL"
                                            checked={formData.expertType === 'PROFESSIONAL'}
                                            onChange={() => setFormData({ ...formData, expertType: 'PROFESSIONAL' })}
                                            className="h-4 w-4 text-rose-500 focus:ring-rose-500"
                                        />
                                        <span className="ml-2">Professional</span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Tags
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {commonTags.map(tag => (
                                        <button
                                            key={tag}
                                            type="button"
                                            onClick={() => toggleTag(tag)}
                                            className={`px-3 py-1 rounded-full text-sm ${formData.tags.includes(tag)
                                                ? 'bg-rose-500 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => setShowSubmitForm(false)}
                                    className="px-4 py-2 border rounded-md hover:bg-gray-50 mr-4"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-rose-500 text-white rounded-md hover:bg-rose-600 flex items-center"
                                >
                                    <Send className="h-4 w-4 mr-2" />
                                    Submit Testimonial
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Testimonials;
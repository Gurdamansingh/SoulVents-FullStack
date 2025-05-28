import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Heart, ArrowLeft, Upload } from 'lucide-react';

type JoinType = 'consultant' | 'professional' | 'contributor';

interface FormData {
    fullName: string;
    email: string;
    phone: string;
    specialty?: string;
    experience?: string;
    qualifications?: string;
    licenseNumber?: string;
    languages: string[];
    bio: string;
    resume?: File | null;
    certificates?: File[] | null;
}

const Join = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [type, setType] = useState<JoinType>((searchParams.get('type') as JoinType) || 'consultant');
    const [formData, setFormData] = useState<FormData>({
        fullName: '',
        email: '',
        phone: '',
        specialty: '',
        experience: '',
        qualifications: '',
        licenseNumber: '',
        languages: ['English'],
        bio: '',
        resume: null,
        certificates: null
    });

    useEffect(() => {
        const typeParam = searchParams.get('type') as JoinType;
        if (typeParam) {
            setType(typeParam);
        }
    }, [searchParams]);

    const availableLanguages = [
        'English',
        'Hindi',
        'Spanish',
        'French',
        'German',
        'Mandarin',
        'Arabic'
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/join`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...formData,
                    type
                })
            });

            if (!response.ok) {
                throw new Error('Failed to submit application');
            }

            alert('Thank you for your interest! We will review your application and get back to you soon.');
            navigate('/');
        } catch (error) {
            console.error('Error submitting application:', error);
            alert('Failed to submit application. Please try again.');
        }
    };

    const toggleLanguage = (language: string) => {
        setFormData(prev => ({
            ...prev,
            languages: prev.languages.includes(language)
                ? prev.languages.filter(l => l !== language)
                : [...prev.languages, language]
        }));
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center text-gray-600 hover:text-gray-900 mb-8"
                >
                    <ArrowLeft className="h-5 w-5 mr-2" />
                 Counsellor
                </button>

                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <div className="relative">
                            <Heart className="h-12 w-12 text-rose-500" />
                            <Heart className="h-12 w-12 text-rose-500 absolute top-0 left-0 animate-ping opacity-75" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">Join Our Platform</h1>
                    <p className="mt-2 text-gray-600">Make a difference in people's lives</p>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                    <div className="flex justify-center space-x-4 mb-8">
                        <button
                            onClick={() => setType('consultant')}
                            className={`px-4 py-2 rounded-md ${type === 'consultant'
                                ? 'bg-rose-500 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            Consultant
                        </button>
                        <button
                            onClick={() => setType('professional')}
                            className={`px-4 py-2 rounded-md ${type === 'professional'
                                ? 'bg-rose-500 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            Professional
                        </button>
                        <button
                            onClick={() => setType('contributor')}
                            className={`px-4 py-2 rounded-md ${type === 'contributor'
                                ? 'bg-rose-500 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            Contributor
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Full Name</label>
                            <input
                                type="text"
                                required
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-rose-500 focus:border-rose-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email</label>
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-rose-500 focus:border-rose-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Phone</label>
                            <input
                                type="tel"
                                required
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-rose-500 focus:border-rose-500"
                            />
                        </div>

                        {(type === 'consultant' || type === 'professional') && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Specialty</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.specialty}
                                        onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-rose-500 focus:border-rose-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Experience</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.experience}
                                        onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-rose-500 focus:border-rose-500"
                                        placeholder="e.g., 5 years"
                                    />
                                </div>

                                {type === 'professional' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Qualifications</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.qualifications}
                                                onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
                                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-rose-500 focus:border-rose-500"
                                                placeholder="e.g., Ph.D. in Clinical Psychology"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">License Number</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.licenseNumber}
                                                onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-rose-500 focus:border-rose-500"
                                            />
                                        </div>
                                    </>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Languages</label>
                                    <div className="flex flex-wrap gap-2">
                                        {availableLanguages.map(language => (
                                            <button
                                                key={language}
                                                type="button"
                                                onClick={() => toggleLanguage(language)}
                                                className={`px-3 py-1 rounded-full text-sm ${formData.languages.includes(language)
                                                    ? 'bg-rose-500 text-white'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                    }`}
                                            >
                                                {language}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Bio</label>
                            <textarea
                                required
                                value={formData.bio}
                                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                rows={4}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-rose-500 focus:border-rose-500"
                                placeholder="Tell us about yourself and your expertise..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Resume/CV</label>
                            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                                <div className="space-y-1 text-center">
                                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                    <div className="flex text-sm text-gray-600">
                                        <label
                                            htmlFor="resume"
                                            className="relative cursor-pointer bg-white rounded-md font-medium text-rose-600 hover:text-rose-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-rose-500"
                                        >
                                            <span>Upload a file</span>
                                            <input id="resume" name="resume" type="file" className="sr-only" />
                                        </label>
                                        <p className="pl-1">or drag and drop</p>
                                    </div>
                                    <p className="text-xs text-gray-500">PDF up to 10MB</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                className="bg-rose-500 text-white px-6 py-2 rounded-md hover:bg-rose-600"
                            >
                                Submit Application
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Join;
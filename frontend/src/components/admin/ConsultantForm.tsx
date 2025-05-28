import React, { useState } from 'react';
import { X } from 'lucide-react';

interface ConsultantFormProps {
    onSubmit: (data: any) => void;
    onClose: () => void;
    initialData?: any;
    isEdit?: boolean;
}

interface FormData {
    email: string;
    password: string;
    fullName: string;
    imageUrl: string;
    specialty: string;
    rate: string | number;
    commissionRate: number;
    bio: string;
    languages: string[];
    type: 'CONSULTANT';
}

const ConsultantForm = ({ onSubmit, onClose, initialData, isEdit = false }: ConsultantFormProps) => {
    const [formData, setFormData] = useState<FormData>({
        email: initialData?.user?.email || '',
        password: initialData?.user?.password || '',
        fullName: initialData?.user?.fullName || '',
        imageUrl: initialData?.image_url || '',
        specialty: initialData?.specialty || '',
        rate: initialData?.rate || '',
        commissionRate: initialData?.commission_rate || 10,
        bio: initialData?.bio || '',
        languages: initialData?.languages || ['English'],
        type: 'CONSULTANT'
    });

    const availableLanguages = [
        'English',
        'Spanish',
        'French',
        'Hindi',
        'Mandarin'
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    const generateRandomPassword = () => {
        const length = 12;
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
        let password = "";
        for (let i = 0; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        setFormData(prev => ({ ...prev, password }));
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full my-8 relative">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">
                        {isEdit ? 'Edit Consultant' : 'Create Consultant'}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
                    {!isEdit && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Password
                                </label>
                                <div className="flex space-x-2">
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={generateRandomPassword}
                                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                                    >
                                        Generate Password
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                                    required
                                />
                            </div>
                        </>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Profile Image URL
                        </label>
                        <input
                            type="url"
                            value={formData.imageUrl}
                            onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                            placeholder="https://example.com/image.jpg"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Specialty
                        </label>
                        <input
                            type="text"
                            value={formData.specialty}
                            onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                            required
                            placeholder="e.g., Emotional Support, Relationship Counseling"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Rate (₹/min)
                        </label>
                        <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={formData.rate}
                            onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) })}
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Commission Rate (%)
                        </label>
                        <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={formData.commissionRate}
                            onChange={(e) => setFormData({ ...formData, commissionRate: parseFloat(e.target.value) })}
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Bio
                        </label>
                        <textarea
                            value={formData.bio}
                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                            rows={4}
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                            required
                            placeholder="Brief description of experience and approach"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Languages
                        </label>
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
                </form>
                
                <div className="flex justify-end space-x-4 mt-6 pt-4 border-t sticky bottom-0 bg-white">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border rounded-md hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-4 py-2 bg-rose-500 text-white rounded-md hover:bg-rose-600"
                    >
                        {isEdit ? 'Update' : 'Create'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConsultantForm;
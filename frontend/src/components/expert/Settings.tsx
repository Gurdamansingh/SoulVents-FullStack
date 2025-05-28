import React, { useState } from 'react';
import { Save, Bell, Clock, CreditCard } from 'lucide-react';
import type { ExpertData } from '../../types/expert';

interface SettingsProps {
    expertData: ExpertData;
    onSave: (settings: any) => Promise<void>;
}

const Settings = ({ expertData, onSave }: SettingsProps) => {
    const [settings, setSettings] = useState({
        commissionRate: expertData.commission_rate || 10,
        notificationPreferences: {
            email: true,
            push: true,
            sessionReminders: true,
            paymentNotifications: true
        },
        availability: expertData.availability || {
            monday: { start: '09:00', end: '17:00', available: true },
            tuesday: { start: '09:00', end: '17:00', available: true },
            wednesday: { start: '09:00', end: '17:00', available: true },
            thursday: { start: '09:00', end: '17:00', available: true },
            friday: { start: '09:00', end: '17:00', available: true },
            saturday: { start: '09:00', end: '17:00', available: false },
            sunday: { start: '09:00', end: '17:00', available: false }
        },
        paymentInfo: {
            bankName: '',
            accountNumber: '',
            ifscCode: '',
            accountHolderName: ''
        }
    });

    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSave(settings);
            alert('Settings saved successfully');
        } catch (error) {
            alert('Failed to save settings');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Commission Rate */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold mb-4">Commission Rate</h2>
                <p className="text-gray-600 mb-4">
                    Current commission rate: {settings.commissionRate}%
                </p>
                <p className="text-sm text-gray-500">
                    This is the percentage that will be deducted from your earnings as platform fees.
                </p>
            </div>

            {/* Notification Preferences */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center">
                    <Bell className="h-5 w-5 text-rose-500 mr-2" />
                    Notification Preferences
                </h2>
                <div className="space-y-4">
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={settings.notificationPreferences.email}
                            onChange={(e) => setSettings({
                                ...settings,
                                notificationPreferences: {
                                    ...settings.notificationPreferences,
                                    email: e.target.checked
                                }
                            })}
                            className="rounded text-rose-500 focus:ring-rose-500"
                        />
                        <span className="ml-2">Email notifications</span>
                    </label>
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={settings.notificationPreferences.push}
                            onChange={(e) => setSettings({
                                ...settings,
                                notificationPreferences: {
                                    ...settings.notificationPreferences,
                                    push: e.target.checked
                                }
                            })}
                            className="rounded text-rose-500 focus:ring-rose-500"
                        />
                        <span className="ml-2">Push notifications</span>
                    </label>
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={settings.notificationPreferences.sessionReminders}
                            onChange={(e) => setSettings({
                                ...settings,
                                notificationPreferences: {
                                    ...settings.notificationPreferences,
                                    sessionReminders: e.target.checked
                                }
                            })}
                            className="rounded text-rose-500 focus:ring-rose-500"
                        />
                        <span className="ml-2">Session reminders</span>
                    </label>
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={settings.notificationPreferences.paymentNotifications}
                            onChange={(e) => setSettings({
                                ...settings,
                                notificationPreferences: {
                                    ...settings.notificationPreferences,
                                    paymentNotifications: e.target.checked
                                }
                            })}
                            className="rounded text-rose-500 focus:ring-rose-500"
                        />
                        <span className="ml-2">Payment notifications</span>
                    </label>
                </div>
            </div>

            {/* Availability Schedule */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center">
                    <Clock className="h-5 w-5 text-rose-500 mr-2" />
                    Availability Schedule
                </h2>
                <div className="space-y-4">
                    {Object.entries(settings.availability).map(([day, schedule]) => (
                        <div key={day} className="flex items-center space-x-4">
                            <div className="w-32 capitalize">{day}</div>
                            <input
                                type="time"
                                value={schedule.start}
                                onChange={(e) => setSettings({
                                    ...settings,
                                    availability: {
                                        ...settings.availability,
                                        [day]: { ...schedule, start: e.target.value }
                                    }
                                })}
                                className="px-3 py-2 border rounded-md"
                            />
                            <span>to</span>
                            <input
                                type="time"
                                value={schedule.end}
                                onChange={(e) => setSettings({
                                    ...settings,
                                    availability: {
                                        ...settings.availability,
                                        [day]: { ...schedule, end: e.target.value }
                                    }
                                })}
                                className="px-3 py-2 border rounded-md"
                            />
                            <label className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={schedule.available}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        availability: {
                                            ...settings.availability,
                                            [day]: { ...schedule, available: e.target.checked }
                                        }
                                    })}
                                    className="rounded text-rose-500 focus:ring-rose-500"
                                />
                                <span>Available</span>
                            </label>
                        </div>
                    ))}
                </div>
            </div>

            {/* Payment Information */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center">
                    <CreditCard className="h-5 w-5 text-rose-500 mr-2" />
                    Payment Information
                </h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Bank Name
                        </label>
                        <input
                            type="text"
                            value={settings.paymentInfo.bankName}
                            onChange={(e) => setSettings({
                                ...settings,
                                paymentInfo: {
                                    ...settings.paymentInfo,
                                    bankName: e.target.value
                                }
                            })}
                            className="w-full px-3 py-2 border rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Account Number
                        </label>
                        <input
                            type="text"
                            value={settings.paymentInfo.accountNumber}
                            onChange={(e) => setSettings({
                                ...settings,
                                paymentInfo: {
                                    ...settings.paymentInfo,
                                    accountNumber: e.target.value
                                }
                            })}
                            className="w-full px-3 py-2 border rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            IFSC Code
                        </label>
                        <input
                            type="text"
                            value={settings.paymentInfo.ifscCode}
                            onChange={(e) => setSettings({
                                ...settings,
                                paymentInfo: {
                                    ...settings.paymentInfo,
                                    ifscCode: e.target.value
                                }
                            })}
                            className="w-full px-3 py-2 border rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Account Holder Name
                        </label>
                        <input
                            type="text"
                            value={settings.paymentInfo.accountHolderName}
                            onChange={(e) => setSettings({
                                ...settings,
                                paymentInfo: {
                                    ...settings.paymentInfo,
                                    accountHolderName: e.target.value
                                }
                            })}
                            className="w-full px-3 py-2 border rounded-md"
                        />
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={isSaving}
                    onClick={handleSubmit}
                    className={`flex items-center bg-rose-500 text-white px-6 py-2 rounded-md hover:bg-rose-600 ${isSaving ? 'opacity-75 cursor-not-allowed' : ''
                        }`}
                >
                    <Save className="h-5 w-5 mr-2" />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </div>
    );
};

export default Settings;
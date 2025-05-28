import React from 'react';
import { Heart, Users, Shield, Award, Brain, Globe } from 'lucide-react';

const About = () => {
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero Section */}
            <section className="bg-gradient-to-r from-rose-50 to-rose-100 py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="flex justify-center mb-6">
                        <div className="relative">
                            <Heart className="h-16 w-16 text-rose-500" />
                            <Heart className="h-16 w-16 text-rose-500 absolute top-0 left-0 animate-ping opacity-75" />
                        </div>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                        About SoulVents
                    </h1>
                    <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                        We're on a mission to make mental health support accessible, affordable, and stigma-free for everyone.
                    </p>
                </div>
            </section>

            {/* Our Story */}
            <section className="py-16 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-3xl mx-auto text-center">
                        <h2 className="text-3xl font-bold mb-6">Our Story</h2>
                        <p className="text-gray-600 mb-8">
                            Founded in 2024, SoulVents was born from a simple yet powerful idea: everyone deserves access to quality mental health support. We recognized the growing need for accessible mental health services and the barriers many face in seeking help.
                        </p>
                        <p className="text-gray-600">
                            Today, we're proud to connect thousands of individuals with qualified mental health professionals and emotional support consultants, creating a safe space for healing and growth.
                        </p>
                    </div>
                </div>
            </section>

            {/* Our Values */}
            <section className="py-16 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-bold text-center mb-12">Our Values</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <ValueCard
                            icon={<Shield className="h-12 w-12 text-rose-500" />}
                            title="Trust & Safety"
                            description="We prioritize your privacy and security in every interaction."
                        />
                        <ValueCard
                            icon={<Heart className="h-12 w-12 text-rose-500" />}
                            title="Empathy First"
                            description="We believe in the power of understanding and compassion."
                        />
                        <ValueCard
                            icon={<Globe className="h-12 w-12 text-rose-500" />}
                            title="Accessibility"
                            description="Making mental health support available to everyone, everywhere."
                        />
                    </div>
                </div>
            </section>

            {/* Team */}
            <section className="py-16 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-bold text-center mb-12">Our Leadership Team</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <TeamMember
                            name="Dr. Sarah Johnson"
                            role="Founder & CEO"
                            image="https://images.unsplash.com/photo-1494790108377-be9c29b29330"
                            bio="Clinical Psychologist with 15+ years of experience"
                        />
                        <TeamMember
                            name="Michael Chen"
                            role="Chief Technology Officer"
                            image="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e"
                            bio="Tech innovator with a passion for mental health"
                        />
                        <TeamMember
                            name="Dr. Emily Williams"
                            role="Head of Professional Services"
                            image="https://images.unsplash.com/photo-1438761681033-6461ffad8d80"
                            bio="Psychiatrist specializing in digital mental health"
                        />
                    </div>
                </div>
            </section>

            {/* Impact */}
            <section className="py-16 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-bold text-center mb-12">Our Impact</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
                        <ImpactStat number="10,000+" label="Users Helped" />
                        <ImpactStat number="500+" label="Expert Consultants" />
                        <ImpactStat number="20,000+" label="Sessions Conducted" />
                        <ImpactStat number="4.8/5" label="Average Rating" />
                    </div>
                </div>
            </section>

            {/* Contact CTA */}
            <section className="py-16 bg-rose-500 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl font-bold mb-4">Get in Touch</h2>
                    <p className="text-xl mb-8">Have questions? We'd love to hear from you.</p>
                    <a
                        href="mailto:support@soulvents.com"
                        className="inline-block bg-white text-rose-500 px-8 py-3 rounded-lg font-medium hover:bg-rose-50 transition-colors"
                    >
                        Contact Us
                    </a>
                </div>
            </section>
        </div>
    );
};

const ValueCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
    <div className="text-center p-6">
        <div className="flex justify-center mb-4">{icon}</div>
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-gray-600">{description}</p>
    </div>
);

const TeamMember = ({ name, role, image, bio }: { name: string; role: string; image: string; bio: string }) => (
    <div className="text-center">
        <img src={image} alt={name} className="w-32 h-32 rounded-full mx-auto mb-4 object-cover" />
        <h3 className="text-xl font-semibold">{name}</h3>
        <p className="text-rose-500 mb-2">{role}</p>
        <p className="text-gray-600">{bio}</p>
    </div>
);

const ImpactStat = ({ number, label }: { number: string; label: string }) => (
    <div>
        <div className="text-3xl font-bold text-rose-500 mb-2">{number}</div>
        <div className="text-gray-600">{label}</div>
    </div>
);

export default About;
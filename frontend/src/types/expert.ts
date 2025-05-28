export interface ExpertData {
    id: string;
    user_id: string;
    type: 'CONSULTANT' | 'PROFESSIONAL';
    specialty: string;
    rate: number;
    bio: string;
    is_online: boolean;
    languages: string[];
    availability: Record<string, { start: string; end: string; available: boolean }>;
    rating: number;
    total_sessions: number;
    total_earnings: number;
    total_hours: number;
    commission_rate: number;
    credits: number;
    notifications_count: number;
    qualifications?: string;
    licenseNumber?: string;
    experience?: string;
    upcoming_sessions: Session[];
    recent_feedback: Feedback[];
    notifications: Notification[];
    payment_history?: Array<{
        month: string;
        sessions: number;
        amount: number;
    }>;
    user: {
        email: string;
        full_name: string;
    };
}

export interface Expert {
    id: string;
    user_id: string;
    type: 'CONSULTANT' | 'PROFESSIONAL';
    specialty: string;
    rate: number;
    bio: string;
    is_online: boolean;
    languages: string[];
    availability: Record<string, { start: string; end: string; available: boolean }>;
    rating: number;
    total_sessions: number;
    qualifications?: string;
    licenseNumber?: string;
    experience?: string;
    user: {
        email: string;
        fullName: string;
    };
    sessionId?: string;
}

export interface Session {
    id: string;
    user: {
        full_name: string
        id?: string
        email?: string
      }
      expert?: {
        id: string
        full_name: string
        specialty?: string,
        user_id?: string,
        rate: number
      }
    status: 'SCHEDULED' | 'WAITING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
    time: string;
    duration: string;
    type: 'Call' | 'Chat';
}

export interface Feedback {
    id: string;
    user: {
        full_name: string;
    };
    rating: number;
    comment: string;
    date: string;
}

export interface Notification {
    id: string;
    message: string;
    time: string;
}
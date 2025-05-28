export interface User {
  id: string;
  email: string;
  full_name?: string;
  role?: 'USER' | 'EXPERT' | 'ADMIN';
  created_at?: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
  login: (email: string) => Promise<{ email: string }>;
  signUp: (email: string, fullName: string) => Promise<{ email: string }>;
  verifyOTP: (email: string, otp: string) => Promise<{ user: User; token: string }>;
  verifySignUpOTP: (email: string, otp: string, fullName: string) => Promise<{ user: User; token: string }>;
  verifyExpertPassword: (email: string, password: string) => Promise<{ user: User; token: string }>;
  logout: () => void;
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
export interface SignUpData {
  name: string;
  email: string;
  password: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  emailVerified: boolean;
}

export interface AuthSession {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
}

export interface AuthResponse {
  user: AuthUser;
  session?: AuthSession;
}

export interface SessionData {
  userId: string;
  user: AuthUser;
  expiresAt: Date;
}


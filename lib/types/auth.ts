export interface AuthUser {
  id: string;
  fasttrakId: string;
  roles: string[];
  name: string | null;
  email: string | null;
}

export interface AuthSession {
  user: AuthUser;
  accessToken?: string;
  error?: string;
  expires: string;
}

export interface LoginError {
  message: string;
  code?: string;
}
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  userName: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  city?: string;
}

export interface UserInfo {
  id: string;
  email: string;
  userName: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  roles: string[];
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: UserInfo;
}

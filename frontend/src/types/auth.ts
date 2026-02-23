export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  user: {
    id: string;
    username: string;
    fullName: string;
    role: string;
    lineCode?: string;
    allowedStations?: string[];
    permissions?: string[];
    isActive: boolean;
  };
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: string;
  lineCode?: string;
  allowedStations?: string[];
  permissions?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
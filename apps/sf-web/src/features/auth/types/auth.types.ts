export interface User {
    id: string;
    email: string;
    displayName?: string;
}

export interface Organization {
    id: string;
    name: string;
}

export interface AuthState {
    user: User | null;
    org: Organization | null;
    role: string | null;
    isAuthenticated: boolean;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
    organizationName: string;
    displayName?: string;
}

export interface AuthResponse {
    user: User;
    org: Organization;
    role: string;
}

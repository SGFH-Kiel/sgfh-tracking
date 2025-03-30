export declare interface AuthProvider {
  readonly providerId: string;
}

export interface SignInRequest {
  email?: string,
  password?: string,
  provider?: AuthProvider
}

export interface CreateUserRequest {
  email: string;
  displayName: string;
  roles: string[];
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
}

export interface CustomAuthProvider {
  signIn(email: string, password: string): Promise<AuthUser>;
  signUp(email: string, password: string): Promise<AuthUser>;
  signOut(): Promise<void>;
  getCurrentUser(): AuthUser | null;
  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void;
  signInWithProvider(provider: AuthProvider): Promise<AuthUser>;
  
  // Admin functions
  createUser(request: CreateUserRequest): Promise<AuthUser>;
  sendPasswordReset(email: string): Promise<void>;
}

export interface AuthError extends Error {
  code?: string;
}

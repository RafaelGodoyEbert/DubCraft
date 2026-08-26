import { User, UserRole } from '../../types';

export interface AuthCredentials {
  email: string;
  password: string;
  name?: string;
  username?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface RateLimitStatus {
  isBlocked: boolean;
  remainingAttempts: number;
  blockedSecondsLeft: number;
}

export interface IAuthProvider {
  getCurrentUser(): User | null;
  signIn(email: string, password: string): Promise<User>;
  signInWithGoogle(): Promise<User>;
  signUp(email: string, password: string, name: string, username: string): Promise<User>;
  signOut(): Promise<void>;
  sendPasswordResetEmail(email: string): Promise<void>;
  sendEmailVerification(): Promise<void>;
  switchUserPersona(role: UserRole, customName?: string): User;
  updateUser(updates: Partial<User>): User;
  getRateLimitStatus(email: string): RateLimitStatus;
  onAuthStateChanged(callback: (user: User | null) => void): () => void;
}

let activeProvider: IAuthProvider | null = null;

export function setAuthProvider(provider: IAuthProvider) {
  activeProvider = provider;
}

export function getAuthService(): IAuthProvider {
  if (!activeProvider) {
    throw new Error('AuthService has not been initialized with a provider');
  }
  return activeProvider;
}

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
  fetchCommunityUsers?(): Promise<User[]>;
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

export function syncCommunityUser(user: User): void {
  if (!user) return;
  try {
    const raw = localStorage.getItem('dubcraft_community_users');
    let list: User[] = raw ? JSON.parse(raw) : [];
    const index = list.findIndex((u) => u.id === user.id || (u.email && u.email.toLowerCase() === (user.email || '').toLowerCase()));
    if (index >= 0) {
      list[index] = { ...list[index], ...user };
    } else {
      list.push(user);
    }
    localStorage.setItem('dubcraft_community_users', JSON.stringify(list));
  } catch (err) {
    console.warn('[authService] Erro ao sincronizar usuário:', err);
  }
}

export function getCommunityUsers(currentUser?: User | null): User[] {
  try {
    const raw = localStorage.getItem('dubcraft_community_users');
    let list: User[] = raw ? JSON.parse(raw) : [];

    if (currentUser) {
      const idx = list.findIndex((u) => u.id === currentUser.id || (u.email && u.email.toLowerCase() === (currentUser.email || '').toLowerCase()));
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...currentUser };
      } else {
        list.unshift(currentUser);
      }
    }
    return list;
  } catch {
    return currentUser ? [currentUser] : [];
  }
}

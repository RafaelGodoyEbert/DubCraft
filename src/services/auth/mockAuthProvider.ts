import { User, UserRole } from '../../types';
import { IAuthProvider, RateLimitStatus, setAuthProvider } from './authService';

export const PRESET_USERS: Record<string, User & { password?: string }> = {
  admin: {
    id: 'user_admin_01',
    name: 'DubCraft Admin',
    username: 'admin',
    email: 'admin@dubcraft.io',
    emailVerified: true,
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    role: 'admin',
    reputation: 750,
    isTrusted: true,
    createdAt: '2025-01-01T00:00:00Z',
    password: 'password123',
  },
  trusted: {
    id: 'user_trusted_01',
    name: 'Revisor Sênior',
    username: 'revisor',
    email: 'revisor@dubcraft.io',
    emailVerified: true,
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    role: 'trusted',
    reputation: 210,
    isTrusted: true,
    trustedGrantedBy: 'user_admin_01',
    trustedGrantedAt: '2025-02-10T14:30:00Z',
    trustedReason: 'Contribuição constante de excelente qualidade',
    createdAt: '2025-01-15T00:00:00Z',
    password: 'password123',
  },
  experienced: {
    id: 'user_exp_01',
    name: 'João Dublagens',
    username: 'joao_dub',
    email: 'colaborador@dubcraft.io',
    emailVerified: true,
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    role: 'experienced',
    reputation: 85,
    isTrusted: false,
    createdAt: '2025-02-01T00:00:00Z',
    password: 'password123',
  },
  user: {
    id: 'user_novice_01',
    name: 'Membro da Comunidade',
    username: 'membro_dub',
    email: 'membro@dubcraft.io',
    emailVerified: true,
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    role: 'user',
    reputation: 10,
    isTrusted: false,
    createdAt: '2025-08-20T00:00:00Z',
    password: 'password123',
  },
};

interface FailedAttemptTracker {
  count: number;
  blockedUntil: number; // timestamp
}

export class MockAuthProvider implements IAuthProvider {
  private currentUser: User | null = null;
  private registeredUsers: Map<string, User & { password: string }> = new Map();
  private failedAttempts: Map<string, FailedAttemptTracker> = new Map();
  private listeners: Array<(user: User | null) => void> = [];

  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly BLOCK_DURATION_MS = 30 * 1000; // 30 seconds cooldown

  constructor(defaultRole: UserRole = 'user') {
    // Purge legacy personal data from previous sessions if any
    try {
      const savedUserStr = localStorage.getItem('dubcraft_current_user');
      if (savedUserStr && savedUserStr.toLowerCase().includes('rafaelgodebert')) {
        localStorage.removeItem('dubcraft_current_user');
      }
    } catch {}

    // Seed initial users
    Object.values(PRESET_USERS).forEach((u) => {
      if (u.email) {
        this.registeredUsers.set(u.email.toLowerCase(), {
          ...u,
          password: u.password || 'password123',
        });
      }
    });

    // Check localStorage for saved registered users
    const savedCustomUsers = localStorage.getItem('dubcraft_custom_users');
    if (savedCustomUsers) {
      try {
        const parsed: Array<User & { password: string }> = JSON.parse(savedCustomUsers);
        parsed.forEach((u) => this.registeredUsers.set(u.email!.toLowerCase(), u));
      } catch (e) {
        console.error('Failed to parse saved custom users', e);
      }
    }

    // Restore saved session
    const saved = localStorage.getItem('dubcraft_current_user');
    if (saved) {
      try {
        this.currentUser = JSON.parse(saved);
      } catch {
        this.currentUser = null;
      }
    } else {
      this.currentUser = null;
    }
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  getRateLimitStatus(email: string): RateLimitStatus {
    const key = email.trim().toLowerCase();
    const tracker = this.failedAttempts.get(key);
    const now = Date.now();

    if (!tracker) {
      return {
        isBlocked: false,
        remainingAttempts: this.MAX_FAILED_ATTEMPTS,
        blockedSecondsLeft: 0,
      };
    }

    if (tracker.blockedUntil > now) {
      const secondsLeft = Math.ceil((tracker.blockedUntil - now) / 1000);
      return {
        isBlocked: true,
        remainingAttempts: 0,
        blockedSecondsLeft: secondsLeft,
      };
    }

    // If block expired, reset
    if (tracker.blockedUntil > 0 && tracker.blockedUntil <= now) {
      this.failedAttempts.delete(key);
      return {
        isBlocked: false,
        remainingAttempts: this.MAX_FAILED_ATTEMPTS,
        blockedSecondsLeft: 0,
      };
    }

    return {
      isBlocked: false,
      remainingAttempts: Math.max(0, this.MAX_FAILED_ATTEMPTS - tracker.count),
      blockedSecondsLeft: 0,
    };
  }

  async signIn(email: string, password: string): Promise<User> {
    const cleanEmail = email.trim().toLowerCase();
    const rateStatus = this.getRateLimitStatus(cleanEmail);

    if (rateStatus.isBlocked) {
      throw new Error('Muitas tentativas incorretas. Tente novamente mais tarde.');
    }

    const registeredUser = this.registeredUsers.get(cleanEmail);

    if (!registeredUser || registeredUser.password !== password) {
      // Record failed attempt
      const tracker = this.failedAttempts.get(cleanEmail) || { count: 0, blockedUntil: 0 };
      tracker.count += 1;

      if (tracker.count >= this.MAX_FAILED_ATTEMPTS) {
        tracker.blockedUntil = Date.now() + this.BLOCK_DURATION_MS;
        this.failedAttempts.set(cleanEmail, tracker);
        throw new Error('Muitas tentativas incorretas. Tente novamente mais tarde.');
      } else {
        this.failedAttempts.set(cleanEmail, tracker);
        throw new Error('E-mail ou senha incorretos.');
      }
    }

    // Success! Clear brute-force tracker
    this.failedAttempts.delete(cleanEmail);

    const { password: _, ...userSafe } = registeredUser;
    this.currentUser = userSafe;
    localStorage.setItem('dubcraft_current_user', JSON.stringify(this.currentUser));
    this.notify();
    return this.currentUser;
  }

  async signInWithGoogle(): Promise<User> {
    const googleUser: User = {
      id: `google_${Date.now()}`,
      name: 'Usuário Google (Dublador)',
      username: 'google_dub',
      email: 'comunidade.google@dubcraft.io',
      emailVerified: true,
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      role: 'user',
      reputation: 25,
      isTrusted: false,
      createdAt: new Date().toISOString(),
    };

    this.currentUser = googleUser;
    localStorage.setItem('dubcraft_current_user', JSON.stringify(this.currentUser));
    this.notify();
    return this.currentUser;
  }

  async signUp(email: string, password: string, name: string, username: string): Promise<User> {
    const cleanEmail = email.trim().toLowerCase();

    if (this.registeredUsers.has(cleanEmail)) {
      throw new Error('Já existe uma conta cadastrada com este endereço de e-mail.');
    }

    if (password.length < 6) {
      throw new Error('A senha deve conter no mínimo 6 caracteres.');
    }

    const newUser: User & { password: string } = {
      id: `user_${Date.now()}`,
      name: name.trim(),
      username: (username.trim() || name.trim().toLowerCase().replace(/\s+/g, '_')).replace('@', ''),
      email: cleanEmail,
      emailVerified: false, // Starts as not verified to demonstrate email verification flow
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanEmail)}`,
      role: 'user',
      reputation: 10,
      isTrusted: false,
      createdAt: new Date().toISOString(),
      password,
    };

    this.registeredUsers.set(cleanEmail, newUser);
    this.persistCustomUsers();

    const { password: _, ...userSafe } = newUser;
    this.currentUser = userSafe;
    localStorage.setItem('dubcraft_current_user', JSON.stringify(this.currentUser));
    this.notify();
    return this.currentUser;
  }

  async signOut(): Promise<void> {
    this.currentUser = null;
    localStorage.removeItem('dubcraft_current_user');
    this.notify();
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@')) {
      throw new Error('Informe um e-mail válido para redefinição de senha.');
    }
    // Simulation / Firebase email handler
    await new Promise((res) => setTimeout(res, 800));
  }

  async sendEmailVerification(): Promise<void> {
    if (!this.currentUser || !this.currentUser.email) {
      throw new Error('Nenhum usuário logado com e-mail.');
    }
    await new Promise((res) => setTimeout(res, 700));
    // Verify user after sending
    this.updateUser({ emailVerified: true });
  }

  switchUserPersona(role: UserRole, customName?: string): User {
    let newUser = PRESET_USERS[role] ? { ...PRESET_USERS[role] } : { ...PRESET_USERS.user };
    if (customName) {
      newUser.name = customName;
      newUser.username = customName.toLowerCase().replace(/\s+/g, '_');
      newUser.email = `${newUser.username}@dubcraft.io`;
      newUser.id = `user_${Date.now()}`;
    }

    const { password: _, ...userSafe } = newUser;
    this.currentUser = userSafe;
    localStorage.setItem('dubcraft_current_user', JSON.stringify(this.currentUser));
    this.notify();
    return this.currentUser;
  }

  updateUser(updates: Partial<User>): User {
    if (!this.currentUser) {
      throw new Error('Nenhum usuário autenticado para atualizar.');
    }
    this.currentUser = { ...this.currentUser, ...updates };

    if (this.currentUser.email) {
      const registered = this.registeredUsers.get(this.currentUser.email.toLowerCase());
      if (registered) {
        this.registeredUsers.set(this.currentUser.email.toLowerCase(), {
          ...registered,
          ...updates,
        });
        this.persistCustomUsers();
      }
    }

    localStorage.setItem('dubcraft_current_user', JSON.stringify(this.currentUser));
    this.notify();
    return this.currentUser;
  }

  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    this.listeners.push(callback);
    callback(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private persistCustomUsers() {
    try {
      const list = Array.from(this.registeredUsers.values());
      localStorage.setItem('dubcraft_custom_users', JSON.stringify(list));
    } catch (e) {
      console.error('Failed to save custom users to localStorage', e);
    }
  }

  private notify() {
    this.listeners.forEach((callback) => callback(this.currentUser));
  }
}

export function initMockAuth(): IAuthProvider {
  const provider = new MockAuthProvider();
  setAuthProvider(provider);
  return provider;
}

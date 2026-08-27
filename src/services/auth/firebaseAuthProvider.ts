import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  sendPasswordResetEmail as fbSendPasswordResetEmail,
  sendEmailVerification as fbSendEmailVerification,
  onAuthStateChanged as fbOnAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { User, UserRole } from '../../types';
import { IAuthProvider, RateLimitStatus, setAuthProvider } from './authService';

let firebaseConfig: any = null;

// Load from Vite env variables or window runtime config
if (import.meta.env.VITE_FIREBASE_API_KEY) {
  firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };
} else if (typeof window !== 'undefined' && (window as any).__FIREBASE_CONFIG__) {
  firebaseConfig = (window as any).__FIREBASE_CONFIG__;
} else {
  firebaseConfig = null;
}

export class FirebaseAuthProvider implements IAuthProvider {
  private auth: any = null;
  private googleProvider: GoogleAuthProvider | null = null;
  private currentUser: User | null = null;
  private failedAttempts: Map<string, { count: number; blockedUntil: number }> = new Map();
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly BLOCK_DURATION_MS = 30 * 1000;

  constructor() {
    if (firebaseConfig && firebaseConfig.apiKey) {
      const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
      this.auth = getAuth(app);
      this.googleProvider = new GoogleAuthProvider();
      this.googleProvider.setCustomParameters({ prompt: 'select_account' });
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
      return { isBlocked: false, remainingAttempts: this.MAX_FAILED_ATTEMPTS, blockedSecondsLeft: 0 };
    }

    if (tracker.blockedUntil > now) {
      return {
        isBlocked: true,
        remainingAttempts: 0,
        blockedSecondsLeft: Math.ceil((tracker.blockedUntil - now) / 1000),
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
      throw new Error(`Acesso temporariamente bloqueado. Tente novamente em ${rateStatus.blockedSecondsLeft}s.`);
    }

    try {
      if (this.auth) {
        const userCredential = await signInWithEmailAndPassword(this.auth, cleanEmail, password);
        const fbUser = userCredential.user;
        this.failedAttempts.delete(cleanEmail);

        this.currentUser = {
          id: fbUser.uid,
          name: fbUser.displayName || cleanEmail.split('@')[0],
          username: (fbUser.displayName || cleanEmail.split('@')[0]).toLowerCase().replace(/\s+/g, '_'),
          email: fbUser.email || cleanEmail,
          emailVerified: fbUser.emailVerified,
          avatarUrl: fbUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanEmail)}`,
          role: cleanEmail.includes('admin') ? 'admin' : 'user',
          reputation: 10,
          isTrusted: false,
          createdAt: fbUser.metadata.creationTime || new Date().toISOString(),
        };
        return this.currentUser;
      } else {
        throw new Error('Firebase não inicializado.');
      }
    } catch (err: any) {
      const tracker = this.failedAttempts.get(cleanEmail) || { count: 0, blockedUntil: 0 };
      tracker.count += 1;
      if (tracker.count >= this.MAX_FAILED_ATTEMPTS) {
        tracker.blockedUntil = Date.now() + this.BLOCK_DURATION_MS;
      }
      this.failedAttempts.set(cleanEmail, tracker);
      throw new Error(err.message || 'Erro ao realizar login no Firebase.');
    }
  }

  async signInWithGoogle(): Promise<User> {
    if (!this.auth) {
      throw new Error('Firebase não inicializado. Verifique as credenciais nas variáveis de ambiente.');
    }

    try {
      const provider = this.googleProvider || new GoogleAuthProvider();
      const result = await signInWithPopup(this.auth, provider);
      const fbUser = result.user;

      const email = fbUser.email || '';
      const name = fbUser.displayName || email.split('@')[0] || 'Usuário Google';
      const username = (fbUser.displayName || email.split('@')[0] || 'google_user')
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');

      this.currentUser = {
        id: fbUser.uid,
        name: name,
        username: username,
        email: email,
        emailVerified: fbUser.emailVerified,
        avatarUrl: fbUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email || 'google')}`,
        role: email.includes('admin') ? 'admin' : 'user',
        reputation: 20,
        isTrusted: false,
        createdAt: fbUser.metadata.creationTime || new Date().toISOString(),
      };

      return this.currentUser;
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        throw new Error('Login com Google cancelado.');
      }
      if (err.code === 'auth/unauthorized-domain') {
        throw new Error('Domínio não autorizado. Adicione "rafaelgodoyebert.github.io" em Firebase Console > Authentication > Settings > Authorized domains.');
      }
      if (err.code === 'auth/operation-not-allowed') {
        throw new Error('Provedor Google desativado. Ative o Google em Firebase Console > Authentication > Sign-in method.');
      }
      if (err.code === 'auth/popup-blocked') {
        throw new Error('O navegador bloqueou o pop-up do Google. Permita pop-ups no navegador para este site.');
      }
      throw new Error(err.message || 'Erro ao fazer login com o Google.');
    }
  }

  async signUp(email: string, password: string, name: string, username: string): Promise<User> {
    if (this.auth) {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const fbUser = userCredential.user;
      await updateProfile(fbUser, {
        displayName: name,
        photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`,
      });
      await fbSendEmailVerification(fbUser);

      this.currentUser = {
        id: fbUser.uid,
        name: name,
        username: username,
        email: email,
        emailVerified: false,
        avatarUrl: fbUser.photoURL || '',
        role: 'user',
        reputation: 10,
        isTrusted: false,
        createdAt: new Date().toISOString(),
      };
      return this.currentUser;
    }
    throw new Error('Firebase não inicializado.');
  }

  async signOut(): Promise<void> {
    if (this.auth) {
      await fbSignOut(this.auth);
    }
    this.currentUser = null;
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    if (this.auth) {
      await fbSendPasswordResetEmail(this.auth, email);
    }
  }

  async sendEmailVerification(): Promise<void> {
    if (this.auth && this.auth.currentUser) {
      await fbSendEmailVerification(this.auth.currentUser);
    }
  }

  switchUserPersona(role: UserRole, customName?: string): User {
    // Fallback persona switch
    this.currentUser = {
      id: `user_${Date.now()}`,
      name: customName || `Usuário (${role})`,
      username: (customName || role).toLowerCase().replace(/\s+/g, '_'),
      email: `${role}@dubcraft.io`,
      emailVerified: true,
      avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
      role: role,
      reputation: role === 'admin' ? 750 : role === 'trusted' ? 210 : 20,
      isTrusted: role === 'admin' || role === 'trusted',
      createdAt: new Date().toISOString(),
    };
    return this.currentUser;
  }

  updateUser(updates: Partial<User>): User {
    if (!this.currentUser) throw new Error('Nenhum usuário logado.');
    this.currentUser = { ...this.currentUser, ...updates };
    return this.currentUser;
  }

  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    if (this.auth) {
      return fbOnAuthStateChanged(this.auth, (fbUser: any) => {
        if (fbUser) {
          this.currentUser = {
            id: fbUser.uid,
            name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Usuário',
            username: (fbUser.displayName || 'usuario').toLowerCase().replace(/\s+/g, '_'),
            email: fbUser.email,
            emailVerified: fbUser.emailVerified,
            avatarUrl: fbUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(fbUser.email || 'user')}`,
            role: fbUser.email?.includes('admin') ? 'admin' : 'user',
            reputation: 10,
            isTrusted: false,
            createdAt: new Date().toISOString(),
          };
        } else {
          this.currentUser = null;
        }
        callback(this.currentUser);
      });
    } else {
      callback(this.currentUser);
      return () => {};
    }
  }
}

export function initFirebaseAuth(): IAuthProvider | null {
  if (firebaseConfig && firebaseConfig.apiKey) {
    const provider = new FirebaseAuthProvider();
    setAuthProvider(provider);
    return provider;
  }
  return null;
}

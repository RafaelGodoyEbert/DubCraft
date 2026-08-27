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
import { getFirestore, collection, doc, setDoc, getDocs, Firestore } from 'firebase/firestore';
import { User, UserRole } from '../../types';
import { IAuthProvider, RateLimitStatus, setAuthProvider, syncCommunityUser } from './authService';

import { PRESET_USERS } from './mockAuthProvider';

let firebaseConfig: any = null;

// Lista de administradores lida exclusivamente de variáveis secretas de ambiente (GitHub Secrets)
const envAdminEmails = (import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map((e: string) => e.trim().toLowerCase())
  .filter(Boolean);

export function isUserAdmin(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  // Apenas o admin de demo local ou os e-mails informados com segurança no GitHub Secret
  return clean === 'admin@dubcraft.io' || envAdminEmails.includes(clean);
}

// Load from Vite env variables (.env.local / GitHub Secrets) or window runtime config
if (import.meta.env.VITE_FIREBASE_API_KEY) {
  firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  };
} else if (typeof window !== 'undefined' && (window as any).__FIREBASE_CONFIG__) {
  firebaseConfig = (window as any).__FIREBASE_CONFIG__;
} else {
  firebaseConfig = null;
}

interface FailedAttemptTracker {
  count: number;
  blockedUntil: number;
}

export class FirebaseAuthProvider implements IAuthProvider {
  private auth: any = null;
  private googleProvider: any = null;
  private currentUser: User | null = null;
  private failedAttempts: Map<string, FailedAttemptTracker> = new Map();
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly BLOCK_DURATION_MS = 15 * 60 * 1000;

  constructor() {
    if (typeof window !== 'undefined' && firebaseConfig && firebaseConfig.apiKey) {
      try {
        const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
        this.auth = getAuth(app);
        this.db = getFirestore(app);
        this.googleProvider = new GoogleAuthProvider();
      } catch (err) {
        console.warn('[Firebase] Erro ao inicializar SDK:', err);
      }
    }
  }

  private async saveUserToFirestore(user: User | null) {
    if (!this.db || !user || user.isDemo || user.email === 'admin@dubcraft.io') return;
    try {
      const userRef = doc(this.db, 'users', user.id);
      await setDoc(userRef, {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        role: user.role,
        reputation: user.reputation,
        isTrusted: user.isTrusted,
        createdAt: user.createdAt,
        lastActiveAt: new Date().toISOString(),
      }, { merge: true });
    } catch (err) {
      console.warn('[Firestore] Erro ao sincronizar usuário no banco:', err);
    }
  }

  async fetchCommunityUsers(): Promise<User[]> {
    if (!this.db) return [];
    try {
      const usersCol = collection(this.db, 'users');
      const snapshot = await getDocs(usersCol);
      const list: User[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as User;
        list.push(data);
        syncCommunityUser(data);
      });
      return list;
    } catch (err) {
      console.warn('[Firestore] Erro ao buscar usuários:', err);
      return [];
    }
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  getRateLimitStatus(email: string): RateLimitStatus {
    const cleanEmail = email.trim().toLowerCase();
    const tracker = this.failedAttempts.get(cleanEmail);
    if (!tracker) {
      return { isBlocked: false, remainingAttempts: this.MAX_FAILED_ATTEMPTS, blockedSecondsLeft: 0 };
    }
    const now = Date.now();
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

    // Suporte para logins locais de demonstração (@dubcraft.io) sem passar pelo Firebase
    if (cleanEmail.endsWith('@dubcraft.io') || cleanEmail === 'admin@dubcraft.io') {
      const presetKey = cleanEmail.split('@')[0];
      const preset = PRESET_USERS[presetKey] || PRESET_USERS.admin;
      this.currentUser = {
        ...preset,
        isDemo: true,
      };
      return this.currentUser;
    }

    const rateLimit = this.getRateLimitStatus(cleanEmail);
    if (rateLimit.isBlocked) {
      throw new Error(`Muitas tentativas falhas. Tente novamente em ${rateLimit.blockedSecondsLeft} segundos.`);
    }

    try {
      if (this.auth) {
        const userCredential = await signInWithEmailAndPassword(this.auth, cleanEmail, password);
        const fbUser = userCredential.user;
        this.failedAttempts.delete(cleanEmail);

        const isAdmin = isUserAdmin(cleanEmail);
        this.currentUser = {
          id: fbUser.uid,
          name: fbUser.displayName || cleanEmail.split('@')[0],
          username: (fbUser.displayName || cleanEmail.split('@')[0]).toLowerCase().replace(/\s+/g, '_'),
          email: fbUser.email || cleanEmail,
          emailVerified: fbUser.emailVerified,
          avatarUrl: fbUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanEmail)}`,
          role: isAdmin ? 'admin' : 'user',
          reputation: isAdmin ? 999 : 20,
          isTrusted: isAdmin,
          isDemo: false,
          createdAt: fbUser.metadata.creationTime || new Date().toISOString(),
        };
        syncCommunityUser(this.currentUser);
        this.saveUserToFirestore(this.currentUser);
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

      const isAdmin = isUserAdmin(email);
      this.currentUser = {
        id: fbUser.uid,
        name: name,
        username: username,
        email: email,
        emailVerified: fbUser.emailVerified,
        avatarUrl: fbUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email || 'google')}`,
        role: isAdmin ? 'admin' : 'user',
        reputation: isAdmin ? 999 : 20,
        isTrusted: isAdmin,
        isDemo: false,
        createdAt: fbUser.metadata.creationTime || new Date().toISOString(),
      };

      syncCommunityUser(this.currentUser);
      this.saveUserToFirestore(this.currentUser);
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

      const isAdmin = isUserAdmin(email);
      this.currentUser = {
        id: fbUser.uid,
        name: name,
        username: username,
        email: email,
        emailVerified: false,
        avatarUrl: fbUser.photoURL || '',
        role: isAdmin ? 'admin' : 'user',
        reputation: isAdmin ? 999 : 20,
        isTrusted: isAdmin,
        isDemo: false,
        createdAt: new Date().toISOString(),
      };
      syncCommunityUser(this.currentUser);
      this.saveUserToFirestore(this.currentUser);
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
    // Fallback persona switch (Demo Mode)
    this.currentUser = {
      id: `user_demo_${Date.now()}`,
      name: customName ? `${customName} [DEMO]` : role === 'admin' ? 'DubCraft Admin [DEMO]' : role === 'trusted' ? 'Revisor Sênior [DEMO]' : `Usuário (${role}) [DEMO]`,
      username: (customName || role).toLowerCase().replace(/\s+/g, '_') + '_demo',
      email: `${role}@dubcraft.io`,
      emailVerified: true,
      avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
      role: role,
      reputation: role === 'admin' ? 750 : role === 'trusted' ? 210 : 20,
      isTrusted: role === 'admin' || role === 'trusted',
      isDemo: true,
      createdAt: new Date().toISOString(),
    };
    return this.currentUser;
  }

  updateUser(updates: Partial<User>): User {
    if (!this.currentUser) throw new Error('Nenhum usuário logado.');
    this.currentUser = { ...this.currentUser, ...updates };
    if (!this.currentUser.isDemo) {
      syncCommunityUser(this.currentUser);
    }
    return this.currentUser;
  }

  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    if (this.auth) {
      return fbOnAuthStateChanged(this.auth, (fbUser: any) => {
        if (fbUser) {
          const isAdmin = isUserAdmin(fbUser.email);
          this.currentUser = {
            id: fbUser.uid,
            name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Usuário',
            username: (fbUser.displayName || 'usuario').toLowerCase().replace(/\s+/g, '_'),
            email: fbUser.email,
            emailVerified: fbUser.emailVerified,
            avatarUrl: fbUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(fbUser.email || 'user')}`,
            role: isAdmin ? 'admin' : 'user',
            reputation: isAdmin ? 999 : 20,
            isTrusted: isAdmin,
            isDemo: false,
            createdAt: new Date().toISOString(),
          };
          syncCommunityUser(this.currentUser);
          this.saveUserToFirestore(this.currentUser);
          callback(this.currentUser);
        } else {
          this.currentUser = null;
          callback(null);
        }
      });
    } else {
      callback(this.currentUser);
      return () => { };
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

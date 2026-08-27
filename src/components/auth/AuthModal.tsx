import React, { useState, useEffect } from 'react';
import { User, Proposal } from '../../types';
import { Drawer } from '../common/Drawer';
import { Badge } from '../common/Badge';
import { DiffViewer } from '../common/DiffViewer';
import { getAuthService } from '../../services/auth/authService';
import { repositoryAdapterSingleton } from '../../repositories/storageAdapter';
import { cloudSyncServiceSingleton } from '../../services/cloudSyncService';
import {
  Lock,
  Mail,
  User as UserIcon,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Send,
  LogOut,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Camera,
  KeyRound,
  Save,
  AtSign,
  MessageSquare,
  Clock,
  XCircle,
  FolderGit2,
  Headphones,
  Ban,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onUserChanged: (user: User | null) => void;
  onNavigateToDialogue?: (projectId: string, dialogueId: string) => void;
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  'https://api.dicebear.com/7.x/bottts/svg?seed=DubMaster',
  'https://api.dicebear.com/7.x/bottts/svg?seed=VoiceActor',
  'https://api.dicebear.com/7.x/bottts/svg?seed=StudioSound',
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserChanged,
  onNavigateToDialogue,
}) => {
  const [tab, setTab] = useState<'login' | 'register' | 'forgot' | 'profile'>('login');
  const [profileSubTab, setProfileSubTab] = useState<'info' | 'proposals'>('info');
  const [userProposals, setUserProposals] = useState<Proposal[]>([]);
  const [isLoadingProposals, setIsLoadingProposals] = useState(false);

  // Form states (Login / Register)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Profile Edit states
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [isChangingAvatar, setIsChangingAvatar] = useState(false);

  // Status & Feedback
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEmailVerifiedNoticeSent, setIsEmailVerifiedNoticeSent] = useState(false);

  // Sync state and load user proposals when opening modal
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMessage(null);
      if (currentUser) {
        setTab('profile');
        setEditName(currentUser.name);
        setEditUsername(currentUser.username);
        setEditAvatarUrl(currentUser.avatarUrl);

        // Load proposals authored by this user
        (async () => {
          setIsLoadingProposals(true);
          try {
            const localProps = await repositoryAdapterSingleton.getProposalsByProject('');
            let cloudProps: Proposal[] = [];
            try {
              const remote = await cloudSyncServiceSingleton.fetchProposals('');
              if (remote && Array.isArray(remote)) {
                cloudProps = remote;
              }
            } catch {}

            const map = new Map<string, Proposal>();
            localProps.forEach((p) => map.set(p.id, p));
            cloudProps.forEach((p) => map.set(p.id, p));

            const allProps = Array.from(map.values());
            const mine = allProps
              .filter(
                (p) =>
                  p.authorId === currentUser.id ||
                  p.authorName === currentUser.name ||
                  (currentUser.email && p.authorId === currentUser.email)
              )
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            setUserProposals(mine);
          } catch (err) {
            console.error('Erro ao carregar propostas do usuário:', err);
          } finally {
            setIsLoadingProposals(false);
          }
        })();
      } else {
        setTab('login');
      }
    }
  }, [isOpen, currentUser]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const auth = getAuthService();
    const rateStatus = auth.getRateLimitStatus(email);
    if (rateStatus.isBlocked) {
      setError('Muitas tentativas incorretas. Tente novamente mais tarde.');
      return;
    }

    try {
      setIsSubmitting(true);
      const loggedUser = await auth.signIn(email, password);
      onUserChanged(loggedUser);
      setSuccessMessage(`Bem-vindo de volta, ${loggedUser.name}!`);
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err: any) {
      setError(err.message || 'E-mail ou senha incorretos.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setSuccessMessage(null);
    try {
      setIsSubmitting(true);
      const auth = getAuthService();
      const loggedUser = await auth.signInWithGoogle();
      onUserChanged(loggedUser);
      setSuccessMessage(`Conectado como ${loggedUser.name}!`);
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar login com o Google.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (password !== confirmPassword) {
      setError('As senhas digitadas não coincidem.');
      return;
    }

    try {
      setIsSubmitting(true);
      const auth = getAuthService();
      const newUser = await auth.signUp(email, password, name, username);
      onUserChanged(newUser);
      setSuccessMessage('Conta criada com sucesso! Enviamos um link de confirmação para o seu e-mail.');
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    try {
      setIsSubmitting(true);
      const auth = getAuthService();
      await auth.sendPasswordResetEmail(email);
      setSuccessMessage(`Enviamos as instruções de recuperação de senha para ${email}. Verifique sua caixa de entrada.`);
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar e-mail de recuperação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setError(null);
    setSuccessMessage(null);

    try {
      setIsSubmitting(true);
      const auth = getAuthService();
      const updatedUser = await auth.updateUser({
        name: editName.trim() || currentUser.name,
        username: editUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') || currentUser.username,
        avatarUrl: editAvatarUrl.trim() || currentUser.avatarUrl,
      });

      onUserChanged(updatedUser);
      setSuccessMessage('Perfil atualizado com sucesso! ✨');
      setIsChangingAvatar(false);
      setTimeout(() => {
        setSuccessMessage(null);
      }, 2500);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar alterações do perfil.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestPasswordResetFromProfile = async () => {
    if (!currentUser?.email) {
      setError('Sua conta não possui um e-mail vinculado para envio da senha.');
      return;
    }
    setError(null);
    setSuccessMessage(null);

    try {
      setIsSubmitting(true);
      const auth = getAuthService();
      await auth.sendPasswordResetEmail(currentUser.email);
      setSuccessMessage(`Link de redefinição de senha enviado para ${currentUser.email}! Verifique seu e-mail.`);
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar e-mail de redefinição.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      setIsSubmitting(true);
      const auth = getAuthService();
      await auth.sendEmailVerification();
      setIsEmailVerifiedNoticeSent(true);
      setSuccessMessage('E-mail de confirmação reenviado!');
    } catch (err: any) {
      setError(err.message || 'Erro ao reenviar e-mail de verificação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    const auth = getAuthService();
    await auth.signOut();
    onUserChanged(null);
    onClose();
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={currentUser ? `Minha Conta — ${currentUser.name}` : 'DubCraft Studio — Autenticação'}
    >
      <div className="space-y-4 text-xs sm:text-sm">
        {/* Error Banner */}
        {error && (
          <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-rose-200 text-xs flex items-center gap-2 animate-fade-in">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <p className="font-semibold flex-1">{error}</p>
          </div>
        )}

        {/* Success Banner */}
        {successMessage && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-emerald-200 text-xs flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* ========================================================
            VIEW: LOGGED IN USER PROFILE & ACCOUNT MANAGEMENT
        ======================================================== */}
        {currentUser && tab === 'profile' && (
          <div className="space-y-5">
            {/* Header Profile Card */}
            <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 space-y-4 shadow-inner">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative group">
                    <img
                      src={editAvatarUrl || currentUser.avatarUrl}
                      alt={currentUser.name}
                      className="w-14 h-14 rounded-2xl object-cover ring-2 ring-amber-500/60 shadow-md transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setIsChangingAvatar(!isChangingAvatar)}
                      className="absolute -bottom-1 -right-1 p-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-lg shadow transition-all"
                      title="Mudar Foto"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-zinc-100 text-base">{currentUser.name}</h3>
                      <Badge role={currentUser.role} isTrusted={currentUser.isTrusted} size="sm" />
                    </div>
                    <p className="text-xs text-zinc-400 font-mono">@{currentUser.username}</p>
                    <p className="text-[11px] text-zinc-500">{currentUser.email || 'Conta sem e-mail'}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-black text-amber-400">★ {currentUser.reputation}</span>
                  <p className="text-[10px] text-zinc-500 uppercase font-semibold">Reputação</p>
                </div>
              </div>

              {/* Avatar Selector Picker Dropdown */}
              {isChangingAvatar && (
                <div className="p-3 bg-zinc-900 border border-zinc-700/80 rounded-xl space-y-2 animate-fade-in">
                  <p className="text-[11px] font-bold text-zinc-300">Escolha um avatar ou cole uma URL:</p>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {AVATAR_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setEditAvatarUrl(preset)}
                        className={`w-9 h-9 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                          editAvatarUrl === preset ? 'border-amber-400 scale-105' : 'border-zinc-700 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={preset} alt="preset" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                  <input
                    type="url"
                    placeholder="Ou cole a URL da sua foto (https://...)"
                    value={editAvatarUrl}
                    onChange={(e) => setEditAvatarUrl(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-zinc-100 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              {/* Email Status Verification Pill */}
              <div
                className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                  currentUser.emailVerified
                    ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                    : 'bg-amber-950/40 border-amber-800/80 text-amber-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {currentUser.emailVerified ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                  <span>
                    {currentUser.emailVerified
                      ? 'E-mail autenticado com segurança.'
                      : 'E-mail pendente de confirmação.'}
                  </span>
                </div>

                {!currentUser.emailVerified && (
                  <button
                    onClick={handleResendVerification}
                    disabled={isSubmitting || isEmailVerifiedNoticeSent}
                    className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-[10px] font-bold rounded-lg transition-all shrink-0"
                  >
                    {isEmailVerifiedNoticeSent ? 'Enviado ✓' : 'Confirmar'}
                  </button>
                )}
              </div>
            </div>

            {/* Subtabs Switcher */}
            <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 gap-1">
              <button
                type="button"
                onClick={() => setProfileSubTab('info')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  profileSubTab === 'info'
                    ? 'bg-zinc-800 text-amber-400 shadow'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <UserIcon className="w-3.5 h-3.5" /> Meus Dados
              </button>
              <button
                type="button"
                onClick={() => setProfileSubTab('proposals')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  profileSubTab === 'proposals'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" /> Minhas Propostas ({userProposals.length})
              </button>
            </div>

            {profileSubTab === 'proposals' ? (
              <div className="space-y-3">
                {isLoadingProposals ? (
                  <div className="py-8 text-center space-y-2">
                    <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs text-zinc-400">Carregando suas propostas...</p>
                  </div>
                ) : userProposals.length === 0 ? (
                  <div className="py-8 text-center bg-zinc-950/60 rounded-2xl border border-zinc-800 p-6 space-y-2">
                    <MessageSquare className="w-8 h-8 text-zinc-600 mx-auto" />
                    <p className="text-sm font-bold text-zinc-300">Você ainda não enviou propostas</p>
                    <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                      Ao revisar qualquer cutscene no DubCraft, você pode sugerir melhorias de dublagem ou descarte de falas!
                    </p>
                  </div>
                ) : (
                  userProposals.map((prop) => {
                    const isApproved = prop.status === 'approved';
                    const isRejected = prop.status === 'rejected';
                    const isIgnore = prop.proposedStatus === 'ignorar';

                    return (
                      <div
                        key={prop.id}
                        className={`p-3.5 bg-zinc-950 rounded-2xl border transition-all space-y-2.5 ${
                          isApproved
                            ? 'border-emerald-500/40 bg-emerald-950/10'
                            : isRejected
                            ? 'border-rose-900/30 opacity-70'
                            : 'border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between gap-2 flex-wrap border-b border-zinc-800/80 pb-2">
                          <span className="px-2 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-bold rounded uppercase flex items-center gap-1">
                            <FolderGit2 className="w-3 h-3" /> {prop.projectId.replace('proj_', '').toUpperCase()}
                          </span>

                          {isApproved ? (
                            <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold rounded-full flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Aprovada no Jogo ✓
                            </span>
                          ) : isRejected ? (
                            <span className="px-2 py-0.5 bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-bold rounded-full flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> Não Aprovada
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-950/80 text-amber-300 border border-amber-800/80 text-[10px] font-bold rounded-full flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Em Votação • Score: +{prop.score}
                            </span>
                          )}
                        </div>

                        {/* Ignore notice or translation diff */}
                        {isIgnore ? (
                          <div className="p-2 bg-rose-950/30 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                            <Ban className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            <span>Sugestão para ignorar / descartar esta fala do jogo.</span>
                          </div>
                        ) : (
                          <div className="space-y-1 text-xs">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase">Sua Sugestão PT-BR:</span>
                            <p className="p-2 bg-zinc-900 rounded-xl border border-zinc-800 font-mono text-zinc-200 text-xs">
                              "{prop.proposedTranslation}"
                            </p>
                          </div>
                        )}

                        {/* Reason */}
                        {prop.reason && (
                          <p className="text-[11px] text-zinc-400">
                            <strong className="text-zinc-300">Justificativa:</strong> {prop.reason}
                          </p>
                        )}

                        {/* Footer with date and button */}
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-800/60 text-[10px] text-zinc-500">
                          <span>{new Date(prop.createdAt).toLocaleDateString('pt-BR')}</span>
                          {onNavigateToDialogue && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onNavigateToDialogue(prop.projectId, prop.dialogueId);
                              }}
                              className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-[10px] font-semibold rounded-lg transition-all flex items-center gap-1"
                            >
                              <Headphones className="w-3 h-3 text-amber-400" /> Ir para a Fala
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <>
                {/* Profile Editing Form */}
                <form onSubmit={handleSaveProfile} className="space-y-3 bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
                  <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-amber-400" /> Dados do Perfil
                  </h4>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-zinc-400">Nome de Exibição</label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Seu Nome Completo"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-zinc-400">Nome de Usuário (@handle)</label>
                    <div className="relative">
                      <AtSign className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        value={editUsername}
                        onChange={(e) => setEditUsername(e.target.value)}
                        placeholder="usuario_dub"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 pl-9 text-zinc-100 text-xs font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-2 min-h-[40px] disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {isSubmitting ? 'Salvando...' : 'Salvar Alterações do Perfil'}
                  </button>
                </form>

                {/* Security & Password Section */}
                <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 space-y-2.5">
                  <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" /> Segurança & Senha
                  </h4>
                  <p className="text-xs text-zinc-400">
                    Deseja alterar ou recuperar sua senha de acesso?
                  </p>
                  <button
                    type="button"
                    onClick={handleRequestPasswordResetFromProfile}
                    disabled={isSubmitting}
                    className="w-full p-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 rounded-xl text-xs font-semibold text-zinc-200 flex items-center justify-center gap-2 transition-all min-h-[40px]"
                  >
                    <Lock className="w-3.5 h-3.5 text-zinc-400" /> Enviar Link de Troca de Senha por E-mail
                  </button>
                </div>

                {/* Quick Demo Switcher Section */}
                {(currentUser.isDemo || currentUser.email === 'admin@dubcraft.io') && (
                  <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800 space-y-2">
                    <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Personas de Demonstração / Teste [DEMO]
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const auth = getAuthService();
                          const u = auth.switchUserPersona('admin');
                          onUserChanged(u);
                        }}
                        className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/60 rounded-xl text-left transition-all"
                      >
                        <p className="text-xs font-bold text-amber-400">DubCraft Admin [DEMO]</p>
                        <p className="text-[10px] text-zinc-500">★ 750 • Acesso Total</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const auth = getAuthService();
                          const u = auth.switchUserPersona('trusted');
                          onUserChanged(u);
                        }}
                        className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/60 rounded-xl text-left transition-all"
                      >
                        <p className="text-xs font-bold text-emerald-400">Revisor Sênior [DEMO]</p>
                        <p className="text-[10px] text-zinc-500">★ 210 • Confiança Alta</p>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Logout Button */}
            <button
              type="button"
              onClick={handleLogout}
              className="w-full p-3 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 rounded-xl text-xs font-bold text-rose-300 flex items-center justify-center gap-2 transition-all min-h-[44px]"
            >
              <LogOut className="w-4 h-4" /> Desconectar da Conta
            </button>
          </div>
        )}

        {/* ========================================================
            VIEW: LOGGED OUT TABS (LOGIN / REGISTER / FORGOT)
        ======================================================== */}
        {!currentUser && (
          <div>
            {/* Tabs Header */}
            <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 mb-4">
              <button
                type="button"
                onClick={() => {
                  setTab('login');
                  setError(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  tab === 'login'
                    ? 'bg-zinc-800 text-amber-400 shadow'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Entrar (Login)
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('register');
                  setError(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  tab === 'register'
                    ? 'bg-zinc-800 text-amber-400 shadow'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Criar Conta
              </button>
            </div>

            {/* Tab: LOGIN */}
            {tab === 'login' && (
              <div className="space-y-4 pt-1">
                {/* Google Sign-in Option */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 rounded-xl text-xs font-bold text-zinc-100 flex items-center justify-center gap-2.5 transition-all shadow-sm min-h-[44px] disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>Continuar com Google</span>
                </button>

                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-zinc-800" />
                  <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">ou entre com e-mail</span>
                  <div className="flex-1 h-px bg-zinc-800" />
                </div>

                <form onSubmit={handleLogin} className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-zinc-300">E-mail</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
                      <input
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu.email@exemplo.com"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 pl-9 text-zinc-100 text-xs focus:outline-none focus:border-amber-500 min-h-[44px]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-zinc-300">Senha</label>
                      <button
                        type="button"
                        onClick={() => setTab('forgot')}
                        className="text-[11px] text-amber-400 hover:underline"
                      >
                        Esqueceu a senha?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
                      <input
                        type="password"
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 pl-9 text-zinc-100 text-xs focus:outline-none focus:border-amber-500 min-h-[44px]"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-2 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ArrowRight className="w-4 h-4" />
                      {isSubmitting ? 'Autenticando...' : 'Entrar na Plataforma'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Tab: REGISTER */}
            {tab === 'register' && (
              <div className="space-y-4 pt-1">
                {/* Google Sign-in Option */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 rounded-xl text-xs font-bold text-zinc-100 flex items-center justify-center gap-2.5 transition-all shadow-sm min-h-[44px] disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>Cadastrar com Google</span>
                </button>

                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-zinc-800" />
                  <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">ou com e-mail</span>
                  <div className="flex-1 h-px bg-zinc-800" />
                </div>

                <form onSubmit={handleRegister} className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-zinc-300">Nome Completo</label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
                      <input
                        type="text"
                        required
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex: Carlos Tradutor"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 pl-9 text-zinc-100 text-xs focus:outline-none focus:border-amber-500 min-h-[44px]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-zinc-300">Nome de Usuário (@handle)</label>
                    <input
                      type="text"
                      required
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="carlos_dub"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-100 text-xs focus:outline-none focus:border-amber-500 min-h-[44px]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-zinc-300">E-mail</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
                      <input
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="carlos@exemplo.com"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 pl-9 text-zinc-100 text-xs focus:outline-none focus:border-amber-500 min-h-[44px]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-zinc-300">Senha</label>
                      <input
                        type="password"
                        required
                        autoComplete="new-password"
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mínimo 6 dígitos"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-100 text-xs focus:outline-none focus:border-amber-500 min-h-[44px]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-zinc-300">Confirmar Senha</label>
                      <input
                        type="password"
                        required
                        autoComplete="new-password"
                        minLength={6}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repita a senha"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-100 text-xs focus:outline-none focus:border-amber-500 min-h-[44px]"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-2 min-h-[44px] disabled:opacity-50"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      {isSubmitting ? 'Cadastrando...' : 'Criar Minha Conta'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Tab: FORGOT PASSWORD */}
            {tab === 'forgot' && (
              <form onSubmit={handleForgotPassword} className="space-y-3 pt-1">
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Digite seu e-mail cadastrado para receber um link seguro de redefinição de senha.
                </p>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-zinc-300">E-mail</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu.email@exemplo.com"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 pl-9 text-zinc-100 text-xs focus:outline-none focus:border-amber-500 min-h-[44px]"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setTab('login')}
                    className="px-4 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs rounded-xl border border-zinc-800 min-h-[44px]"
                  >
                    Voltar
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-2 min-h-[44px] disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    {isSubmitting ? 'Enviando...' : 'Enviar Link de Redefinição'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </Drawer>
  );
};

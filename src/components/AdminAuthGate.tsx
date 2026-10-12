import React, { useState } from 'react';
import {
  Lock,
  ShieldCheck,
  ShieldAlert,
  Car,
  Tv,
  ClipboardList,
  ArrowRight,
  Eye,
  EyeOff,
  User as UserIcon,
  KeyRound,
  FileSpreadsheet,
  CheckCircle2,
  Smartphone,
  Phone,
  FileText,
  X
} from 'lucide-react';
import { User } from 'firebase/auth';
import { GoogleSignInButton } from './GoogleSignInButton';
import { AppViewMode, AuthorizedUser, Dock } from '../types';
import { adminService } from '../services/adminService';

interface AdminAuthGateProps {
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
  onNavigate: (view: AppViewMode) => void;
  onLoginSuccess: (authUser: AuthorizedUser) => void;
  docks?: Dock[];
  onClose?: () => void;
}

export const AdminAuthGate: React.FC<AdminAuthGateProps> = ({
  user,
  onSignIn,
  onSignOut,
  onNavigate,
  onLoginSuccess,
  docks = [],
  onClose,
}) => {
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'password' | 'google'>('password');

  const masterGoogleEmail = adminService.getMasterGoogleAdmin();
  const secondaryGoogleEmail = adminService.getSecondaryGoogleAdmin();
  const isGoogleAuthorized = adminService.isGoogleAdminAuthorized(user?.email);

  const handleSubmitPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    setTimeout(() => {
      const res = adminService.authenticate(usernameInput, passwordInput);
      setIsLoading(false);

      if (res.success && res.user) {
        let loggedUser = res.user;
        // Automatically identify dock for collaborator if not already assigned
        if (!loggedUser.assignedDockId && docks && docks.length > 0) {
          const targetDock = docks.find((d) => d.status === 'livre') || docks[0];
          adminService.assignUserToDock(loggedUser.id, targetDock.id, targetDock.nome);
          loggedUser = {
            ...loggedUser,
            assignedDockId: targetDock.id,
            assignedDockNome: targetDock.nome,
          };
        }
        onLoginSuccess(loggedUser);
      } else {
        setErrorMessage(res.error || 'Credenciais inválidas. Verifique usuário, CPF ou telefone e a senha.');
      }
    }, 200);
  };

  const handleQuickFill = (u: string, p: string) => {
    setUsernameInput(u);
    setPasswordInput(p);
    setErrorMessage('');
  };

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6 relative">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        {/* Lock Icon */}
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/5">
          <Lock className="w-8 h-8" />
        </div>

        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
            Acesso Restrito ao Administrador & Operadores
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-3">
            Dashboard de Gestão de Docas
          </h2>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            Painel exclusivo para controle e chamada de carros nas docas. Acesso restrito ao Administrador Geral (Google) e operadores autorizados na planilha.
          </p>
        </div>

        {/* Tab switch between Password and Google */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setAuthMode('password')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              authMode === 'password'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Login & Senha (Planilha)</span>
          </button>
          <button
            type="button"
            onClick={() => setAuthMode('google')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              authMode === 'google'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Login Google (2 Contas)</span>
          </button>
        </div>

        {/* Authentication Box */}
        {authMode === 'password' ? (
          <form onSubmit={handleSubmitPassword} className="p-5 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-4 text-left">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-mono font-semibold text-slate-300 uppercase mb-1.5">
                Usuário, CPF ou Telefone
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ex: GilianoCosta, admin, 123.456.789-00 ou (11) 98765-4321"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                />
                <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-mono font-semibold text-slate-300 uppercase">
                  Senha
                </label>
                <span className="text-[9px] text-amber-400 font-mono">Gili2112#@! ou 8 dígitos</span>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Digite sua senha de acesso"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono placeholder:text-slate-500 focus:outline-none focus:border-amber-500 tracking-wider"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-slate-500 hover:text-slate-300 absolute right-3 top-2.5 transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider transition cursor-pointer shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isLoading ? 'Verificando...' : 'Entrar na Dashboard'}</span>
            </button>

            {/* Quick credentials hint */}
            <div className="pt-2 border-t border-slate-800/80">
              <p className="text-[10px] text-slate-400 mb-1.5">
                Credencial Mestre do Administrador Geral:
              </p>
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickFill('GilianoCosta', 'Gili2112#@!')}
                  className="p-2.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-[10px] font-mono text-left flex items-center justify-between transition cursor-pointer"
                >
                  <span className="text-amber-300 font-bold">Admin Mestre: GilianoCosta</span>
                  <span className="text-amber-200 font-bold">Senha: Gili2112#@!</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('operador', 'Ca25R0l0')}
                  className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-mono text-left flex items-center justify-between transition cursor-pointer"
                >
                  <span className="text-sky-300 font-bold">Operador: operador</span>
                  <span className="text-slate-300">Senha: Ca25R0l0</span>
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 text-left">
              <p className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Acesso Direto com Conta Google (Administrador)</span>
              </p>
              <p className="text-[11px] text-slate-300 mt-1">
                Conecte-se com sua conta Google para gerenciar docas, sincronizar planilhas e configurar formulários.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 text-left">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {!user ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-300">
                  Clique abaixo para autenticar e entrar diretamente na Dashboard:
                </p>
                <div className="flex justify-center">
                  <GoogleSignInButton
                    onClick={async () => {
                      setErrorMessage('');
                      setIsLoading(true);
                      try {
                        await onSignIn();
                      } catch (err: any) {
                        setErrorMessage(err?.message || 'Falha ao autenticar com o Google. Verifique se o pop-up foi permitido.');
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    disabled={isLoading}
                    text={isLoading ? 'Conectando ao Google...' : 'Entrar com Conta Google'}
                    className="w-full justify-center"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-center">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Conta Google Conectada!</span>
                </div>
                <p className="text-xs text-slate-300">
                  Conectado como <span className="font-mono text-amber-400 font-bold">{user.email}</span>.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onLoginSuccess({
                      id: `usr-google-${user.uid?.slice(0, 8) || 'adm'}`,
                      name: user.displayName || user.email?.split('@')[0] || 'Administrador Google',
                      cpf: '---',
                      phone: '---',
                      username: user.email || 'admin.google',
                      password: '---',
                      role: 'admin_geral',
                      status: 'ativo',
                      createdAt: new Date().toLocaleDateString('pt-BR'),
                    });
                  }}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  Entrar na Dashboard Agora
                </button>
                <button
                  type="button"
                  onClick={onSignOut}
                  className="w-full py-2 px-3 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-xs font-medium cursor-pointer transition"
                >
                  Trocar de Conta Google
                </button>
              </div>
            )}
          </div>
        )}

        {/* Public Driver Links Shortcuts */}
        <div className="pt-4 border-t border-slate-800/80 space-y-2.5 text-left">
          <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold text-center">
            Você é motorista? Acesse seu link exclusivo:
          </p>

          <button
            onClick={() => onNavigate('driver-mobile')}
            className="w-full p-3 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 flex items-center justify-between transition cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20">
                <Car className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Chamada de Motoristas (Mobile)</p>
                <p className="text-[10px] text-slate-400">Acompanhar sua vez na fila e doca no celular</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition" />
          </button>

          <button
            onClick={() => onNavigate('driver-checkin')}
            className="w-full p-3 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 flex items-center justify-between transition cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20">
                <ClipboardList className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Check-in de Chegada Automático</p>
                <p className="text-[10px] text-slate-400">Localização GPS, data e horário automáticos</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition" />
          </button>
        </div>
      </div>
    </div>
  );
};

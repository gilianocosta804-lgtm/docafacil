import React from 'react';
import {
  Car,
  Tv,
  ClipboardList,
  LayoutDashboard,
  Settings,
  Bell,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  LogOut,
  User as UserIcon,
  Smartphone,
  ShieldCheck,
  Lock,
  KeyRound,
  Megaphone,
  Search,
  MessageSquare,
  Package,
  Compass,
  ArrowRightLeft,
  Warehouse
} from 'lucide-react';
import { AppViewMode, WorkspaceConfig, AuthorizedUser, CollaboratorPermissions } from '../types';
import { GoogleSignInButton } from './GoogleSignInButton';
import { User } from 'firebase/auth';
import { adminService } from '../services/adminService';

interface NavbarProps {
  currentView: AppViewMode;
  onViewChange: (view: AppViewMode) => void;
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
  config: WorkspaceConfig;
  onOpenSettings: () => void;
  onOpenAudioSettings: () => void;
  onOpenShareMobile?: () => void;
  onOpenAccessManagement?: () => void;
  onOpenCepSearch?: () => void;
  onOpenChat?: () => void;
  onOpenPackageTransfer?: () => void;
  onSwitchDock?: () => void;
  onTriggerSync: () => void;
  isSyncing: boolean;
  activeSession: AuthorizedUser | null;
  onLogoutSession: () => void;
  pendingTransfersCount?: number;
  permissions?: CollaboratorPermissions;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onViewChange,
  user,
  onSignIn,
  onSignOut,
  config,
  onOpenSettings,
  onOpenAudioSettings,
  onOpenShareMobile,
  onOpenAccessManagement,
  onOpenCepSearch,
  onOpenChat,
  onOpenPackageTransfer,
  onSwitchDock,
  onTriggerSync,
  isSyncing,
  activeSession,
  onLogoutSession,
  pendingTransfersCount = 0,
  permissions,
}) => {
  const isAdmin = activeSession?.role === 'admin_geral' || adminService.isAdmin(user?.email);

  const canSearchCep = isAdmin || (permissions ? permissions.canSearchCep : true);
  const canChat = isAdmin || (permissions ? permissions.canUseChat : true);
  const canTransfer = isAdmin || (permissions ? permissions.canTransferPackages : true);
  const canSwitch = isAdmin || (permissions ? permissions.canSwitchDock : true);

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4 overflow-x-auto no-scrollbar">
        {/* Brand */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20 shrink-0">
            <Car className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-black text-base sm:text-lg text-white leading-none">DocaFácil</span>
              <span className="text-[9px] sm:text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 leading-none">
                Carros
              </span>
              {isAdmin && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 leading-none">
                  ADM GERAL
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block leading-normal mt-0.5">
              Chamada de Carros & Gestão de Docas
            </p>
          </div>
        </div>

        {/* View Switcher Tabs (Separated Panels) */}
        <nav className="flex items-center bg-slate-950/70 p-1 rounded-xl border border-slate-800 shrink-0">
          <button
            onClick={() => onViewChange('dashboard')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap leading-none ${
              currentView === 'dashboard'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Painel do Operador de Docas"
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span className="hidden md:inline">Painel Operador</span>
          </button>

          <button
            onClick={() => onViewChange('driver-mobile')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap leading-none ${
              currentView === 'driver-mobile'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Versão Mobile para Celular dos Motoristas"
          >
            <Smartphone className="w-4 h-4 shrink-0" />
            <span className="hidden lg:inline">Chamada Mobile</span>
          </button>

          <button
            onClick={() => onViewChange('driver-tv')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap leading-none ${
              currentView === 'driver-tv'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Chamada de Motoristas - Telão do Pátio"
          >
            <Megaphone className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Chamada de Motoristas</span>
          </button>

          <button
            onClick={() => onViewChange('driver-checkin')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap leading-none ${
              currentView === 'driver-checkin'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Check-in Automático de Chegada"
          >
            <ClipboardList className="w-4 h-4 shrink-0" />
            <span className="hidden md:inline">Check-in</span>
          </button>
        </nav>

        {/* Right actions: CEP, Chat, Package Transfer, Audio, Sync, Google, Settings */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* CEP Search Button */}
          {canSearchCep && onOpenCepSearch && (
            <button
              onClick={onOpenCepSearch}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-sky-400 border border-slate-700/80 transition cursor-pointer shrink-0 flex items-center gap-1.5 text-xs font-semibold"
              title="Pesquisa de CEP & Rotas (ViaCEP)"
            >
              <Compass className="w-4 h-4" />
              <span className="hidden md:inline">Buscar CEP</span>
            </button>
          )}

          {/* Docks Chat Button with Live Messages */}
          {canChat && onOpenChat && (
            <button
              onClick={onOpenChat}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-amber-300 border border-slate-700/80 transition cursor-pointer shrink-0 flex items-center gap-1.5 text-xs font-semibold"
              title="Chat em Tempo Real entre Docas e Administradores"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden md:inline">Chat</span>
            </button>
          )}

          {/* Package Transfer Between Routes Button */}
          {canTransfer && onOpenPackageTransfer && (
            <button
              onClick={onOpenPackageTransfer}
              className="relative px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-emerald-400 border border-slate-700/80 transition cursor-pointer shrink-0 flex items-center gap-1.5 text-xs font-semibold"
              title="Remanejamento de Pacotes entre Rotas & Docas"
            >
              <Package className="w-4 h-4" />
              <span className="hidden md:inline">Remanejar</span>
              {pendingTransfersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-mono font-bold text-[10px] flex items-center justify-center animate-pulse">
                  {pendingTransfersCount}
                </span>
              )}
            </button>
          )}

          {/* Share mobile link button */}
          {onOpenShareMobile && (
            <button
              onClick={onOpenShareMobile}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-amber-400 border border-slate-700/80 transition cursor-pointer shrink-0"
              title="Compartilhar Link do Celular dos Motoristas (WhatsApp / QR Code)"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          )}

          {/* Manage Authorized Credentials & Permissions button (Restricted exclusively to authorized Google Admin) */}
          {adminService.canManageAccess(user?.email) && onOpenAccessManagement && (
            <button
              onClick={onOpenAccessManagement}
              className="p-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 transition cursor-pointer shrink-0"
              title="Controle de Acessos, Logins e Permissões (Exclusivo Administrador Geral Google)"
            >
              <KeyRound className="w-4 h-4 text-amber-400" />
            </button>
          )}

          {/* Audio Alert Settings */}
          <button
            onClick={onOpenAudioSettings}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700/80 transition cursor-pointer shrink-0"
            title="Configurar Alertas Sonoros e Voz"
          >
            <Bell className="w-4 h-4 text-amber-400" />
          </button>

          {/* Realtime Sheets Sync Trigger */}
          <button
            onClick={onTriggerSync}
            disabled={isSyncing}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700/80 transition cursor-pointer shrink-0"
            title="Sincronizar Planilha Agora"
          >
            <RefreshCw
              className={`w-4 h-4 text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`}
            />
          </button>

          {/* Workspace Sheets & Forms Config */}
          <button
            onClick={onOpenSettings}
            className={`p-2 sm:px-3 sm:py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0 leading-none ${
              config.spreadsheetId
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
            title={config.spreadsheetId ? 'Planilha Conectada' : 'Conectar Sheets'}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="hidden lg:inline">
              {config.spreadsheetId ? 'Planilha Conectada' : 'Conectar Sheets'}
            </span>
          </button>

          {/* Active Session / Collaborator Assigned Dock Badge */}
          {activeSession ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800 shrink-0">
              <div
                className="hidden md:flex flex-col items-end text-right"
                title={`Logado como ${activeSession.name} (${activeSession.username})`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-white leading-normal">
                    {activeSession.name}
                  </span>
                  {activeSession.assignedDockNome && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold border border-amber-500/30">
                      {activeSession.assignedDockNome}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] font-mono text-amber-400 uppercase tracking-wider leading-none">
                    {activeSession.role === 'admin_geral' ? 'Admin Geral' : 'Operador'}
                  </span>
                  {canSwitch && onSwitchDock && (
                    <button
                      type="button"
                      onClick={onSwitchDock}
                      className="text-[9px] font-mono text-sky-400 hover:underline cursor-pointer"
                    >
                      Trocar Doca
                    </button>
                  )}
                </div>
              </div>
              <button
                onClick={onLogoutSession}
                className="p-2 text-slate-400 hover:text-rose-400 rounded-xl bg-slate-800 hover:bg-slate-750 transition cursor-pointer border border-slate-700 shrink-0"
                title="Bloquear Painel / Sair da Conta"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800 shrink-0">
              <div
                className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-amber-400 overflow-hidden shrink-0"
                title={user.email || 'Usuário Google'}
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Foto" className="w-full h-full object-cover" />
                ) : (
                  user.displayName?.charAt(0) || <UserIcon className="w-4 h-4 text-slate-400" />
                )}
              </div>
              <button
                onClick={onSignOut}
                className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition cursor-pointer shrink-0"
                title="Desconectar conta Google"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="hidden sm:block shrink-0">
              <GoogleSignInButton
                onClick={onSignIn}
                text="Entrar Google"
                className="py-1.5 px-3 text-xs leading-none"
              />
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

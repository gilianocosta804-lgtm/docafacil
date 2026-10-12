import React, { useState } from 'react';
import {
  Play,
  CheckCircle2,
  BellRing,
  RotateCcw,
  Car,
  MapPin,
  Clock,
  Wrench,
  AlertCircle,
  Pause,
  PlayCircle,
  Edit2,
  Shield,
  ShieldAlert,
  UserCheck,
  Package,
  MessageSquare,
  Lock,
  ArrowRightLeft,
  Hash
} from 'lucide-react';
import { Dock, DriverEntry, AuthorizedUser, CollaboratorPermissions } from '../types';

interface DockCardProps {
  dock: Dock;
  onCallNext: (dock: Dock) => void;
  onSelectDriver: (dock: Dock) => void;
  onStartLoading: (dock: Dock) => void;
  onFinishLoading: (dock: Dock) => void;
  onReCall: (dock: Dock) => void;
  onToggleMaintenance: (dock: Dock) => void;
  onClearDock: (dock: Dock) => void;
  onRemove?: (dock: Dock) => void;
  onRename?: (dock: Dock, newName: string) => void;
  onTogglePause?: (dock: Dock, motivo?: string) => void;
  onAssumeDock?: (dock: Dock) => void;
  onOpenChat?: (dock: Dock) => void;
  onTransferPackage?: (dock: Dock) => void;
  isAdmin: boolean;
  activeSession: AuthorizedUser | null;
  permissions?: CollaboratorPermissions;
}

export const DockCard: React.FC<DockCardProps> = ({
  dock,
  onCallNext,
  onSelectDriver,
  onStartLoading,
  onFinishLoading,
  onReCall,
  onToggleMaintenance,
  onClearDock,
  onRemove,
  onRename,
  onTogglePause,
  onAssumeDock,
  onOpenChat,
  onTransferPackage,
  isAdmin,
  activeSession,
  permissions,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [newNameInput, setNewNameInput] = useState(dock.nome);
  const [showPauseMenu, setShowPauseMenu] = useState(false);

  // Check if current user is restricted to a specific dock
  const userAssignedDockId = activeSession?.assignedDockId;
  const isMyDock = !userAssignedDockId || userAssignedDockId === dock.id;
  // Collaborator can move cars ONLY from their dock! Admins can move from any dock.
  const canOperateThisDock = isAdmin || isMyDock;

  // Granular permissions for collaborators
  const canCall = isAdmin || (permissions ? permissions.canCallDrivers : true);
  const canStart = isAdmin || (permissions ? permissions.canStartLoading : true);
  const canFinish = isAdmin || (permissions ? permissions.canFinishLoading : true);
  const canPause = isAdmin || (permissions ? permissions.canPauseDock : true);
  const canSwitch = isAdmin || (permissions ? permissions.canSwitchDock : true);
  const canChat = isAdmin || (permissions ? permissions.canUseChat : true);
  const canTransfer = isAdmin || (permissions ? permissions.canTransferPackages : true);

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (newNameInput.trim() && onRename) {
      onRename(dock, newNameInput.trim());
      setIsEditingName(false);
    }
  };

  const handleSelectPauseReason = (motivo: string) => {
    setShowPauseMenu(false);
    onTogglePause?.(dock, motivo);
  };

  const getStatusBadge = () => {
    switch (dock.status) {
      case 'livre':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Livre
          </span>
        );
      case 'chamando':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            Chamando
          </span>
        );
      case 'carregando':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-sky-500/15 text-sky-300 border border-sky-500/30">
            <span className="w-2 h-2 rounded-full bg-sky-400"></span>
            Carregando
          </span>
        );
      case 'pausada':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <Pause className="w-3 h-3 text-amber-400" />
            Pausada
          </span>
        );
      case 'manutencao':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-700/60 text-slate-400 border border-slate-600">
            <span className="w-2 h-2 rounded-full bg-slate-500"></span>
            Manutenção
          </span>
        );
    }
  };

  const getCardBorder = () => {
    if (dock.status === 'pausada') {
      return 'border-amber-500/50 bg-amber-950/15 ring-1 ring-amber-500/20';
    }
    switch (dock.status) {
      case 'chamando':
        return 'border-amber-500/50 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/30';
      case 'carregando':
        return 'border-sky-500/40 shadow-md shadow-sky-500/5';
      case 'livre':
        return 'border-emerald-500/30 hover:border-emerald-500/60';
      case 'manutencao':
        return 'border-slate-800 opacity-75';
    }
  };

  return (
    <div
      className={`rounded-2xl bg-slate-900/90 border p-5 flex flex-col justify-between transition-all duration-200 relative ${getCardBorder()}`}
    >
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-mono font-black text-lg text-white shrink-0">
              {dock.numero}
            </div>
            <div className="min-w-0 flex-1">
              {isEditingName && isAdmin ? (
                <form onSubmit={handleSaveName} className="flex items-center gap-1">
                  <input
                    type="text"
                    required
                    value={newNameInput}
                    onChange={(e) => setNewNameInput(e.target.value)}
                    className="px-2 py-0.5 rounded bg-slate-950 border border-amber-500 text-white font-bold text-xs w-full focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-bold text-[10px]"
                  >
                    OK
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingName(false)}
                    className="text-slate-400 text-[10px]"
                  >
                    ✕
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="font-bold text-white text-base leading-tight truncate">
                    {dock.nome}
                  </h4>
                  {isAdmin && onRename && (
                    <button
                      type="button"
                      onClick={() => setIsEditingName(true)}
                      className="p-1 text-slate-500 hover:text-amber-400 transition"
                      title="Renomear Doca (Administrador)"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {getStatusBadge()}
            {isAdmin && onRemove && (dock.status === 'livre' || dock.status === 'manutencao' || dock.status === 'pausada') && (
              <button
                type="button"
                onClick={() => onRemove(dock)}
                className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                title="Remover esta doca (Administrador)"
              >
                <span className="text-xs font-mono">✕</span>
              </button>
            )}
          </div>
        </div>

        {/* Collaborator Badge ("Mesa: Nome do Colaborador") */}
        <div className="mb-3 p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <UserCheck className={`w-3.5 h-3.5 shrink-0 ${dock.colaboradorNome ? 'text-emerald-400' : 'text-slate-500'}`} />
            <span className="text-[11px] text-slate-400 shrink-0 font-medium">Mesa:</span>
            <span className={`font-bold truncate text-[11px] ${dock.colaboradorNome ? 'text-white' : 'text-slate-500 italic'}`}>
              {dock.colaboradorNome || 'Sem colaborador fixado'}
            </span>
          </div>

          {/* Switch dock button for collaborators */}
          {!isAdmin && canSwitch && userAssignedDockId !== dock.id && (
            <button
              type="button"
              onClick={() => onAssumeDock?.(dock)}
              className="text-[10px] font-mono font-bold text-amber-400 hover:text-amber-300 underline shrink-0 cursor-pointer"
              title="Assumir esta doca como minha mesa de trabalho"
            >
              Assumir Doca
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={() => onAssumeDock?.(dock)}
              className="text-[10px] font-mono text-slate-400 hover:text-amber-300 transition shrink-0 cursor-pointer"
              title="Definir colaborador para esta doca"
            >
              Trocar
            </button>
          )}
        </div>

        {/* PAUSE NOTICE IF PAUSED */}
        {dock.status === 'pausada' && (
          <div className="my-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <Pause className="w-4 h-4 text-amber-400" />
                Doca em Pausa
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                {dock.pausaMotivo || 'Intervalo'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              Operações temporariamente suspensas nesta doca.
            </p>
          </div>
        )}

        {/* Content Area when FREE */}
        {dock.status === 'livre' && (
          <div className="my-3 py-4 px-3 rounded-xl border border-dashed border-slate-800 bg-slate-950/40 text-center">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-1.5">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <p className="text-xs font-semibold text-emerald-400">Doca Disponível</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Pronta para receber novo motorista</p>
          </div>
        )}

        {/* Content Area when OCCUPIED */}
        {(dock.status === 'chamando' || dock.status === 'carregando') && dock.motoristaAtual && (
          <div className="my-3 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2.5">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">
                  Motorista
                </span>
                <p className="text-sm font-bold text-white leading-tight">
                  {dock.motoristaAtual.nome}
                </p>
              </div>
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                {dock.motoristaAtual.placa}
              </span>
            </div>

            {/* Rota */}
            <div className="flex items-center justify-between text-xs bg-slate-900/90 p-2 rounded-lg border border-slate-800">
              <span className="text-[11px] font-mono text-slate-400 uppercase">Rota Designada:</span>
              <span className="font-mono font-black text-amber-300 text-xs px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30">
                {dock.motoristaAtual.rota}
              </span>
            </div>

            {/* Colaborador que está carregando */}
            <div className="flex items-center justify-between text-xs bg-slate-900/90 p-2 rounded-lg border border-slate-800">
              <span className="text-[11px] font-mono text-slate-400 uppercase">Carregando com:</span>
              <span className="font-semibold text-emerald-400 text-xs flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5" />
                {dock.colaboradorNome || dock.motoristaAtual.colaboradorResponsavel || 'Operador da Doca'}
              </span>
            </div>

            {/* Quantidade Carregada & Isca Security Indicator */}
            {(dock.quantidadeCarregada || dock.motoristaAtual.quantidadeCarregada || dock.numeroIsca || dock.motoristaAtual.numeroIsca) && (
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                {(dock.quantidadeCarregada || dock.motoristaAtual.quantidadeCarregada) && (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Package className="w-3 h-3 text-emerald-400" />
                    {dock.quantidadeCarregada || dock.motoristaAtual.quantidadeCarregada} vol.
                  </span>
                )}

                {/* Confidential ISCA NUMBER - VISIBLE ONLY TO ADM */}
                {isAdmin ? (
                  <span className="text-amber-300 font-bold flex items-center gap-1" title="Número de Isca Confidencial (ADM)">
                    <Shield className="w-3 h-3 text-amber-400" />
                    Isca: {dock.numeroIsca || dock.motoristaAtual.numeroIsca || '---'}
                  </span>
                ) : (
                  <span className="text-slate-500 flex items-center gap-1 text-[10px]" title="Isca Confidencial Administrador">
                    <Shield className="w-3 h-3 text-slate-500" />
                    Isca: •••••• (ADM)
                  </span>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-[11px] text-slate-400 pt-1.5 border-t border-slate-800/80 font-mono gap-1">
              <span className="flex items-center gap-1 shrink-0">
                <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                {dock.status === 'chamando'
                  ? `Chamado: ${dock.motoristaAtual.horarioChamada || '--:--'}`
                  : `Início: ${dock.motoristaAtual.inicioCarregamento || '--:--'}`}
              </span>
              <span className="truncate text-slate-400" title={dock.motoristaAtual.localizacao}>
                Local: {dock.motoristaAtual.localizacao}
              </span>
            </div>
          </div>
        )}

        {dock.status === 'manutencao' && (
          <div className="my-3 py-4 px-4 rounded-xl border border-slate-800 bg-slate-950/40 text-center text-slate-400">
            <Wrench className="w-7 h-7 mx-auto mb-2 text-slate-500" />
            <p className="text-xs font-semibold text-slate-300">Em Manutenção / Limpeza</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Indisponível temporariamente</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="pt-3 border-t border-slate-800/80 space-y-2">
        {/* COLLABORATOR RESTRICTION BANNER IF NOT ASSIGNED TO THIS DOCK */}
        {!canOperateThisDock && (
          <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <span className="text-[11px] font-mono text-amber-400/90 flex items-center justify-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              Restrito à sua Doca ({activeSession?.assignedDockNome || 'sua mesa'})
            </span>
          </div>
        )}

        {/* IF CURRENT DOCK IS PAUSED */}
        {dock.status === 'pausada' && (
          <div className="space-y-1.5">
            <button
              onClick={() => onTogglePause?.(dock)}
              disabled={!canOperateThisDock || !canPause}
              className="w-full px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              Retomar Operação da Doca
            </button>
          </div>
        )}

        {dock.status === 'livre' && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onCallNext(dock)}
                disabled={!canOperateThisDock || !canCall}
                className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                title={!canOperateThisDock ? 'Você só pode movimentar carros da sua doca' : 'Chamar 1º da fila'}
              >
                <BellRing className="w-3.5 h-3.5" />
                Chamar 1º
              </button>
              <button
                onClick={() => onSelectDriver(dock)}
                disabled={!canOperateThisDock || !canCall}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title={!canOperateThisDock ? 'Você só pode movimentar carros da sua doca' : 'Escolher motorista da fila'}
              >
                <Car className="w-3.5 h-3.5 text-sky-400" />
                Escolher
              </button>
            </div>
          </div>
        )}

        {dock.status === 'chamando' && (
          <div className="space-y-1.5">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onStartLoading(dock)}
                disabled={!canOperateThisDock || !canStart}
                className="px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Carregando
              </button>
              <button
                onClick={() => onReCall(dock)}
                disabled={!canOperateThisDock}
                className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                title="Repetir gongo e anúncio sonoro de chamada no pátio"
              >
                <BellRing className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                Rechamar
              </button>
            </div>
            <button
              onClick={() => onClearDock(dock)}
              disabled={!canOperateThisDock}
              className="w-full text-center text-[11px] text-slate-400 hover:text-rose-400 transition py-1 cursor-pointer disabled:opacity-50"
            >
              Cancelar chamada / Liberar doca
            </button>
          </div>
        )}

        {dock.status === 'carregando' && (
          <div className="space-y-1.5">
            <button
              onClick={() => onFinishLoading(dock)}
              disabled={!canOperateThisDock || !canFinish}
              className="w-full px-3 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md shadow-emerald-500/20 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              Concluir & Liberar Doca
            </button>
            <button
              onClick={() => onClearDock(dock)}
              disabled={!canOperateThisDock}
              className="w-full text-center text-[11px] text-slate-400 hover:text-rose-400 transition py-0.5 cursor-pointer disabled:opacity-50"
            >
              Desalocar motorista
            </button>
          </div>
        )}

        {dock.status === 'manutencao' && (
          <button
            onClick={() => onToggleMaintenance(dock)}
            disabled={!isAdmin}
            className="w-full px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Liberar para Operação
          </button>
        )}

        {/* BOTTOM EXTRA DOCK CONTROLS (PAUSE, CHAT, TRANSFER PAC) */}
        <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
          {/* Pause Button */}
          {dock.status !== 'manutencao' && dock.status !== 'pausada' && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPauseMenu(!showPauseMenu)}
                disabled={!canOperateThisDock || !canPause}
                className="px-2 py-1 rounded-lg text-[11px] font-medium text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition flex items-center gap-1 cursor-pointer disabled:opacity-40"
                title="Pausar operação na doca (Almoço / Manutenção)"
              >
                <Pause className="w-3 h-3 text-amber-400" />
                <span>Pausar</span>
              </button>

              {/* Pause reason menu */}
              {showPauseMenu && (
                <div className="absolute bottom-full left-0 mb-1 z-20 w-44 rounded-xl bg-slate-950 border border-slate-800 shadow-xl p-1 text-xs space-y-0.5 animate-in fade-in">
                  <span className="text-[10px] font-mono uppercase text-slate-500 px-2 py-1 block">
                    Motivo da Pausa:
                  </span>
                  {['Almoço', 'Intervalo / Café', 'Banheiro', 'Manutenção Doca', 'Troca de Turno'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleSelectPauseReason(r)}
                      className="w-full text-left px-2 py-1.5 rounded-lg text-slate-200 hover:bg-slate-850 hover:text-amber-400 text-xs transition"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quick Chat Shortcut for this dock */}
          {canChat && onOpenChat && (
            <button
              type="button"
              onClick={() => onOpenChat(dock)}
              className="px-2 py-1 rounded-lg text-[11px] font-medium text-slate-400 hover:text-sky-400 hover:bg-slate-800 transition flex items-center gap-1 cursor-pointer"
              title="Abrir chat para esta doca"
            >
              <MessageSquare className="w-3 h-3 text-sky-400" />
              <span>Chat</span>
            </button>
          )}

          {/* Transfer Package Shortcut */}
          {canTransfer && onTransferPackage && (
            <button
              type="button"
              onClick={() => onTransferPackage(dock)}
              className="px-2 py-1 rounded-lg text-[11px] font-medium text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition flex items-center gap-1 cursor-pointer"
              title="Remanejar / Transferir pacote para outra rota"
            >
              <Package className="w-3 h-3 text-emerald-400" />
              <span>Remanejar</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

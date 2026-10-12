import React, { useState } from 'react';
import {
  Car,
  Clock,
  CheckCircle2,
  BellRing,
  PlusCircle,
  FileSpreadsheet,
  AlertCircle,
  ExternalLink,
  Users,
  Warehouse,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Smartphone,
  KeyRound,
  Compass,
  MessageSquare,
  Package,
  Pause,
  ArrowRightLeft
} from 'lucide-react';
import {
  DriverEntry,
  Dock,
  WorkspaceConfig,
  DriverStatus,
  AuthorizedUser,
  CollaboratorPermissions
} from '../types';
import { DockCard } from './DockCard';
import { DriverQueueTable } from './DriverQueueTable';
import { CallModal } from './CallModal';
import { ConfirmModal } from './ConfirmModal';
import { LoadingDetailsModal } from './LoadingDetailsModal';
import { adminService } from '../services/adminService';

interface DashboardViewProps {
  drivers: DriverEntry[];
  docks: Dock[];
  config: WorkspaceConfig;
  onCallDriverToDock: (driver: DriverEntry, dock: Dock) => Promise<void>;
  onStartLoading: (dock: Dock) => Promise<void>;
  onFinishLoading: (
    dock: Dock,
    data?: {
      quantidadeCarregada?: number;
      numeroIsca?: string;
      colaboradorResponsavel?: string;
    }
  ) => Promise<void>;
  onReCallDriver: (dock: Dock) => void;
  onToggleMaintenance: (dock: Dock) => void;
  onClearDock: (dock: Dock) => Promise<void>;
  onUpdateDriverStatus: (driver: DriverEntry, newStatus: DriverStatus, dockName?: string) => Promise<void>;
  onOpenWorkspaceSetup: () => void;
  onOpenManualRegistration: () => void;
  onOpenShareMobile?: () => void;
  onOpenAccessManagement?: () => void;
  onAddDock?: () => void;
  onRemoveDock?: (dockId: string) => void;
  onRenameDock?: (dockId: string, newName: string) => void;
  onTogglePause?: (dock: Dock, motivo?: string) => void;
  onAssumeDock?: (dock: Dock) => void;
  onOpenChat?: (dock?: Dock) => void;
  onOpenCepSearch?: () => void;
  onOpenPackageTransfer?: (dock?: Dock) => void;
  currentUserEmail?: string | null;
  activeSession: AuthorizedUser | null;
  permissions?: CollaboratorPermissions;
  isLoadingAction: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  drivers,
  docks,
  config,
  onCallDriverToDock,
  onStartLoading,
  onFinishLoading,
  onReCallDriver,
  onToggleMaintenance,
  onClearDock,
  onUpdateDriverStatus,
  onOpenWorkspaceSetup,
  onOpenManualRegistration,
  onOpenShareMobile,
  onOpenAccessManagement,
  onAddDock,
  onRemoveDock,
  onRenameDock,
  onTogglePause,
  onAssumeDock,
  onOpenChat,
  onOpenCepSearch,
  onOpenPackageTransfer,
  currentUserEmail,
  activeSession,
  permissions,
  isLoadingAction,
}) => {
  // Modals state
  const [callModalDriver, setCallModalDriver] = useState<DriverEntry | null>(null);
  const [preselectedDockId, setPreselectedDockId] = useState<string | undefined>(undefined);

  // Loading details modal state (Quantidade carregada + Isca confidencial)
  const [loadingDetailsDock, setLoadingDetailsDock] = useState<Dock | null>(null);

  // Mandatory Workspace confirmation modal state for destructive or mutating updates
  const [confirmModalData, setConfirmModalData] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    details: string[];
    confirmVariant: 'danger' | 'warning' | 'primary';
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    details: [],
    confirmVariant: 'primary',
    action: async () => {},
  });

  const isAdmin = activeSession?.role === 'admin_geral' || adminService.isAdmin(currentUserEmail);

  // Calculate high-level KPIs
  const totalDrivers = drivers.length;
  const waitingDrivers = drivers.filter((d) => d.status === 'aguardando');
  const calledDrivers = drivers.filter((d) => d.status === 'chamado');
  const loadingDrivers = drivers.filter((d) => d.status === 'carregando');
  const finishedDrivers = drivers.filter((d) => d.status === 'concluido');

  const freeDocks = docks.filter((d) => d.status === 'livre').length;
  const occupiedDocks = docks.filter((d) => d.status === 'carregando' || d.status === 'chamando').length;
  const pausedDocks = docks.filter((d) => d.status === 'pausada').length;

  // Handler for calling the first waiting driver
  const handleCallFirst = (targetDock: Dock) => {
    if (waitingDrivers.length === 0) {
      alert('Não há motoristas aguardando na fila no momento.');
      return;
    }
    const firstInLine = waitingDrivers[0];
    setCallModalDriver(firstInLine);
    setPreselectedDockId(targetDock.id);
  };

  const handleSelectDriverForDock = (targetDock: Dock) => {
    setPreselectedDockId(targetDock.id);
    if (waitingDrivers.length > 0) {
      setCallModalDriver(waitingDrivers[0]);
    } else {
      alert('Nenhum motorista aguardando na fila.');
    }
  };

  // Safe wrapper with LoadingDetailsModal to capture volumes and isca
  const handleRequestFinishLoading = (dock: Dock) => {
    setLoadingDetailsDock(dock);
  };

  // Safe wrapper with confirmation dialog for clearing dock
  const handleRequestClearDock = (dock: Dock) => {
    setConfirmModalData({
      isOpen: true,
      title: `Desalocar / Liberar ${dock.nome}`,
      message: `Tem certeza que deseja cancelar a alocação da ${dock.nome}? O motorista retornará para a fila ou será desvinculado.`,
      details: [
        `Doca: ${dock.nome}`,
        `Status atual: ${dock.status.toUpperCase()}`,
        `Motorista atual: ${dock.motoristaAtual?.nome || 'Nenhum'}`,
      ],
      confirmVariant: 'danger',
      action: async () => {
        await onClearDock(dock);
      },
    });
  };

  const isGoogleAdmin = adminService.canManageAccess(currentUserEmail);
  const todayFormatted = new Date().toLocaleDateString('pt-BR');

  const canSearchCep = isAdmin || (permissions ? permissions.canSearchCep : true);
  const canChat = isAdmin || (permissions ? permissions.canUseChat : true);
  const canTransfer = isAdmin || (permissions ? permissions.canTransferPackages : true);

  return (
    <div className="space-y-8">
      {/* DAILY CALL SPREADSHEET STATUS BAR */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-white">Chamada Diária de Carros:</span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold border border-emerald-500/30">
                {config.activeDailyDate || todayFormatted}
              </span>
              <span className="text-[10px] font-mono text-amber-300/80 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                Planilha de Logins Permanente
              </span>
              {activeSession?.assignedDockNome && (
                <span className="text-[10px] font-mono text-emerald-300 px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 font-bold">
                  Sua Mesa: {activeSession.assignedDockNome}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {config.spreadsheetId
                ? `Planilha do dia conectada (${config.sheetName || 'Controle de Chamadas'}). Sincronizada em tempo real.`
                : 'Planilha e formulário do dia ainda não gerados no Google Sheets.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {canSearchCep && onOpenCepSearch && (
            <button
              onClick={onOpenCepSearch}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-sky-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0"
              title="Pesquisar CEP e Logística"
            >
              <Compass className="w-3.5 h-3.5 text-sky-400" />
              <span>Pesquisa CEP</span>
            </button>
          )}

          {canChat && onOpenChat && (
            <button
              onClick={() => onOpenChat()}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-amber-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0"
              title="Abrir Chat com Docas e Administração"
            >
              <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
              <span>Chat Interno</span>
            </button>
          )}

          {canTransfer && onOpenPackageTransfer && (
            <button
              onClick={() => onOpenPackageTransfer()}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-emerald-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0"
              title="Remanejar Pacote para Próxima Doca/Rota"
            >
              <Package className="w-3.5 h-3.5 text-emerald-400" />
              <span>Remanejar Rota</span>
            </button>
          )}

          <button
            onClick={onOpenWorkspaceSetup}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Nova Chamada Diária</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Waiting */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
              Fila de Espera
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-white">
              {waitingDrivers.length}
            </span>
            <span className="text-xs text-slate-400">motoristas aguardando</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Próximos a serem chamados</p>
        </div>

        {/* In Docks */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-sky-400">
              Nas Docas
            </span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
              <Warehouse className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-white">
              {occupiedDocks}
            </span>
            <span className="text-xs text-slate-400">de {docks.length} docas</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {freeDocks} livres {pausedDocks > 0 ? `· ${pausedDocks} em pausa` : ''}
          </p>
        </div>

        {/* Finished */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
              Carregados Hoje
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-white">
              {finishedDrivers.length}
            </span>
            <span className="text-xs text-slate-400">cargas finalizadas</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Volumes e iscas computados</p>
        </div>

        {/* Total Registered */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-400">
              Total Chegadas
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-white">
              {totalDrivers}
            </span>
            <span className="text-xs text-slate-400">motoristas no dia</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Tempo real conectado</p>
        </div>
      </div>

      {/* SECTION 1: DOCAS DE CARREGAMENTO */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Warehouse className="w-5 h-5 text-amber-400" />
              Docas de Carregamento & Gestão de Mesas
            </h2>
            <p className="text-xs text-slate-400">
              Colaboradores identificados por login pré-cadastrado na doca • Controle de pausa e remanejamento
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && onAddDock && (
              <button
                onClick={onAddDock}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                title="Adicionar mais uma doca (Administrador)"
              >
                <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>+ Adicionar Doca</span>
              </button>
            )}

            {waitingDrivers.length > 0 && freeDocks > 0 && (
              <button
                onClick={() => {
                  const firstFree = docks.find((d) => d.status === 'livre');
                  if (firstFree) handleCallFirst(firstFree);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm shadow-amber-500/20"
              >
                <BellRing className="w-3.5 h-3.5" />
                Chamar Próximo ({waitingDrivers[0].nome.split(' ')[0]})
              </button>
            )}
          </div>
        </div>

        {/* Grid of Docks */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {docks.map((dock) => (
            <DockCard
              key={dock.id}
              dock={dock}
              onCallNext={handleCallFirst}
              onSelectDriver={handleSelectDriverForDock}
              onStartLoading={onStartLoading}
              onFinishLoading={handleRequestFinishLoading}
              onReCall={onReCallDriver}
              onToggleMaintenance={onToggleMaintenance}
              onClearDock={handleRequestClearDock}
              onRemove={onRemoveDock ? () => onRemoveDock(dock.id) : undefined}
              onRename={onRenameDock ? (d, newName) => onRenameDock(d.id, newName) : undefined}
              onTogglePause={onTogglePause}
              onAssumeDock={onAssumeDock}
              onOpenChat={onOpenChat}
              onTransferPackage={onOpenPackageTransfer}
              isAdmin={isAdmin}
              activeSession={activeSession}
              permissions={permissions}
            />
          ))}
        </div>
      </section>

      {/* SECTION 2: FILA DE ESPERA & GESTÃO DE MOTORISTAS */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Car className="w-5 h-5 text-sky-400" />
              Controle Geral de Carros & Fila de Chegada
            </h2>
            <p className="text-xs text-slate-400">
              Registros em tempo real • Colaborador responsável, quantidade carregada e isca confidencial
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isGoogleAdmin && onOpenAccessManagement && (
              <button
                onClick={onOpenAccessManagement}
                className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
                title="Gerenciar Logins, Senhas e Permissões dos Colaboradores"
              >
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Acessos & Permissões</span>
                <span className="sm:hidden">Acessos</span>
              </button>
            )}
            {onOpenShareMobile && (
              <button
                onClick={onOpenShareMobile}
                className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Smartphone className="w-4 h-4 text-amber-400" />
                <span>Links Motoristas</span>
              </button>
            )}
            <button
              onClick={onOpenManualRegistration}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-emerald-400" />
              <span>Novo Registro</span>
            </button>
          </div>
        </div>

        {/* Queue Table */}
        <DriverQueueTable
          drivers={drivers}
          docks={docks}
          onCallDriver={(driver) => {
            setCallModalDriver(driver);
            setPreselectedDockId(docks.find((d) => d.status === 'livre')?.id);
          }}
          onUpdateStatus={onUpdateDriverStatus}
          isAdmin={isAdmin}
          activeSession={activeSession}
        />
      </section>

      {/* CALL DRIVER MODAL */}
      <CallModal
        isOpen={!!callModalDriver}
        driver={callModalDriver}
        docks={docks}
        preselectedDockId={preselectedDockId}
        onClose={() => setCallModalDriver(null)}
        isLoading={isLoadingAction}
        onConfirmCall={async (driver, dock) => {
          await onCallDriverToDock(driver, dock);
          setCallModalDriver(null);
        }}
      />

      {/* FINISH LOADING DETAILS MODAL (VOLUMES + ISCA CONFIDENCIAL + COLABORADOR) */}
      <LoadingDetailsModal
        isOpen={!!loadingDetailsDock}
        dock={loadingDetailsDock}
        driver={loadingDetailsDock?.motoristaAtual || null}
        collaboratorName={loadingDetailsDock?.colaboradorNome || activeSession?.name}
        isAdmin={isAdmin}
        onClose={() => setLoadingDetailsDock(null)}
        isLoading={isLoadingAction}
        onConfirm={async (data) => {
          if (loadingDetailsDock) {
            await onFinishLoading(loadingDetailsDock, data);
            setLoadingDetailsDock(null);
          }
        }}
      />

      {/* EXPLICIT WORKSPACE MUTATION CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={confirmModalData.isOpen}
        title={confirmModalData.title}
        message={confirmModalData.message}
        details={confirmModalData.details}
        confirmVariant={confirmModalData.confirmVariant}
        onCancel={() => setConfirmModalData((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={async () => {
          await confirmModalData.action();
          setConfirmModalData((prev) => ({ ...prev, isOpen: false }));
        }}
        isLoading={isLoadingAction}
      />
    </div>
  );
};

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  DriverEntry,
  Dock,
  WorkspaceConfig,
  AppViewMode,
  CallAlertEvent,
  DriverStatus,
  AuthorizedUser,
  PackageTransfer,
  CollaboratorPermissions,
  ChatMessage
} from './types';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
  setCachedAccessToken
} from './services/auth';
import {
  getStoredDrivers,
  setStoredDrivers,
  getStoredDocks,
  setStoredDocks,
  getStoredConfig,
  setStoredConfig
} from './services/storageService';
import { GoogleSheetsService } from './services/sheetsService';
import { audioService } from './services/audioService';
import { realtimeSync, SyncMessage } from './services/realtimeSync';

import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { DriverTVView } from './components/DriverTVView';
import { DriverMobileView } from './components/DriverMobileView';
import { DriverCheckinView } from './components/DriverCheckinView';
import { WorkspaceSetupModal } from './components/WorkspaceSetupModal';
import { AudioSettingsModal } from './components/AudioSettingsModal';
import { ManualRegistrationModal } from './components/ManualRegistrationModal';
import { ShareDriverLinkModal } from './components/ShareDriverLinkModal';
import { AccessManagementModal } from './components/AccessManagementModal';
import { AdminAuthGate } from './components/AdminAuthGate';
import { CepSearchModal } from './components/CepSearchModal';
import { DockChatModal } from './components/DockChatModal';
import { PackageTransferModal } from './components/PackageTransferModal';
import { adminService } from './services/adminService';
import { Bell, Package, CheckCircle2, X } from 'lucide-react';

const STORAGE_TRANSFERS_KEY = 'docafacil_package_transfers';

export default function App() {
  // Navigation & View state - reads ?view=motorista or ?view=tv from URL
  const [currentView, setCurrentView] = useState<AppViewMode>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const v = params.get('view') || params.get('painel');
      if (
        v === 'motorista' ||
        v === 'driver' ||
        v === 'celular' ||
        v === 'mobile' ||
        v === 'chamada' ||
        v === 'chamadas'
      ) return 'driver-mobile';
      if (v === 'tv' || v === 'telao') return 'driver-tv';
      if (v === 'checkin') return 'driver-checkin';
      if (v === 'dashboard') {
        const session = adminService.getCurrentSession();
        if (session && session.status === 'ativo') return 'dashboard';
      }
    }
    // "antes do acesso, so ficara visivel meu status, fila e doca que é a parte do motorista, que ele vai conseguir ter acesso"
    return 'driver-mobile';
  });

  // Keep URL updated when switching views
  const handleViewChange = (newView: AppViewMode) => {
    setCurrentView(newView);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (newView === 'driver-mobile') {
        url.searchParams.set('view', 'motorista');
      } else if (newView === 'driver-tv') {
        url.searchParams.set('view', 'tv');
      } else if (newView === 'driver-checkin') {
        url.searchParams.set('view', 'checkin');
      } else {
        url.searchParams.delete('view');
      }
      window.history.replaceState(null, '', url.toString());
    }
  };

  // Google Auth state
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Application Data
  const [drivers, setDrivers] = useState<DriverEntry[]>(getStoredDrivers);
  const [docks, setDocks] = useState<Dock[]>(getStoredDocks);
  const [config, setConfig] = useState<WorkspaceConfig>(getStoredConfig);

  // Package transfers between docks / routes
  const [packageTransfers, setPackageTransfers] = useState<PackageTransfer[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_TRANSFERS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Collaborator permissions configured by administrators
  const [collaboratorPermissions, setCollaboratorPermissions] = useState<CollaboratorPermissions>(() =>
    adminService.getCollaboratorPermissions()
  );

  // Operational states
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isLoadingAction, setIsLoadingAction] = useState<boolean>(false);
  const [activeCallAlert, setActiveCallAlert] = useState<CallAlertEvent | null>(null);
  const [headerColumns, setHeaderColumns] = useState<string[]>([]);
  const [packageAlertToast, setPackageAlertToast] = useState<{
    id: string;
    message: string;
    type: 'signal' | 'received';
  } | null>(null);

  // Modals
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState<boolean>(false);
  const [isAudioModalOpen, setIsAudioModalOpen] = useState<boolean>(false);
  const [isManualRegModalOpen, setIsManualRegModalOpen] = useState<boolean>(false);
  const [isShareMobileModalOpen, setIsShareMobileModalOpen] = useState<boolean>(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState<boolean>(false);
  const [isCepModalOpen, setIsCepModalOpen] = useState<boolean>(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState<boolean>(false);
  const [chatTargetDock, setChatTargetDock] = useState<Dock | undefined>(undefined);
  const [isPackageModalOpen, setIsPackageModalOpen] = useState<boolean>(false);
  const [packageTargetDock, setPackageTargetDock] = useState<Dock | undefined>(undefined);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  // Active Authorized Operator Session (stored in session/localStorage)
  const [activeSession, setActiveSession] = useState<AuthorizedUser | null>(() =>
    adminService.getCurrentSession()
  );

  // Sync ref to avoid stale closure in interval
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const driversRef = useRef<DriverEntry[]>(drivers);
  const docksRef = useRef<Dock[]>(docks);
  const configRef = useRef<WorkspaceConfig>(config);
  const tokenRef = useRef<string | null>(token);

  useEffect(() => {
    driversRef.current = drivers;
    setStoredDrivers(drivers);
  }, [drivers]);

  useEffect(() => {
    docksRef.current = docks;
    setStoredDocks(docks);
  }, [docks]);

  useEffect(() => {
    configRef.current = config;
    setStoredConfig(config);
  }, [config]);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_TRANSFERS_KEY, JSON.stringify(packageTransfers));
    } catch {}
  }, [packageTransfers]);

  // 1. Initialize Firebase Auth
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        if (accessToken) {
          setToken(accessToken);
        }
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // 2. Realtime Synchronization Bus (BroadcastChannel + Storage)
  useEffect(() => {
    const unsubscribe = realtimeSync.subscribe((msg: SyncMessage) => {
      switch (msg.type) {
        case 'DRIVER_CALLED':
          if (msg.payload) {
            const alertData: CallAlertEvent = msg.payload;
            setActiveCallAlert(alertData);
          }
          break;
        case 'DOCK_UPDATED':
          if (msg.payload) {
            setDocks(msg.payload);
          }
          break;
        case 'QUEUE_UPDATED':
          if (msg.payload) {
            setDrivers(msg.payload);
          }
          break;
        case 'DRIVERS_RELOAD_REQUEST':
          triggerSync();
          break;
        case 'PACKAGE_TRANSFER_SIGNALED':
          if (msg.payload) {
            const newTransfer: PackageTransfer = msg.payload;
            setPackageTransfers((prev) => {
              if (prev.some((t) => t.id === newTransfer.id)) return prev;
              return [newTransfer, ...prev];
            });

            audioService.playDockAlert(
              newTransfer.origemColaboradorNome,
              newTransfer.destinoDocaNome || 'Docas',
              `Pacote ${newTransfer.codigoPacote} Sinalizado para Remanejamento`
            );

            setPackageAlertToast({
              id: `toast-${Date.now()}`,
              message: `⚠️ Novo pacote ${newTransfer.codigoPacote} sinalizado da ${newTransfer.origemDocaNome} para Rota ${newTransfer.rotaDestino}!`,
              type: 'signal',
            });
            setTimeout(() => setPackageAlertToast(null), 7000);
          }
          break;
        case 'PACKAGE_TRANSFER_RECEIVED':
          if (msg.payload) {
            const updatedTransfer: PackageTransfer = msg.payload;
            setPackageTransfers((prev) =>
              prev.map((t) => (t.id === updatedTransfer.id ? updatedTransfer : t))
            );

            audioService.playChime();
            setPackageAlertToast({
              id: `toast-${Date.now()}`,
              message: `✅ O colaborador ${updatedTransfer.recebidoPorNome} confirmou o recebimento do pacote ${updatedTransfer.codigoPacote} na ${updatedTransfer.destinoDocaNome || 'doca'}!`,
              type: 'received',
            });
            setTimeout(() => setPackageAlertToast(null), 7000);
          }
          break;
        case 'PERMISSIONS_UPDATED':
          if (msg.payload) {
            setCollaboratorPermissions(msg.payload);
          }
          break;
      }
    });

    return () => unsubscribe();
  }, []);

  // 3. Realtime Google Sheets Polling Loop
  const triggerSync = useCallback(async () => {
    const currentToken = tokenRef.current;
    const currentConfig = configRef.current;

    if (!currentToken || !currentConfig.spreadsheetId) {
      return;
    }

    try {
      setIsSyncing(true);
      const result = await GoogleSheetsService.fetchDriversFromSheet(
        currentToken,
        currentConfig.spreadsheetId,
        currentConfig.sheetName
      );

      setHeaderColumns(result.headerColumns);

      if (result.drivers && result.drivers.length > 0) {
        setDrivers((prevDrivers) => {
          const updated = [...result.drivers];
          // Check if any driver became 'chamado' from external sheet edit
          result.drivers.forEach((fetched) => {
            const old = prevDrivers.find((p) => p.id === fetched.id || (p.rowIndex && p.rowIndex === fetched.rowIndex));
            if (fetched.status === 'chamado' && old && old.status !== 'chamado' && fetched.docaDesignada) {
              const alert: CallAlertEvent = {
                id: `alert-${Date.now()}`,
                motoristaNome: fetched.nome,
                placa: fetched.placa,
                docaNome: fetched.docaDesignada,
                rota: fetched.rota,
                timestamp: Date.now(),
                chamadaId: fetched.id,
              };
              setActiveCallAlert(alert);
              audioService.playDockAlert(fetched.nome, fetched.docaDesignada, fetched.rota);
              realtimeSync.broadcastCall(alert);
            }
          });

          // Sync with docks
          syncDocksWithDrivers(result.drivers, docksRef.current);
          return updated;
        });
      }
    } catch (err: any) {
      console.warn('Sync notice:', err?.message || err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Helper to sync dock status based on drivers in list
  const syncDocksWithDrivers = (driverList: DriverEntry[], currentDocks: Dock[]) => {
    const updatedDocks = currentDocks.map((dock) => {
      // If dock is paused or in maintenance, preserve that state
      if (dock.status === 'manutencao' || dock.status === 'pausada') {
        return dock;
      }

      const activeDriver = driverList.find(
        (d) =>
          d.docaDesignada?.toLowerCase() === dock.nome.toLowerCase() &&
          (d.status === 'chamado' || d.status === 'carregando')
      );

      if (activeDriver) {
        return {
          ...dock,
          status: activeDriver.status as any,
          motoristaAtual: activeDriver,
        };
      } else {
        return {
          ...dock,
          status: 'livre' as const,
          motoristaAtual: undefined,
        };
      }
    });

    setDocks(updatedDocks);
  };

  // Schedule auto sync interval
  useEffect(() => {
    if (syncTimeoutRef.current) clearInterval(syncTimeoutRef.current);

    const intervalSeconds = Math.max(3, config.autoSyncInterval || 5);
    syncTimeoutRef.current = setInterval(() => {
      if (tokenRef.current && configRef.current.spreadsheetId) {
        triggerSync();
      }
    }, intervalSeconds * 1000);

    return () => {
      if (syncTimeoutRef.current) clearInterval(syncTimeoutRef.current);
    };
  }, [config.autoSyncInterval, triggerSync]);

  // Auth actions
  const handleSignIn = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        triggerSync();
      }
    } catch (err: any) {
      console.error('Google Sign In failed:', err);
    }
  };

  const handleSignOut = async () => {
    await logout();
    setUser(null);
    setToken(null);
  };

  const handleLogoutSession = async () => {
    setActiveSession(null);
    adminService.logoutSession();
    await handleSignOut();
    handleViewChange('driver-mobile');
  };

  const isDashboardAuthorized =
    (activeSession && activeSession.status === 'ativo') ||
    adminService.isAdmin(user?.email);

  const isAdmin =
    activeSession?.role === 'admin_geral' ||
    adminService.isAdmin(user?.email);

  // OPERATIONAL ACTION 1: CALL DRIVER TO DOCK
  const handleCallDriverToDock = async (driver: DriverEntry, targetDock: Dock) => {
    setIsLoadingAction(true);
    try {
      const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      // 1. Update Driver State
      const updatedDriver: DriverEntry = {
        ...driver,
        status: 'chamado',
        docaDesignada: targetDock.nome,
        horarioChamada: nowTime,
        colaboradorResponsavel: targetDock.colaboradorNome || activeSession?.name,
        colaboradorId: targetDock.colaboradorId || activeSession?.id,
      };

      const updatedDrivers = drivers.map((d) => (d.id === driver.id ? updatedDriver : d));
      setDrivers(updatedDrivers);

      // 2. Update Dock State
      const updatedDocks = docks.map((d) =>
        d.id === targetDock.id
          ? {
              ...d,
              status: 'chamando' as const,
              motoristaAtual: updatedDriver,
              chamadoEm: nowTime,
              colaboradorId: targetDock.colaboradorId || activeSession?.id,
              colaboradorNome: targetDock.colaboradorNome || activeSession?.name,
            }
          : d
      );
      setDocks(updatedDocks);

      // 3. Audio & Speech Synthesizer Alert
      const alertEvent: CallAlertEvent = {
        id: `call-${Date.now()}`,
        motoristaNome: driver.nome,
        placa: driver.placa,
        docaNome: targetDock.nome,
        rota: driver.rota,
        timestamp: Date.now(),
        chamadaId: driver.id,
      };
      setActiveCallAlert(alertEvent);

      audioService.playDockAlert(driver.nome, targetDock.nome, driver.rota);

      // 4. Realtime Broadcast to Driver TV Telão and other tabs
      realtimeSync.broadcastCall(alertEvent);
      realtimeSync.broadcastDockUpdate(updatedDocks);
      realtimeSync.broadcastQueueUpdate(updatedDrivers);

      // 5. Update Google Sheets row if connected
      if (token && config.spreadsheetId && driver.rowIndex) {
        await GoogleSheetsService.updateDriverRow(
          token,
          config.spreadsheetId,
          config.sheetName,
          driver.rowIndex,
          updatedDriver,
          headerColumns
        );
      }
    } catch (err: any) {
      console.error('Error calling driver:', err);
    } finally {
      setIsLoadingAction(false);
    }
  };

  // OPERATIONAL ACTION 2: START LOADING
  const handleStartLoading = async (dock: Dock) => {
    if (!dock.motoristaAtual) return;
    setIsLoadingAction(true);
    try {
      const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      const updatedDriver: DriverEntry = {
        ...dock.motoristaAtual,
        status: 'carregando',
        inicioCarregamento: nowTime,
        colaboradorResponsavel: dock.colaboradorNome || activeSession?.name,
      };

      const updatedDrivers = drivers.map((d) => (d.id === updatedDriver.id ? updatedDriver : d));
      setDrivers(updatedDrivers);

      const updatedDocks = docks.map((d) =>
        d.id === dock.id
          ? {
              ...d,
              status: 'carregando' as const,
              motoristaAtual: updatedDriver,
            }
          : d
      );
      setDocks(updatedDocks);

      realtimeSync.broadcastDockUpdate(updatedDocks);
      realtimeSync.broadcastQueueUpdate(updatedDrivers);

      if (token && config.spreadsheetId && updatedDriver.rowIndex) {
        await GoogleSheetsService.updateDriverRow(
          token,
          config.spreadsheetId,
          config.sheetName,
          updatedDriver.rowIndex,
          updatedDriver,
          headerColumns
        );
      }
    } catch (err) {
      console.error('Error starting loading:', err);
    } finally {
      setIsLoadingAction(false);
    }
  };

  // OPERATIONAL ACTION 3: FINISH LOADING & FREE DOCK (WITH QUANTITY & ISCA RECORDING)
  const handleFinishLoading = async (
    dock: Dock,
    details?: {
      quantidadeCarregada?: number;
      numeroIsca?: string;
      colaboradorResponsavel?: string;
    }
  ) => {
    if (!dock.motoristaAtual) return;
    setIsLoadingAction(true);
    try {
      const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      const finishedDriver: DriverEntry = {
        ...dock.motoristaAtual,
        status: 'concluido',
        fimCarregamento: nowTime,
        quantidadeCarregada: details?.quantidadeCarregada !== undefined ? details.quantidadeCarregada : dock.motoristaAtual.quantidadeCarregada,
        numeroIsca: details?.numeroIsca || dock.motoristaAtual.numeroIsca,
        colaboradorResponsavel: details?.colaboradorResponsavel || dock.colaboradorNome || activeSession?.name,
      };

      const updatedDrivers = drivers.map((d) => (d.id === finishedDriver.id ? finishedDriver : d));
      setDrivers(updatedDrivers);

      const updatedDocks = docks.map((d) =>
        d.id === dock.id
          ? {
              ...d,
              status: 'livre' as const,
              motoristaAtual: undefined,
              chamadoEm: undefined,
              quantidadeCarregada: undefined,
              numeroIsca: undefined,
            }
          : d
      );
      setDocks(updatedDocks);

      realtimeSync.broadcastDockUpdate(updatedDocks);
      realtimeSync.broadcastQueueUpdate(updatedDrivers);

      if (token && config.spreadsheetId && finishedDriver.rowIndex) {
        await GoogleSheetsService.updateDriverRow(
          token,
          config.spreadsheetId,
          config.sheetName,
          finishedDriver.rowIndex,
          finishedDriver,
          headerColumns
        );
      }
    } catch (err) {
      console.error('Error finishing loading:', err);
    } finally {
      setIsLoadingAction(false);
    }
  };

  // OPERATIONAL ACTION 4: RE-CALL DRIVER (REPETIR ALERTA)
  const handleReCallDriver = (dock: Dock) => {
    if (!dock.motoristaAtual) return;

    const alertEvent: CallAlertEvent = {
      id: `recall-${Date.now()}`,
      motoristaNome: dock.motoristaAtual.nome,
      placa: dock.motoristaAtual.placa,
      docaNome: dock.nome,
      rota: dock.motoristaAtual.rota,
      timestamp: Date.now(),
      chamadaId: dock.motoristaAtual.id,
    };

    setActiveCallAlert(alertEvent);
    audioService.playDockAlert(dock.motoristaAtual.nome, dock.nome, dock.motoristaAtual.rota);
    realtimeSync.broadcastCall(alertEvent);
  };

  // OPERATIONAL ACTION 5: CLEAR / CANCEL DOCK ALLOCATION
  const handleClearDock = async (dock: Dock) => {
    setIsLoadingAction(true);
    try {
      const targetDriver = dock.motoristaAtual;
      let updatedDrivers = drivers;

      if (targetDriver) {
        const releasedDriver: DriverEntry = {
          ...targetDriver,
          status: 'aguardando',
          docaDesignada: undefined,
          horarioChamada: undefined,
        };
        updatedDrivers = drivers.map((d) => (d.id === targetDriver.id ? releasedDriver : d));
        setDrivers(updatedDrivers);

        if (token && config.spreadsheetId && releasedDriver.rowIndex) {
          await GoogleSheetsService.updateDriverRow(
            token,
            config.spreadsheetId,
            config.sheetName,
            releasedDriver.rowIndex,
            releasedDriver,
            headerColumns
          );
        }
      }

      const updatedDocks = docks.map((d) =>
        d.id === dock.id
          ? {
              ...d,
              status: 'livre' as const,
              motoristaAtual: undefined,
              chamadoEm: undefined,
            }
          : d
      );
      setDocks(updatedDocks);

      realtimeSync.broadcastDockUpdate(updatedDocks);
      realtimeSync.broadcastQueueUpdate(updatedDrivers);
    } catch (err) {
      console.error('Error clearing dock:', err);
    } finally {
      setIsLoadingAction(false);
    }
  };

  // OPERATIONAL ACTION 6: TOGGLE MAINTENANCE
  const handleToggleMaintenance = (dock: Dock) => {
    const newStatus = dock.status === 'manutencao' ? 'livre' : 'manutencao';
    const updatedDocks = docks.map((d) =>
      d.id === dock.id
        ? {
            ...d,
            status: newStatus as any,
            motoristaAtual: undefined,
          }
        : d
    );
    setDocks(updatedDocks);
    realtimeSync.broadcastDockUpdate(updatedDocks);
  };

  // OPERATIONAL ACTION 7: TOGGLE PAUSE
  const handleTogglePause = (dock: Dock, motivo?: string) => {
    const isPaused = dock.status === 'pausada';
    const updatedDocks = docks.map((d) => {
      if (d.id === dock.id) {
        if (isPaused) {
          return {
            ...d,
            status: (d.motoristaAtual ? 'carregando' : 'livre') as any,
            pausadaEm: undefined,
            pausaMotivo: undefined,
          };
        } else {
          return {
            ...d,
            status: 'pausada' as const,
            pausadaEm: Date.now(),
            pausaMotivo: motivo || 'Intervalo',
          };
        }
      }
      return d;
    });

    setDocks(updatedDocks);
    realtimeSync.broadcastDockUpdate(updatedDocks);
  };

  // OPERATIONAL ACTION 8: RENAME DOCK (ADMINISTRADOR)
  const handleRenameDock = (dockId: string, newName: string) => {
    const updatedDocks = docks.map((d) =>
      d.id === dockId ? { ...d, nome: newName } : d
    );
    setDocks(updatedDocks);
    realtimeSync.broadcastDockUpdate(updatedDocks);
  };

  // OPERATIONAL ACTION 9: COLLABORATOR ASSUMING / SWITCHING DOCK
  const handleAssumeDock = (dock: Dock) => {
    if (!activeSession) return;

    // Update session
    const updatedSession: AuthorizedUser = {
      ...activeSession,
      assignedDockId: dock.id,
      assignedDockNome: dock.nome,
    };
    setActiveSession(updatedSession);
    adminService.assignUserToDock(activeSession.id, dock.id, dock.nome);

    // Update dock
    const updatedDocks = docks.map((d) => {
      if (d.id === dock.id) {
        return {
          ...d,
          colaboradorId: activeSession.id,
          colaboradorNome: activeSession.name,
        };
      }
      // If was previous dock, free up collaborator
      if (d.colaboradorId === activeSession.id) {
        return {
          ...d,
          colaboradorId: undefined,
          colaboradorNome: undefined,
        };
      }
      return d;
    });

    setDocks(updatedDocks);
    realtimeSync.broadcastDockUpdate(updatedDocks);
  };

  // OPERATIONAL ACTION 10: UPDATE DRIVER STATUS FROM QUEUE TABLE
  const handleUpdateDriverStatus = async (
    driver: DriverEntry,
    newStatus: DriverStatus,
    dockName?: string
  ) => {
    setIsLoadingAction(true);
    try {
      const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      const updatedDriver: DriverEntry = {
        ...driver,
        status: newStatus,
        docaDesignada: dockName || driver.docaDesignada,
        inicioCarregamento: newStatus === 'carregando' ? nowTime : driver.inicioCarregamento,
        fimCarregamento: newStatus === 'concluido' ? nowTime : driver.fimCarregamento,
        colaboradorResponsavel: activeSession?.name || driver.colaboradorResponsavel,
      };

      const updatedDrivers = drivers.map((d) => (d.id === driver.id ? updatedDriver : d));
      setDrivers(updatedDrivers);

      // If finished or cancelled, free any associated dock
      if (newStatus === 'concluido' || newStatus === 'cancelado') {
        const updatedDocks = docks.map((d) =>
          d.motoristaAtual?.id === driver.id
            ? { ...d, status: 'livre' as const, motoristaAtual: undefined }
            : d
        );
        setDocks(updatedDocks);
        realtimeSync.broadcastDockUpdate(updatedDocks);
      }

      realtimeSync.broadcastQueueUpdate(updatedDrivers);

      if (token && config.spreadsheetId && updatedDriver.rowIndex) {
        await GoogleSheetsService.updateDriverRow(
          token,
          config.spreadsheetId,
          config.sheetName,
          updatedDriver.rowIndex,
          updatedDriver,
          headerColumns
        );
      }
    } catch (err) {
      console.error('Error updating driver status:', err);
    } finally {
      setIsLoadingAction(false);
    }
  };

  // OPERATIONAL ACTION 11: ADD / REMOVE DOCKS
  const handleAddDock = () => {
    const nextNumber = docks.length + 1;
    const numStr = nextNumber < 10 ? `0${nextNumber}` : `${nextNumber}`;
    const newDock: Dock = {
      id: `dock-${Date.now()}`,
      numero: numStr,
      nome: `Doca ${numStr}`,
      status: 'livre',
    };
    const updatedDocks = [...docks, newDock];
    setDocks(updatedDocks);
    realtimeSync.broadcastDockUpdate(updatedDocks);
  };

  const handleRemoveDock = (dockId: string) => {
    const target = docks.find((d) => d.id === dockId);
    if (!target) return;
    if (target.status === 'chamando' || target.status === 'carregando') {
      alert('Não é possível remover uma doca ocupada ou chamando. Finalize a operação antes de remover.');
      return;
    }
    const updatedDocks = docks.filter((d) => d.id !== dockId);
    setDocks(updatedDocks);
    realtimeSync.broadcastDockUpdate(updatedDocks);
  };

  // OPERATIONAL ACTION 12: REGISTER NEW ARRIVAL
  const handleRegisterDriver = async (data: {
    nome: string;
    rota: string;
    cidade?: string;
    rotaPrioridade?: boolean;
    horarioChegada: string;
    localizacao: string;
    latitude?: number;
    longitude?: number;
    mapsUrl?: string;
    placa: string;
    telefone: string;
  }) => {
    const newDriver: DriverEntry = {
      id: `drv-${Date.now()}`,
      rowIndex: drivers.length + 2,
      timestamp: new Date().toISOString(),
      nome: data.nome,
      rota: data.rota,
      cidade: data.cidade,
      rotaPrioridade: data.rotaPrioridade || false,
      horarioChegada: data.horarioChegada,
      localizacao: data.localizacao,
      latitude: data.latitude,
      longitude: data.longitude,
      mapsUrl: data.mapsUrl,
      placa: data.placa,
      telefone: data.telefone,
      status: 'aguardando',
    };

    const updatedDrivers = [...drivers, newDriver];
    setDrivers(updatedDrivers);
    realtimeSync.broadcastQueueUpdate(updatedDrivers);

    if (token && config.spreadsheetId) {
      try {
        await GoogleSheetsService.appendDriverCheckin(
          token,
          config.spreadsheetId,
          config.sheetName,
          newDriver
        );
      } catch (err) {
        console.warn('Could not append row directly to sheet:', err);
      }
    }
  };

  // OPERATIONAL ACTION 13: PACKAGE TRANSFER SIGNALLING
  const handleSignalPackageTransfer = (
    transferData: Omit<PackageTransfer, 'id' | 'timestamp' | 'status'>
  ) => {
    const newTransfer: PackageTransfer = {
      ...transferData,
      id: `pkg-${Date.now()}`,
      timestamp: Date.now(),
      status: 'pendente',
    };

    const updatedList = [newTransfer, ...packageTransfers];
    setPackageTransfers(updatedList);
    realtimeSync.broadcastPackageTransfer(newTransfer);

    audioService.playDockAlert(
      newTransfer.origemColaboradorNome,
      newTransfer.destinoDocaNome || 'Docas',
      `Pacote ${newTransfer.codigoPacote} Sinalizado para Remanejamento`
    );

    setPackageAlertToast({
      id: `toast-${Date.now()}`,
      message: `Pacote ${newTransfer.codigoPacote} sinalizado para transferência para Rota ${newTransfer.rotaDestino}!`,
      type: 'signal',
    });
    setTimeout(() => setPackageAlertToast(null), 6000);
  };

  // OPERATIONAL ACTION 14: PACKAGE TRANSFER RECEIPT CONFIRMATION
  const handleConfirmReceiptTransfer = (transferId: string) => {
    const target = packageTransfers.find((t) => t.id === transferId);
    if (!target) return;

    const updatedTransfer: PackageTransfer = {
      ...target,
      status: 'recebido',
      recebidoPorNome: activeSession?.name || 'Operador de Doca',
      recebidoEm: Date.now(),
    };

    const updatedList = packageTransfers.map((t) =>
      t.id === transferId ? updatedTransfer : t
    );
    setPackageTransfers(updatedList);
    realtimeSync.broadcastPackageReceived(updatedTransfer);

    audioService.playChime();
    setPackageAlertToast({
      id: `toast-${Date.now()}`,
      message: `✅ Recebimento do pacote ${updatedTransfer.codigoPacote} confirmado com sucesso!`,
      type: 'received',
    });
    setTimeout(() => setPackageAlertToast(null), 6000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Navbar (rendered on desktop and administrative/TV views) */}
      {currentView !== 'driver-mobile' && (
        <Navbar
          currentView={currentView}
          onViewChange={handleViewChange}
          user={user}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
          config={config}
          onOpenSettings={() => setIsWorkspaceModalOpen(true)}
          onOpenAudioSettings={() => setIsAudioModalOpen(true)}
          onOpenShareMobile={() => setIsShareMobileModalOpen(true)}
          onOpenAccessManagement={() => setIsAccessModalOpen(true)}
          onOpenCepSearch={() => setIsCepModalOpen(true)}
          onOpenChat={() => {
            setChatTargetDock(undefined);
            setIsChatModalOpen(true);
          }}
          onOpenPackageTransfer={() => {
            setPackageTargetDock(undefined);
            setIsPackageModalOpen(true);
          }}
          onSwitchDock={() => setIsAccessModalOpen(true)}
          onTriggerSync={triggerSync}
          isSyncing={isSyncing}
          activeSession={activeSession}
          onLogoutSession={handleLogoutSession}
          pendingTransfersCount={packageTransfers.filter((t) => t.status === 'pendente').length}
          permissions={collaboratorPermissions}
        />
      )}

      {/* Package Transfer Alert Toast Notification */}
      {packageAlertToast && (
        <div className="fixed top-20 right-4 z-50 max-w-sm p-4 rounded-2xl bg-slate-900 border border-amber-500/40 shadow-2xl animate-in slide-in-from-top-4 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div className="flex-1 text-xs text-white leading-relaxed">
            {packageAlertToast.message}
          </div>
          <button
            onClick={() => setPackageAlertToast(null)}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main View Display */}
      {currentView === 'dashboard' && (
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
          {!isDashboardAuthorized ? (
            <AdminAuthGate
              user={user}
              onSignIn={handleSignIn}
              onSignOut={handleSignOut}
              onNavigate={handleViewChange}
              docks={docks}
              onLoginSuccess={(authUser) => {
                setActiveSession(authUser);
                adminService.setCurrentSession(authUser);
                // Also set collaborator on the dock
                if (authUser.assignedDockId) {
                  const targetDock = docks.find((d) => d.id === authUser.assignedDockId);
                  if (targetDock) {
                    handleAssumeDock(targetDock);
                  }
                }
              }}
            />
          ) : (
            <DashboardView
              drivers={drivers}
              docks={docks}
              config={config}
              onCallDriverToDock={handleCallDriverToDock}
              onStartLoading={handleStartLoading}
              onFinishLoading={handleFinishLoading}
              onReCallDriver={handleReCallDriver}
              onToggleMaintenance={handleToggleMaintenance}
              onClearDock={handleClearDock}
              onUpdateDriverStatus={handleUpdateDriverStatus}
              onOpenWorkspaceSetup={() => setIsWorkspaceModalOpen(true)}
              onOpenManualRegistration={() => setIsManualRegModalOpen(true)}
              onOpenShareMobile={() => setIsShareMobileModalOpen(true)}
              onOpenAccessManagement={() => setIsAccessModalOpen(true)}
              onAddDock={handleAddDock}
              onRemoveDock={handleRemoveDock}
              onRenameDock={handleRenameDock}
              onTogglePause={handleTogglePause}
              onAssumeDock={handleAssumeDock}
              onOpenChat={(dock) => {
                setChatTargetDock(dock);
                setIsChatModalOpen(true);
              }}
              onOpenCepSearch={() => setIsCepModalOpen(true)}
              onOpenPackageTransfer={(dock) => {
                setPackageTargetDock(dock);
                setIsPackageModalOpen(true);
              }}
              currentUserEmail={user?.email}
              activeSession={activeSession}
              permissions={collaboratorPermissions}
              isLoadingAction={isLoadingAction}
            />
          )}
        </main>
      )}

      {currentView === 'driver-mobile' && (
        <DriverMobileView
          drivers={drivers}
          docks={docks}
          activeCallAlert={activeCallAlert}
          onGoToCheckin={() => handleViewChange('driver-checkin')}
          onGoToDashboard={() => {
            if (isDashboardAuthorized) {
              handleViewChange('dashboard');
            } else {
              setIsLoginModalOpen(true);
            }
          }}
          onOpenLogin={() => setIsLoginModalOpen(true)}
          activeSession={activeSession}
          formUrl={config.formResponderUrl || config.formUrl}
          isSyncing={isSyncing}
          onTriggerSync={triggerSync}
        />
      )}

      {currentView === 'driver-tv' && (
        <DriverTVView
          drivers={drivers}
          docks={docks}
          activeCallAlert={activeCallAlert}
          formUrl={config.formResponderUrl || config.formUrl}
          onOpenCheckin={() => handleViewChange('driver-checkin')}
        />
      )}

      {currentView === 'driver-checkin' && (
        <DriverCheckinView
          onRegisterDriver={handleRegisterDriver}
          onGoToTV={() => handleViewChange('driver-tv')}
          onGoToMobile={() => handleViewChange('driver-mobile')}
          formUrl={config.formResponderUrl || config.formUrl}
        />
      )}

      {/* Workspace Setup Modal (Google Sheets + Google Forms) */}
      <WorkspaceSetupModal
        isOpen={isWorkspaceModalOpen}
        config={config}
        accessToken={token}
        onClose={() => setIsWorkspaceModalOpen(false)}
        onSaveConfig={(newConfig) => {
          setConfig(newConfig);
          setStoredConfig(newConfig);
        }}
        onTriggerSync={triggerSync}
      />

      {/* Audio Settings Modal */}
      <AudioSettingsModal
        isOpen={isAudioModalOpen}
        onClose={() => setIsAudioModalOpen(false)}
      />

      {/* Manual Driver Arrival Registration Modal */}
      <ManualRegistrationModal
        isOpen={isManualRegModalOpen}
        onClose={() => setIsManualRegModalOpen(false)}
        onSubmit={handleRegisterDriver}
        isLoading={isLoadingAction}
      />

      {/* Share Driver Mobile Link Modal */}
      <ShareDriverLinkModal
        isOpen={isShareMobileModalOpen}
        onClose={() => setIsShareMobileModalOpen(false)}
        onOpenMobileView={() => handleViewChange('driver-mobile')}
        onOpenTVView={() => handleViewChange('driver-tv')}
        onOpenCheckinView={() => handleViewChange('driver-checkin')}
      />

      {/* Access Control & Password Management Modal (Admin Google only) */}
      <AccessManagementModal
        isOpen={isAccessModalOpen}
        onClose={() => setIsAccessModalOpen(false)}
        config={config}
        accessToken={token}
        currentUserEmail={user?.email}
        docks={docks}
        onUsersUpdated={() => {
          setActiveSession(adminService.getCurrentSession());
        }}
        onPermissionsUpdated={(newPerms) => {
          setCollaboratorPermissions(newPerms);
        }}
      />

      {/* ViaCEP Search Modal */}
      <CepSearchModal
        isOpen={isCepModalOpen}
        onClose={() => setIsCepModalOpen(false)}
      />

      {/* Docks & Admins Realtime Chat Modal */}
      <DockChatModal
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        currentUser={activeSession}
        docks={docks}
        currentDock={chatTargetDock}
        isAdmin={isAdmin}
      />

      {/* Package Transfer Modal with Advance Signalling & Handover Alert */}
      <PackageTransferModal
        isOpen={isPackageModalOpen}
        onClose={() => setIsPackageModalOpen(false)}
        transfers={packageTransfers}
        onSignalTransfer={handleSignalPackageTransfer}
        onConfirmReceipt={handleConfirmReceiptTransfer}
        docks={docks}
        currentDock={packageTargetDock}
        currentUser={activeSession}
        isAdmin={isAdmin}
      />

      {/* Login Modal for Pre-Registered Collaborators & Google Admins */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <AdminAuthGate
              user={user}
              onSignIn={handleSignIn}
              onSignOut={handleSignOut}
              onNavigate={(view) => {
                setIsLoginModalOpen(false);
                handleViewChange(view);
              }}
              docks={docks}
              onClose={() => setIsLoginModalOpen(false)}
              onLoginSuccess={(authUser) => {
                setActiveSession(authUser);
                adminService.setCurrentSession(authUser);
                if (authUser.assignedDockId) {
                  const targetDock = docks.find((d) => d.id === authUser.assignedDockId);
                  if (targetDock) {
                    handleAssumeDock(targetDock);
                  }
                }
                setIsLoginModalOpen(false);
                handleViewChange('dashboard');
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

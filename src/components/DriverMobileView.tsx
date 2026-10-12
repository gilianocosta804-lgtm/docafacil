import React, { useState, useEffect } from 'react';
import {
  Car,
  Clock,
  MapPin,
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Share2,
  User,
  Radio,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Check,
  Zap,
  ArrowRight,
  Warehouse,
  ListOrdered,
  Navigation,
  Sparkles,
  LayoutDashboard,
  Lock,
  UserCheck,
  FileText,
  ClipboardList,
  Send,
  Compass,
  Phone,
  QrCode,
  Copy
} from 'lucide-react';
import { DriverEntry, Dock, CallAlertEvent, AuthorizedUser } from '../types';
import { audioService } from '../services/audioService';
import { realtimeSync, SyncMessage } from '../services/realtimeSync';
import { notificationService, NotificationPermissionState } from '../services/notificationService';

interface DriverMobileViewProps {
  drivers: DriverEntry[];
  docks: Dock[];
  activeCallAlert: CallAlertEvent | null;
  onGoToCheckin: () => void;
  onGoToDashboard?: () => void;
  onOpenLogin?: () => void;
  activeSession?: AuthorizedUser | null;
  formUrl?: string;
  isSyncing?: boolean;
  onTriggerSync?: () => void;
  onRegisterDriver?: (driver: {
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
  }) => Promise<void> | void;
}

export const DriverMobileView: React.FC<DriverMobileViewProps> = ({
  drivers,
  docks,
  activeCallAlert,
  onGoToCheckin,
  onGoToDashboard,
  onOpenLogin,
  activeSession,
  formUrl,
  isSyncing = false,
  onTriggerSync,
  onRegisterDriver,
}) => {
  // Saved driver identification
  const [selectedDriverId, setSelectedDriverId] = useState<string>(() => {
    return localStorage.getItem('docafacil_my_driver_id') || '';
  });
  const [searchPlaca, setSearchPlaca] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(audioService.getSoundEnabled());
  const [acknowledgedCall, setAcknowledgedCall] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isAlertActive, setIsAlertActive] = useState<boolean>(false);
  const [notificationState, setNotificationState] = useState<NotificationPermissionState>(() =>
    notificationService.getPermission()
  );
  const notifiedCallIdsRef = React.useRef<Set<string>>(new Set());

  const [activeTab, setActiveTab] = useState<'meu-carro' | 'fila' | 'docas' | 'forms'>('meu-carro');

  // Forms and Check-in state
  const [formNome, setFormNome] = useState('');
  const [formPlaca, setFormPlaca] = useState('');
  const [formRota, setFormRota] = useState('');
  const [formTelefone, setFormTelefone] = useState('');
  const [formCidade, setFormCidade] = useState('Gama / Entorno DF');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formSuccessNotice, setFormSuccessNotice] = useState<string | null>(null);
  const [showQrForms, setShowQrForms] = useState(false);
  const [copiedFormLink, setCopiedFormLink] = useState(false);

  // GPS validation for Condomínio SYS do Gama, Ponte Alta
  const BASE_LAT = -16.0492;
  const BASE_LNG = -48.0483;
  const BASE_NAME = 'Condomínio SYS do Gama, Ponte Alta (Gama - DF)';
  const MAX_RADIUS_METERS = 150;
  const [driverLat, setDriverLat] = useState<number | null>(null);
  const [driverLng, setDriverLng] = useState<number | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [isWithinGeofence, setIsWithinGeofence] = useState<boolean>(true);
  const [isGpsLoading, setIsGpsLoading] = useState<boolean>(false);
  const [simulationMode, setSimulationMode] = useState<boolean>(false);

  // Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  const detectGps = () => {
    if (!navigator.geolocation) return;
    setIsGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setDriverLat(latitude);
        setDriverLng(longitude);
        const dist = calculateDistance(latitude, longitude, BASE_LAT, BASE_LNG);
        setDistanceMeters(dist);
        setIsWithinGeofence(dist <= MAX_RADIUS_METERS);
        setIsGpsLoading(false);
      },
      () => {
        setIsGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  useEffect(() => {
    if (activeTab === 'forms') {
      detectGps();
    }
  }, [activeTab]);

  const handleSubmitCheckinFromTab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim() || !formPlaca.trim() || !formRota.trim()) return;

    setFormSubmitting(true);
    const cleanPlaca = formPlaca.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const local = 'Pátio Condomínio SYS Gama (Ponte Alta)';

    try {
      if (onRegisterDriver) {
        await onRegisterDriver({
          nome: formNome.trim(),
          placa: cleanPlaca,
          rota: formRota.trim().toUpperCase(),
          cidade: formCidade.trim(),
          telefone: formTelefone.trim(),
          horarioChegada: nowTime,
          localizacao: local,
          latitude: driverLat || BASE_LAT,
          longitude: driverLng || BASE_LNG,
          mapsUrl: `https://www.google.com/maps?q=${driverLat || BASE_LAT},${driverLng || BASE_LNG}`,
        });
      }

      setFormSuccessNotice(`Check-in de ${cleanPlaca} realizado com sucesso! Você entrou na fila.`);
      setFormNome('');
      setFormPlaca('');
      setFormRota('');
      setFormTelefone('');

      setTimeout(() => {
        const matching = drivers.find((d) => d.placa.toUpperCase() === cleanPlaca);
        if (matching) {
          handleSelectDriver(matching.id);
        }
        setActiveTab('meu-carro');
      }, 600);
    } catch (err: any) {
      console.error('Error submitting checkin from tab:', err);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);



  const handleRequestNotification = async () => {
    const granted = await notificationService.requestPermission();
    setNotificationState(notificationService.getPermission());
    if (granted) {
      notificationService.sendTestNotification();
    }
  };

  // Sync driver selection with localStorage
  const handleSelectDriver = (id: string) => {
    setSelectedDriverId(id);
    localStorage.setItem('docafacil_my_driver_id', id);
    setAcknowledgedCall(false);
  };

  const handleClearSelection = () => {
    setSelectedDriverId('');
    localStorage.removeItem('docafacil_my_driver_id');
    setAcknowledgedCall(false);
  };

  // Find the identified driver in current driver list
  const currentDriver = drivers.find((d) => d.id === selectedDriverId);

  // Calculate waiting list, prioritizing rotaPrioridade
  const waitingDrivers = [...drivers]
    .filter((d) => d.status === 'aguardando')
    .sort((a, b) => {
      if (a.rotaPrioridade && !b.rotaPrioridade) return -1;
      if (!a.rotaPrioridade && b.rotaPrioridade) return 1;
      return (a.rowIndex || 0) - (b.rowIndex || 0);
    });
  const calledDrivers = drivers.filter((d) => d.status === 'chamado');
  const freeDocks = docks.filter((d) => d.status === 'livre');

  // Next driver to be called (the first one waiting)
  const nextDriverInLine = waitingDrivers[0] || null;

  // Position of current driver in waiting line
  const myQueuePosition = currentDriver && currentDriver.status === 'aguardando'
    ? waitingDrivers.findIndex((d) => d.id === currentDriver.id) + 1
    : null;

  const isMyTurn = myQueuePosition === 1;
  const wasCalled = currentDriver && currentDriver.status === 'chamado';

  // When called, immediately switch tab to meu-carro to show big alert
  useEffect(() => {
    if (wasCalled || isAlertActive) {
      setActiveTab('meu-carro');
    }
  }, [wasCalled, isAlertActive]);

  // Listen to realtime broadcast call events
  useEffect(() => {
    const unsubscribe = realtimeSync.subscribe((msg: SyncMessage) => {
      if (msg.type === 'DRIVER_CALLED' && msg.payload) {
        const alert: CallAlertEvent = msg.payload;

        // If the call is for THIS driver, trigger persistent mobile vibration + sound + browser notification
        if (
          currentDriver &&
          (alert.chamadaId === currentDriver.id || alert.placa.toUpperCase() === currentDriver.placa.toUpperCase())
        ) {
          setIsAlertActive(true);
          setAcknowledgedCall(false);

          // 1. Browser Notification (works even if screen locked or in background/another app)
          if (!notifiedCallIdsRef.current.has(alert.id)) {
            notifiedCallIdsRef.current.add(alert.id);
            notificationService.sendCallNotification(
              alert.motoristaNome,
              alert.docaNome,
              alert.placa,
              alert.rota
            );
          }

          // 2. Vibrate mobile phone if supported
          if ('vibrate' in navigator) {
            try {
              navigator.vibrate([300, 150, 300, 150, 600]);
            } catch (e) {
              // Ignore vibration failure
            }
          }

          // 3. Audio alert
          audioService.playDockAlert(alert.motoristaNome, alert.docaNome, alert.rota);
        }
      }
    });

    return () => unsubscribe();
  }, [currentDriver]);

  // When driver status changes to chamado, trigger alert and notification
  useEffect(() => {
    if (wasCalled && !acknowledgedCall && currentDriver) {
      setIsAlertActive(true);

      const callKey = `${currentDriver.id}-${currentDriver.docaDesignada}-${currentDriver.horarioChamada}`;
      if (!notifiedCallIdsRef.current.has(callKey)) {
        notifiedCallIdsRef.current.add(callKey);
        // Dispatch Web Notification even when tab is in background!
        notificationService.sendCallNotification(
          currentDriver.nome,
          currentDriver.docaDesignada || 'Doca Designada',
          currentDriver.placa,
          currentDriver.rota
        );
      }

      if ('vibrate' in navigator) {
        try {
          navigator.vibrate([300, 150, 300, 150, 600]);
        } catch (e) {}
      }
    } else {
      setIsAlertActive(false);
    }
  }, [wasCalled, acknowledgedCall, currentDriver]);

  const toggleSound = () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    audioService.setSoundEnabled(nextVal);
    if (nextVal) {
      audioService.playChime();
    }
  };

  const shareMobileLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?view=motorista`;
    if (navigator.share) {
      navigator
        .share({
          title: 'Painel do Motorista - Chamada de Docas',
          text: 'Acompanhe a chamada de motoristas e docas em tempo real no seu celular:',
          url,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-28 selection:bg-amber-500 selection:text-slate-950">
      {/* Mobile Sticky App Bar */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-3.5 py-2.5 shadow-md">
        <div className="max-w-md mx-auto w-full flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/20 shrink-0">
              <Car className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-xs text-white leading-none">Chamada de Carros</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0 leading-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  AO VIVO
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-1 leading-none">
                {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Audio Toggle */}
            <button
              onClick={toggleSound}
              className={`p-2 rounded-xl border text-xs transition cursor-pointer ${
                soundEnabled
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
              title={soundEnabled ? 'Sons ativados' : 'Sons desativados'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Sync trigger */}
            {onTriggerSync && (
              <button
                onClick={onTriggerSync}
                disabled={isSyncing}
                className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 active:bg-slate-700 transition"
                title="Atualizar dados"
              >
                <RefreshCw className={`w-4 h-4 text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
            )}

            {/* Share Link */}
            <button
              onClick={shareMobileLink}
              className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 active:bg-slate-700 transition"
              title="Compartilhar Link"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>

            {/* Access to Operator Panel / Login for pre-registered collaborators */}
            {activeSession ? (
              <button
                onClick={onGoToDashboard}
                className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm shadow-amber-500/20"
                title={`Logado como ${activeSession.name} (${activeSession.assignedDockNome || 'Mesa Operacional'})`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span className="hidden sm:inline font-mono">{activeSession.assignedDockNome || 'Mesa'}</span>
              </button>
            ) : (
              <button
                onClick={onOpenLogin || onGoToDashboard}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-400 hover:text-amber-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                title="Área do Colaborador / Administrador"
              >
                <Lock className="w-3.5 h-3.5" />
                <span className="text-[11px] font-mono">Entrar</span>
              </button>
            )}
          </div>
        </div>

        {/* Top Segmented Tab Switcher */}
        <div className="max-w-md mx-auto w-full mt-2.5 grid grid-cols-4 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800/80">
          <button
            onClick={() => setActiveTab('meu-carro')}
            className={`py-2 px-1 rounded-lg text-[10px] sm:text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer relative whitespace-nowrap leading-snug ${
              activeTab === 'meu-carro'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Car className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Status</span>
            {wasCalled && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping absolute top-1 right-1" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('fila')}
            className={`py-2 px-1 rounded-lg text-[10px] sm:text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap leading-snug ${
              activeTab === 'fila'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Fila ({waitingDrivers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('docas')}
            className={`py-2 px-1 rounded-lg text-[10px] sm:text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap leading-snug ${
              activeTab === 'docas'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Warehouse className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Docas ({freeDocks.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('forms')}
            className={`py-2 px-1 rounded-lg text-[10px] sm:text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap leading-snug ${
              activeTab === 'forms'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Forms</span>
          </button>
        </div>
      </header>

      {/* Main Content - Viewport Fitted Max-w-md */}
      <main className="flex-1 p-3.5 max-w-md mx-auto w-full space-y-3.5">
        {/* BROWSER NOTIFICATION BANNER */}
        {notificationState === 'default' && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-slate-900 to-slate-900 border border-amber-500/40 shadow-md flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0 animate-bounce">
                <Bell className="w-3.5 h-3.5 fill-current" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white leading-snug">Alertas em 2º Plano</p>
                <p className="text-[11px] text-slate-300 leading-normal truncate mt-0.5">Receba avisos sonoros com tela bloqueada</p>
              </div>
            </div>
            <button
              onClick={handleRequestNotification}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0 cursor-pointer shadow-sm leading-none"
            >
              Ativar
            </button>
          </div>
        )}

        {/* FORMS QUICK ACCESS BANNER FOR DRIVERS */}
        {activeTab !== 'forms' && (
          <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-slate-900 to-slate-900 border border-emerald-500/30 flex items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-md">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white">Formulário de Chegada (Forms)</p>
                <p className="text-[10px] text-slate-300 truncate">Check-in GPS (150m da base) & Google Forms</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('forms')}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shrink-0 transition cursor-pointer flex items-center gap-1 shadow-sm"
            >
              <span>Acessar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* TAB 1: MEU CARRO & STATUS */}
        {activeTab === 'meu-carro' && (
          <div className="space-y-3">
            {/* CAR SELECTION CARD (IF NOT IDENTIFIED) */}
            {!currentDriver ? (
              <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/40 shadow-xl space-y-3">
                <div className="flex items-center gap-2.5">
                  <User className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <h2 className="text-sm font-bold text-white leading-snug">Identifique seu Carro</h2>
                    <p className="text-[11px] text-slate-400 leading-normal mt-0.5">
                      Veja sua posição exata na fila e receba alertas sonoros no celular
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchPlaca}
                    onChange={(e) => setSearchPlaca(e.target.value)}
                    placeholder="Digite sua placa ou nome..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

                {/* Quick list of waiting drivers */}
                <div className="space-y-2 max-h-52 overflow-y-auto pt-1">
                  {drivers
                    .filter(
                      (d) =>
                        !searchPlaca ||
                        d.placa.toLowerCase().includes(searchPlaca.toLowerCase()) ||
                        d.nome.toLowerCase().includes(searchPlaca.toLowerCase())
                    )
                    .map((driver) => (
                      <button
                        key={driver.id}
                        onClick={() => handleSelectDriver(driver.id)}
                        className="w-full p-2.5 rounded-xl bg-slate-950/70 hover:bg-slate-800 border border-slate-800 text-left flex items-center justify-between gap-2.5 transition cursor-pointer"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white leading-snug truncate">{driver.nome}</p>
                          <p className="text-[11px] text-slate-400 leading-normal truncate mt-0.5">
                            {driver.rota} {driver.cidade ? `· ${driver.cidade}` : ''}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700 leading-none inline-block">
                            {driver.placa}
                          </span>
                          <span className="text-[9px] text-slate-500 block mt-1 uppercase font-mono leading-none">
                            {driver.status}
                          </span>
                        </div>
                      </button>
                    ))}
                </div>

                <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Não está na lista ainda?</span>
                  <button
                    onClick={onGoToCheckin}
                    className="font-bold text-amber-400 hover:text-amber-300 underline cursor-pointer"
                  >
                    Fazer Check-in de Chegada
                  </button>
                </div>
              </div>
            ) : (
              /* IDENTIFIED DRIVER CARD */
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-md">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                      <Car className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white leading-snug truncate">{currentDriver.nome}</p>
                      <p className="text-[11px] text-slate-400 leading-normal mt-0.5">Chegada: {currentDriver.horarioChegada}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleClearSelection}
                    className="text-[11px] text-slate-300 hover:text-amber-400 font-semibold px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 shrink-0 cursor-pointer"
                  >
                    Trocar
                  </button>
                </div>

                {/* Details pill row */}
                <div className="flex items-center gap-2 gap-y-2 flex-wrap pt-2 border-t border-slate-800">
                  <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-slate-950 text-emerald-400 border border-slate-800 shadow-inner leading-none">
                    {currentDriver.placa}
                  </span>
                  <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 leading-none">
                    {currentDriver.rota}
                  </span>
                  {currentDriver.cidade && (
                    <span className="text-xs text-slate-300 px-2.5 py-0.5 rounded bg-slate-950 border border-slate-800 leading-none">
                      📍 {currentDriver.cidade}
                    </span>
                  )}
                  {currentDriver.rotaPrioridade && (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse leading-none">
                      ⚡ PRIORIDADE
                    </span>
                  )}
                  {currentDriver.mapsUrl && (
                    <a
                      href={currentDriver.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-sky-400 hover:text-sky-300 font-medium underline flex items-center gap-1 ml-auto"
                    >
                      <span>Google Maps</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* CALL ALERT (GIANT CALL BANNER IF CALLED) */}
            {wasCalled && (
              <div
                className={`p-5 rounded-3xl border-2 transition-all relative overflow-hidden shadow-2xl ${
                  isAlertActive
                    ? 'bg-gradient-to-br from-amber-500/30 via-amber-600/20 to-slate-900 border-amber-400 ring-4 ring-amber-500/40 animate-pulse'
                    : 'bg-slate-900 border-amber-500/80'
                }`}
              >
                <div className="text-center space-y-3.5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg leading-none">
                    <BellRing className="w-4 h-4 fill-current animate-bounce" />
                    <span>VOCÊ FOI CHAMADO!</span>
                  </div>

                  <div>
                    <span className="text-[11px] font-mono uppercase text-slate-300 tracking-wider block leading-normal">
                      Compareça Imediatamente à
                    </span>
                    <span className="text-3xl sm:text-4xl font-black font-mono text-amber-400 leading-snug block my-2 break-words">
                      {currentDriver.docaDesignada || 'DOCA DESIGNADA'}
                    </span>
                    <span className="text-xs font-bold text-slate-200 leading-normal block">
                      Encoste seu veículo de ré para carregamento
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950/80 rounded-xl border border-amber-500/30 text-xs text-slate-300 text-left space-y-1.5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
                      <span className="text-slate-400">Motorista:</span>
                      <span className="font-bold text-white break-words">{currentDriver.nome}</span>
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-slate-400">Placa:</span>
                      <span className="font-mono font-bold text-emerald-400">{currentDriver.placa}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
                      <span className="text-slate-400">Rota / Destino:</span>
                      <span className="font-mono text-amber-300 font-bold break-words">
                        {currentDriver.rota} {currentDriver.cidade ? `· ${currentDriver.cidade}` : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-slate-400">Chamado às:</span>
                      <span className="font-mono text-amber-300">{currentDriver.horarioChamada || '--:--'}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setAcknowledgedCall(true)}
                    className="w-full py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 cursor-pointer leading-none"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Confirmar / Estou a Caminho</span>
                  </button>
                </div>
              </div>
            )}

            {/* STATUS: VOCÊ É O PRÓXIMO (#1) */}
            {!wasCalled && currentDriver && isMyTurn && (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 via-slate-900 to-slate-900 border-2 border-amber-400/80 shadow-xl space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-sm animate-pulse leading-none">
                    VOCÊ É O PRÓXIMO (#1)
                  </span>
                  <Zap className="w-4 h-4 text-amber-400" />
                </div>

                <h3 className="text-base font-black text-white leading-snug">
                  Prepare-se no seu veículo!
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed mt-1">
                  Você é o 1º da fila de espera. Assim que qualquer doca for liberada, seu carro será chamado no som e no telão do pátio.
                </p>

                <div className="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800 text-[11px] text-amber-300 flex items-center justify-between leading-normal">
                  <span>Docas livres no momento:</span>
                  <span className="font-bold text-white font-mono">{freeDocks.length} disponível(is)</span>
                </div>
              </div>
            )}

            {/* STATUS: NA FILA (#2, #3, ...) */}
            {!wasCalled && currentDriver && !isMyTurn && myQueuePosition && (
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase text-slate-400 font-bold leading-none">
                    Sua Posição na Fila
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono leading-none">
                    {waitingDrivers.length} na fila total
                  </span>
                </div>

                <div className="flex items-center gap-3.5 py-1">
                  <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center font-mono font-black text-2xl text-amber-400 shadow-inner shrink-0 leading-none">
                    #{myQueuePosition}
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <p className="text-sm font-bold text-white leading-snug">
                      Existem {myQueuePosition - 1} carro(s) na sua frente
                    </p>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Aguarde no pátio. O celular avisará com som e vibração quando for chamado.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* RECENT CALLS PREVIEW */}
            <div className="space-y-2 pt-1">
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5 leading-none">
                <Radio className="w-3.5 h-3.5 text-rose-400" />
                Últimas Chamadas no Pátio
              </h3>

              {calledDrivers.length > 0 ? (
                <div className="space-y-2">
                  {calledDrivers.slice(0, 3).map((called) => (
                    <div
                      key={called.id}
                      className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-[9px] uppercase tracking-wider leading-none">
                            CHAMADO
                          </span>
                          <span className="font-mono text-xs font-bold text-emerald-400 leading-none">
                            {called.placa}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-white truncate leading-snug">{called.nome}</p>
                        <p className="text-[11px] text-slate-400 truncate leading-normal mt-0.5">
                          {called.rota} {called.cidade ? `· ${called.cidade}` : ''}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-base text-amber-400 block leading-snug">
                          {called.docaDesignada || 'DOCA'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 block mt-0.5 leading-none">
                          {called.horarioChamada || '--:--'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-500 leading-normal">
                  Nenhum carro chamado no momento.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: FILA COMPLETA */}
        {activeTab === 'fila' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold leading-none">
                  Ordem de Chamada das Docas
                </h3>
                <p className="text-[11px] text-slate-500 leading-normal mt-1">Prioridades de rota atendidas primeiro</p>
              </div>
              <span className="text-xs font-mono font-bold text-amber-400 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 shrink-0 leading-none">
                {waitingDrivers.length} carros
              </span>
            </div>

            {waitingDrivers.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2">
                <Car className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400 leading-normal">Fila livre! Nenhum carro aguardando no pátio.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {waitingDrivers.map((driver, index) => {
                  const pos = index + 1;
                  const isMe = currentDriver?.id === driver.id;

                  return (
                    <div
                      key={driver.id}
                      onClick={() => handleSelectDriver(driver.id)}
                      className={`p-3 rounded-2xl border transition flex items-center justify-between gap-2.5 cursor-pointer ${
                        isMe
                          ? 'bg-amber-500/15 border-amber-400 shadow-md ring-1 ring-amber-400/40'
                          : pos === 1
                          ? 'bg-slate-900 border-amber-500/40'
                          : 'bg-slate-900/70 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 leading-none ${
                            isMe
                              ? 'bg-amber-500 text-slate-950 font-bold'
                              : pos === 1
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          #{pos}
                        </div>

                        <div className="min-w-0 flex-1">
                          {/* Row 1: Placa + Driver Name + Badges with safe gap and line spacing */}
                          <div className="flex items-center gap-1.5 flex-wrap gap-y-1 mb-1">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-950 text-emerald-400 border border-slate-800 shrink-0 leading-none">
                              {driver.placa}
                            </span>
                            <span className="text-xs font-bold text-white truncate max-w-[140px] sm:max-w-[180px] leading-snug">
                              {driver.nome}
                            </span>
                            {driver.rotaPrioridade && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 shrink-0 animate-pulse leading-none">
                                PRIORIDADE
                              </span>
                            )}
                            {isMe && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 shrink-0 uppercase leading-none">
                                VOCÊ
                              </span>
                            )}
                          </div>

                          {/* Row 2: Route, City, Time with clear vertical clearance */}
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-300 leading-normal flex-wrap">
                            <span className="font-mono text-amber-300 font-semibold">{driver.rota}</span>
                            {driver.cidade && <span className="text-slate-400">· {driver.cidade}</span>}
                            <span className="text-slate-400">· {driver.horarioChegada}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {driver.mapsUrl ? (
                          <a
                            href={driver.mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 text-[10px] font-mono border border-slate-700 inline-flex items-center gap-1 leading-none"
                          >
                            <MapPin className="w-3 h-3 text-sky-400 shrink-0" />
                            <span>Mapa</span>
                          </a>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-500 leading-none">{driver.horarioChegada}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DOCAS */}
        {activeTab === 'docas' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold leading-none">
                  Status das Docas da Base
                </h3>
                <p className="text-[11px] text-slate-500 leading-normal mt-1">{freeDocks.length} livres de {docks.length} ativas</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {docks.map((dock) => {
                const isFree = dock.status === 'livre';
                const isCalling = dock.status === 'chamando';
                const isLoading = dock.status === 'carregando';

                return (
                  <div
                    key={dock.id}
                    className={`p-3 rounded-2xl border flex flex-col justify-between transition min-h-[110px] space-y-2 ${
                      isCalling
                        ? 'bg-amber-500/20 border-amber-400 text-white ring-2 ring-amber-400/50'
                        : isLoading
                        ? 'bg-slate-900 border-sky-500/30 text-white'
                        : isFree
                        ? 'bg-emerald-950/20 border-emerald-500/30 text-slate-200'
                        : 'bg-slate-900 border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-xs text-white leading-none">{dock.nome}</span>
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          isFree
                            ? 'bg-emerald-400'
                            : isCalling
                            ? 'bg-amber-400 animate-ping'
                            : isLoading
                            ? 'bg-sky-400'
                            : 'bg-slate-500'
                        }`}
                      />
                    </div>

                    <div className="min-w-0 space-y-1.5">
                      {isFree && (
                        <div>
                          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider leading-none">
                            LIVRE
                          </p>
                          {dock.colaboradorNome && (
                            <p className="text-[10px] text-slate-400 truncate mt-1 flex items-center gap-1 font-mono">
                              <UserCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span>{dock.colaboradorNome}</span>
                            </p>
                          )}
                        </div>
                      )}

                      {(isCalling || isLoading) && dock.motoristaAtual && (
                        <div className="min-w-0 space-y-1">
                          {/* ROTA */}
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[9px] uppercase font-mono text-slate-400">Rota:</span>
                            <span className="font-mono text-[10px] font-black text-amber-300 px-1.5 py-0.2 rounded bg-amber-500/15 border border-amber-500/30">
                              {dock.motoristaAtual.rota}
                            </span>
                          </div>

                          {/* MOTORISTA */}
                          <div>
                            <span className="text-[9px] uppercase font-mono text-slate-400 block leading-none">
                              Motorista:
                            </span>
                            <p className="text-xs font-bold text-white truncate leading-snug">
                              {dock.motoristaAtual.nome}
                            </p>
                            <span className="text-[10px] font-mono text-emerald-300 font-bold">
                              {dock.motoristaAtual.placa}
                            </span>
                          </div>

                          {/* COLABORADOR QUE ESTA CARREGANDO */}
                          <div className="pt-1 border-t border-slate-800">
                            <span className="text-[9px] uppercase font-mono text-slate-400 block leading-none">
                              Carregador:
                            </span>
                            <p className="text-[11px] font-semibold text-emerald-400 truncate flex items-center gap-1 mt-0.5">
                              <UserCheck className="w-3 h-3 shrink-0" />
                              <span>{dock.colaboradorNome || dock.motoristaAtual.colaboradorResponsavel || 'Operador'}</span>
                            </p>
                          </div>
                        </div>
                      )}

                      {dock.status === 'manutencao' && (
                        <p className="text-[10px] text-slate-400 leading-normal">Manutenção</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: FORMS DE CHEGADA E CHECK-IN */}
        {activeTab === 'forms' && (
          <div className="space-y-4">
            {/* Header info card */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/30 shadow-xl space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Formulário de Chegada (Forms)</h2>
                  <p className="text-[11px] text-slate-400">
                    Registre sua chegada para entrar na fila de chamada das docas
                  </p>
                </div>
              </div>

              {formSuccessNotice && (
                <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{formSuccessNotice}</span>
                </div>
              )}
            </div>

            {/* OPTION 1: GOOGLE FORMS OFICIAL (IF CONFIGURED OR AVAILABLE) */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    Google Forms Oficial
                  </span>
                  <h3 className="text-sm font-bold text-white mt-1.5">
                    Formulário da Guarita / Base
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formUrl
                      ? 'Preencha o formulário oficial do Google Forms conectado à planilha da base.'
                      : 'O link do Google Forms é gerado no painel da administração. Você também pode preencher pelo check-in direto abaixo.'}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                  <ExternalLink className="w-4 h-4" />
                </div>
              </div>

              {formUrl ? (
                <div className="space-y-2.5 pt-2 border-t border-slate-800">
                  <a
                    href={formUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Abrir Formulário no Google Forms ↗</span>
                  </a>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(formUrl);
                        setCopiedFormLink(true);
                        setTimeout(() => setCopiedFormLink(false), 2000);
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 transition cursor-pointer"
                    >
                      {copiedFormLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedFormLink ? 'Copiado!' : 'Copiar Link'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowQrForms(!showQrForms)}
                      className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 transition cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5 text-amber-400" />
                      <span>{showQrForms ? 'Ocultar QR' : 'QR Code'}</span>
                    </button>
                  </div>

                  {showQrForms && (
                    <div className="p-3 bg-white rounded-xl text-center space-y-1 mx-auto max-w-[200px]">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(formUrl)}`}
                        alt="QR Code Google Forms"
                        className="w-full h-auto mx-auto"
                      />
                      <p className="text-[10px] text-slate-700 font-mono font-bold">Aponte a câmera</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
                  <span>Dica: Use o formulário direto abaixo para entrar na fila com localização GPS automática.</span>
                </div>
              )}
            </div>

            {/* OPTION 2: CHECK-IN DIRETO NO CELULAR COM VALIDAÇÃO GPS (150M) */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Check-in Inteligente no Celular
                </span>
                <h3 className="text-sm font-bold text-white mt-1.5">
                  Preenchimento Direto no App
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Base: <strong className="text-slate-200">Condomínio SYS do Gama, Ponte Alta</strong> (Raio máximo de 150m)
                </p>
              </div>

              {/* GPS Geofence Status */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <span className="text-slate-300 font-medium">Localização GPS:</span>
                  </div>
                  {isGpsLoading ? (
                    <span className="text-[11px] text-amber-400 flex items-center gap-1 font-mono">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Calculando...
                    </span>
                  ) : distanceMeters !== null ? (
                    <span
                      className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                        isWithinGeofence || simulationMode
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {distanceMeters}m da Base
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={detectGps}
                      className="text-[11px] text-sky-400 underline cursor-pointer"
                    >
                      Detectar GPS
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80 text-[10px]">
                  <span className="text-slate-400">
                    {simulationMode
                      ? 'Simulação ativa (Dentro da base - 150m)'
                      : isWithinGeofence
                      ? '✅ Você está dentro do raio permitido (150m)'
                      : '⚠️ Limite é 150m do Condomínio SYS do Gama'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSimulationMode(!simulationMode)}
                    className="text-amber-400 hover:underline font-mono cursor-pointer shrink-0"
                  >
                    {simulationMode ? 'Desativar Teste' : 'Modo Teste'}
                  </button>
                </div>
              </div>

              {/* Form Input Fields */}
              <form onSubmit={handleSubmitCheckinFromTab} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-slate-300 font-semibold mb-1">
                    Nome Completo do Motorista *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="Ex: João Ferreira de Souza"
                      value={formNome}
                      onChange={(e) => setFormNome(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-slate-300 font-semibold mb-1">
                      Placa do Veículo *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: ABC1D23"
                      maxLength={8}
                      value={formPlaca}
                      onChange={(e) => setFormPlaca(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-white uppercase placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase text-slate-300 font-semibold mb-1">
                      Rota Alfanumérica *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: DF-01, RT-102"
                      value={formRota}
                      onChange={(e) => setFormRota(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-white uppercase placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-slate-300 font-semibold mb-1">
                      Telefone / WhatsApp
                    </label>
                    <input
                      type="tel"
                      placeholder="(61) 99999-9999"
                      value={formTelefone}
                      onChange={(e) => setFormTelefone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase text-slate-300 font-semibold mb-1">
                      Cidade / Região
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Gama - DF"
                      value={formCidade}
                      onChange={(e) => setFormCidade(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={formSubmitting || (!isWithinGeofence && !simulationMode)}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black text-xs uppercase tracking-wider transition cursor-pointer shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>{formSubmitting ? 'Gravando Check-in...' : 'Enviar Check-in e Entrar na Fila'}</span>
                </button>
              </form>
            </div>

            {/* FULLSCREEN CHECK-IN BUTTON */}
            <button
              type="button"
              onClick={onGoToCheckin}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Navigation className="w-4 h-4 text-emerald-400" />
              <span>Abrir Modo Check-in com Radar em Tela Cheia</span>
            </button>
          </div>
        )}
      </main>

      {/* FIXED BOTTOM THUMB NAVIGATION BAR (FITS MOBILE SCREEN PERFECTLY) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 py-2 pb-3 shadow-2xl">
        <div className="max-w-md mx-auto w-full flex items-center justify-around">
          <button
            onClick={() => setActiveTab('meu-carro')}
            className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition cursor-pointer min-w-[56px] text-center ${
              activeTab === 'meu-carro'
                ? 'text-amber-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Car className="w-5 h-5" />
              {wasCalled && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping absolute -top-0.5 -right-0.5" />
              )}
            </div>
            <span className="text-[10px] mt-1 whitespace-nowrap leading-tight text-center">Meu Carro</span>
          </button>

          <button
            onClick={() => setActiveTab('fila')}
            className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition cursor-pointer min-w-[56px] text-center ${
              activeTab === 'fila'
                ? 'text-amber-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListOrdered className="w-5 h-5" />
            <span className="text-[10px] mt-1 whitespace-nowrap leading-tight text-center">Fila ({waitingDrivers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('docas')}
            className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition cursor-pointer min-w-[56px] text-center ${
              activeTab === 'docas'
                ? 'text-amber-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Warehouse className="w-5 h-5" />
            <span className="text-[10px] mt-1 whitespace-nowrap leading-tight text-center">Docas ({freeDocks.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('forms')}
            className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition cursor-pointer min-w-[56px] text-center ${
              activeTab === 'forms'
                ? 'text-emerald-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-bold whitespace-nowrap leading-tight text-center">Forms</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

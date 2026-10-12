import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Car,
  Clock,
  MapPin,
  Bell,
  Search,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  QrCode,
  Radio,
  Smartphone,
  Megaphone,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { DriverEntry, Dock, CallAlertEvent } from '../types';
import { audioService } from '../services/audioService';
import { realtimeSync, SyncMessage } from '../services/realtimeSync';

interface DriverTVViewProps {
  drivers: DriverEntry[];
  docks: Dock[];
  activeCallAlert: CallAlertEvent | null;
  formUrl?: string;
  onOpenCheckin?: () => void;
}

export const DriverTVView: React.FC<DriverTVViewProps> = ({
  drivers,
  docks,
  activeCallAlert,
  formUrl,
  onOpenCheckin,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(audioService.getSoundEnabled());
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [recentCallAlert, setRecentCallAlert] = useState<CallAlertEvent | null>(activeCallAlert);
  const [isAlertStrobe, setIsAlertStrobe] = useState(false);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync active alert from props
  useEffect(() => {
    if (activeCallAlert) {
      setRecentCallAlert(activeCallAlert);
      triggerStrobe();
    }
  }, [activeCallAlert]);

  // Listen to realtime broadcast calls
  useEffect(() => {
    const unsubscribe = realtimeSync.subscribe((msg: SyncMessage) => {
      if (msg.type === 'DRIVER_CALLED' && msg.payload) {
        const alert: CallAlertEvent = msg.payload;
        setRecentCallAlert(alert);
        triggerStrobe();
        // Play audio alert
        audioService.playDockAlert(alert.motoristaNome, alert.docaNome, alert.rota);
      }
    });

    return () => unsubscribe();
  }, []);

  const triggerStrobe = () => {
    setIsAlertStrobe(true);
    const timeout = setTimeout(() => setIsAlertStrobe(false), 15000);
    return () => clearTimeout(timeout);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleEnableAudio = () => {
    audioService.setSoundEnabled(true);
    setSoundEnabled(true);
    setAudioInitialized(true);
    audioService.playChime();
  };

  // Filter waiting drivers, giving priority to rotaPrioridade
  const waitingDrivers = [...drivers]
    .filter((d) => d.status === 'aguardando')
    .sort((a, b) => {
      if (a.rotaPrioridade && !b.rotaPrioridade) return -1;
      if (!a.rotaPrioridade && b.rotaPrioridade) return 1;
      return (a.rowIndex || 0) - (b.rowIndex || 0);
    });
  const calledDrivers = drivers.filter((d) => d.status === 'chamado');

  // Search driver position in queue
  const searchResult = searchQuery.trim()
    ? drivers.find(
        (d) =>
          d.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.placa.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null;

  const searchPosition = searchResult
    ? waitingDrivers.findIndex((d) => d.id === searchResult.id) + 1
    : 0;

  return (
    <div
      className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans transition-all duration-300 ${
        isAlertStrobe ? 'ring-8 ring-amber-500/80 bg-slate-950/95' : ''
      }`}
    >
      {/* Top Banner / TV Header */}
      <header className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/30">
            <Megaphone className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse">
                <Radio className="w-3 h-3 text-rose-400" />
                AO VIVO NO PÁTIO
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                CHAMADA DE MOTORISTAS
              </h1>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Painel de Carregamento de Carros • Docas e Fila em Tempo Real
            </p>
          </div>
        </div>

        {/* Clock & Controls */}
        <div className="flex items-center gap-4">
          {!audioInitialized && (
            <button
              onClick={handleEnableAudio}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-2 shadow-lg transition cursor-pointer animate-bounce"
            >
              <Volume2 className="w-4 h-4" />
              <span>Ativar Som das Chamadas</span>
            </button>
          )}

          <div className="hidden sm:flex flex-col items-end px-4 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="font-mono text-2xl font-black text-amber-400 leading-none">
              {currentTime.toLocaleTimeString('pt-BR')}
            </span>
            <span className="text-[11px] text-slate-400 uppercase font-mono tracking-wider mt-0.5">
              {currentTime.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
            </span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
            title="Alternar Tela Cheia"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* GIANT ACTIVE CALL BANNER - ULTRA INTUITIVE HIGH CONTRAST */}
        {recentCallAlert ? (
          <div
            className={`p-6 sm:p-8 rounded-3xl border-2 transition-all relative overflow-hidden shadow-2xl ${
              isAlertStrobe
                ? 'bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/60 border-amber-400 shadow-amber-500/30 ring-4 ring-amber-500/40'
                : 'bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-850 border-amber-500/40'
            }`}
          >
            <div className="absolute top-0 right-0 -mr-12 -mt-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col lg:flex-row items-center justify-between gap-6 relative z-10">
              <div className="space-y-3 text-center lg:text-left w-full lg:w-auto">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg">
                  <Bell className="w-4 h-4 fill-current animate-bounce" />
                  <span>ÚLTIMA CHAMADA DISPARADA</span>
                </div>

                <div>
                  <span className="text-xs uppercase font-mono text-amber-300 font-bold tracking-widest block mb-1">
                    MOTORISTA CONVOCADO:
                  </span>
                  <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight uppercase drop-shadow-md">
                    {recentCallAlert.motoristaNome}
                  </h2>
                </div>

                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-1">
                  <span className="font-mono text-base sm:text-lg font-black px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-2">
                    <Car className="w-4 h-4" />
                    PLACA: {recentCallAlert.placa}
                  </span>
                  <span className="text-sm sm:text-base font-semibold text-slate-200 px-3 py-1 rounded-lg bg-slate-800/90 border border-slate-700">
                    ROTA: {recentCallAlert.rota}
                  </span>
                </div>
              </div>

              {/* Big Dock Destination Display */}
              <div className="flex flex-col items-center justify-center px-8 py-6 rounded-2xl bg-amber-400 text-slate-950 shadow-2xl shadow-amber-400/30 shrink-0 transform hover:scale-105 transition duration-200 border-2 border-amber-300">
                <span className="text-xs font-mono font-black uppercase tracking-widest opacity-90">
                  DIRIGIR-SE PARA
                </span>
                <span className="text-4xl sm:text-6xl font-black tracking-tight leading-none my-1 font-mono">
                  {recentCallAlert.docaNome}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider bg-slate-950 text-amber-300 px-3 py-1 rounded-full mt-1">
                  Encostar Imediatamente
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Aguardando Próxima Chamada de Carro</h3>
                <p className="text-xs text-slate-400">Os motoristas serão chamados com aviso sonoro e visual assim que a doca liberar.</p>
              </div>
            </div>
          </div>
        )}

        {/* STATUS DAS DOCAS (GRID INTUITIVA) */}
        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-sm font-mono uppercase tracking-wider text-slate-300 font-bold flex items-center gap-2">
              <Car className="w-4 h-4 text-amber-400" />
              Docas de Carregamento & Situação em Tempo Real
            </h3>
            {/* Legend with intuitive colors */}
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400"></span> Livre
              </span>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-300">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span> Chamando
              </span>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-sky-950/40 border border-sky-500/30 text-sky-300">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span> Carregando
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {docks.map((dock) => {
              const isFree = dock.status === 'livre';
              const isCalling = dock.status === 'chamando';
              const isLoading = dock.status === 'carregando';

              return (
                <div
                  key={dock.id}
                  className={`p-4 rounded-2xl border transition relative flex flex-col justify-between ${
                    isCalling
                      ? 'bg-amber-950/50 border-amber-400 text-white shadow-xl shadow-amber-500/20 ring-2 ring-amber-400/60'
                      : isLoading
                      ? 'bg-sky-950/30 border-sky-500/40 text-white'
                      : isFree
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-slate-200'
                      : 'bg-slate-900 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-lg font-black text-white">{dock.nome}</span>
                    <span
                      className={`w-3 h-3 rounded-full ${
                        isFree
                          ? 'bg-emerald-400 shadow-sm shadow-emerald-400'
                          : isCalling
                          ? 'bg-amber-400 animate-ping'
                          : isLoading
                          ? 'bg-sky-400'
                          : 'bg-slate-500'
                      }`}
                    />
                  </div>

                  <div className="space-y-1">
                    {isFree && (
                      <p className="text-xs font-black text-emerald-400 uppercase tracking-wider">
                        LIVRE • PRONTA
                      </p>
                    )}

                    {(isCalling || isLoading) && dock.motoristaAtual && (
                      <div className="space-y-1.5 min-w-0">
                        {/* Rota */}
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] uppercase font-mono text-slate-400">ROTA:</span>
                          <span className="font-mono text-xs font-black text-amber-300 px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40">
                            {dock.motoristaAtual.rota}
                          </span>
                        </div>

                        {/* Motorista */}
                        <div>
                          <span className="text-[9px] uppercase font-mono text-slate-400 block leading-none">MOTORISTA:</span>
                          <p className="text-sm font-black text-white truncate mt-0.5 leading-tight">
                            {dock.motoristaAtual.nome}
                          </p>
                          <p className="text-xs font-mono text-emerald-300 font-bold mt-0.5">
                            {dock.motoristaAtual.placa}
                          </p>
                        </div>

                        {/* Colaborador que está carregando */}
                        <div className="pt-1 border-t border-slate-800/80">
                          <span className="text-[9px] uppercase font-mono text-slate-400 block leading-none">CARREGANDO COM:</span>
                          <p className="text-xs font-semibold text-emerald-400 truncate mt-0.5">
                            {dock.colaboradorNome || dock.motoristaAtual.colaboradorResponsavel || 'Operador'}
                          </p>
                        </div>
                      </div>
                    )}

                    {dock.status === 'manutencao' && (
                      <p className="text-xs font-semibold text-rose-400">Manutenção</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* PRÓXIMOS DA FILA & CONSULTA DE VEZ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Fila de Espera (2 cols) */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-400" />
                  Ordem da Fila de Espera
                </h3>
                <p className="text-xs text-slate-400">Sequência de chegada dos motoristas para carregamento</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                {waitingDrivers.length} Aguardando no pátio
              </span>
            </div>

            {waitingDrivers.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <CheckCircle className="w-10 h-10 mx-auto mb-2 text-emerald-400/60" />
                <p className="text-base font-semibold text-slate-300">Nenhum motorista aguardando na fila.</p>
                <p className="text-xs text-slate-500 mt-1">Todos os veículos foram chamados ou estão em trânsito.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {waitingDrivers.slice(0, 8).map((driver, index) => {
                  const isFirst = index === 0;
                  const isSecond = index === 1;

                  return (
                    <div
                      key={driver.id}
                      className={`p-4 rounded-2xl border transition flex items-center justify-between gap-4 ${
                        isFirst
                          ? 'bg-amber-500/15 border-amber-400/80 shadow-md shadow-amber-500/10'
                          : isSecond
                          ? 'bg-sky-500/10 border-sky-500/40'
                          : 'bg-slate-950/60 border-slate-850'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Position badge */}
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-black text-base shrink-0 ${
                            isFirst
                              ? 'bg-amber-400 text-slate-950 shadow-md animate-pulse'
                              : isSecond
                              ? 'bg-sky-500 text-slate-950 font-bold'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          #{index + 1}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-base truncate">
                              {driver.nome}
                            </span>
                            {isFirst && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider shrink-0 shadow-sm">
                                1º DA FILA - PREPARE-SE!
                              </span>
                            )}
                            {isSecond && (
                              <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold text-[10px] uppercase shrink-0">
                                2º DA FILA
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400">
                            <span className="font-mono font-bold text-emerald-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                              {driver.placa}
                            </span>
                            <span className="font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-xs">
                              {driver.rota}
                            </span>
                            {driver.cidade && (
                              <span className="text-slate-300 font-semibold text-xs flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-sky-400" />
                                {driver.cidade}
                              </span>
                            )}
                            {driver.rotaPrioridade && (
                              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                                ROTA PRIORIDADE
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-1 font-mono text-xs text-slate-300 justify-end">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>Chegou: {driver.horarioChegada}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          {driver.localizacao}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Lateral: "CONSULTAR MINHA VEZ" + CHECK-IN QR */}
          <div className="space-y-6">
            {/* Driver position lookup */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Search className="w-5 h-5 text-sky-400" />
                  Consultar Posição do Motorista
                </h3>
                <p className="text-xs text-slate-400">Digite seu nome ou placa do carro</p>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ex: Carlos ou BRA2E19..."
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                />
              </div>

              {searchResult ? (
                <div className="p-4 rounded-2xl bg-sky-950/40 border border-sky-500/40 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase text-sky-300 font-bold">
                      Motorista Localizado
                    </span>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300">
                      {searchResult.placa}
                    </span>
                  </div>

                  <p className="font-bold text-white text-base leading-tight">{searchResult.nome}</p>

                  {searchResult.status === 'aguardando' && (
                    <div className="p-3 bg-slate-950/80 rounded-xl border border-sky-500/20 text-center">
                      <span className="text-xs text-slate-400 block">Sua posição na fila de espera:</span>
                      <span className="text-3xl font-black font-mono text-amber-400 block my-1">
                        #{searchPosition}º LUGAR
                      </span>
                      <p className="text-xs text-slate-300">
                        {searchPosition === 1
                          ? 'Atenção! Você é o próximo a ser chamado. Aguarde perto do veículo!'
                          : searchPosition === 2
                          ? 'Você é o 2º da fila. Comece a se preparar para a doca.'
                          : 'Aguarde no pátio. O painel anunciará quando sua doca liberar.'}
                      </p>
                    </div>
                  )}

                  {searchResult.status === 'chamado' && (
                    <div className="p-3 bg-amber-500/25 rounded-xl border-2 border-amber-400 text-center animate-pulse">
                      <span className="text-xs font-bold uppercase text-amber-300 block">
                        VOCÊ JÁ FOI CHAMADO!
                      </span>
                      <span className="text-2xl font-black font-mono text-white block my-1">
                        DOCA: {searchResult.docaDesignada || 'CONSULTE O OPERADOR'}
                      </span>
                      <p className="text-xs text-white">Compareça imediatamente à doca indicada!</p>
                    </div>
                  )}

                  {searchResult.status === 'carregando' && (
                    <div className="p-3 bg-sky-500/20 rounded-xl border border-sky-400 text-center">
                      <span className="text-xs font-bold uppercase text-sky-300 block">
                        EM CARREGAMENTO
                      </span>
                      <p className="text-xs text-slate-200 mt-1">
                        Seu veículo está na doca {searchResult.docaDesignada}.
                      </p>
                    </div>
                  )}
                </div>
              ) : searchQuery.trim() ? (
                <p className="text-xs text-rose-400 text-center py-2">
                  Motorista ou placa não encontrado na lista de hoje.
                </p>
              ) : null}
            </div>

            {/* Mobile Driver Panel & Check-in QR Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-center space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
                <Smartphone className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-base">Painel no Celular do Motorista</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Escaneie com a câmera do celular para acompanhar sua vez na fila e receber alertas com som e vibração:
              </p>

              <div className="p-3 bg-white rounded-2xl w-40 h-40 mx-auto shadow-md flex items-center justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                    `${typeof window !== 'undefined' ? window.location.origin + window.location.pathname : ''}?view=motorista`
                  )}`}
                  alt="QR Code Painel do Motorista"
                  className="w-full h-full"
                />
              </div>

              <p className="text-[10px] text-amber-400 font-mono">
                {typeof window !== 'undefined' ? `${window.location.origin}/?view=motorista` : ''}
              </p>

              <div className="flex flex-col gap-2 pt-1">
                {formUrl && (
                  <a
                    href={formUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20"
                  >
                    <span>Abrir Google Forms Oficial ↗</span>
                  </a>
                )}
                {onOpenCheckin && (
                  <button
                    onClick={onOpenCheckin}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer border border-slate-700"
                  >
                    Novo Check-in de Chegada (GPS 150m)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

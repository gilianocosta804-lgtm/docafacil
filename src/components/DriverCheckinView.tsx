import React, { useState, useEffect, useCallback } from 'react';
import {
  Car,
  MapPin,
  Clock,
  Phone,
  User,
  Send,
  CheckCircle,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Compass,
  RefreshCw,
  AlertTriangle,
  Navigation,
  ShieldCheck,
  Building2,
  ChevronLeft
} from 'lucide-react';

// COORDENADAS OFICIAIS DA BASE: Condomínio SYS do Gama, Ponte Alta (Gama - DF)
export const BASE_COORDINATES = {
  name: 'Condomínio SYS do Gama, Ponte Alta (Gama - DF)',
  latitude: -16.0492,
  longitude: -48.0483,
  maxDistanceMeters: 150, // 150 metros da base
};

/**
 * Calcula distância entre duas coordenadas geográficas em metros (Haversine Formula)
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Raio da Terra em metros
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

interface DriverCheckinViewProps {
  onRegisterDriver: (data: {
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
  }) => Promise<void>;
  onGoToTV: () => void;
  onGoToMobile?: () => void;
  formUrl?: string;
}

export const DriverCheckinView: React.FC<DriverCheckinViewProps> = ({
  onRegisterDriver,
  onGoToTV,
  onGoToMobile,
  formUrl,
}) => {
  const [nome, setNome] = useState('');
  const [rota, setRota] = useState('');
  const [cidade, setCidade] = useState('');
  const [rotaPrioridade, setRotaPrioridade] = useState(false);
  const [placa, setPlaca] = useState('');
  const [telefone, setTelefone] = useState('');

  // 1. Data e Horário em tempo real
  const [currentDate, setCurrentDate] = useState(() =>
    new Date().toLocaleDateString('pt-BR')
  );
  const [currentTime, setCurrentTime] = useState(() =>
    new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  );

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentDate(now.toLocaleDateString('pt-BR'));
      setCurrentTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // 2. Georreferenciamento e Checagem de Raio de 150m da Base
  const [localizacao, setLocalizacao] = useState('Obtendo localização via GPS...');
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
  const [mapsUrl, setMapsUrl] = useState<string>('');
  const [distanceToBase, setDistanceToBase] = useState<number | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'detecting' | 'inside' | 'outside' | 'error'>('detecting');
  const [gpsErrorMessage, setGpsErrorMessage] = useState<string | null>(null);
  const [simulateBasePresence, setSimulateBasePresence] = useState<boolean>(false);

  const checkGeofence = useCallback((lat: number, lng: number, accuracy?: number) => {
    const dist = calculateDistanceMeters(
      lat,
      lng,
      BASE_COORDINATES.latitude,
      BASE_COORDINATES.longitude
    );
    setDistanceToBase(dist);
    if (accuracy) setGpsAccuracy(Math.round(accuracy));

    const link = `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
    setMapsUrl(link);

    if (dist <= BASE_COORDINATES.maxDistanceMeters) {
      setGpsStatus('inside');
      setLocalizacao(`Pátio Condomínio SYS Gama (~${dist}m da base)`);
      setGpsErrorMessage(null);
    } else {
      setGpsStatus('outside');
      setLocalizacao(`Fora do raio (~${dist}m da base)`);
    }
  }, []);

  const requestGpsLocation = useCallback(() => {
    setGpsStatus('detecting');
    setLocalizacao('Conectando ao satélite / GPS...');
    setGpsErrorMessage(null);

    if (simulateBasePresence) {
      // Simulação ativada para testes de laboratório / desenvolvimento
      const simLat = BASE_COORDINATES.latitude + 0.0002;
      const simLng = BASE_COORDINATES.longitude + 0.0001;
      setLatitude(simLat);
      setLongitude(simLng);
      checkGeofence(simLat, simLng, 10);
      return;
    }

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude: lat, longitude: lng, accuracy } = pos.coords;
          setLatitude(lat);
          setLongitude(lng);
          checkGeofence(lat, lng, accuracy);
        },
        (err) => {
          console.warn('Geolocation error:', err.message);
          setGpsStatus('error');
          setGpsErrorMessage(
            'Não foi possível obter sua localização exata. Ative o GPS/Localização no seu aparelho e recarregue.'
          );
          setLocalizacao('GPS não autorizado / indisponível');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
      );
    } else {
      setGpsStatus('error');
      setGpsErrorMessage('Navegador sem suporte a geolocalização.');
      setLocalizacao('GPS não suportado');
    }
  }, [checkGeofence, simulateBasePresence]);

  useEffect(() => {
    requestGpsLocation();
  }, [requestGpsLocation]);

  // Toggle do modo de teste / simulação de presença na base
  const handleToggleSimulation = (enabled: boolean) => {
    setSimulateBasePresence(enabled);
    if (enabled) {
      const simLat = BASE_COORDINATES.latitude + 0.0001;
      const simLng = BASE_COORDINATES.longitude + 0.0001;
      setLatitude(simLat);
      setLongitude(simLng);
      checkGeofence(simLat, simLng, 8);
    } else {
      requestGpsLocation();
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState<{
    nome: string;
    placa: string;
    rota: string;
    cidade: string;
    rotaPrioridade: boolean;
    mapsUrl?: string;
  } | null>(null);

  const isCheckinAllowed = gpsStatus === 'inside' || simulateBasePresence;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !rota.trim() || !placa.trim()) {
      return;
    }

    if (!isCheckinAllowed) {
      alert(
        `Atenção: Você está a ${distanceToBase || 0}m da Base. O check-in só é liberado a até ${BASE_COORDINATES.maxDistanceMeters} metros do Condomínio SYS do Gama, Ponte Alta.`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await onRegisterDriver({
        nome: nome.trim(),
        rota: rota.trim().toUpperCase(),
        cidade: cidade.trim(),
        rotaPrioridade,
        horarioChegada: currentTime,
        localizacao: localizacao.trim(),
        latitude,
        longitude,
        mapsUrl,
        placa: placa.trim().toUpperCase(),
        telefone: telefone.trim(),
      });

      setSubmittedData({
        nome: nome.trim(),
        placa: placa.trim().toUpperCase(),
        rota: rota.trim().toUpperCase(),
        cidade: cidade.trim(),
        rotaPrioridade,
        mapsUrl,
      });
    } catch (err) {
      console.error('Check-in error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setNome('');
    setRota('');
    setCidade('');
    setRotaPrioridade(false);
    setPlaca('');
    setTelefone('');
    setSubmittedData(null);
    requestGpsLocation();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 selection:bg-amber-500 selection:text-slate-950">
      <div className="w-full max-w-lg">
        {/* Navigation back */}
        <div className="flex items-center justify-between mb-4">
          {onGoToMobile && (
            <button
              onClick={onGoToMobile}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 text-amber-400" />
              <span>Painel do Motorista (Fila & Docas)</span>
            </button>
          )}

          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider ml-auto">
            Portaria da Base
          </span>
        </div>

        {/* Header Branding */}
        <div className="text-center mb-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-xl shadow-amber-500/20 mx-auto mb-2.5">
            <Car className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Check-in de Chegada do Carro
          </h1>
          <p className="text-xs text-slate-400 mt-1 flex items-center justify-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Condomínio SYS do Gama, Ponte Alta</span>
          </p>
        </div>

        {/* Success confirmation screen */}
        {submittedData ? (
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle className="w-10 h-10" />
            </div>

            <div>
              <span className="text-xs uppercase font-mono tracking-wider text-emerald-400 font-bold block mb-1">
                Chegada Confirmada com Sucesso!
              </span>
              <h2 className="text-2xl font-bold text-white">{submittedData.nome}</h2>
              <div className="flex items-center justify-center gap-2 mt-1.5">
                <span className="font-mono text-emerald-300 font-bold text-sm px-2.5 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30">
                  Placa: {submittedData.placa}
                </span>
                <span className="font-mono text-amber-300 font-bold text-sm px-2.5 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30">
                  Rota: {submittedData.rota}
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800 text-left text-xs text-slate-300 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-semibold">
                <Sparkles className="w-4 h-4" />
                <span>Você já está posicionado na fila oficial das docas!</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Chegada registrada às <span className="text-white font-mono font-bold">{currentTime}</span> ({currentDate}) com validação de presença no <span className="text-white font-bold">{BASE_COORDINATES.name}</span>. Aguarde a chamada da sua doca!
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={onGoToMobile || onGoToTV}
                className="w-full py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Acompanhar Minha Vez na Fila e Docas</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={handleReset}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Fazer Novo Registro de Carro
              </button>
            </div>
          </div>
        ) : (
          /* Check-in Form */
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl relative space-y-4">
            {formUrl && (
              <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-xs text-purple-200 flex items-center justify-between">
                <span>Formulário Google Forms alternativo:</span>
                <a
                  href={formUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-[11px] transition shrink-0 ml-2"
                >
                  Abrir Forms
                </a>
              </div>
            )}

            {/* AUTOMATIC LIVE DATA & HORÁRIO BADGE */}
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">
                    Horário e Data Automáticos
                  </span>
                  <div className="flex items-center gap-2 font-mono text-xs font-bold text-white">
                    <span className="text-amber-300">{currentTime}</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-300">{currentDate}</span>
                  </div>
                </div>
              </div>
              <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                Automático
              </span>
            </div>

            {/* GEOFENCE CHECK: 150 METROS DO CONDOMÍNIO SYS DO GAMA, PONTE ALTA */}
            <div
              className={`p-3.5 rounded-2xl border transition space-y-2.5 ${
                gpsStatus === 'inside'
                  ? 'bg-emerald-950/20 border-emerald-500/40'
                  : gpsStatus === 'outside'
                  ? 'bg-rose-950/20 border-rose-500/40'
                  : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                  <Navigation className={`w-4 h-4 ${gpsStatus === 'inside' ? 'text-emerald-400' : 'text-amber-400'}`} />
                  <span>Raio da Base (150 metros)</span>
                </div>

                <button
                  type="button"
                  onClick={requestGpsLocation}
                  className="text-[10px] text-amber-400 hover:text-amber-300 font-mono flex items-center gap-1 cursor-pointer"
                  title="Atualizar Localização GPS"
                >
                  <RefreshCw className={`w-3 h-3 ${gpsStatus === 'detecting' ? 'animate-spin' : ''}`} />
                  <span>Atualizar GPS</span>
                </button>
              </div>

              {/* Status Message */}
              {gpsStatus === 'detecting' && (
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400 shrink-0" />
                  <span>Detectando posição exata via satélite Google Maps / GPS...</span>
                </div>
              )}

              {gpsStatus === 'inside' && (
                <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Check-in Autorizado na Base</p>
                    <p className="text-[11px] text-emerald-400/90 mt-0.5">
                      Você está a <strong>{distanceToBase ?? 0}m</strong> do Condomínio SYS do Gama, Ponte Alta (limite: 150m).
                      {gpsAccuracy && ` Precisão GPS: ~${gpsAccuracy}m.`}
                    </p>
                  </div>
                </div>
              )}

              {gpsStatus === 'outside' && (
                <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Fora do Raio Permitido (150m)</p>
                    <p className="text-[11px] text-rose-200 mt-0.5 leading-relaxed">
                      Você está a <strong>{distanceToBase ? (distanceToBase >= 1000 ? `${(distanceToBase / 1000).toFixed(1)} km` : `${distanceToBase} metros`) : 'mais de 150m'}</strong> do Condomínio SYS do Gama, Ponte Alta. Aproxime-se da portaria para liberar o check-in.
                    </p>
                  </div>
                </div>
              )}

              {gpsStatus === 'error' && (
                <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Sinal de GPS não detectado</p>
                    <p className="text-[11px] text-amber-200 mt-0.5">
                      {gpsErrorMessage || 'Permita o acesso à localização no navegador para calcular os 150m.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Detalhes da Base e Google Maps link */}
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-0.5">
                <span className="truncate">Base: Condomínio SYS - Ponte Alta</span>
                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-400 hover:text-sky-300 flex items-center gap-1 underline shrink-0 ml-2"
                  >
                    <span>Ver no Maps</span>
                    <ArrowRight className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* Botão de simulação/teste para administradores ou testes em laboratório */}
              <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                <span className="text-slate-400">Modo Teste / Demonstração:</span>
                <button
                  type="button"
                  onClick={() => handleToggleSimulation(!simulateBasePresence)}
                  className={`px-2 py-1 rounded-lg font-mono font-bold transition cursor-pointer ${
                    simulateBasePresence
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {simulateBasePresence ? 'Simulação Ativa (~35m da Base)' : 'Simular presença a 150m da Base'}
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 pt-1">
              {/* Nome */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Nome Completo do Motorista *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Carlos Eduardo Silva"
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
              </div>

              {/* Rota Alfanumérica e Cidade Destino */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Código da Rota *
                    </label>
                    <span className="text-[10px] text-amber-400 font-mono font-bold">Alfanumérico</span>
                  </div>
                  <div className="relative">
                    <Compass className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={rota}
                      onChange={(e) => setRota(e.target.value.toUpperCase())}
                      placeholder="Ex: GAM-01, RT-104, BSB-05"
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white font-mono uppercase placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Região / Destino
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={cidade}
                      onChange={(e) => setCidade(e.target.value)}
                      placeholder="Ex: Gama, Santa Maria, Plano Piloto"
                      list="cidades-sugestoes"
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                    <datalist id="cidades-sugestoes">
                      <option value="Gama" />
                      <option value="Ponte Alta" />
                      <option value="Santa Maria" />
                      <option value="Taguatinga" />
                      <option value="Ceilândia" />
                      <option value="Samambaia" />
                      <option value="Plano Piloto" />
                      <option value="Águas Claras" />
                      <option value="Valparaíso" />
                      <option value="Novo Gama" />
                      <option value="Luziânia" />
                    </datalist>
                  </div>
                </div>
              </div>

              {/* ABA / TOGGLE: ROTA PRIORIDADE */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Aba Rota Prioridade (Urgente)</span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Marque caso esta rota tenha prioridade de saída imediata
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rotaPrioridade}
                    onChange={(e) => setRotaPrioridade(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              {/* Placa & Telefone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Placa do Carro *
                  </label>
                  <div className="relative">
                    <Car className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={placa}
                      onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                      placeholder="ABC-1234"
                      maxLength={8}
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white font-mono placeholder-slate-500 uppercase focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Telefone / WhatsApp (Opcional)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="tel"
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                      placeholder="(61) 99999-8888"
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !isCheckinAllowed}
                  className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer ${
                    isCheckinAllowed
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20'
                      : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-70'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-slate-950" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Registrando Chegada...</span>
                    </>
                  ) : !isCheckinAllowed ? (
                    <>
                      <Navigation className="w-4 h-4" />
                      <span>Check-in Bloqueado (Fora dos 150m da Base)</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Confirmar Chegada & Entrar na Fila</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

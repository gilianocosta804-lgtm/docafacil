import React, { useState, useEffect } from 'react';
import {
  Car,
  Clock,
  Phone,
  User,
  Send,
  CheckCircle,
  ArrowRight,
  Sparkles,
  QrCode,
  ShieldCheck,
  Building2,
  ChevronLeft,
  FileText
} from 'lucide-react';

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

  // 1. Live arrival Date and Time
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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBaseQrCode, setShowBaseQrCode] = useState(false);
  const [submittedData, setSubmittedData] = useState<{
    nome: string;
    placa: string;
    rota: string;
    cidade: string;
    rotaPrioridade: boolean;
  } | null>(null);

  // QR Code URL for Base Arrival Check-in
  const checkinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?view=checkin`
    : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !rota.trim() || !placa.trim()) {
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
        localizacao: 'Pátio da Base (Leitura QR Code)',
        placa: placa.trim().toUpperCase(),
        telefone: telefone.trim(),
      });

      setSubmittedData({
        nome: nome.trim(),
        placa: placa.trim().toUpperCase(),
        rota: rota.trim().toUpperCase(),
        cidade: cidade.trim(),
        rotaPrioridade,
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
            <span>Leitura por QR Code • Pátio da Base</span>
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
                Chegada registrada às <span className="text-white font-mono font-bold">{currentTime}</span> ({currentDate}) com validação via <span className="text-white font-bold">QR Code da Base</span>. Aguarde o aviso sonoro da sua doca!
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
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-200 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  Google Forms Oficial da Base:
                </span>
                <a
                  href={formUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] transition shrink-0 ml-2 shadow-sm"
                >
                  Abrir Forms ↗
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

            {/* QR CODE ARRIVAL CONFIRMATION BADGE */}
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Chegada Validada por Leitura de QR Code</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBaseQrCode(!showBaseQrCode)}
                  className="text-[10px] text-amber-400 hover:text-amber-300 font-mono flex items-center gap-1 cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>{showBaseQrCode ? 'Ocultar QR' : 'Ver QR Code'}</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed">
                Check-in presencial no pátio da base por leitura de QR Code da guarita. Preencha seus dados abaixo para entrar na fila.
              </p>

              {showBaseQrCode && (
                <div className="p-3 bg-white text-slate-900 rounded-xl text-center space-y-1 mx-auto max-w-[200px] mt-2 animate-in fade-in duration-200">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(checkinUrl || 'https://docafacil.app')}`}
                    alt="QR Code de Chegada na Base"
                    className="w-full h-auto mx-auto rounded border border-slate-200"
                  />
                  <p className="text-[10px] text-slate-700 font-mono font-bold">QR Code de Chegada</p>
                </div>
              )}
            </div>

            {/* Input Form Fields */}
            <form onSubmit={handleSubmit} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Nome Completo do Motorista *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Eduardo de Oliveira"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Placa do Veículo *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={8}
                    placeholder="Ex: ABC1D23"
                    value={placa}
                    onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono font-bold text-white placeholder-slate-500 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Rota Alfanumérica *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: DF-01, RT-102"
                    value={rota}
                    onChange={(e) => setRota(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono font-bold text-white placeholder-slate-500 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Cidade Destino (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Gama - DF"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Telefone / WhatsApp
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      placeholder="Ex: (61) 99999-9999"
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  </div>
                </div>
              </div>

              {/* Rota Prioridade Checkbox */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Sua carga é de Rota Prioridade?</span>
                  <span className="text-[11px] text-slate-400">
                    Sinaliza urgência para saída imediata
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={rotaPrioridade}
                  onChange={(e) => setRotaPrioridade(e.target.checked)}
                  className="w-5 h-5 rounded text-amber-500 focus:ring-amber-500/40 bg-slate-900 border-slate-700 cursor-pointer"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-sm uppercase tracking-wider transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Registrando Chegada...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Confirmar Chegada na Base (Entrar na Fila)</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

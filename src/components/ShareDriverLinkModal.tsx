import React, { useState } from 'react';
import {
  Smartphone,
  Copy,
  Check,
  QrCode,
  ExternalLink,
  X,
  Share2,
  Car,
  Tv,
  ClipboardList
} from 'lucide-react';

interface ShareDriverLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenMobileView: () => void;
  onOpenTVView: () => void;
  onOpenCheckinView: () => void;
}

export const ShareDriverLinkModal: React.FC<ShareDriverLinkModalProps> = ({
  isOpen,
  onClose,
  onOpenMobileView,
  onOpenTVView,
  onOpenCheckinView,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeQrUrl, setActiveQrUrl] = useState<string>('');
  const [activeQrTitle, setActiveQrTitle] = useState<string>('');

  if (!isOpen) return null;

  const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '';

  const links = [
    {
      key: 'motorista',
      title: '📱 Chamada de Motoristas (Mobile / Celular)',
      description: 'Versão mobile de acesso aos motoristas com alertas sonoros, vibração, docas livres e posição em tempo real.',
      url: `${baseUrl}?view=motorista`,
      icon: Smartphone,
      color: 'amber',
      openAction: onOpenMobileView,
    },
    {
      key: 'telao',
      title: '📢 Chamada de Motoristas (Telão do Pátio)',
      description: 'Exibir em tela cheia na TV da base ou monitores do pátio para que todos vejam quem foi chamado em tempo real.',
      url: `${baseUrl}?view=telao`,
      icon: Tv,
      color: 'sky',
      openAction: onOpenTVView,
    },
    {
      key: 'checkin',
      title: '📝 Check-in por QR Code na Base',
      description: 'Link oficial com leitura de QR Code na Guarita/Portaria para confirmação de chegada presencial do carro.',
      url: `${baseUrl}?view=checkin`,
      icon: QrCode,
      color: 'emerald',
      openAction: onOpenCheckinView,
    },
  ];

  const handleCopy = (key: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleShareWhatsApp = (title: string, url: string) => {
    const text = encodeURIComponent(
      `🚗 ${title}\nAcesse pelo celular no pátio de carregamento:\n${url}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto space-y-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-2xl">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Central de Links dos Motoristas</h3>
            <p className="text-xs text-slate-400">
              Links públicos separados para acesso de carros e motoristas sem necessidade de login administrativo
            </p>
          </div>
        </div>

        {/* 3 Separate Links */}
        <div className="space-y-3.5">
          {links.map((item) => {
            const Icon = item.icon;
            const isCopied = copiedKey === item.key;

            return (
              <div
                key={item.key}
                className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5 hover:border-slate-700 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-2 rounded-xl ${
                        item.color === 'amber'
                          ? 'bg-amber-500/10 text-amber-400'
                          : item.color === 'sky'
                          ? 'bg-sky-500/10 text-sky-400'
                          : 'bg-emerald-500/10 text-emerald-400'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{item.title}</h4>
                      <p className="text-xs text-slate-400 leading-relaxed max-w-md">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Input and Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                  <input
                    type="text"
                    readOnly
                    value={item.url}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-300 select-all focus:outline-none"
                  />
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleCopy(item.key, item.url)}
                      className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                      title="Copiar link"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopied ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                    <button
                      onClick={() => handleShareWhatsApp(item.title, item.url)}
                      className="p-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 transition cursor-pointer"
                      title="Compartilhar no WhatsApp"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setActiveQrUrl(item.url);
                        setActiveQrTitle(item.title);
                      }}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 transition cursor-pointer"
                      title="Gerar QR Code para Imprimir"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        onClose();
                        item.openAction();
                      }}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 transition cursor-pointer"
                      title="Abrir nesta tela"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal QR Code Preview */}
        {activeQrUrl && (
          <div className="p-4 bg-white rounded-2xl text-center space-y-2 mt-4 text-slate-900 animate-in fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                QR Code: {activeQrTitle}
              </span>
              <button
                onClick={() => setActiveQrUrl('')}
                className="text-xs text-slate-500 hover:text-slate-800 font-bold cursor-pointer"
              >
                Fechar QR
              </button>
            </div>
            <div className="flex justify-center py-2">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                  activeQrUrl
                )}`}
                alt="QR Code"
                className="w-48 h-48 border border-slate-200 rounded shadow-sm"
              />
            </div>
            <p className="text-[11px] text-slate-600 font-mono break-all">{activeQrUrl}</p>
          </div>
        )}
      </div>
    </div>
  );
};

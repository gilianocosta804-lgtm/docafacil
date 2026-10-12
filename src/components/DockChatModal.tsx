import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  X,
  AlertTriangle,
  User,
  Warehouse,
  ShieldCheck,
  Bell,
  Trash2,
  Sparkles
} from 'lucide-react';
import { ChatMessage, AuthorizedUser, Dock } from '../types';
import { realtimeSync, SyncMessage } from '../services/realtimeSync';
import { audioService } from '../services/audioService';

interface DockChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthorizedUser | null;
  docks: Dock[];
  currentDock?: Dock;
  isAdmin: boolean;
}

const STORAGE_CHAT_KEY = 'docafacil_chat_history';

export const DockChatModal: React.FC<DockChatModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  docks,
  currentDock,
  isAdmin,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_CHAT_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [inputMessage, setInputMessage] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [filterDock, setFilterDock] = useState<string>('all');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen, messages]);

  // Realtime subscription for incoming chat messages
  useEffect(() => {
    const unsubscribe = realtimeSync.subscribe((msg: SyncMessage) => {
      if (msg.type === 'CHAT_MESSAGE' && msg.payload) {
        const newMsg: ChatMessage = msg.payload;
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          const updated = [...prev, newMsg];
          try {
            localStorage.setItem(STORAGE_CHAT_KEY, JSON.stringify(updated.slice(-100)));
          } catch {}
          return updated;
        });

        // Chime for incoming message
        if (newMsg.isUrgent) {
          audioService.playDockAlert(newMsg.senderName, newMsg.dockNome || 'Docas', 'Aviso Urgente no Chat');
        } else {
          audioService.playChime();
        }
      }
    });

    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputMessage.trim();
    if (!text) return;

    const senderName = currentUser ? currentUser.name : (isAdmin ? 'Administrador Geral' : 'Operador');
    const senderRole = currentUser ? currentUser.role : (isAdmin ? 'admin_geral' : 'operador');

    // Identify dock: from currentDock or user's assigned dock
    const dockId = currentDock?.id || currentUser?.assignedDockId;
    const dockNome = currentDock?.nome || currentUser?.assignedDockNome || (isAdmin ? 'Central Adm' : 'Doca');

    const newChatMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      senderId: currentUser?.id || 'admin-master',
      senderName,
      senderRole,
      dockId,
      dockNome,
      text,
      timestamp: Date.now(),
      isUrgent,
    };

    // Update locally
    const updated = [...messages, newChatMessage];
    setMessages(updated);
    try {
      localStorage.setItem(STORAGE_CHAT_KEY, JSON.stringify(updated.slice(-100)));
    } catch {}

    // Broadcast across devices / tabs
    realtimeSync.broadcastChatMessage(newChatMessage);

    // Reset input
    setInputMessage('');
    setIsUrgent(false);
  };

  const handleClearHistory = () => {
    if (window.confirm('Deseja limpar o histórico de mensagens deste dispositivo?')) {
      setMessages([]);
      localStorage.removeItem(STORAGE_CHAT_KEY);
    }
  };

  const filteredMessages = messages.filter((m) => {
    if (filterDock === 'all') return true;
    return m.dockId === filterDock;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl h-[85vh] max-h-[680px] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Chat Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-white leading-tight">Chat em Tempo Real: Docas & Administração</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold uppercase shrink-0">
                  Ao Vivo
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                {currentUser
                  ? `Identificado como ${currentUser.name} (${currentUser.assignedDockNome || 'Docas'})`
                  : (isAdmin ? 'Identificado como Administrador Geral' : 'Operação de Docas')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && (
              <button
                type="button"
                onClick={handleClearHistory}
                className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                title="Limpar histórico"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter bar by dock */}
        <div className="px-4 py-2 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between gap-2 overflow-x-auto text-xs shrink-0">
          <div className="flex items-center gap-1.5">
            <Warehouse className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-400 font-medium">Filtrar Doca:</span>
            <button
              type="button"
              onClick={() => setFilterDock('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                filterDock === 'all'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Todas ({messages.length})
            </button>
            {docks.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setFilterDock(d.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer shrink-0 ${
                  filterDock === d.id
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {d.nome}
              </button>
            ))}
          </div>
        </div>

        {/* Messages Body */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-950/60">
          {filteredMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
              <MessageSquare className="w-10 h-10 text-slate-700" />
              <p className="text-sm font-semibold">Nenhuma mensagem no canal</p>
              <p className="text-xs max-w-sm">
                Envie recados, solicitações de apoio, dúvidas sobre rotas ou comunicados entre as mesas das docas e a administração.
              </p>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const isMine =
                (currentUser && msg.senderId === currentUser.id) ||
                (isAdmin && msg.senderRole === 'admin_geral');

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} space-y-1`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 px-1 font-mono">
                    <span className="font-bold text-white">{msg.senderName}</span>
                    <span>·</span>
                    <span className="text-amber-300 font-semibold">{msg.dockNome || 'Docas'}</span>
                    <span>·</span>
                    <span>
                      {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div
                    className={`p-3 rounded-2xl max-w-[85%] text-xs shadow-md ${
                      msg.isUrgent
                        ? 'bg-rose-950/90 text-rose-100 border-2 border-rose-500 ring-2 ring-rose-500/20'
                        : isMine
                        ? 'bg-amber-500 text-slate-950 font-medium rounded-tr-none'
                        : 'bg-slate-800/90 text-slate-100 border border-slate-700 rounded-tl-none'
                    }`}
                  >
                    {msg.isUrgent && (
                      <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] text-rose-300 mb-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Aviso Urgente / Apoio</span>
                      </div>
                    )}
                    <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="p-3 bg-slate-900 border-t border-slate-800 space-y-2 shrink-0">
          <div className="flex items-center justify-between text-xs px-1">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 select-none">
              <input
                type="checkbox"
                checked={isUrgent}
                onChange={(e) => setIsUrgent(e.target.checked)}
                className="w-4 h-4 rounded text-rose-500 bg-slate-950 border-slate-700 focus:ring-rose-500"
              />
              <span className={`text-[11px] font-semibold flex items-center gap-1 ${isUrgent ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>
                <AlertTriangle className="w-3.5 h-3.5" />
                Sinalizar como Urgente / Chamada de Apoio
              </span>
            </label>

            <span className="text-[10px] font-mono text-slate-500">
              Transmitido em tempo real para todas as docas
            </span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={`Escrever mensagem para a administração ou docas...`}
              className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim()}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Enviar</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

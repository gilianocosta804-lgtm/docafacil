import React, { useState } from 'react';
import {
  Package,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  X,
  Warehouse,
  Send,
  Sparkles,
  User,
  ShieldCheck
} from 'lucide-react';
import { PackageTransfer, Dock, AuthorizedUser } from '../types';

interface PackageTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  transfers: PackageTransfer[];
  onSignalTransfer: (transfer: Omit<PackageTransfer, 'id' | 'timestamp' | 'status'>) => void;
  onConfirmReceipt: (transferId: string) => void;
  docks: Dock[];
  currentDock?: Dock;
  currentUser: AuthorizedUser | null;
  isAdmin: boolean;
}

export const PackageTransferModal: React.FC<PackageTransferModalProps> = ({
  isOpen,
  onClose,
  transfers,
  onSignalTransfer,
  onConfirmReceipt,
  docks,
  currentDock,
  currentUser,
  isAdmin,
}) => {
  const [activeTab, setActiveTab] = useState<'nova' | 'pendentes' | 'historico'>('nova');
  const [codigoPacote, setCodigoPacote] = useState('');
  const [descricao, setDescricao] = useState('');
  const [origemDocaId, setOrigemDocaId] = useState(currentDock?.id || docks[0]?.id || '');
  const [rotaOrigem, setRotaOrigem] = useState(currentDock?.motoristaAtual?.rota || '');
  const [rotaDestino, setRotaDestino] = useState('');
  const [destinoDocaId, setDestinoDocaId] = useState('');
  const [observacao, setObservacao] = useState('');
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoPacote.trim() || !rotaDestino.trim()) return;

    const sourceDock = docks.find((d) => d.id === origemDocaId) || currentDock || docks[0];
    const targetDock = docks.find((d) => d.id === destinoDocaId);

    const collaboratorName = currentUser ? currentUser.name : (sourceDock?.colaboradorNome || 'Operador de Doca');

    onSignalTransfer({
      codigoPacote: codigoPacote.trim().toUpperCase(),
      descricao: descricao.trim(),
      origemDocaId: sourceDock?.id || 'dock-origem',
      origemDocaNome: sourceDock?.nome || 'Doca Origem',
      origemColaboradorNome: collaboratorName,
      rotaOrigem: rotaOrigem.trim().toUpperCase() || 'ROTA ATUAL',
      rotaDestino: rotaDestino.trim().toUpperCase(),
      destinoDocaId: targetDock?.id,
      destinoDocaNome: targetDock?.nome,
      observacao: observacao.trim(),
    });

    setSuccessNotice(`Pacote ${codigoPacote.trim().toUpperCase()} sinalizado com sucesso para a rota ${rotaDestino.trim().toUpperCase()}!`);
    setCodigoPacote('');
    setDescricao('');
    setRotaDestino('');
    setObservacao('');
    setTimeout(() => {
      setSuccessNotice(null);
      setActiveTab('pendentes');
    }, 1500);
  };

  const pendingTransfers = transfers.filter((t) => t.status === 'pendente');
  const completedTransfers = transfers.filter((t) => t.status !== 'pendente');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white leading-tight">Remanejamento de Pacotes Entre Rotas</h2>
                {pendingTransfers.length > 0 && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    {pendingTransfers.length} pendente(s)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Sinalize previamente antes de transferir volumes. A doca de destino será alertada em tempo real!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switchers */}
        <div className="px-5 pt-3 border-b border-slate-800 bg-slate-950/40 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('nova')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'nova'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            + Sinalizar Transferência
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pendentes')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'pendentes'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <span>Pendentes</span>
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
              {pendingTransfers.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('historico')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'historico'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Histórico ({completedTransfers.length})
          </button>
        </div>

        {/* Modal content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {successNotice && (
            <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* TAB 1: FORM TO SIGNAL TRANSFER */}
          {activeTab === 'nova' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Ao sinalizar o pacote, um aviso imediato aparecerá no painel de todas as docas. Assim que a doca responsável pela rota de destino assumir o carregamento, ela receberá um alerta automático sonoro e visual para conferência física.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-200 block mb-1">
                    Código do Pacote / Volume *
                  </label>
                  <input
                    type="text"
                    required
                    value={codigoPacote}
                    onChange={(e) => setCodigoPacote(e.target.value)}
                    placeholder="Ex: PCK-9921 ou Bipagem"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-200 block mb-1">
                    Descrição / Conteúdo (Opcional)
                  </label>
                  <input
                    type="text"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Ex: Caixa média, Frágil, Envelope"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-200 block mb-1">
                    Doca de Origem (Onde o pacote está) *
                  </label>
                  <select
                    value={origemDocaId}
                    onChange={(e) => setOrigemDocaId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {docks.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nome} {d.colaboradorNome ? `(${d.colaboradorNome})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-200 block mb-1">
                    Rota de Origem
                  </label>
                  <input
                    type="text"
                    value={rotaOrigem}
                    onChange={(e) => setRotaOrigem(e.target.value)}
                    placeholder="Ex: SP-01 ou Rota Atual"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-amber-300 block mb-1">
                    Rota de Destino Obrigatória *
                  </label>
                  <input
                    type="text"
                    required
                    value={rotaDestino}
                    onChange={(e) => setRotaDestino(e.target.value)}
                    placeholder="Ex: SAN-01, SJC-03, CPN-08"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-amber-500/60 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-200 block mb-1">
                    Doca de Destino Prevista (Se souber)
                  </label>
                  <select
                    value={destinoDocaId}
                    onChange={(e) => setDestinoDocaId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">Qualquer doca que carregar esta rota</option>
                    {docks.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nome} {d.colaboradorNome ? `· ${d.colaboradorNome}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-200 block mb-1">
                  Motivo da Transferência / Observações
                </label>
                <input
                  type="text"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Ex: Pacote bipado por engano na Doca 01 / Remanejamento por volume excessivo"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={!codigoPacote.trim() || !rotaDestino.trim()}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-md"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Sinalizar Transferência Agora</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: PENDING TRANSFERS */}
          {activeTab === 'pendentes' && (
            <div className="space-y-3">
              {pendingTransfers.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800 text-slate-500 space-y-2">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/60" />
                  <p className="text-sm font-semibold text-slate-300">Nenhum pacote com transferência pendente</p>
                  <p className="text-xs">Todas as rotas e docas estão sincronizadas sem pacotes pendentes de recebimento.</p>
                </div>
              ) : (
                pendingTransfers.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-slate-950/80 border border-amber-500/40 space-y-3 shadow-md"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-amber-500 text-slate-950">
                          {item.codigoPacote}
                        </span>
                        {item.descricao && (
                          <span className="text-xs font-semibold text-white">
                            {item.descricao}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Sinalizado às {new Date(item.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      <div className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-1.5">
                        <span className="text-slate-500">De:</span>
                        <span className="font-bold text-slate-200">{item.origemDocaNome}</span>
                        <span className="font-mono text-amber-300">({item.rotaOrigem})</span>
                      </div>

                      <ArrowRight className="w-4 h-4 text-amber-400 shrink-0" />

                      <div className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center gap-1.5">
                        <span className="text-slate-400">Para Rota:</span>
                        <span className="font-mono font-bold text-amber-300 text-sm">{item.rotaDestino}</span>
                        {item.destinoDocaNome && (
                          <span className="text-slate-300">({item.destinoDocaNome})</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px]">
                      <span className="text-slate-400">
                        Sinalizado por: <strong className="text-white">{item.origemColaboradorNome}</strong>
                        {item.observacao ? ` · Obs: "${item.observacao}"` : ''}
                      </span>

                      <button
                        type="button"
                        onClick={() => onConfirmReceipt(item.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm shrink-0"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirmar Recebimento</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: HISTORY */}
          {activeTab === 'historico' && (
            <div className="space-y-2.5">
              {completedTransfers.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Nenhum pacote transferido anteriormente no histórico.
                </div>
              ) : (
                completedTransfers.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 flex items-center justify-between text-xs gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-emerald-400">{item.codigoPacote}</span>
                        <span className="text-slate-300">Rota {item.rotaDestino}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          (De {item.origemDocaNome})
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Recebido por {item.recebidoPorNome || 'Colaborador'} às{' '}
                        {item.recebidoEm
                          ? new Date(item.recebidoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                          : '--:--'}
                      </p>
                    </div>

                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase shrink-0">
                      Entregue
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500 font-mono shrink-0">
          <span>Sinalização com alerta instantâneo entre colaboradores</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

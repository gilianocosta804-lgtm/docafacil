import React, { useState } from 'react';
import {
  Package,
  Shield,
  ShieldAlert,
  CheckCircle2,
  X,
  UserCheck,
  AlertCircle,
  Hash
} from 'lucide-react';
import { Dock, DriverEntry } from '../types';

interface LoadingDetailsModalProps {
  isOpen: boolean;
  dock: Dock | null;
  driver: DriverEntry | null;
  collaboratorName?: string;
  isAdmin: boolean;
  onClose: () => void;
  onConfirm: (data: {
    quantidadeCarregada: number;
    numeroIsca?: string;
    colaboradorResponsavel: string;
  }) => Promise<void>;
  isLoading: boolean;
}

export const LoadingDetailsModal: React.FC<LoadingDetailsModalProps> = ({
  isOpen,
  dock,
  driver,
  collaboratorName,
  isAdmin,
  onClose,
  onConfirm,
  isLoading,
}) => {
  const [quantidade, setQuantidade] = useState<string>(
    driver?.quantidadeCarregada ? String(driver.quantidadeCarregada) : ''
  );
  const [numeroIsca, setNumeroIsca] = useState<string>(driver?.numeroIsca || '');
  const [responsavel, setResponsavel] = useState<string>(
    collaboratorName || driver?.colaboradorResponsavel || dock?.colaboradorNome || ''
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !dock || !driver) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qtyNum = parseInt(quantidade, 10);
    if (isNaN(qtyNum) || qtyNum < 0) {
      setErrorMsg('Informe uma quantidade válida de volumes/pacotes carregados.');
      return;
    }

    setErrorMsg(null);
    await onConfirm({
      quantidadeCarregada: qtyNum,
      numeroIsca: numeroIsca.trim() || undefined,
      colaboradorResponsavel: responsavel.trim() || 'Operador de Doca',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                Finalizar Carregamento & Liberação da {dock.nome}
              </h2>
              <p className="text-xs text-slate-400">
                Registro de volumes carregados e isca de segurança
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Driver Summary Card */}
        <div className="p-4 mx-5 mt-5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-500 block leading-none">
              Motorista / Rota
            </span>
            <p className="text-sm font-bold text-white mt-1 leading-snug">{driver.nome}</p>
            <p className="text-xs font-mono text-sky-400 mt-0.5">
              {driver.rota} {driver.cidade ? `· ${driver.cidade}` : ''}
            </p>
          </div>
          <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-900 text-emerald-400 border border-slate-700">
            {driver.placa}
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quantidade Carregada */}
          <div>
            <label className="block text-xs font-mono font-semibold text-slate-300 uppercase mb-1">
              Quantidade de Volumes / Pacotes Carregados *
            </label>
            <div className="relative">
              <Hash className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="number"
                min="0"
                step="1"
                required
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                placeholder="Ex: 45"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Informe o total de volumes bipados e colocados no carro.
            </p>
          </div>

          {/* Colaborador Acompanhando */}
          <div>
            <label className="block text-xs font-mono font-semibold text-slate-300 uppercase mb-1">
              Colaborador que Acompanhou a Doca *
            </label>
            <div className="relative">
              <UserCheck className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                required
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                placeholder="Nome do colaborador responsável"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Número da Isca (Confidencial ADM) */}
          <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-bold text-amber-300 flex items-center gap-1.5 uppercase">
                <Shield className="w-4 h-4 text-amber-400" />
                <span>Número da Isca de Segurança (Rastreador)</span>
              </label>
              <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                Exclusivo ADM
              </span>
            </div>

            <input
              type="text"
              value={numeroIsca}
              onChange={(e) => setNumeroIsca(e.target.value)}
              placeholder="Ex: ISCA-98421 (opcional)"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
            />

            <p className="text-[11px] text-amber-300/80 leading-relaxed">
              ⚠️ <strong>Regra de Sigilo:</strong> O número da isca fica protegido e visível <strong>apenas no painel de Administrador Geral e Gerenciamento</strong>. Não aparece para motoristas nem para colaboradores sem permissão.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isLoading ? 'Salvando...' : 'Concluir & Liberar Doca'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

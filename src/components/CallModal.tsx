import React, { useState, useEffect } from 'react';
import { Car, MapPin, X, ArrowRight, Clock, ShieldCheck, Lock, AlertTriangle } from 'lucide-react';
import { DriverEntry, Dock, AuthorizedUser } from '../types';

interface CallModalProps {
  isOpen: boolean;
  driver: DriverEntry | null;
  docks: Dock[];
  preselectedDockId?: string;
  onClose: () => void;
  onConfirmCall: (driver: DriverEntry, dock: Dock) => void;
  isLoading?: boolean;
  activeSession?: AuthorizedUser | null;
  isAdmin?: boolean;
}

export const CallModal: React.FC<CallModalProps> = ({
  isOpen,
  driver,
  docks,
  preselectedDockId,
  onClose,
  onConfirmCall,
  isLoading = false,
  activeSession,
  isAdmin = false,
}) => {
  const isOperator = !isAdmin && activeSession?.role === 'operador';
  const operatorAssignedDockId = activeSession?.assignedDockId;

  const initialDockId = isOperator && operatorAssignedDockId
    ? operatorAssignedDockId
    : (preselectedDockId || docks.find(d => d.status === 'livre')?.id || docks[0]?.id || '');

  const [selectedDockId, setSelectedDockId] = useState<string>(initialDockId);

  useEffect(() => {
    if (isOperator && operatorAssignedDockId) {
      setSelectedDockId(operatorAssignedDockId);
    } else if (preselectedDockId) {
      setSelectedDockId(preselectedDockId);
    }
  }, [isOperator, operatorAssignedDockId, preselectedDockId]);

  if (!isOpen || !driver) return null;

  const targetDock = docks.find(d => d.id === selectedDockId);
  const isTargetDockFree = targetDock?.status === 'livre';

  // An operator can only confirm call if their own dock is free and selected
  const canConfirm = targetDock && (isAdmin ? isTargetDockFree : (isTargetDockFree && targetDock.id === operatorAssignedDockId));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDock) return;
    if (isOperator) {
      if (!operatorAssignedDockId || targetDock.id !== operatorAssignedDockId) {
        alert(`Acesso restrito: Como operador, você só pode chamar carros para sua própria doca (${activeSession?.assignedDockNome || 'sua mesa'}).`);
        return;
      }
    }
    if (!canConfirm) return;
    onConfirmCall(driver, targetDock);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-amber-500/30 rounded-2xl p-6 shadow-2xl text-slate-100">
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-xl">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Chamar Carro para Doca</h3>
            <p className="text-xs text-slate-400">
              Acionará alerta sonoro no pátio, telão e celular do motorista
            </p>
          </div>
        </div>

        {/* Driver Details Card */}
        <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 space-y-3 mb-5">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs uppercase font-mono tracking-wider text-amber-400 font-semibold">Motorista</span>
              <h4 className="text-lg font-bold text-white">{driver.nome}</h4>
            </div>
            <div className="text-right">
              <span className="text-xs uppercase font-mono tracking-wider text-slate-400">Placa</span>
              <p className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/30">
                {driver.placa}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
            <div className="flex items-center gap-1.5 text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">{driver.localizacao || 'Pátio da Base (QR Code)'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Chegada: {driver.horarioChegada}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 text-xs flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold">Rota:</span>
              <span className="font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                {driver.rota}
              </span>
              {driver.cidade && (
                <span className="text-white font-medium">({driver.cidade})</span>
              )}
              {driver.rotaPrioridade && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                  ROTA PRIORIDADE
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Dock Selection */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            {isOperator && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2 mb-3">
                <Lock className="w-4 h-4 shrink-0 text-amber-400" />
                <span>
                  <strong>Regra Operacional:</strong> Você só pode chamar carros para a sua própria doca (<strong>{activeSession?.assignedDockNome || 'sua doca'}</strong>). Todas as outras docas estão bloqueadas para este operador.
                </span>
              </div>
            )}

            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                {isOperator ? 'Sua Doca Exclusiva de Chamada:' : 'Selecione a Doca de Carregamento:'}
              </label>
              {isOperator && (
                <span className="text-[10px] font-mono text-amber-400 flex items-center gap-1 font-bold">
                  <Lock className="w-3 h-3 text-amber-400" />
                  Bloqueio Ativo (Docas de Terceiros)
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {docks.map((dock) => {
                const isSelected = selectedDockId === dock.id;
                const isFree = dock.status === 'livre';
                const isDockAllowed = isAdmin || (isOperator && dock.id === operatorAssignedDockId);

                return (
                  <button
                    key={dock.id}
                    type="button"
                    disabled={!isDockAllowed || (!isAdmin && !isFree)}
                    onClick={() => {
                      if (isDockAllowed) setSelectedDockId(dock.id);
                    }}
                    className={`p-3 rounded-xl border text-left transition relative ${
                      !isDockAllowed
                        ? 'bg-slate-950/60 border-slate-900 text-slate-600 cursor-not-allowed opacity-40'
                        : isSelected
                        ? 'bg-amber-500/20 border-amber-400 text-white shadow-md ring-2 ring-amber-400/40 cursor-pointer'
                        : isFree
                        ? 'bg-slate-800/80 border-slate-700 hover:border-slate-500 text-slate-200 cursor-pointer'
                        : 'bg-slate-900/40 border-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm">{dock.nome}</span>
                      {!isDockAllowed ? (
                        <Lock className="w-3.5 h-3.5 text-slate-600" />
                      ) : (
                        <span
                          className={`w-2 h-2 rounded-full ${
                            dock.status === 'livre'
                              ? 'bg-emerald-400'
                              : dock.status === 'chamando'
                              ? 'bg-amber-400 animate-ping'
                              : dock.status === 'carregando'
                              ? 'bg-sky-400'
                              : 'bg-rose-400'
                          }`}
                        />
                      )}
                    </div>
                    <span className="text-[10px] uppercase font-mono block opacity-80">
                      {!isDockAllowed
                        ? 'Outro Operador'
                        : dock.status === 'livre'
                        ? 'Livre'
                        : dock.status === 'chamando'
                        ? 'Chamando'
                        : dock.status === 'carregando'
                        ? 'Carregando'
                        : 'Manutenção'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Operator Status Feedback */}
          {isOperator && !isTargetDockFree && (
            <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                Sua doca ({activeSession?.assignedDockNome || targetDock?.nome || 'sua mesa'}) não está livre no momento. Conclua o carregamento atual para chamar este carro.
              </span>
            </div>
          )}

          {isOperator && isTargetDockFree && (
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>
                Carro será chamado exclusivamente para sua doca: <strong>{targetDock?.nome}</strong> ({activeSession?.name}).
              </span>
            </div>
          )}

          {/* Voice Preview Box */}
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-400">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5 mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              Alerta por Voz & Visual ao Disparar:
            </span>
            <p className="italic text-slate-300">
              &ldquo;Atenção: Motorista <span className="text-amber-400 font-semibold">{driver.nome}</span>, comparecer imediatamente à <span className="text-amber-400 font-semibold">{targetDock?.nome || 'Doca Selecionada'}</span> para carregamento!&rdquo;
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-300 text-sm font-semibold transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!targetDock || isLoading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-sm font-bold transition shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-slate-950" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Disparando Chamada...</span>
                </>
              ) : (
                <>
                  <span>Confirmar e Chamar</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

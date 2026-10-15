import React, { useState } from 'react';
import {
  Search,
  Filter,
  BellRing,
  CheckCircle,
  Play,
  XCircle,
  Clock,
  MapPin,
  Car,
  Phone,
  UserCheck,
  Package,
  Shield,
  ShieldAlert,
  Lock
} from 'lucide-react';
import { DriverEntry, DriverStatus, Dock, AuthorizedUser } from '../types';

interface DriverQueueTableProps {
  drivers: DriverEntry[];
  docks: Dock[];
  onCallDriver: (driver: DriverEntry) => void;
  onUpdateStatus: (driver: DriverEntry, newStatus: DriverStatus, dockName?: string) => void;
  isAdmin?: boolean;
  activeSession?: AuthorizedUser | null;
}

export const DriverQueueTable: React.FC<DriverQueueTableProps> = ({
  drivers,
  docks,
  onCallDriver,
  onUpdateStatus,
  isAdmin = false,
  activeSession = null,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  const myDockNome = activeSession?.assignedDockNome;
  const isOperator = !isAdmin && activeSession?.role === 'operador';
  const myAssignedDock = docks.find((d) => d.id === activeSession?.assignedDockId);
  const isMyDockFree = myAssignedDock ? myAssignedDock.status === 'livre' : false;

  // Filter drivers
  const filteredDrivers = drivers.filter((driver) => {
    const matchesSearch =
      driver.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.rota.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.localizacao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (driver.colaboradorResponsavel && driver.colaboradorResponsavel.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === 'todos') return true;
    if (statusFilter === 'minha_doca' && myDockNome) {
      return driver.docaDesignada?.toLowerCase() === myDockNome.toLowerCase();
    }
    if (statusFilter === 'aguardando') return driver.status === 'aguardando';
    if (statusFilter === 'em_operacao')
      return driver.status === 'chamado' || driver.status === 'carregando';
    if (statusFilter === 'concluido') return driver.status === 'concluido';

    return true;
  });

  // Calculate waiting queue position for 'aguardando' drivers, prioritizing rotaPrioridade
  let queueCounter = 0;
  const queuePositions = new Map<string, number>();

  const waitingDriversSorted = [...drivers]
    .filter((d) => d.status === 'aguardando')
    .sort((a, b) => {
      if (a.rotaPrioridade && !b.rotaPrioridade) return -1;
      if (!a.rotaPrioridade && b.rotaPrioridade) return 1;
      return (a.rowIndex || 0) - (b.rowIndex || 0);
    });

  waitingDriversSorted.forEach((d) => {
    queueCounter++;
    queuePositions.set(d.id, queueCounter);
  });

  const getStatusBadge = (status: DriverStatus, doca?: string) => {
    switch (status) {
      case 'aguardando':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Clock className="w-3 h-3" />
            Aguardando
          </span>
        );
      case 'chamado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500/20 text-orange-300 border border-orange-500/40 animate-pulse">
            <BellRing className="w-3 h-3" />
            {doca ? `Chamado (${doca})` : 'Chamado'}
          </span>
        );
      case 'carregando':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30">
            <Car className="w-3 h-3" />
            {doca ? `Carregando (${doca})` : 'Carregando'}
          </span>
        );
      case 'concluido':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle className="w-3 h-3" />
            Concluído
          </span>
        );
      case 'cancelado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            <XCircle className="w-3 h-3" />
            Cancelado
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Top search & filter bar */}
      <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, placa, rota, colaborador ou localização..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setStatusFilter('todos')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
              statusFilter === 'todos'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Todos ({drivers.length})
          </button>

          {myDockNome && !isAdmin && (
            <button
              onClick={() => setStatusFilter('minha_doca')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
                statusFilter === 'minha_doca'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                  : 'bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20'
              }`}
            >
              Minha Doca ({myDockNome})
            </button>
          )}

          <button
            onClick={() => setStatusFilter('aguardando')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
              statusFilter === 'aguardando'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Fila / Aguardando ({drivers.filter((d) => d.status === 'aguardando').length})
          </button>
          <button
            onClick={() => setStatusFilter('em_operacao')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
              statusFilter === 'em_operacao'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Nas Docas ({drivers.filter((d) => d.status === 'chamado' || d.status === 'carregando').length})
          </button>
          <button
            onClick={() => setStatusFilter('concluido')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
              statusFilter === 'concluido'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Concluídos ({drivers.filter((d) => d.status === 'concluido').length})
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-950/60 text-slate-400 font-mono text-xs uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-3.5 px-4 w-16 text-center">Fila</th>
              <th className="py-3.5 px-4">Motorista / Placa</th>
              <th className="py-3.5 px-4">Rota / Destino</th>
              <th className="py-3.5 px-4">Doca & Colaborador</th>
              <th className="py-3.5 px-4">Carga & Isca</th>
              <th className="py-3.5 px-4">Chegada</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {filteredDrivers.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500">
                  <Car className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  Nenhum carro ou motorista encontrado para os filtros selecionados.
                </td>
              </tr>
            ) : (
              filteredDrivers.map((driver) => {
                const pos = queuePositions.get(driver.id);
                const isNextInLine = pos === 1;

                // Collaborator restriction: can move only cars of their dock
                const isAssignedToMyDock =
                  !myDockNome ||
                  !driver.docaDesignada ||
                  driver.docaDesignada.toLowerCase() === myDockNome.toLowerCase();
                const canOperateThisDriver = isAdmin || isAssignedToMyDock;

                return (
                  <tr
                    key={driver.id}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      isNextInLine ? 'bg-amber-500/5' : ''
                    }`}
                  >
                    {/* Queue position badge */}
                    <td className="py-3.5 px-4 text-center">
                      {pos ? (
                        <span
                          className={`inline-flex items-center justify-center w-7 h-7 rounded-lg font-mono font-bold text-xs ${
                            isNextInLine
                              ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400/50 animate-pulse'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                          title={isNextInLine ? 'Próximo a ser chamado' : `Posição ${pos} na fila`}
                        >
                          #{pos}
                        </span>
                      ) : (
                        <span className="text-slate-600 font-mono text-xs">-</span>
                      )}
                    </td>

                    {/* Driver & Plate */}
                    <td className="py-3.5 px-4">
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          <span>{driver.nome}</span>
                          {isNextInLine && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              PRÓXIMO
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700 leading-none inline-block">
                            {driver.placa}
                          </span>
                          {driver.telefone && (
                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-500" />
                              {driver.telefone}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Route & City */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
                            {driver.rota}
                          </span>
                          {driver.rotaPrioridade && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                              PRIORIDADE
                            </span>
                          )}
                        </div>
                        {driver.cidade && (
                          <span className="text-xs text-slate-300 font-medium block">
                            {driver.cidade}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Doca & Colaborador */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        {driver.docaDesignada ? (
                          <span className="font-mono font-bold text-xs text-amber-300 block">
                            {driver.docaDesignada}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 italic block">Não atribuída</span>
                        )}
                        {driver.colaboradorResponsavel && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-300">
                            <UserCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span className="truncate max-w-[130px]">{driver.colaboradorResponsavel}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Carga & Isca (Confidencial ADM) */}
                    <td className="py-3.5 px-4 font-mono text-xs">
                      <div className="space-y-1">
                        {driver.quantidadeCarregada ? (
                          <div className="text-emerald-400 font-bold flex items-center gap-1">
                            <Package className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>{driver.quantidadeCarregada} volumes</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">-- volumes</span>
                        )}

                        {/* ISCA CONFIDENTIALITY */}
                        {driver.numeroIsca ? (
                          isAdmin ? (
                            <div className="text-amber-300 font-bold text-[11px] flex items-center gap-1" title="Isca Confidencial ADM">
                              <Shield className="w-3 h-3 text-amber-400 shrink-0" />
                              <span>Isca: {driver.numeroIsca}</span>
                            </div>
                          ) : (
                            <div className="text-slate-500 text-[10px] flex items-center gap-1" title="Confidencial Administrador">
                              <Shield className="w-3 h-3 text-slate-500 shrink-0" />
                              <span>Isca: •••••• (ADM)</span>
                            </div>
                          )
                        ) : null}
                      </div>
                    </td>

                    {/* Arrival Time */}
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-400/80" />
                        <span>{driver.horarioChegada}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 block truncate max-w-[120px] mt-0.5">
                        {driver.localizacao}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      {getStatusBadge(driver.status, driver.docaDesignada)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {driver.status === 'aguardando' && (
                          <button
                            onClick={() => onCallDriver(driver)}
                            disabled={isOperator && (!activeSession?.assignedDockId || !isMyDockFree)}
                            title={
                              isOperator
                                ? !activeSession?.assignedDockId
                                  ? 'Você não possui doca atribuída para chamar'
                                  : !isMyDockFree
                                  ? `Sua doca (${myDockNome || 'sua doca'}) não está livre no momento`
                                  : `Chamar para sua doca (${myDockNome || 'sua doca'})`
                                : 'Chamar motorista para uma doca livre'
                            }
                            className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition shadow-sm ${
                              isOperator && (!activeSession?.assignedDockId || !isMyDockFree)
                                ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-50'
                                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20 cursor-pointer'
                            }`}
                          >
                            <BellRing className="w-3.5 h-3.5" />
                            <span>{isOperator ? `Chamar (${myDockNome || 'Doca'})` : 'Chamar'}</span>
                          </button>
                        )}

                        {driver.status === 'chamado' && (
                          <button
                            onClick={() => onUpdateStatus(driver, 'carregando', driver.docaDesignada)}
                            disabled={!canOperateThisDriver}
                            className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                            title={!canOperateThisDriver ? 'Restrito à doca atribuída' : 'Iniciar Carregamento'}
                          >
                            <Play className="w-3 h-3 fill-current" />
                            Carregar
                          </button>
                        )}

                        {driver.status === 'carregando' && (
                          <button
                            onClick={() => onUpdateStatus(driver, 'concluido', driver.docaDesignada)}
                            disabled={!canOperateThisDriver}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                            title={!canOperateThisDriver ? 'Restrito à doca atribuída' : 'Concluir Carregamento'}
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Concluir
                          </button>
                        )}

                        {driver.status !== 'cancelado' && driver.status !== 'concluido' && (
                          <button
                            onClick={() => onUpdateStatus(driver, 'cancelado')}
                            disabled={!canOperateThisDriver}
                            className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition disabled:opacity-30"
                            title="Cancelar/Dispensar Motorista"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

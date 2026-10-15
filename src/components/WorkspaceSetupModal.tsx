import React, { useState } from 'react';
import {
  FileSpreadsheet,
  FileText,
  ExternalLink,
  Check,
  Copy,
  PlusCircle,
  Link as LinkIcon,
  X,
  QrCode,
  Sparkles,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { GoogleSheetsService } from '../services/sheetsService';
import { GoogleFormsService } from '../services/formsService';
import { WorkspaceConfig } from '../types';

interface WorkspaceSetupModalProps {
  isOpen: boolean;
  config: WorkspaceConfig;
  accessToken: string | null;
  onClose: () => void;
  onSaveConfig: (newConfig: WorkspaceConfig) => void;
  onTriggerSync: () => void;
}

export const WorkspaceSetupModal: React.FC<WorkspaceSetupModalProps> = ({
  isOpen,
  config,
  accessToken,
  onClose,
  onSaveConfig,
  onTriggerSync,
}) => {
  const [spreadsheetIdInput, setSpreadsheetIdInput] = useState(config.spreadsheetId || '');
  const [formUrlInput, setFormUrlInput] = useState(config.formResponderUrl || config.formUrl || '');
  const [syncInterval, setSyncInterval] = useState(config.autoSyncInterval || 5);
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [creationStatus, setCreationStatus] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Extract ID from full Google Sheets URL if pasted
  const parseSpreadsheetId = (raw: string): string => {
    const trimmed = raw.trim();
    const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      return match[1];
    }
    return trimmed;
  };

  const todayFormatted = new Date().toLocaleDateString('pt-BR');
  const todayIso = new Date().toISOString().slice(0, 10);

  const handleCreateAutoWorkspace = async (isNewDay: boolean = false) => {
    if (!accessToken) {
      setErrorMsg('Faça login com sua conta Google autorizada primeiro para criar os recursos.');
      return;
    }

    try {
      setIsCreatingWorkspace(true);
      setErrorMsg(null);

      const titleSuffix = `${todayFormatted}`;
      setCreationStatus(`Criando Planilha Diária da Chamada (${titleSuffix})...`);
      const sheetResult = await GoogleSheetsService.createSpreadsheet(
        accessToken,
        `Chamada de Motoristas - ${titleSuffix}`
      );

      setCreationStatus(`Criando Google Forms Diário (${titleSuffix})...`);
      const formResult = await GoogleFormsService.createDriverArrivalForm(
        accessToken,
        `Check-in de Chegada de Motoristas - ${titleSuffix}`
      );

      // Preserve permanent auth spreadsheet, if any
      const permanentAuthSpreadsheetId = config.authSpreadsheetId || sheetResult.spreadsheetId;
      const permanentAuthSheetName = config.authSheetName || 'Acessos_Autorizados';

      const newDailyItem = {
        date: todayIso,
        formattedDate: todayFormatted,
        spreadsheetId: sheetResult.spreadsheetId,
        spreadsheetUrl: sheetResult.spreadsheetUrl,
        sheetName: sheetResult.sheetName,
        formId: formResult.formId,
        formUrl: formResult.editUri,
        formResponderUrl: formResult.responderUri,
        createdAt: new Date().toLocaleTimeString('pt-BR'),
      };

      const existingHistory = config.dailyWorkspaces || [];
      const updatedHistory = [newDailyItem, ...existingHistory.filter((item) => item.date !== todayIso)];

      const newConfig: WorkspaceConfig = {
        ...config,
        spreadsheetId: sheetResult.spreadsheetId,
        spreadsheetUrl: sheetResult.spreadsheetUrl,
        sheetName: sheetResult.sheetName,
        formId: formResult.formId,
        formUrl: formResult.editUri,
        formResponderUrl: formResult.responderUri,
        autoSyncInterval: syncInterval,
        lastSyncTimestamp: Date.now(),
        isSyncing: false,
        activeDailyDate: todayFormatted,
        authSpreadsheetId: permanentAuthSpreadsheetId,
        authSheetName: permanentAuthSheetName,
        dailyWorkspaces: updatedHistory,
      };

      onSaveConfig(newConfig);
      setSpreadsheetIdInput(sheetResult.spreadsheetId);
      setCreationStatus(`Sucesso! Nova Planilha e Formulário para o dia ${todayFormatted} prontos.`);
    } catch (err: any) {
      console.error('Error creating workspace resources:', err);
      setErrorMsg(err?.message || 'Erro ao criar recursos no Google Workspace.');
    } finally {
      setIsCreatingWorkspace(false);
    }
  };

  const handleSaveManual = () => {
    const cleanId = parseSpreadsheetId(spreadsheetIdInput);
    const cleanForm = formUrlInput.trim();
    const newConfig: WorkspaceConfig = {
      ...config,
      spreadsheetId: cleanId,
      spreadsheetUrl: cleanId ? `https://docs.google.com/spreadsheets/d/${cleanId}/edit` : '',
      formUrl: cleanForm || config.formUrl,
      formResponderUrl: cleanForm || config.formResponderUrl,
      autoSyncInterval: syncInterval,
    };
    onSaveConfig(newConfig);
    onTriggerSync();
    onClose();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const formShareUrl =
    config.formResponderUrl ||
    (config.formId ? `https://docs.google.com/forms/d/e/${config.formId}/viewform` : '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Integração Google Sheets & Google Forms</h3>
            <p className="text-xs text-slate-400">
              Sincronização em tempo real entre o formulário do motorista e o painel de chamadas
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Option 1: Automatic Creation of Daily Call Sheet and Daily Form */}
        <div className="p-5 bg-gradient-to-br from-slate-800/80 to-slate-800/40 border border-emerald-500/30 rounded-2xl mb-6 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 mb-2">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                Chamada Diária dos Motoristas
              </div>
              <h4 className="text-base font-bold text-white">
                Criar Nova Planilha e Forms Diário ({todayFormatted})
              </h4>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-lg">
                Conforme solicitado, uma <strong>planilha nova e um Google Forms novo</strong> são criados todos os dias para a chamada dos carros. Apenas a <strong>planilha de logins e senhas</strong> permanece a mesma de forma fixa e permanente!
              </p>
            </div>
            <button
              onClick={() => handleCreateAutoWorkspace(true)}
              disabled={isCreatingWorkspace || !accessToken}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shrink-0 flex items-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreatingWorkspace ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Gerando no Google...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  <span>Gerar Chamada de Hoje</span>
                </>
              )}
            </button>
          </div>

          {creationStatus && (
            <p className="mt-3 text-xs font-mono text-emerald-400 bg-slate-950/60 p-2.5 rounded-lg border border-emerald-500/20 flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              {creationStatus}
            </p>
          )}

          {/* Indicator of Permanent Logins Sheet */}
          <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 text-amber-300 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Planilha de Logins: Fixa & Permanente ({config.authSheetName || 'Acessos_Autorizados'})
            </span>
            <span className="text-[11px] text-slate-400">Não reseta com os dias</span>
          </div>
        </div>

        {/* Current Links / Active Workspace */}
        {(config.spreadsheetId || config.formId) && (
          <div className="mb-6 p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
                Chamada Diária Ativa ({config.activeDailyDate || todayFormatted})
              </h5>
              <span className="text-[10px] font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 font-bold">
                HOJE
              </span>
            </div>

            {/* Sheets link */}
            {config.spreadsheetId && (
              <div className="flex items-center justify-between p-2.5 bg-slate-900 rounded-lg border border-slate-800 text-xs">
                <div className="flex items-center gap-2 truncate pr-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-semibold text-white">Planilha do Dia:</span>
                  <span className="font-mono text-slate-400 truncate">{config.spreadsheetId}</span>
                </div>
                <a
                  href={config.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}/edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1 shrink-0 font-medium transition"
                >
                  <span>Abrir Planilha</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {/* Forms link */}
            {formShareUrl && (
              <div className="flex items-center justify-between p-2.5 bg-slate-900 rounded-lg border border-slate-800 text-xs">
                <div className="flex items-center gap-2 truncate pr-2">
                  <FileText className="w-4 h-4 text-purple-400 shrink-0" />
                  <span className="font-semibold text-white">Link do Google Forms (Motoristas):</span>
                  <span className="font-mono text-slate-400 truncate max-w-[200px]">{formShareUrl}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => copyToClipboard(formShareUrl)}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1 font-medium transition cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedLink ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                  <button
                    onClick={() => setShowQrCode(!showQrCode)}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1 font-medium transition cursor-pointer"
                  >
                    <QrCode className="w-3 h-3 text-amber-400" />
                    <span>QR Code</span>
                  </button>
                  <a
                    href={formShareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1 font-medium transition"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}

            {/* QR Code view */}
            {showQrCode && formShareUrl && (
              <div className="p-4 bg-white text-slate-900 rounded-xl text-center space-y-2 mt-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  QR Code para os motoristas escanearem na guarita / chegada:
                </p>
                <div className="flex justify-center py-2">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(formShareUrl)}`}
                    alt="QR Code Google Forms"
                    className="w-44 h-44 rounded border border-slate-200 shadow-sm"
                  />
                </div>
                <p className="text-[11px] text-slate-600 font-mono break-all">{formShareUrl}</p>
              </div>
            )}
          </div>
        )}

        {/* Option 2: Manual Spreadsheet ID */}
        <div className="space-y-4 pt-2 border-t border-slate-800">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Ou Conectar Planilha Existente (ID ou Link Completo):
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={spreadsheetIdInput}
                onChange={(e) => setSpreadsheetIdInput(e.target.value)}
                placeholder="Ex: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms ou link completo"
                className="flex-1 px-3.5 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Link do Google Forms dos Motoristas (Opcional):
            </label>
            <input
              type="text"
              value={formUrlInput}
              onChange={(e) => setFormUrlInput(e.target.value)}
              placeholder="Ex: https://docs.google.com/forms/d/e/.../viewform"
              className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Ficará visível e acessível imediatamente no painel dos motoristas em seus celulares.
            </p>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-950/40 rounded-xl border border-slate-800">
            <div>
              <p className="text-xs font-semibold text-slate-200">Frequência de Sincronização em Tempo Real</p>
              <p className="text-[11px] text-slate-400">Verificação automática de novas chegadas na planilha</p>
            </div>
            <select
              value={syncInterval}
              onChange={(e) => setSyncInterval(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none font-mono"
            >
              <option value={3}>A cada 3 segundos (Ultra rápido)</option>
              <option value={5}>A cada 5 segundos (Recomendado)</option>
              <option value={10}>A cada 10 segundos</option>
              <option value={30}>A cada 30 segundos</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onTriggerSync}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Sincronizar Agora
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-800 transition cursor-pointer"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={handleSaveManual}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition cursor-pointer shadow-md shadow-emerald-500/20"
            >
              Salvar Configuração
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
